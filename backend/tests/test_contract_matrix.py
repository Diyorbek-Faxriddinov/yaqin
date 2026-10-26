"""Kontraktdan avtomatik yaratiladigan xavfsizlik matritsasi — har bir operatsiya uchun:

- kirishni talab qiladigan endpoint sessiyasiz — 401;
- admin endpoint ruxsatsiz administratorga — 403 (ADR-0009: ruxsat backendda tekshiriladi);
- o'zgartiruvchi so'rov begona saytdan (`Origin`) — 403 `origin_denied`;
- mavjud bo'lmagan obyekt — 404;
- ro'yxatlarda noto'g'ri sahifa raqami — 400.

Yangi endpoint kontraktga qo'shilsa, u avtomatik shu tekshiruvlarga tushadi.
"""

import json
import re
from typing import Any

import pytest
from django.test import Client

from tests.admin_api import AdminClient
from tests.contract import assert_matches_contract, operations
from tests.factories import make_admin

pytestmark = pytest.mark.django_db

MISSING = "00000000-0000-4000-a000-000000000000"
SAMPLE = {"slug": "yoq-biznes", "item": "yoq-mahsulot", "token": "y" * 43}
# Sessiyasiz ham ishlaydigan, lekin 401 e'lon qilingan operatsiyalar (masalan, kirish xatosi)
AUTH_FLOW = {"/admin/auth/login", "/admin/auth/2fa", "/admin/auth/setup"}
PUBLIC_401 = {("POST", "/auth/telegram"), ("POST", "/auth/google")}
# Har qanday kirgan administrator uchun ochiq
ANY_ADMIN = {("GET", "/admin/me"), ("POST", "/admin/auth/logout")}
# 404 ga yetish uchun tekshiruvdan o'tadigan tana kerak bo'lganlar
VALID_BODY: dict[tuple[str, str], Any] = {
    ("PATCH", "/admin/reviews/{reviewId}"): {"status": "published"},
    ("PATCH", "/admin/complaints/{complaintId}"): {"status": "in_review"},
    ("PATCH", "/admin/business-requests/{requestId}"): {"status": "contacted"},
    ("POST", "/admin/business-requests/{requestId}/convert"): {
        "name": "Yangi biznes",
        "categorySlug": "sartaroshxonalar",
        "districtSlug": "chilonzor",
    },
    ("PATCH", "/admin/users/{userId}"): {"isBlocked": False},
    ("PATCH", "/admin/roles/{roleId}"): {
        "name": "Rol",
        "description": None,
        "permissions": ["stats.view"],
    },
    ("PATCH", "/admin/categories/{categoryId}"): {},
    ("PUT", "/admin/categories/{categoryId}/attributes"): {"attributes": []},
    ("PUT", "/admin/businesses/{businessId}/items/{itemId}"): {},
    ("PUT", "/admin/businesses/{businessId}/photos/order"): {"photoIds": []},
}


def concrete(path: str) -> str:
    return "/api/v1" + re.sub(r"\{(\w+)\}", lambda m: SAMPLE.get(str(m.group(1)), MISSING), path)


def send(client: Client, method: str, path: str, body: Any = None, **headers: str) -> Any:
    response = client.generic(
        method,
        concrete(path),
        data=json.dumps({} if body is None else body),
        content_type="application/json",
        headers=headers,
    )
    assert_matches_contract(response)
    return response


def ops(predicate: Any) -> list[tuple[str, str]]:
    return sorted(op for op, codes in operations().items() if predicate(op, codes))


def op_id(op: tuple[str, str]) -> str:
    return f"{op[0]} {op[1]}"


@pytest.mark.parametrize(
    "op",
    ops(lambda op, codes: 401 in codes and op[1] not in AUTH_FLOW and op not in PUBLIC_401),
    ids=op_id,
)
def test_requires_session(client: Client, op: tuple[str, str]) -> None:
    method, path = op
    response = send(client, method, path)
    assert response.status_code == 401, response.content


@pytest.mark.parametrize(
    "op",
    ops(
        lambda op, codes: (
            op[1].startswith("/admin/")
            and 403 in codes
            and op not in ANY_ADMIN
            and op[1] not in AUTH_FLOW
        )
    ),
    ids=op_id,
)
def test_admin_without_permission(client: Client, op: tuple[str, str]) -> None:
    admin = AdminClient(client, make_admin())  # hech qanday rol va ruxsat yo'q
    method, path = op
    response = send(client, method, path, VALID_BODY.get(op), **_csrf(admin, method))
    assert response.status_code == 403, response.content
    assert response.json()["code"] in {"permission_denied", "root_required"}


@pytest.mark.parametrize("op", ops(lambda op, codes: op[0] != "GET" and 403 in codes), ids=op_id)
def test_foreign_origin_rejected(client: Client, op: tuple[str, str]) -> None:
    method, path = op
    response = send(client, method, path, Origin="https://yomon.example")
    assert response.status_code == 403
    assert response.json()["code"] == "origin_denied"


@pytest.mark.parametrize(
    "op",
    ops(lambda op, codes: op[1].startswith("/admin/") and 404 in codes and "{" in op[1]),
    ids=op_id,
)
def test_missing_object(client: Client, op: tuple[str, str]) -> None:
    root = AdminClient(client, make_admin(is_root=True))
    method, path = op
    response = send(client, method, path, VALID_BODY.get(op), **_csrf(root, method))
    assert response.status_code == 404, response.content


@pytest.mark.parametrize(
    "op",
    ops(lambda op, codes: op[0] == "GET" and op[1].startswith("/admin/") and 400 in codes),
    ids=op_id,
)
def test_list_rejects_bad_page(client: Client, op: tuple[str, str]) -> None:
    root = AdminClient(client, make_admin(is_root=True))
    method, path = op
    query = "?days=5" if path.endswith("/stats") else "?page=0"
    response = client.get(concrete(path) + query, headers=_csrf(root, method))
    assert_matches_contract(response)
    assert response.status_code == 400, response.content


def _csrf(admin: AdminClient, method: str) -> dict[str, str]:
    return {} if method == "GET" else {"X-CSRFToken": admin.csrf}
