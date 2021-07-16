from utils import Utils


class Docker:
    def __init__(self, executer):
        self.executer = executer

    def build_image(self, name, directory):
        return self.executer.run(f"docker build -t {name} {directory}")

    def is_running(self, container):
        self.executer.exec_context.set_next_exit_on_error(False)
        exit_code = self.executer.run(
            f"docker container inspect {container} >/dev/null 2>&1"
        )
        return 0 == exit_code

    def exec(self, docker_exec_builder):
        self.executer.run(docker_exec_builder.build())

    def push(self, image, tag="latest"):
        self.executer.run(f"docker push {image}:{tag}")

    def run(self, docker_run_builder):
        return self.executer.run(docker_run_builder.build())

    def start(self, container):
        self.executer.run(f"docker start {container}")

    def stop(self, container):
        self.executer.run(f"docker stop {container}")


class DockerExecBuilder:
    def __init__(self):
        self.interactive = False
        self.tty = False

        if Utils.is_tty():
            self.set_tty().set_interactive()

    def set_container(self, container):
        self.container = container
        return self

    def set_command(self, command):
        self.command = command
        return self

    def set_interactive(self, interactive=True):
        self.interactive = interactive
        return self

    def set_tty(self, tty=True):
        self.tty = tty
        return self

    def build(self):
        # Required values
        if not self.container or not self.command:
            raise Exception("Missing container and/or command to execute")

        # Options
        options = ""

        if self.interactive:
            options += "-i "

        if self.tty:
            options += "-t "

        # Build the command
        return f"docker exec {options} {self.container} {self.command}"


class DockerRunBuilder:
    def __init__(self):
        self.autoremove = True
        self.daemon = False
        self.interactive = False
        self.tty = False
        self.autoremove = True
        self.env = {}
        self.volumes = {}
        self.ports = {}
        self.command = ""
        self.networks = []

    def set_name(self, name):
        self.name = name
        return self

    def set_image(self, image):
        self.image = image
        return self

    def set_daemon(self, daemon=True):
        self.daemon = daemon
        return self

    def set_interactive(self, interactive=True):
        self.interactive = interactive
        return self

    def set_tty(self, tty=True):
        self.tty = tty
        return self

    def set_autoremove(self, autoremove=True):
        self.autoremove = autoremove
        return self

    def set_command(self, command):
        self.command = command
        return self

    def add_env(self, name, value):
        self.env[name] = value
        return self

    def add_volume(self, source, target):
        self.volumes[source] = target
        return self

    def add_network(self, network_name):
        self.networks.append(network_name)
        return self

    def bind_port(self, port, target=None):
        if target is None:
            target = port
        self.ports[target] = port
        return self

    def build(self):
        # Required values
        if not self.image:
            raise Exception("Missing image to run")

        # Command
        args = ""

        if self.autoremove:
            args += "--rm "

        if self.daemon:
            args += "-d "

        if self.interactive:
            args += "-i "

        if self.tty:
            args += "-t "

        if self.name:
            args += f"--name {self.name} "

        for key, value in self.env.items():
            args += f"-e {key}={value} "

        for key, value in self.volumes.items():
            args += f"-v {key}:{value} "

        for port, target in self.ports.items():
            args += f"-p {port}:{target} "

        for network in self.networks:
            args += f"--network={network} "

        # Build the command
        return f"docker run {args} {self.image} {self.command}"
