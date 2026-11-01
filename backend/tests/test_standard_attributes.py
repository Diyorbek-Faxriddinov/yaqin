"""Standart kategoriya xususiyatlari (catalog 0003 migratsiyasi, 5.2a)."""

import importlib
import json
from typing import Any

import pytest
from django.conf import settings

from apps.catalog.admin_views import parse_attributes
from apps.catalog.models import Category

pytestmark = pytest.mark.django_db

STANDARD: dict[str, list[dict[str, Any]]] = importlib.import_module(
    "apps.catalog.migrations.0003_standard_attributes"
).STANDARD


def test_migration_filled_categories() -> None:
    for slug, attributes in STANDARD.items():
        assert Category.objects.get(slug=slug).attributes == attributes, slug


def test_standard_set_follows_admin_rules() -> None:
    # Admin panel orqali saqlanganidek: kalit, ikki tildagi nom, 2–30 variant, birlik faqat sonda
    for slug, attributes in STANDARD.items():
        assert parse_attributes(attributes) == attributes, slug


def test_only_leaf_categories() -> None:
    leaves = set(Category.objects.filter(parent__isnull=False).values_list("slug", flat=True))
    assert set(STANDARD) <= leaves


def test_demo_data_uses_same_set() -> None:
    # Mock (demo rejim) va backend bir xil xususiyatlar bilan ishlaydi:
    # frontend/src/mocks/fixtures/standard-attributes.json → scripts/export-demo-data.ts
    demo = json.loads((settings.BASE_DIR / "demo" / "demo-data.json").read_text(encoding="utf-8"))
    assert demo["categoryAttributes"] == STANDARD


def test_does_not_override_admin_changes() -> None:
    migration = importlib.import_module("apps.catalog.migrations.0003_standard_attributes")
    category = Category.objects.get(slug="poyabzal")
    custom = [{**STANDARD["poyabzal"][1], "key": "brend"}]
    category.attributes = custom
    category.save(update_fields=["attributes"])

    class Apps:
        @staticmethod
        def get_model(app: str, model: str) -> type[Category]:
            return Category

    migration.fill(Apps, None)
    category.refresh_from_db()
    assert category.attributes == custom
