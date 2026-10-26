"""Admin API testlari uchun: sessiya + CSRF bilan so'rovlar, har bir javob kontraktga qarshi."""

import json
from typing import Any

from django.test import Client

from apps.staff.models import AdminUser, Role
from apps.staff.sessions import create_admin_session
from tests.contract import assert_matches_contract
from tests.factories import make_admin


class AdminClient:
    def __init__(self, client: Client, admin: AdminUser) -> None:
        self.client = client
        self.admin = admin
        token, session = create_admin_session(admin)
        self.csrf = session.csrf_token
        client.cookies["adminsessionid"] = token
        client.cookies["csrftoken"] = session.csrf_token

    def call(self, method: str, path: str, body: Any = None) -> Any:
        headers = {} if method == "GET" else {"X-CSRFToken": self.csrf}
        response = self.client.generic(
            method,
            f"/api/v1{path}",
            data="" if body is None else json.dumps(body),
            content_type="application/json",
            headers=headers,
        )
        assert_matches_contract(response)
        return response

    def upload(self, path: str, data: dict[str, Any]) -> Any:
        response = self.client.post(f"/api/v1{path}", data, headers={"X-CSRFToken": self.csrf})
        assert_matches_contract(response)
        return response


def admin_with(
    client: Client, *, roles: tuple[str, ...] = (), extra: tuple[str, ...] = ()
) -> AdminClient:
    admin = make_admin(extra_permissions=list(extra))
    for name in roles:
        admin.roles.add(Role.objects.get(name=name))
    return AdminClient(client, admin)
