import argparse


class CommonCommand:
    def create_parser(self):
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

        parser.add_argument(
            "-B",
            "--no-browser",
            action="store_false",
            dest="open_browser",
            help="to never open a browser on post actions",
        )

        return parser
