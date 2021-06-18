from commands.abstract import Command
from deployer import DeployerFactory, DeployerPlaybookCommandBuilder


class PackageCommand(Command):
    def __init__(self):
        super().__init__("package", "Package production images")

    def run(self, args):
        # Deployer run builder
        builder = (
            DeployerPlaybookCommandBuilder()
            .add_playbook("build")
            .add_playbook("run")
            .add_playbook("package")
            .add_inventory("prod")
            .set_login_required(True)
        )

        # Run the deployer to package production images
        deployer = DeployerFactory().create(self.executer)
        deployer.run(builder)

        # Push the deployer image to
        deployer.push()
