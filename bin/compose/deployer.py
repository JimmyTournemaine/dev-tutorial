import os
import sys
from abc import ABC, abstractmethod
from docker import Docker, DockerExecBuilder, DockerRunBuilder


class Deployer:

    IMAGE = "tzimy/dev-tutorial-deployer"
    CONTAINER = "dev-tutorial-deployer"

    def __init__(self, executer):
        self.executer = executer
        self.init_workspaces()
        self.docker = Docker(executer)

    def init_workspaces(self):
        self.deployer_workspace = "/usr/src/dev-tutorial"
        self.host_workspace = os.path.abspath(
            os.path.join(os.path.realpath(__file__), "../../..")
        )

    def is_running(self):
        return self.docker.is_running(self.CONTAINER)

    def get_image_id(self):
        tmp_file = "/tmp/dev-tutorial-image.id"
        self.executer.run(
            'docker images --format "{{.ID}}" ' + self.IMAGE + " > " + tmp_file
        )
        with open(tmp_file) as f:
            image_id = f.readline()
        os.remove(tmp_file)
        return image_id

    def is_updated(self):
        return self.image_id != self.get_image_id()

    def prepare(self):
        self.image_id = self.get_image_id()

    def build_image(self):
        self.docker.build_image(self.IMAGE, "./dev-tutorial-deployer")

    def push(self):
        self.docker.push(self.IMAGE)

    def login_registry(self):
        cmd = "docker login"

        login = os.getenv("DOCKER_USERNAME")
        if login is not None:
            cmd += " --username $DOCKER_USERNAME"

        passwd = os.getenv("DOCKER_TOKEN")
        if passwd is not None:
            cmd += " --password $DOCKER_TOKEN"
            self.executer.exec_context.set_next_verbose(False)

        builder = DockerExecBuilder()
        builder.set_container(self.CONTAINER).set_command(cmd)
        
        if login is None or passwd is None:
            builder.set_interactive().set_tty()

        self.docker.exec(builder)

    def stop(self):
        self.executer.exec_context.set_next_exit_on_error(False)
        self.docker.stop(self.CONTAINER)

    def start(self):
        builder = DockerRunBuilder()
        builder.set_name(self.CONTAINER).set_image(
            self.IMAGE
        ).set_daemon().add_env("HOST_SYSTEM", sys.platform).add_env(
            "WORKSPACE_HOSTED", self.host_workspace
        ).add_env(
            "WORKSPACE_LOCAL", self.deployer_workspace
        ).add_volume(
            "/var/run/docker.sock", "/var/run/docker.sock"
        ).add_volume(
            f"{self.host_workspace}/dev-tutorial-deployer", "/etc/ansible"
        ).add_volume(
            self.host_workspace, self.deployer_workspace
        ).add_network("host").set_command("sleep infinity")

        self.docker.run(builder)

    def execute(self, deployer_command_builder):
        builder = DockerExecBuilder()
        builder.set_container(self.CONTAINER).set_command(
            deployer_command_builder.follow_docker_exec_context(
                self.executer.exec_context
            ).build()
        )

        self.executer.exec_context.set_next_dry_run(False)
        self.docker.exec(builder)

    def run(self, deployer_command_builder):
        self.prepare()
        self.build_image()

        if self.is_updated() and self.is_running():
            self.stop()

        if not self.is_running():
            self.prepare()
            self.start()

        if deployer_command_builder.is_login_required():
            self.login_registry()

        self.execute(deployer_command_builder)


class Win32Deployer(Deployer):
    """Backslashes workspace path"""

    def init_workspaces(self):
        super().init_workspaces()

        self.host_workspace = (
            "/" + self.host_workspace.replace("\\", "/").replace(":", "").lower()
        )


class DarwinDeployer(Deployer):
    def prepare(self):
        super().prepare()

        builder = (
            DockerRunBuilder()
            .set_daemon()
            .set_name("tcp-connect")
            .bind_port(2375)
            .add_volume("/var/run/docker.sock", "/var/run/docker.sock")
            .set_image("alpine/socat")
            .set_command(
                "tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock"
            )
        )

        self.executer.exec_context.set_next_exit_on_error(False)
        exit_code = self.docker.run(builder)

        if exit_code > 0:
            self.docker.start("tcp-connect")


class DeployerFactory:
    def create(self, executer):
        if "darwin" == sys.platform:
            classname = DarwinDeployer
        elif "win32" == sys.platform:
            classname = Win32Deployer
        else:
            classname = Deployer

        return classname(executer)


class DeployerCommandBuilder(ABC):
    def __init__(self):
        self.login_required = False

    @abstractmethod
    def build(self):
        pass

    def follow_docker_exec_context(self, exec_context):
        pass

    def is_login_required(self):
        return self.login_required

    def set_login_required(self, required):
        self.login_required = required
        return self


class DeployerShellCommandBuilder(DeployerCommandBuilder):
    def __init__(self, command="sh"):
        super().__init__()
        self.command = command

    def build(self):
        return self.command

    def follow_docker_exec_context(self, _):
        return self


class DeployerPlaybookCommandBuilder(DeployerCommandBuilder):
    def __init__(self):
        super().__init__()
        self.playbooks = list()
        self.inventories = list()
        self.verbosity = 0  # 0-4
        self.tags = list()
        self.extra_vars = {}
        self.check = False

    def add_playbook(self, name):
        self.playbooks.append(f"{name}.yml")
        return self

    def add_inventory(self, name):
        # Add the default inventory first
        if len(self.inventories) == 0:
            self.inventories.append("../hosts.yml")

        self.inventories.append(f"../inventories/{name}.yml")
        return self

    def add_tag(self, tag):
        self.tags.append(tag)
        return self

    def add_extra_var(self, var_name, value):
        self.extra_vars[var_name] = value
        return self

    def set_verbosity(self, verbosity):
        if verbosity < 0 or verbosity > 4:
            raise Exception("Verbosity must be a level from 0 to 4.")
        self.verbosity = verbosity
        return self

    def set_check(self, check):
        self.check = check
        return self

    def follow_docker_exec_context(self, exec_context):
        return self.set_verbosity(3 if exec_context.verbose() else 0).set_check(
            exec_context.dry_run()
        )

    def build(self):
        args = ""

        for inventory in self.inventories:
            args += f"-i {inventory} "

        for var_name, value in self.extra_vars.items():
            args += f"-e {var_name}={value} "

        if len(self.tags) > 0:
            taglist = ",".join(self.tags)
            args += f"--tags={taglist} "

        if self.check:
            args += "--check "

        if self.verbosity > 0:
            verb = "v" * self.verbosity
            args += f"-{verb} "

        for playbook in self.playbooks:
            args += f"{playbook} "

        return f"ansible-playbook {args}"
