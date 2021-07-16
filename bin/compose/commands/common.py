import argparse

from executer import DeployerExecutionContext, ExecutionContext


class BaseCommand:
    def create_parser(self, _):
        parser = argparse.ArgumentParser(add_help=False)

        parser.add_argument(
            "-d",
            "--dry-run",
            action="store_true",
            help="output every action but don't run them",
        )

        parser.add_argument(
            "-v", "--verbose", action="store_true", help="make actions more verbose"
        )

        return parser

    @staticmethod
    def setup_context(args):
        return ExecutionContext(args.verbose, args.dry_run)


class BaseDeployerCommand(BaseCommand):
    def create_parser(self, _):
        parser = super().create_parser(_)

        parser.add_argument(
            "--no-build",
            action="store_false",
            dest="deployer_build",
            help="to not build the deployer from sources",
        )

        return parser

    @staticmethod
    def setup_context(args):
        return DeployerExecutionContext(args.verbose, args.dry_run, args.deployer_build)
