from commands.abstract import Command
from commands.exception import InvalidCommandException
from deployer import DeployerFactory, DeployerShellCommandBuilder


class DeployerCommand(Command):
    def __init__(self):
        super().__init__(
            "deployer", "Run custom deployer commands (get a shell with sh for instance"
        )

    def setup_parser(self):
        self.parser.add_argument(
            "command", nargs="*", help="The command to run in the deployer"
        )

    def run(self, args):

        # Check args
        if len(args.command) < 1:
            raise InvalidCommandException()

        # Run the deployer
        command = " ".join(args.command)
        deployer = DeployerFactory().create(self.executer)
        deployer.run(DeployerShellCommandBuilder(command))
