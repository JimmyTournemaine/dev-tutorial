#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from datetime import datetime

from command import CommandManager


def main(argv):
    manager = CommandManager()
    manager.create_parsers()

    start_time = datetime.now()
    manager.run(argv)
    end_time = datetime.now()

    print(f"Done in {end_time - start_time}")


if __name__ == "__main__":
    main(sys.argv[1:])  # pragma: no cover
