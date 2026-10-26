#!/usr/bin/env python
"""Django boshqaruv buyruqlari."""

import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    # Windows konsoli (cp1252) o'zbekcha ʻ ʼ belgilarida yiqilmasin
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
