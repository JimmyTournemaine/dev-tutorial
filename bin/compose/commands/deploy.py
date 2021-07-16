from commands.abstract import Command
from commands.common import BaseDeployerCommand
from deployer import DeployerFactory, DeployerPlaybookCommandBuilder


class DeployCommand(Command):
    def __init__(self):
        super().__init__("deploy", "Deploy a production environment")

    def parent_command(self):
        return BaseDeployerCommand

    def run(self, args):
        # Deployer run builder
        builder = DeployerPlaybookCommandBuilder().add_playbook("deploy")

        # Run the deployer
        deployer = DeployerFactory().create(self.executer)
        deployer.run(builder)
