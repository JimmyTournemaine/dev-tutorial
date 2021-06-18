import os

from commands.abstract import Command
from deployer import DeployerFactory, DeployerPlaybookCommandBuilder


class LintCommand(Command):
    def __init__(self):
        super().__init__("lint", "Build and run a ready-to-use environment")

    def setup_parser(self):
        self.parser.add_argument(
            "-f",
            "--fix",
            action="store_true",
            help="fix issues that can be automatically fixed",
        )
        self.parser.add_argument(
            "-c",
            "--cleanup",
            action="store_true",
            help="cleanup reports before linting",
        )
        self.parser.add_argument(
            "--languages",
            nargs="+",
            default=[],
            help="linters to use (default: from .mega-linter.yml)",
        )
        self.parser.add_argument(
            "-l",
            "--linters",
            nargs="+",
            default=[],
            help="linters to use (default: from .mega-linter.yml)",
        )

    def run(self, args):
        deployer = DeployerFactory().create(self.executer)

        if args.cleanup:
            deployer.run(
                DeployerPlaybookCommandBuilder()
                .add_playbook("quality_check")
                .add_tag("cleanup")
            )

        # Deployer run builder
        builder = (
            DeployerPlaybookCommandBuilder()
            .add_playbook("quality_check")
            .add_extra_var("code_check_github_token", os.environ.get("GITHUB_TOKEN"))
        )

        if args.fix:
            builder.add_extra_var("code_check_apply_fixes", "yes")

        if args.linters:
            builder.add_extra_var("code_check_enable_linters", ",".join(args.linters))

        if args.languages:
            builder.add_extra_var(
                "code_check_enable_languages", ",".join(args.languages)
            )

        deployer.run(builder)
