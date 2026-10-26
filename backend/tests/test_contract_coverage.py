"""Kontraktdagi har bir endpoint backendda bor (route mavjud) — yo'qlari aniq ro'yxatda."""

import re

import yaml
from django.conf import settings
from django.urls import Resolver404, resolve

# Hali bajarilmagan (qadam bilan) — ro'yxat bo'shaguncha 3.9 yakunlanmaydi
PENDING = {
    "/admin/stats": "3.8",
    "/admin/businesses/{businessId}/stats": "3.8",
    "/admin/businesses/{businessId}/report-link": "3.8",
    "/reports/{token}": "3.8",
}
SAMPLE = {
    "slug": "ustoz",
    "item": "soch-olish",
    "token": "a" * 43,
}
UUID = "00000000-0000-4000-a000-000000000000"


def contract_paths() -> list[str]:
    spec = yaml.safe_load(settings.OPENAPI_CONTRACT.read_text(encoding="utf-8"))
    return list(spec["paths"])


def concrete(path: str) -> str:
    return "/api/v1" + re.sub(r"\{(\w+)\}", lambda m: SAMPLE.get(str(m.group(1)), UUID), path)


def test_every_contract_path_is_routed() -> None:
    missing = []
    for path in contract_paths():
        if path in PENDING:
            continue
        try:
            resolve(concrete(path))
        except Resolver404:
            missing.append(path)
    assert missing == []


def test_pending_list_is_current() -> None:
    """Bajarilgan endpoint PENDING'da qolib ketmasin."""
    done = []
    for path in PENDING:
        try:
            resolve(concrete(path))
            done.append(path)
        except Resolver404:
            pass
    assert done == []
