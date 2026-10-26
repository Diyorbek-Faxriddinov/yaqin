"""Statistika (platforma va biznes) va egasi uchun hisobot havolasi."""

from datetime import timedelta
from typing import Any

import pytest
from django.test import Client
from django.utils import timezone

from apps.businesses.models import Business, BusinessRequest
from apps.community.models import Review
from apps.staff.models import AuditEntry
from apps.stats.models import DailyStats, ReportLink
from apps.stats.series import today
from tests.admin_api import AdminClient, admin_with
from tests.contract import assert_matches_contract
from tests.factories import make_admin, make_business, make_user, publishable

pytestmark = pytest.mark.django_db


@pytest.fixture
def root(client: Client) -> AdminClient:
    return AdminClient(client, make_admin(is_root=True))


@pytest.fixture
def ustoz() -> Business:
    return make_business(**publishable(name="Ustoz", slug="ustoz"))


def stats(business: Business, days_ago: int, **counts: int) -> None:
    DailyStats.objects.create(business=business, date=today() - timedelta(days=days_ago), **counts)


def public(client: Client, path: str) -> Any:
    response = client.get(f"/api/v1{path}")
    assert_matches_contract(response)
    return response


# --- Statistika ---


def test_business_series_fills_empty_days(root: AdminClient, ustoz: Business) -> None:
    stats(ustoz, 0, profile_views=5, calls=1)
    stats(ustoz, 6, profile_views=2, direction_clicks=3)
    stats(ustoz, 7, profile_views=100)  # 7 kunlik davrdan tashqarida
    body = root.call("GET", f"/admin/businesses/{ustoz.id}/stats?days=7").json()
    assert body["days"] == 7
    assert len(body["daily"]) == 7
    assert body["to"] == today().isoformat()
    assert body["daily"][0] == {
        "date": body["from"],
        "profileViews": 2,
        "calls": 0,
        "telegramClicks": 0,
        "directionClicks": 3,
    }
    assert body["totals"] == {
        "profileViews": 7,
        "calls": 1,
        "telegramClicks": 0,
        "directionClicks": 3,
    }
    assert root.call("GET", f"/admin/businesses/{ustoz.id}/stats?days=14").status_code == 400
    assert len(root.call("GET", f"/admin/businesses/{ustoz.id}/stats").json()["daily"]) == 30


def test_platform_stats(root: AdminClient, client: Client, ustoz: Business) -> None:
    other = make_business(**publishable(name="Tandir"))
    draft = make_business(name="Qoralama")
    stats(ustoz, 1, profile_views=10, calls=2, telegram_clicks=1)
    stats(other, 1, profile_views=30)
    stats(draft, 1, profile_views=999)  # qoralama hisoblanmaydi
    Review.objects.create(business=ustoz, user=make_user(), rating=5)
    old = BusinessRequest.objects.create(
        business_name="Eski", contact_name="A", phone="+998901112233"
    )
    BusinessRequest.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=40))

    body = root.call("GET", "/admin/stats").json()
    assert body["totals"]["profileViews"] == 40
    assert [(t["business"]["slug"], t["profileViews"]) for t in body["topBusinesses"]] == [
        (other.slug, 30),
        ("ustoz", 10),
    ]
    assert body["topBusinesses"][1]["contactClicks"] == 3
    assert body["content"] == {
        "publishedBusinesses": 2,
        "newBusinesses": 3,
        "newReviews": 1,
        "newComplaints": 0,
        "newRequests": 0,
    }
    assert admin_with(client, roles=("Moderator",)).call("GET", "/admin/stats").status_code == 403
    assert admin_with(client, roles=("Tahlilchi",)).call("GET", "/admin/stats").status_code == 200


def test_events_feed_statistics(root: AdminClient, client: Client, ustoz: Business) -> None:
    for event in ("profile_view", "profile_view", "call_click"):
        response = client.post(
            "/api/v1/events",
            {"type": event, "businessId": str(ustoz.id)},
            content_type="application/json",
        )
        assert response.status_code == 202
    totals = root.call("GET", f"/admin/businesses/{ustoz.id}/stats?days=7").json()["totals"]
    assert (totals["profileViews"], totals["calls"]) == (2, 1)


# --- Hisobot havolasi ---


def test_report_link_lifecycle(root: AdminClient, client: Client, ustoz: Business) -> None:
    url = f"/admin/businesses/{ustoz.id}/report-link"
    assert root.call("GET", url).json() == {
        "active": False,
        "createdAt": None,
        "lastViewedAt": None,
        "viewCount": 0,
    }
    created = root.call("POST", url).json()
    token = created["token"]
    assert len(token) >= 43
    assert created["status"]["active"] is True
    link = ReportLink.objects.get(business=ustoz)
    assert token not in link.token_hash  # faqat xeshi saqlanadi

    stats(ustoz, 0, profile_views=4)
    response = public(client, f"/reports/{token}?lang=ru")
    assert response.status_code == 200
    assert response["Cache-Control"] == "no-store"
    assert response["Referrer-Policy"] == "no-referrer"
    report = response.json()
    assert report["business"]["name"] == "Ustoz"
    assert report["business"]["isPublished"] is True
    assert report["days"] == 30
    assert report["totals"]["profileViews"] == 4
    status = root.call("GET", url).json()
    assert status["viewCount"] == 1
    assert status["lastViewedAt"] is not None

    # Yangi havola eskisini bekor qiladi
    new_token = root.call("POST", url).json()["token"]
    assert public(client, f"/reports/{token}").status_code == 404
    assert public(client, f"/reports/{new_token}").status_code == 200
    assert root.call("DELETE", url).status_code == 204
    assert public(client, f"/reports/{new_token}").status_code == 404
    assert root.call("DELETE", url).status_code == 404
    actions = list(AuditEntry.objects.values_list("action", flat=True))
    assert actions.count("report.create") == 2
    assert "report.revoke" in actions


def test_report_link_permissions(client: Client, ustoz: Business) -> None:
    analyst = admin_with(client, roles=("Tahlilchi",))
    url = f"/admin/businesses/{ustoz.id}/report-link"
    assert analyst.call("GET", url).status_code == 200
    assert analyst.call("POST", url).status_code == 403


@pytest.mark.parametrize("token", ["qisqa", "a" * 43, "../../etc/passwd" + "a" * 30])
def test_unknown_report(client: Client, token: str) -> None:
    response = client.get(f"/api/v1/reports/{token}")
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_report_throttled(client: Client) -> None:
    codes = {public(client, f"/reports/{'b' * 43}").status_code for _ in range(31)}
    assert codes == {404, 429}
