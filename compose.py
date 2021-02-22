#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import multiprocessing
import os
import shutil
import signal
import sys
import webbrowser
from datetime import datetime


def exec(cmd, verbose=False, dry_run=False):
    if verbose or dry_run:
        print(cmd)
    if not dry_run:
        exit_code = os.system(cmd)
        if exit_code > 0:
            sys.exit(exit_code)


def cwd():
    return os.path.dirname(os.path.realpath(__file__))


class Deployer:
    def __init__(self, command, options="", verbose=False, dry_run=False):
        self.command = command
        self.options = options
        self.verbose = verbose
        self.dry_run = dry_run

    @classmethod
    def forPlaybook(
        cls, playbook, tags=[], extra_vars=[], verbose=False, dry_run=False
    ):
        return cls.forPlaybooks([playbook], tags, extra_vars, verbose, dry_run)

    @classmethod
    def forPlaybooks(
        cls, playbooks=[], tags=[], extra_vars=[], verbose=False, dry_run=False
    ):

        playbook_args = list()
        if verbose:
            playbook_args.append("--verbose")
        if dry_run:
            playbook_args.append("--check")
        if len(tags) > 0:
            playbook_args.append("--tags=" + ",".join(tags))
        if len(extra_vars) > 0:
            for ansible_var in extra_vars:
                playbook_args.append("-e " + ansible_var)

        return cls(
            "ansible-playbook " + " ".join(playbooks + playbook_args),
            verbose=verbose,
            dry_run=dry_run,
        )

    @classmethod
    def forCommand(
        cls, command, command_args=[], interactive=False, verbose=False, dry_run=False
    ):
        options = "-i" if interactive else ""
        return cls(command + " " + " ".join(command_args), options, verbose, dry_run)

    def prepare(self):
        if "darwin" == sys.platform:
            exec(
                "docker run --rm -d --name tcp-connect -p 2375:2375"
                + " -v /var/run/docker.sock:/var/run/docker.sock alpine/socat"
                + " tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock"
                + " || docker start tcp-connect",
                self.verbose,
            )

    def build(self):
        exec(
            "docker build -t dev-tutorial-deployer ./dev-tutorial-deployer",
            self.verbose,
        )

    def run(self):
        host_workspace = cwd()
        if "win32" == sys.platform:
            host_workspace = (
                "/" + host_workspace.replace("\\", "/").replace(":", "").lower()
            )

        deployer_workspace = "/usr/src/dev-tutorial"

        exec(
            f"docker run --rm --name dev-tutorial-deployer -t {self.options} "
            + f"-e HOST_SYSTEM={sys.platform} "
            + f"-e WORKSPACE_HOSTED={host_workspace} "
            + f"-e WORKSPACE_LOCAL={deployer_workspace} "
            + "-v /var/run/docker.sock:/var/run/docker.sock "
            + f"-v {host_workspace}/dev-tutorial-deployer:/etc/ansible "
            + f" -v {host_workspace}/:{deployer_workspace} "
            + "dev-tutorial-deployer "
            + self.command,
            self.verbose,
        )

    def start(self):
        self.prepare()
        self.build()
        self.run()


class Command:
    def __init__(self, args):
        self.verbose = args.verbose
        self.dry_run = args.dry_run

    def exec(self, cmd):
        return exec(cmd, self.verbose, self.dry_run)


class Dockerize(Command):
    def __init__(self, args):
        Command.__init__(self, args)
        self.environment = args.environment
        self.services = args.services
        self.ansible_vars = args.ansible_vars
        self.tags = args.tags

    def run(self):
        deployer = Deployer.forPlaybook(
            "playbooks/" + self.environment + ".yml",
            self.tags + self.services,
            self.ansible_vars,
            self.verbose,
            self.dry_run,
        )

        start_time = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%IZ")

        deployer.start()

        # Follow containers logs
        threads = [
            multiprocessing.Process(target=self._post_actions),
            multiprocessing.Process(
                target=self.exec,
                args=(
                    self._log_transform(
                        "docker logs --follow --since "
                        + start_time
                        + " dev-tutorial-api-"
                        + self.environment,
                        "api"
                    ),
                ),
            ),
            multiprocessing.Process(
                target=self.exec,
                args=(
                    self._log_transform(
                        "docker logs --follow --since "
                        + start_time
                        + " dev-tutorial-app-"
                        + self.environment,
                        "app"
                    ),
                ),
            ),
        ]
        [t.start() for t in threads]

        # SIGINT handler
        signal.signal(
            signal.SIGINT, lambda sig, frame: [t.terminate() for t in threads]
        )

        # Wait for termination with SIGINT(^C) or containers termination
        [t.join() for t in threads]

    def _post_actions(self):

        if "dev" == self.environment:
            if not self.dry_run:
                webbrowser.open("http://localhost:4200/")
                copies = (
                    multiprocessing.Process(
                        target=self.exec,
                        args=(
                            "docker cp "
                            + f"dev-tutorial-api-{self.environment}:/usr/src/app/api/node_modules"
                            + " ./dev-tutorial-api/"
                        ),
                    ),
                    multiprocessing.Process(
                        target=self.exec,
                        args=(
                            "docker cp "
                            + f"dev-tutorial-app-{self.environment}:/usr/src/app/app-ui/node_modules"
                            + " ./dev-tutorial-app/"
                        ),
                    ),
                )
                [t.start() for t in copies]
                [t.join() for t in copies]

    def _log_transform(self, logCommand, container):
        if container == "api":
            label = "backend "
            color = "33"
            win_color = "Yellow"
        elif container == "app":
            label = "frontend"
            color = "32"
            win_color = "Orange"
        else:
            label = "others  "
            color = "31"
            win_color = "Red"

        if "win32" == sys.platform:
            log_transform = (
                'powershell "{}"'
                + " | % {{ Write-Host -NoNewline -ForegroundColor {} '{} | '; Write-Host $_ }}\""
            ).format(logCommand, win_color, label)
        else:
            log_transform = "{} | sed -e 's/^/\033[0;{}m{} | \033[0m/'".format(
                logCommand, color, label
            )

        return log_transform


class Lint(Command):
    def __init__(self, args):
        Command.__init__(self, args)
        self.fix = args.fix
        self.interactive = args.interactive
        self.linters = args.linters
        self.languages = args.languages

    def run(self):
        # Remove previous reports
        if os.path.exists("./report"):
            shutil.rmtree("./report")

        # Touch .eslintrc to activate TYPESCRIPT_ES linter
        eslintroot = open(".eslintrc.json", "w+")
        eslintroot.write("{}")
        eslintroot.close()

        # Run Mega-Linter
        cmd = "docker run --rm --name mega-linter {} -v $(pwd):/tmp/lint nvuillam/mega-linter:v4"
        args = list()
        if self.fix:
            args.append("-e APPLY_FIXES=all")

        if len(self.linters) > 0:
            args.append("-e ENABLE_LINTERS=" + ",".join(self.linters))

        if len(self.languages) > 0:
            args.append("-e ENABLE=" + ",".join(self.languages))

        if self.verbose:
            args.append("-e LOG_LEVEL=DEBUG")

        if self.interactive:
            args.append("-it --entrypoint=/bin/bash")

        signal.signal(
            signal.SIGINT,
            lambda sig, frame: self.exec("docker container stop mega-linter"),
        )

        self.exec(cmd.format(" ".join(args)))

        # Cleaning
        os.remove(".eslintrc.json")


class Prune(Command):
    def __init__(self, args):
        Command.__init__(self, args)
        self.force = args.force

    def run(self):
        cmd = "docker system prune --all --volumes"
        if self.force:
            cmd += " --force"
        self.exec(cmd)


class Docs(Command):
    def generate(self, clean, force):
        tags = ("all", "clean") if clean else ()
        args = ("docsgen_force=yes", "docs_restart=yes") if force else ()
        Deployer("playbooks/docsgen.yml playbooks/docs.yml", tags, args).start()
        # webbrowser.open('http://localhost:8000')

    def status(self, state):
        Deployer.forPlaybook(
            "playbooks/docs.yml",
            extra_vars=[f"docs_state={state}"],
            verbose=self.verbose,
            dry_run=self.dry_run,
        ).start()
        # webbrowser.open('http://localhost:8000')


def main(argv):

    parser = argparse.ArgumentParser()
    parser.set_defaults(func=lambda args: parser.print_help())

    common_parser = argparse.ArgumentParser(add_help=False)
    common_parser.add_argument(
        "-d",
        "--dry-run",
        action="store_true",
        help="output every action but don't run them",
    )
    common_parser.add_argument(
        "-v", "--verbose", action="store_true", help="make actions more verbose"
    )

    subparsers = parser.add_subparsers()
    deployer_parser = subparsers.add_parser(
        "deployer", parents=[common_parser], help="Run custom deployer actions"
    )
    deployer_parser.add_argument("command")
    deployer_parser.add_argument(
        "-i", "--interactive", action="store_true", help="open an interactive session"
    )
    deployer_parser.set_defaults(
        func=lambda args: Deployer.forCommand(
            args.command,
            interactive=args.interactive,
            verbose=True,
            dry_run=args.dry_run,
        ).start()
    )

    dockerize_parser = subparsers.add_parser(
        "dockerize",
        parents=[common_parser],
        help="dockerize the apps to build a ready-to-use environment",
    )
    dockerize_parser.set_defaults(func=lambda args: Dockerize(args).run())
    dockerize_parser.add_argument(
        "environment",
        choices=["dev", "test", "ci", "prod"],
        default="dev",
        help="select the environment, allowed values are %(choices)s (default: %(default)s)",
        metavar="environment",
    )
    dockerize_parser.add_argument(
        "-s",
        "--services",
        choices=["api", "app"],
        nargs="+",
        default=[],
        help="select the services to run, allowed values are %(choices)s (default: %(default)s)",
        metavar="services",
    )
    dockerize_parser.add_argument(
        "-t",
        "--tags",
        nargs="+",
        default=[],
        help="select tags to pass to the deployer",
        metavar="tags",
    )
    dockerize_parser.add_argument(
        "-a",
        "--ansible-vars",
        nargs="+",
        default=[],
        help="additional ansible variables (default: %(default)s)",
        metavar="ansible_vars",
    )

    lint_parser = subparsers.add_parser(
        "lint",
        parents=[common_parser],
        help="run the MegaLinter over all the source code",
    )
    lint_parser.set_defaults(func=lambda args: Lint(args).run())
    lint_parser.add_argument(
        "-f",
        "--fix",
        action="store_true",
        help="fix issues that can be automatically fixed",
    )
    lint_parser.add_argument(
        "--languages",
        nargs="+",
        default=[],
        help="linters to use (default: from .mega-linter.yml)",
    )
    lint_parser.add_argument(
        "-l",
        "--linters",
        nargs="+",
        default=[],
        help="linters to use (default: from .mega-linter.yml)",
    )
    lint_parser.add_argument(
        "-i", "--interactive", action="store_true", help="open an interactive session"
    )

    prune_parser = subparsers.add_parser(
        "prune",
        parents=[common_parser],
        help="Remove all unused images , networks, containers, volumes and build caches from your docker system",
    )
    prune_parser.set_defaults(func=lambda args: Prune(args).run())
    prune_parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help="Do not prompt for confirmation",
    )

    docs_parser = subparsers.add_parser(
        "docs",
        help="Generate and expose API documentations",
    )
    docs_subparsers = docs_parser.add_subparsers()
    docs_generate_parser = docs_subparsers.add_parser(
        "generate",
        parents=[common_parser],
        help="Generate API documentations",
    )
    docs_generate_parser.set_defaults(
        func=lambda args: Docs(args).generate(args.clean, args.force)
    )
    docs_generate_parser.add_argument(
        "-k",
        "--keep",
        action="store_false",
        help="Keep the documentation build environment (rebuilds are faster). You should use `force` with this option",
        dest="clean",
    )
    docs_generate_parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help="Force regeneration of documentation",
        dest="force",
    )
    docs_start_parser = docs_subparsers.add_parser(
        "start",
        parents=[common_parser],
        help="Start the documentation server",
    )
    docs_start_parser.set_defaults(func=lambda args: Docs(args).status("started"))
    docs_stop_parser = docs_subparsers.add_parser(
        "stop",
        parents=[common_parser],
        help="Stop the documentation server",
    )
    docs_stop_parser.set_defaults(func=lambda args: Docs(args).status("stopped"))

    args = parser.parse_args()

    start_time = datetime.now()
    args.func(args)
    end_time = datetime.now()
    print(f"Done in {end_time - start_time}")


if __name__ == "__main__":
    main(sys.argv)
