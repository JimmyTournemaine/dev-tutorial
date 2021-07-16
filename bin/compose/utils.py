import os
import sys


class Utils:
    @staticmethod
    def is_tty():
        return os.isatty(sys.stdout.fileno())
