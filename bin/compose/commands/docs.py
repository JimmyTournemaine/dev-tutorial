import webbrowser

from commands.abstract import Command
from commands.common import BaseDeployerCommand
from commands.exception import InvalidCommandException
from deployer import DeployerFactory, DeployerPlaybookCommandBuilder
from utils import Utils


class DocsCommand(Command):
    def __init__(self):
        super().__init__("docs", "Generate and expose API documentations")

    def create_parser(self, subparsers):
        super().create_parser(subparsers)

        self.parser.set_defaults()

        docs_subparsers = self.parser.add_subparsers()
        DocsGenerateCommand().create_parser(docs_subparsers)
        DocsServerStartCommand().create_parser(docs_subparsers)
        DocsServerStopCommand().create_parser(docs_subparsers)

    def run(self, args):
        raise InvalidCommandException()


class DocsGenerateCommand(Command):
    def __init__(self):
        super().__init__("generate", "Generate API documentations")

    def parent_command(self):
        return BaseDeployerCommand

    def setup_parser(self):
        self.parser.add_argument(
            "-k",
            "--keep",
            action="store_false",
            help=(
                "Keep the documentation build environment (rebuilds are faster)."
                + "You should use `force` with this option"
            ),
            dest="clean",
        )
        self.parser.add_argument(
            "-f",
            "--force",
            action="store_true",
            help="Force regeneration of documentation",
            dest="force",
        )

    def run(self, args):
        # Deployer run builder
        builder = (
            DeployerPlaybookCommandBuilder()
            .add_playbook("docsgen")
            .add_playbook("docs")
        )

        if args.clean:
            builder.add_tag("all").add_tag("clean")

        if args.force:
            builder.add_extra_var("docsgen_force", "yes").add_extra_var(
                "docs_restart", "yes"
            )

        # Run the deployer
        deployer = DeployerFactory().create(self.executer)
        deployer.run(builder)

        # Open the documentation
        if Utils.is_tty():
            webbrowser.open("http://localhost:8000")


class DocsServerCommand(Command):
    def __init__(self, name, expected_state, help_message):
        super().__init__(name, help_message)
        self.expected_state = expected_state

    def parent_command(self):
        return BaseDeployerCommand

    def run(self, args):
        # Deployer run builder
        builder = (
            DeployerPlaybookCommandBuilder()
            .add_playbook("docs")
            .add_extra_var("docs_state", self.expected_state)
        )

        # Run the deployer
        deployer = DeployerFactory().create(self.executer)
        deployer.run(builder)

        # Open the documentation
        if Utils.is_tty() and self.expected_state == "started":
            webbrowser.open("http://localhost:8000")


class DocsServerStartCommand(DocsServerCommand):
    def __init__(self):
        super().__init__("start", "started", "Start the documentation server")


class DocsServerStopCommand(DocsServerCommand):
    def __init__(self):
        super().__init__("stop", "stopped", "Stop the documentation server")
