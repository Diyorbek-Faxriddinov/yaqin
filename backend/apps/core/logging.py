"""Loglarda URL query string yozilmaydi: unda foydalanuvchi joylashuvi (`lat`, `lng`) bo'lishi
mumkin — maxfiylik siyosati joylashuvni saqlamaslikni vaʼda qiladi.
"""

import logging
import re

_QUERY = re.compile(r"\?\S*")


class StripQueryStringFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, tuple):
            record.args = tuple(
                _QUERY.sub("", arg) if isinstance(arg, str) else arg for arg in record.args
            )
        if isinstance(record.msg, str):
            record.msg = _QUERY.sub("", record.msg)
        return True
