"""URL slug'lari: biznes (butun platformada noyob) va mahsulot (biznes ichida noyob).

Mock'dagi `slugify` bilan bir xil asos (kichik lotin harflari, raqam, tire), qo'shimcha ravishda
kirill yozuvi lotinga o'giriladi — ruscha nomli biznes "biznes-7" bo'lib qolmasligi uchun.
"""

import re
from uuid import UUID

from apps.businesses.models import Business, Item

_CYRILLIC = dict(
    zip(
        "абвгдеёжзийклмнопрстуфхцчшщъыьэюяўқғҳ",
        [
            "a", "b", "v", "g", "d", "e", "yo", "j", "z", "i", "y", "k", "l", "m", "n", "o", "p",
            "r", "s", "t", "u", "f", "x", "ts", "ch", "sh", "sh", "", "i", "", "e", "yu", "ya",
            "o", "q", "g", "h",
        ],
        strict=True,
    )
)  # fmt: skip
_APOSTROPHES = re.compile(r"[ʻʼ'`‘’]")
_NON_SLUG = re.compile(r"[^a-z0-9]+")


def slugify(name: str, fallback: str = "biznes") -> str:
    text = "".join(_CYRILLIC.get(char, char) for char in name.lower())
    slug = _NON_SLUG.sub("-", _APOSTROPHES.sub("", text)).strip("-")
    return slug[:120].rstrip("-") or fallback


def unique_business_slug(name: str, exclude_id: UUID | None = None) -> str:
    base = slugify(name)
    others = Business.objects.filter(slug__startswith=base)
    if exclude_id is not None:
        others = others.exclude(pk=exclude_id)
    taken = set(others.values_list("slug", flat=True))
    slug, n = base, 2
    while slug in taken:
        slug, n = f"{base}-{n}", n + 1
    return slug


def unique_item_slug(business: Business, name: str) -> str:
    base = slugify(name, fallback="mahsulot")
    taken = set(
        Item.objects.filter(business=business, slug__startswith=base).values_list("slug", flat=True)
    )
    slug, n = base, 2
    while slug in taken:
        slug, n = f"{base}-{n}", n + 1
    return slug
