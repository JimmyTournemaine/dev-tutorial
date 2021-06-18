from commands.exception import InvalidCommandException
from executer import Executer, ExecutionContext


class Command:
    def __init__(self, name, help_message):
        self.name = name
        self.help_message = help_message

    def use_common_parser(self):
        return True

    def create_parser(self, subparsers, common_parser):
        self.parser = subparsers.add_parser(
            self.name,
            parents=([common_parser] if self.use_common_parser() else []),
            help=self.help_message,
        )

        self.parser.set_defaults(func=lambda args: self.parse(args))
        self.setup_parser()

    def setup_parser(self):
        pass

    def parse(self, args):
        if self.use_common_parser():
            exec_context = ExecutionContext(args.verbose, args.dry_run)
        else:
            exec_context = ExecutionContext()  # use defaults

        self.executer = Executer(exec_context)

        try:
            self.run(args)
        except InvalidCommandException as e:
            self.parser.print_help()
            print("\n\033[91m" + str(e) + "\033[0m")

    def run(self, args):
        pass
