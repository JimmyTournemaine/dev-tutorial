from abc import ABC, abstractmethod

from commands.common import BaseCommand
from commands.exception import InvalidCommandException
from executer import Executer


class Command(ABC):
    def __init__(self, name, help_message):
        self.name = name
        self.help_message = help_message

    def parent_command(self):
        return BaseCommand

    def create_parser(self, subparsers):
        self.parser = subparsers.add_parser(
            self.name,
            parents=[self.parent_command()().create_parser(None)],
            help=self.help_message,
        )

        self.parser.set_defaults(func=lambda args: self.parse(args))
        self.setup_parser()

    def setup_parser(self):
        pass

    def parse(self, args):
        self.executer = Executer(self.parent_command().setup_context(args))

        try:
            self.run(args)
        except InvalidCommandException as e:
            self.parser.print_help()
            print("\n\033[91m" + str(e) + "\033[0m")

    @abstractmethod
    def run(self, args):
        pass  # pragma: no cover
