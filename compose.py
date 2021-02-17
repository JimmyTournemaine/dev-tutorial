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
from pathlib import Path


class Dockerize:
    def __init__(self, args):
        self.environment = args.environment
        self.verbose = args.verbose
        self.dry_run = args.dry_run
        self.services = args.services
        self.tags = args.tags
        self.ansible_vars = args.ansible_vars

    def run(self):
        if "darwin" == sys.platform:
            self._exec(
                "docker run --rm -d --name tcp-connect -p 2375:2375"
                + " -v /var/run/docker.sock:/var/run/docker.sock alpine/socat"
                + " tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock"
                + " || docker start tcp-connect"
            )

        host_workspace = os.path.dirname(os.path.realpath(__file__))
        if "win32" == sys.platform:
            host_workspace = (
                "/" + host_workspace.replace("\\", "/").replace(":", "").lower()
            )

        deployer_workspace = "/usr/src/dev-tutorial"

        playbook = "playbooks/" + self.environment + ".yml"
        tags = self.tags + self.services
        playbook_args = list()
        if self.verbose:
            playbook_args.append("--verbose")
        if self.dry_run:
            playbook_args.append("--check")
        if len(tags) > 0:
            playbook_args.append("--tags=" + ",".join(tags))
        if len(self.ansible_vars) > 0:
            for ansible_var in self.ansible_vars:
                playbook_args.append("-e " + ansible_var)

        # Build deployer
        self._exec("docker build -t dev-tutorial-deployer ./dev-tutorial-deployer")

        # Run deployer
        start_time = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%IZ")
        self._exec(
            "docker run --rm --name dev-tutorial-deployer -t -e HOST_SYSTEM="
            + sys.platform
            + " -e WORKSPACE_HOSTED="
            + host_workspace
            + " -e WORKSPACE_LOCAL="
            + deployer_workspace
            + " -v /var/run/docker.sock:/var/run/docker.sock -v "
            + host_workspace
            + "/dev-tutorial-deployer:/etc/ansible -v "
            + host_workspace
            + "/:"
            + deployer_workspace
            + " dev-tutorial-deployer ansible-playbook "
            + playbook
            + " "
            + " ".join(playbook_args)
        )

        # Follow containers logs
        threads = [
            multiprocessing.Process(target=self._post_actions),
            multiprocessing.Process(
                target=self._exec,
                args=(
                    self._log_transform(
                        "docker logs --follow --since "
                        + start_time
                        + " dev-tutorial-api-"
                        + self.environment,
                        "api",
                    ),
                ),
            ),
            multiprocessing.Process(
                target=self._exec,
                args=(
                    self._log_transform(
                        "docker logs --follow --since "
                        + start_time
                        + " dev-tutorial-app-"
                        + self.environment,
                        "app",
                    ),
                ),
            ),
            # multiprocessing.Process(
            #     target=self._exec,
            #     args=(
            #         self._log_transform(
            #             "docker logs --follow --since "
            #             + start_time
            #             + " dev-tutorial-mongo-"
            #             + self.environment,
            #             "mongo",
            #         ),
            #     ),
            # ),
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
                        target=self._exec,
                        args=(
                            "docker cp "
                            + f"dev-tutorial-api-{self.environment}:/usr/src/app/api/node_modules"
                            + " ./dev-tutorial-api/",
                        ),
                    ),
                    multiprocessing.Process(
                        target=self._exec,
                        args=(
                            "docker cp "
                            + f"dev-tutorial-app-{self.environment}:/usr/src/app/app-ui/node_modules"
                            + " ./dev-tutorial-app/",
                        ),
                    ),
                )
                [t.start() for t in copies]
                [t.join() for t in copies]

    def _exec(self, cmd):
        if self.verbose or self.dry_run:
            print(cmd)
        if not self.dry_run:
            exit_code = os.system(cmd)
            if exit_code > 0:
                sys.exit(exit_code)

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


class Lint:
    def __init__(self, args):
        self.verbose = args.verbose
        self.fix = args.fix
        self.linters = args.linters
        self.languages = args.languages

    def run(self):
        # Remove previous reports
        if os.path.exists("./report"):
            shutil.rmtree("./report")

        # Touch .eslintrc to activate TYPESCRIPT_ES linter
        Path(".eslintrc.json").touch()
        eslintroot = open(".eslintrc.json", "w")
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
            print(cmd.format(" ".join(args)))

        signal.signal(
            signal.SIGINT,
            lambda sig, frame: os.system("docker container stop mega-linter"),
        )

        os.system(cmd.format(" ".join(args)))

        # Cleaning
        os.remove(".eslintrc.json")


class Prune:
    def __init__(self, args):
        self.force = args.force

    def run(self):
        cmd = "docker system prune --all --volumes"
        if self.force:
            cmd += " --force"
        os.system(cmd)


def main(argv):

    parser = argparse.ArgumentParser()
    parser.set_defaults(func=lambda args: parser.print_help())

    subparsers = parser.add_subparsers()

    dockerize_parser = subparsers.add_parser(
        "dockerize", help="dockerize the apps to build a ready-to-use environment"
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
    dockerize_parser.add_argument(
        "-d",
        "--dry-run",
        action="store_true",
        help="output every action but don't run them",
    )
    dockerize_parser.add_argument(
        "-v", "--verbose", action="store_true", help="make actions more verbose"
    )

    lint_parser = subparsers.add_parser(
        "lint", help="run the MegaLinter over all the source code"
    )
    lint_parser.set_defaults(func=lambda args: Lint(args).run())
    lint_parser.add_argument("-v", "--verbose", action="store_true")
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

    prune_parser = subparsers.add_parser(
        "prune",
        help="Remove all unused images , networks, containers, volumes and build caches from your docker system",
    )
    prune_parser.set_defaults(func=lambda args: Prune(args).run())
    prune_parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help="Do not prompt for confirmation",
    )

    args = parser.parse_args()

    args.func(args)


if __name__ == "__main__":
    main(sys.argv)
