from commands.abstract import Command
from commands.common import BaseDeployerCommand
from commands.exception import InvalidCommandException
from deployer import DeployerFactory, DeployerShellCommandBuilder


class TestDeployerCommand(Command):
    def __init__(self):
        super().__init__("test-deployer", "Run a deployer unit test", ["molecule"])

    def parent_command(self):
        return BaseDeployerCommand

    def setup_parser(self):
        self.parser.add_argument(
            "roles",
            nargs="*",
            default=[],
            help="The roles to test",
        )
        self.parser.add_argument(
            "--all",
            action="store_true",
            help="Run all the tests",
        )
        self.parser.add_argument(
            "--command", default="test", help="the molecule command"
        )
        self.parser.add_argument(
            "--scenario",
            default=None,
            help="the scenario to run (run all scenario if not provided)",
        )

    def run(self, args):

        # Check args
        if len(args.roles) < 1 and not args.all:
            raise InvalidCommandException(
                "You must specify a role to test or provide --all option"
            )

        # Run the deployer
        command = f"../tests/unit-tests.py --command {args.command} "

        if args.scenario is not None:
            command += f" --scenario {args.scenario}"

        if len(args.roles) > 0:
            command += " ".join(args.roles)

        deployer = DeployerFactory().create(self.executer)
        deployer.run(DeployerShellCommandBuilder(command))
