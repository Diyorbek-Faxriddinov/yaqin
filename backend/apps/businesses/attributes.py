"""Mahsulot xususiyatlari: biznes kategoriyasi ta'rifi (AdminAttribute, JSONB) bo'yicha yoki erkin.

Saqlash (`Item.attributes`):
- erkin — `{"key": slug(nom), "name", "value"}`;
- kategoriya xususiyati — qo'shimcha `"raw"` (xom qiymat: variant qiymatlari, son, "true"/"false").
  `name`/`value` — saqlangan paytdagi o'zbekcha ko'rinish: ta'rif keyin o'chirilsa yoki variant
  olib tashlansa, shu ko'rsatiladi.

Ommaviy javobda kategoriya xususiyatining nomi va qiymati so'ralgan tilda qaytadi.
Frontend mock'idagi `src/mocks/item-attributes.ts` bilan bir xil.
"""

import re
from typing import Any

from apps.core.api import Lang

Attribute = dict[str, Any]

BOOLEAN_LABELS: dict[str, tuple[str, str]] = {"uz": ("Ha", "Yoʻq"), "ru": ("Да", "Нет")}
NUMBER = re.compile(r"^\d{1,9}(?:[.,]\d{1,3})?$")


def definitions(category_attributes: list[Attribute]) -> dict[str, Attribute]:
    return {definition["key"]: definition for definition in category_attributes}


def parse_raw(definition: Attribute, value: str) -> str | None:
    """Kiritilgan qiymat → xom qiymat; turiga mos kelmasa — None."""
    kind = definition["type"]
    if kind == "text":
        return value or None
    if kind == "number":
        return value.replace(",", ".") if NUMBER.match(value) else None
    if kind == "boolean":
        return value if value in ("true", "false") else None
    options = [option["value"] for option in definition["options"]]
    if kind == "select":
        return value if value in options else None
    chosen = {part.strip() for part in value.split(",") if part.strip()}
    if not chosen or not chosen <= set(options):
        return None
    # Ta'rifdagi tartibda, takrorsiz
    return ",".join(option for option in options if option in chosen)


def display(definition: Attribute, raw: str, lang: Lang) -> str:
    kind = definition["type"]
    if kind == "boolean":
        yes, no = BOOLEAN_LABELS[lang]
        return yes if raw == "true" else no
    if kind == "number":
        number = raw.replace(".", ",")
        return f"{number} {definition['unit']}" if definition.get("unit") else number
    if kind in ("select", "multiselect"):
        labels = {option["value"]: option["label"][lang] for option in definition["options"]}
        return ", ".join(labels[value] for value in raw.split(",") if value in labels)
    return raw


def _definition_of(stored: Attribute, known: dict[str, Attribute]) -> Attribute | None:
    """Saqlangan kategoriya xususiyati hozirgi ta'rifga hali mos kelsa — ta'rif."""
    raw = stored.get("raw")
    definition = known.get(stored["key"])
    if raw is None or definition is None or parse_raw(definition, raw) is None:
        return None
    return definition


def public_attributes(
    stored: list[Attribute], known: dict[str, Attribute], lang: Lang
) -> list[Attribute]:
    result = []
    for entry in stored:
        definition = _definition_of(entry, known)
        if definition is None:
            result.append({"key": entry["key"], "name": entry["name"], "value": entry["value"]})
        else:
            result.append(
                {
                    "key": entry["key"],
                    "name": definition["name"][lang],
                    "value": display(definition, entry["raw"], lang),
                }
            )
    return result


def input_values(stored: list[Attribute], known: dict[str, Attribute]) -> list[Attribute]:
    """Tahrirlash formasi uchun (AdminItem.attributeValues)."""
    result = []
    for entry in stored:
        definition = _definition_of(entry, known)
        if definition is None:
            result.append({"key": None, "name": entry["name"], "value": entry["value"]})
        else:
            result.append(
                {"key": entry["key"], "name": definition["name"]["uz"], "value": entry["raw"]}
            )
    return result


def parse_input(
    attributes: list[Any], known: dict[str, Attribute], slugify: Any
) -> tuple[list[Attribute], list[str]]:
    """ItemAttributeInput ro'yxati → saqlanadigan ko'rinish va xatolar."""
    stored: list[Attribute] = []
    problems: list[str] = []
    seen: set[str] = set()
    for raw_entry in attributes:
        key = raw_entry.get("key")
        name = raw_entry["name"].strip() if isinstance(raw_entry.get("name"), str) else ""
        value = raw_entry["value"].strip() if isinstance(raw_entry.get("value"), str) else ""
        if key is None or key == "":
            if name and value:
                stored.append(
                    {"key": slugify(name, fallback="xususiyat"), "name": name, "value": value}
                )
            continue
        definition = known.get(key) if isinstance(key, str) else None
        if definition is None:
            problems.append("Kategoriyada bunday xususiyat yoʻq")
            continue
        if key in seen:
            problems.append(f"{definition['name']['uz']}: takrorlangan")
            continue
        seen.add(key)
        if not value:
            continue
        parsed = parse_raw(definition, value)
        if parsed is None:
            problems.append(f"{definition['name']['uz']}: qiymat notoʻgʻri")
            continue
        stored.append(
            {
                "key": key,
                "name": definition["name"]["uz"],
                "value": display(definition, parsed, "uz"),
                "raw": parsed,
            }
        )
    return stored, problems
