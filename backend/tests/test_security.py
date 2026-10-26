"""Xavfsizlik va texnik xizmat: Origin tekshiruvi, loglarda query string yo'q, davriy tozalash,
production tekshiruvlari.
"""

import io
import logging
from datetime import timedelta
from typing import Any

import pytest
from django.core.checks import run_checks
from django.core.management import call_command
from django.test import Client, override_settings
from django.utils import timezone

from apps.accounts.models import CustomerSession
from apps.accounts.sessions import create_session
from apps.businesses.models import BusinessRequest
from apps.core.logging import StripQueryStringFilter
from apps.staff.models import AdminSession, LoginChallenge
from apps.staff.sessions import create_admin_session, create_challenge
from tests.contract import assert_matches_contract
from tests.factories import make_admin, make_business, make_user, publishable

pytestmark = pytest.mark.django_db


# --- Origin ---


def post(client: Client, path: str, body: Any, origin: str | None) -> Any:
    headers = {"Origin": origin} if origin else {}
    response = client.post(f"/api/v1{path}", body, content_type="application/json", headers=headers)
    assert_matches_contract(response)
    return response


@pytest.mark.parametrize(
    ("origin", "status"),
    [("https://yomon.example", 403), ("null", 403), ("http://localhost:3000", 202), (None, 202)],
)
def test_origin_check_on_guest_post(client: Client, origin: str | None, status: int) -> None:
    business = make_business(**publishable())
    response = post(
        client, "/events", {"type": "profile_view", "businessId": str(business.id)}, origin
    )
    assert response.status_code == status
    if status == 403:
        assert response.json()["code"] == "origin_denied"


def test_origin_check_on_admin_login(client: Client) -> None:
    body = {"username": "root", "password": "x"}
    response = post(client, "/admin/auth/login", body, "https://yomon.example")
    assert response.status_code == 403
    # O'qish so'rovlari tekshirilmaydi
    response = client.get("/api/v1/health", headers={"Origin": "https://yomon.example"})
    assert response.status_code == 200


@override_settings(ALLOWED_ORIGINS=["https://yaqin.uz"])
def test_origin_list_from_settings(client: Client) -> None:
    body = {"username": "root", "password": "x"}
    assert post(client, "/admin/auth/login", body, "https://yaqin.uz").status_code == 401
    assert post(client, "/admin/auth/login", body, "http://localhost:3000").status_code == 403


# --- Sarlavhalar ---


def test_api_security_headers(client: Client) -> None:
    for path in ("/api/v1/health", "/api/v1/yoq-yol"):
        response = client.get(path)
        assert response["Content-Security-Policy"] == "default-src 'none'; frame-ancestors 'none'"
        assert response["Cross-Origin-Resource-Policy"] == "same-origin"
        assert response["X-Content-Type-Options"] == "nosniff"
        assert response["X-Frame-Options"] == "DENY"


# --- Loglar ---


def test_query_string_removed_from_logs() -> None:
    record = logging.LogRecord(
        "django.server",
        logging.INFO,
        __file__,
        1,
        '"%s" %s %s',
        ("GET /api/v1/businesses?lat=41.31&lng=69.24 HTTP/1.1", "200", "512"),
        None,
    )
    assert StripQueryStringFilter().filter(record)
    assert record.getMessage() == '"GET /api/v1/businesses HTTP/1.1" 200 512'


# --- Davriy tozalash ---


def test_cleanup_command() -> None:
    create_session(make_user())  # muddati o'tadi (pastda)
    create_session(make_user())  # amal qiladi
    CustomerSession.objects.exclude(
        pk__in=CustomerSession.objects.order_by("-created_at")[:1]
    ).update(expires_at=timezone.now() - timedelta(seconds=1))
    admin = make_admin()
    create_admin_session(admin)
    AdminSession.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
    create_challenge(admin)
    LoginChallenge.objects.update(expires_at=timezone.now() - timedelta(seconds=1))

    old = timezone.now() - timedelta(days=366)
    stale = BusinessRequest.objects.create(
        business_name="Eski",
        contact_name="A",
        phone="+998901112233",
        status="rejected",
        admin_note="Rad",
        closed_at=old,
    )
    fresh = BusinessRequest.objects.create(
        business_name="Yangi",
        contact_name="B",
        phone="+998901112244",
        status="rejected",
        admin_note="Rad",
        closed_at=timezone.now(),
    )
    open_old = BusinessRequest.objects.create(
        business_name="Ochiq", contact_name="C", phone="+998901112255"
    )
    BusinessRequest.objects.filter(pk=open_old.pk).update(created_at=old)

    dry = io.StringIO()
    call_command("cleanup", dry_run=True, stdout=dry)
    assert "Yopilgan soʻrovlar (12 oy): 1" in dry.getvalue()
    assert BusinessRequest.objects.filter(pk=stale.pk).exists()

    out = io.StringIO()
    call_command("cleanup", stdout=out)
    assert "Mijoz sessiyalari: 1" in out.getvalue()
    assert CustomerSession.objects.count() == 1
    assert not AdminSession.objects.exists()
    assert not LoginChallenge.objects.exists()
    remaining = set(BusinessRequest.objects.values_list("pk", flat=True))
    # Ochiq so'rov (qancha eski bo'lmasin) va yaqinda yopilgani qoladi
    assert remaining == {fresh.pk, open_old.pk}


# --- Production tekshiruvlari ---


def test_deploy_check_warns_without_redis(settings: Any) -> None:
    settings.REDIS_URL = ""
    ids = {message.id for message in run_checks(include_deployment_checks=True)}
    assert "yaqin.W001" in ids
    settings.REDIS_URL = "redis://localhost:6379/0"
    ids = {message.id for message in run_checks(include_deployment_checks=True)}
    assert "yaqin.W001" not in ids
