"""Telefon raqamlari — frontenddagi `normalizeUzPhone` bilan bir xil qoidalar."""

import re

_NON_DIGIT = re.compile(r"\D")


def normalize_uz_phone(value: str) -> str | None:
    """Raqamni E.164 ga keltiradi: "90 123 45 67", "+998 (90) 123-45-67" → "+998901234567".

    O'zbekiston raqami bo'lmasa — None.
    """
    digits = _NON_DIGIT.sub("", value)
    if len(digits) == 12 and digits.startswith("998"):
        return f"+{digits}"
    if len(digits) == 9:
        return f"+998{digits}"
    return None
