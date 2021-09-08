import sys
import webbrowser
from datetime import datetime

from commands.abstract import Command
from commands.common import BaseDeployerCommand
from deployer import DeployerFactory, DeployerPlaybookCommandBuilder
from utils import Utils


class ElasticCommand(Command):
    def __init__(self):
        super().__init__("elastic", "Run the Elastic stack over an environment")

    def parent_command(self):
        return BaseDeployerCommand

    def setup_parser(self):
        self.parser.add_argument(
            "environment",
            choices=["dev", "prod"],
            default="dev",
            nargs="?",
            help="select the environment, allowed values are %(choices)s (default: %(default)s)",
            metavar="environment",
        )
        self.parser.add_argument(
            "-t",
            "--tags",
            nargs="+",
            default=[],
            help="select extra tags to pass to the deployer",
            metavar="tags",
        )

    def run(self, args):
        # Deployer run builder
        builder = (
            DeployerPlaybookCommandBuilder()
            .add_playbook("elastic")
            .add_inventory(args.environment)
        )

        # Custom tags
        for tag in args.tags:
            builder.add_tag(tag)

        # Run the deployer
        deployer = DeployerFactory().create(self.executer)
        deployer.run(builder)
