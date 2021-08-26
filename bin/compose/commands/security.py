from commands.abstract import Command
from commands.common import BaseDeployerCommand
from deployer import DeployerFactory, DeployerPlaybookCommandBuilder


class SecurityCommand(Command):
    def __init__(self):
        super().__init__("security", "Run security checks using a running environment")

    def parent_command(self):
        return BaseDeployerCommand

    def setup_parser(self):
        self.parser.add_argument(
            "environment",
            choices=["dev", "prod"],
            nargs="?",
            default="dev",
            help="select the environment, allowed values are %(choices)s (default: %(default)s)",
            metavar="environment",
        )
        self.parser.add_argument(
            "--api",
            action="store_true",
            help="Only run api security test",
        )

    def run(self, args):
        # Deployer run builder
        builder = (
            DeployerPlaybookCommandBuilder()
            .add_playbook("security_check")
            .add_inventory(args.environment)
        )
        if args.api:
            builder.add_tag("api")

        # Run the deployer
        deployer = DeployerFactory().create(self.executer)
        deployer.run(builder)
