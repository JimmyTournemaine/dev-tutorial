from commands.abstract import Command


class PruneCommand(Command):
    def __init__(self):
        super().__init__(
            "prune",
            "Remove all unused images, networks, containers, volumes and build caches from your docker system",
        )

    def setup_parser(self):
        self.parser.add_argument(
            "-f",
            "--force",
            action="store_true",
            help="Do not prompt for confirmation",
        )

    def run(self, args):
        self.executer.run(
            "docker system prune --all --volumes" + (" --force" if args.force else "")
        )
