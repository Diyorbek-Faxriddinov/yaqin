import pytest

from apps.core.text import normalize_for_search


# frontend/src/lib/text/normalize.test.ts bilan bir xil holatlar —
# ikkala tomon bir xil ishlashi shart
@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Doʻkon", "dokon"),
        ("Do'kon", "dokon"),
        ("Do‘kon", "dokon"),
        ("Do`kon", "dokon"),
        ("Дўкон", "dokon"),
        ("Сартарошхона", "sartaroshxona"),
        ("Ҳаммом", "hammom"),
        ("Ғишт", "gisht"),
        ("Парикмахерская", "parikmaxerskaya"),
        ("  Mirzo   Ulugʻbek  ", "mirzo ulugbek"),
        ("Kafe «Baraka»", "kafe baraka"),
    ],
)
def test_normalize_matches_frontend(text: str, expected: str) -> None:
    assert normalize_for_search(text) == expected


def test_underscore_is_a_separator_like_in_javascript() -> None:
    assert normalize_for_search("kafe_baraka") == "kafe baraka"
