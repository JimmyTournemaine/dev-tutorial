import sys
import webbrowser
from datetime import datetime

from commands.abstract import Command
from commands.common import BaseDeployerCommand
from deployer import DeployerFactory, DeployerPlaybookCommandBuilder
from utils import Utils


class DockerizeCommand(Command):
    def __init__(self):
        super().__init__("dockerize", "Build and run a ready-to-use environment")

    def parent_command(self):
        return BaseDeployerCommand

    def setup_parser(self):
        self.parser.add_argument(
            "environment",
            choices=["dev", "test", "ci"],
            default="dev",
            help="select the environment, allowed values are %(choices)s (default: %(default)s)",
            metavar="environment",
        )
        self.parser.add_argument(
            "-s",
            "--services",
            choices=["api", "app"],
            nargs="+",
            default=[],
            help="select the services to run, allowed values are %(choices)s (default: %(default)s)",
            metavar="services",
        )
        self.parser.add_argument(
            "-t",
            "--tags",
            nargs="+",
            default=[],
            help="select extra tags to pass to the deployer",
            metavar="tags",
        )
        self.parser.add_argument(
            "-a",
            "--ansible-vars",
            nargs="+",
            default=[],
            help="additional ansible variables (default: %(default)s)",
            metavar="ansible_vars",
        )

    def run(self, args):
        # Deployer run builder
        builder = (
            DeployerPlaybookCommandBuilder()
            .add_playbook("build")
            .add_playbook("run" if args.environment != "ci" else "run-ci")
            .add_inventory(args.environment)
        )

        for tag in args.tags + args.services:
            builder.add_tag(tag)

        # Specific dev arguments
        if args.environment == "dev":
            builder.add_playbook("healthcheck").add_extra_var("healthcheck_wait", "yes")

        # Run the deployer
        start_time = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%IZ")
        deployer = DeployerFactory().create(self.executer)
        deployer.run(builder)

        if "ci" != args.environment:
            # Open the application
            if (
                not Utils.is_tty()
                and not args.dry_run
                and (len(args.services) == 0 or "app" in args.services)
            ):
                if "dev" == args.environment:
                    webbrowser.open("http://localhost:4200/home")
                elif "test" == args.environment:
                    webbrowser.open("http://localhost:9876/debug.html")

            # Retrieve dependencies to local node_mocules
            (
                self.executer.create_taskgroup()
                .add_task(
                    "docker cp dev-tutorial-api:/usr/src/app/api/node_modules ./dev-tutorial-api/"
                )
                .add_task(
                    "docker cp dev-tutorial-app:/usr/src/app/app-ui/node_modules ./dev-tutorial-app/"
                )
                .run_tasks()
            )

            # Follow logs
            (
                self.executer.create_taskgroup()
                .add_task(
                    ApiLogTransform().transform(
                        f"docker logs --follow --since {start_time} dev-tutorial-api"
                    )
                )
                .add_task(
                    AppLogTransform().transform(
                        f"docker logs --follow --since {start_time} dev-tutorial-app"
                    )
                )
                .run_tasks()
                .join_tasks()
            )


class LogTransform:
    def __init__(self, label, color, win_color):
        self.label = f"{label} "
        self.color = color
        self.win_color = win_color

    def transform(self, cmd):
        print(sys.platform)
        if "win32" == sys.platform:
            log_transform = (
                "powershell \"{} | % {{ Write-Host -NoNewline -ForegroundColor {} '{} | '; Write-Host $_ }}\""
            ).format(cmd, self.win_color, self.label)
        else:
            log_transform = "{} | sed -e 's/^/\033[0;{}m{} | \033[0m/'".format(
                cmd, self.color, self.label
            )

        return log_transform


class ApiLogTransform(LogTransform):
    def __init__(self):
        super().__init__("backend", "33", "Yellow")


class AppLogTransform(LogTransform):
    def __init__(self):
        super().__init__("frontend", "32", "DarkYellow")
