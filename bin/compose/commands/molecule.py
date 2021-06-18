from commands.abstract import Command
from commands.exception import InvalidCommandException
from deployer import DeployerFactory, DeployerShellCommandBuilder


class TestDeployerCommand(Command):
    def __init__(self):
        super().__init__("test-deployer", "Run a deployer unit test")

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

    def run(self, args):

        # Check args
        if len(args.roles) < 1 and not args.all:
            raise InvalidCommandException(
                "You must specify a role to test or provide --all option"
            )

        # Run the deployer
        command = "./scripts/unit-tests.py "
        if len(args.roles) > 0:
            command += " ".join(args.roles)

        deployer = DeployerFactory().create(self.executer)
        deployer.run(DeployerShellCommandBuilder(command))
