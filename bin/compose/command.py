import argparse

from commands.deploy import DeployCommand
from commands.deployer import DeployerCommand
from commands.dockerize import DockerizeCommand
from commands.docs import DocsCommand
from commands.elastic import ElasticCommand
from commands.lint import LintCommand
from commands.molecule import TestDeployerCommand
from commands.package import PackageCommand
from commands.prune import PruneCommand
from commands.security import SecurityCommand


class CommandManager:

    command_classes = [
        DeployCommand,
        DeployerCommand,
        DockerizeCommand,
        DocsCommand,
        ElasticCommand,
        LintCommand,
        PackageCommand,
        PruneCommand,
        SecurityCommand,
        TestDeployerCommand,
    ]

    def __init__(self):
        self.parser = argparse.ArgumentParser()
        self.parser.set_defaults(func=lambda args: self.parser.print_help())
        self.commands = list()

    def create_parsers(self):
        subparsers = self.parser.add_subparsers()

        for command_class in self.command_classes:
            command = command_class()
            command.create_parser(subparsers)

            self.commands.append(command)

    def run(self, argv):
        args = self.parser.parse_args(argv)
        args.func(args)
