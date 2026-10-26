"""Qidiruv uchun matn normalizatsiyasi — frontenddagi `src/lib/text/normalize.ts` bilan bir xil.

- kichik harflar;
- o'zbek va rus kirill → lotin (ҳ → h, ў → o, ғ → g, ...);
- barcha apostrof turlari (ʻ ‘ ’ ' ` ʼ) olib tashlanadi: "doʻkon", "do'kon", "dokon" — bir xil;
- harf va raqamdan boshqa belgilar bo'shliqqa, ortiqcha bo'shliqlar qisqartiriladi.

Ikkala tomondagi test holatlari bir xil (tests/test_text.py ↔ normalize.test.ts) — ADR-0010.
"""

import re

CYRILLIC_TO_LATIN = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "ғ": "g",
    "д": "d",
    "е": "e",
    "ё": "yo",
    "ж": "j",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "қ": "q",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ў": "o",
    "ф": "f",
    "х": "x",
    "ҳ": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sh",
    "ъ": "",
    "ы": "i",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}

_APOSTROPHES = re.compile(r"['`ʻʼ‘’´]")
# \w Python'da harf, raqam va "_" — JavaScript'dagi [^\p{L}\p{N}] bilan bir xil
# bo'lishi uchun "_" ham ajratuvchi
_NON_WORD = re.compile(r"[\W_]+")


def normalize_for_search(text: str) -> str:
    latin = "".join(CYRILLIC_TO_LATIN.get(char, char) for char in text.lower())
    return _NON_WORD.sub(" ", _APOSTROPHES.sub("", latin)).strip()
