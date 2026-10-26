"""Mijoz kirishi va kabineti. Har bir javob kontraktga qarshi tekshiriladi."""

import json
import time
from datetime import timedelta
from typing import Any
from unittest.mock import patch

import pytest
from django.test import Client, override_settings
from django.utils import timezone
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.models import CustomerSession, User
from apps.accounts.providers import telegram_check_hash
from apps.accounts.sessions import create_session
from apps.businesses.models import Business
from apps.community.models import Complaint, Favorite, Review
from apps.core.models import PlatformSettings
from apps.core.revalidate import _send
from tests.contract import assert_matches_contract
from tests.factories import make_business, make_user, publishable

pytestmark = pytest.mark.django_db

BOT_TOKEN = "123456:test-bot-token"


class Session:
    """Test mijozi: cookie'lar va CSRF sarlavhasi bilan so'rovlar."""

    def __init__(self, client: Client, user: User | None = None) -> None:
        self.client = client
        self.user = user or make_user(display_name="Aziz Karimov")
        token, session = create_session(self.user)
        self.csrf = session.csrf_token
        client.cookies["sessionid"] = token
        client.cookies["csrftoken"] = session.csrf_token

    def request(self, method: str, path: str, body: Any = None, csrf: str | None = None) -> Any:
        token = self.csrf if csrf is None else csrf
        headers = {} if method == "GET" else {"X-CSRFToken": token}
        response = self.client.generic(
            method,
            f"/api/v1{path}",
            data="" if body is None else json.dumps(body),
            content_type="application/json",
            headers=headers,
        )
        assert_matches_contract(response)
        return response


def call(client: Client, method: str, path: str, body: Any = None) -> Any:
    response = client.generic(
        method,
        f"/api/v1{path}",
        data="" if body is None else json.dumps(body),
        content_type="application/json",
    )
    assert_matches_contract(response)
    return response


@pytest.fixture
def business() -> Business:
    return make_business(**publishable(name="Ustoz sartaroshxonasi", slug="ustoz"))


# --- Telegram ---


def telegram_payload(**overrides: Any) -> dict[str, Any]:
    data = {
        "id": 777001,
        "first_name": "Malika",
        "last_name": "Rahimova",
        "username": "malika",
        "auth_date": int(time.time()),
        **overrides,
    }
    data["hash"] = telegram_check_hash(data, BOT_TOKEN)
    return data


@override_settings(TELEGRAM_BOT_TOKEN=BOT_TOKEN)
def test_telegram_login_sets_secure_session_cookies(client: Client) -> None:
    response = call(client, "POST", "/auth/telegram", telegram_payload())
    assert response.status_code == 200
    assert response.json()["displayName"] == "Malika Rahimova"
    assert response.json()["provider"] == "telegram"
    session_cookie = response.cookies["sessionid"]
    assert session_cookie["httponly"]
    assert session_cookie["samesite"] == "Lax"
    assert not response.cookies["csrftoken"]["httponly"]
    # Bazada token emas, faqat xeshi
    assert not CustomerSession.objects.filter(token_hash=session_cookie.value).exists()
    # Qayta kirish — o'sha foydalanuvchi
    call(client, "POST", "/auth/telegram", telegram_payload())
    assert User.objects.filter(provider="telegram", provider_uid="777001").count() == 1


@override_settings(TELEGRAM_BOT_TOKEN=BOT_TOKEN)
@pytest.mark.parametrize(
    "tamper",
    [
        lambda d: {**d, "first_name": "Boshqa"},  # imzodan keyin o'zgartirilgan
        lambda d: {**d, "hash": "0" * 64},
        lambda d: {k: v for k, v in d.items() if k != "hash"},
    ],
)
def test_telegram_rejects_tampered_data(client: Client, tamper: Any) -> None:
    response = call(client, "POST", "/auth/telegram", tamper(telegram_payload()))
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_credentials"
    assert not User.objects.exists()


@override_settings(TELEGRAM_BOT_TOKEN=BOT_TOKEN)
def test_telegram_rejects_expired_auth_date(client: Client) -> None:
    response = call(
        client, "POST", "/auth/telegram", telegram_payload(auth_date=int(time.time()) - 2 * 86400)
    )
    assert response.status_code == 401


@override_settings(TELEGRAM_BOT_TOKEN=BOT_TOKEN)
def test_telegram_ignores_injected_fields(client: Client) -> None:
    # Telegram yubormaydigan maydon imzoga ta'sir qilmaydi va saqlanmaydi
    response = call(client, "POST", "/auth/telegram", {**telegram_payload(), "is_admin": True})
    assert response.status_code == 200


@override_settings(TELEGRAM_BOT_TOKEN="")
def test_telegram_not_configured(client: Client) -> None:
    response = call(client, "POST", "/auth/telegram", telegram_payload())
    assert response.status_code == 401
    assert response.json()["code"] == "provider_unavailable"


@override_settings(TELEGRAM_BOT_TOKEN=BOT_TOKEN)
def test_blocked_user_cannot_log_in(client: Client) -> None:
    make_user(provider="telegram", provider_uid="777001", is_blocked=True, blocked_reason="Spam")
    response = call(client, "POST", "/auth/telegram", telegram_payload())
    assert response.status_code == 403
    assert response.json()["code"] == "account_blocked"
    assert "sessionid" not in response.cookies


# --- Google va demo ---

GOOGLE_CLAIMS = {
    "iss": "https://accounts.google.com",
    "sub": "1098765",
    "email": "aziz@example.com",
    "email_verified": True,
    "name": "Aziz Karimov",
}


@override_settings(GOOGLE_CLIENT_ID="client-id.apps.googleusercontent.com")
def test_google_login_does_not_store_email(client: Client) -> None:
    with patch("apps.accounts.providers._google_verify", return_value=GOOGLE_CLAIMS):
        response = call(client, "POST", "/auth/google", {"credential": "jwt"})
    assert response.status_code == 200
    user = User.objects.get(provider="google", provider_uid="1098765")
    assert "aziz@example.com" not in str(user.__dict__.values())


@override_settings(GOOGLE_CLIENT_ID="client-id.apps.googleusercontent.com")
@pytest.mark.parametrize(
    "verify",
    [
        {"side_effect": ValueError("Token expired")},
        {"return_value": {**GOOGLE_CLAIMS, "email_verified": False}},
        {"return_value": {**GOOGLE_CLAIMS, "iss": "https://evil.example.com"}},
    ],
)
def test_google_rejects_invalid_tokens(client: Client, verify: dict[str, Any]) -> None:
    with patch("apps.accounts.providers._google_verify", **verify):
        response = call(client, "POST", "/auth/google", {"credential": "jwt"})
    assert response.status_code == 401


def test_demo_login_only_when_enabled(client: Client) -> None:
    with override_settings(DEMO_LOGIN_ENABLED=False):
        assert call(client, "POST", "/auth/demo").status_code == 404
    with override_settings(DEMO_LOGIN_ENABLED=True):
        response = call(client, "POST", "/auth/demo")
    assert response.status_code == 200
    assert response.json()["provider"] == "demo"


@pytest.mark.parametrize("provider", ["telegram", "google"])
def test_login_rate_limit(client: Client, monkeypatch: pytest.MonkeyPatch, provider: str) -> None:
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "auth", "2/min")
    statuses = [call(client, "POST", f"/auth/{provider}", {}).status_code for _ in range(3)]
    assert statuses == [401, 401, 429]


# --- Sessiya va CSRF ---


def test_me_requires_session(client: Client) -> None:
    response = call(client, "GET", "/me")
    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"


def test_csrf_double_submit(client: Client) -> None:
    session = Session(client)
    assert session.request("GET", "/me").json()["displayName"] == "Aziz Karimov"
    for wrong in ["", "boshqa-token"]:
        response = session.request("PATCH", "/me", {"displayName": "Yangi"}, csrf=wrong)
        assert response.status_code == 403
        assert response.json()["code"] == "csrf_failed"
    assert session.request("PATCH", "/me", {"displayName": "Yangi ism"}).status_code == 200
    assert session.request("PATCH", "/me", {"displayName": "A"}).status_code == 400


def test_expired_and_blocked_sessions_are_rejected(client: Client) -> None:
    session = Session(client)
    CustomerSession.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
    assert session.request("GET", "/me").status_code == 401
    other = Session(client, make_user(is_blocked=True, blocked_reason="Spam"))
    assert other.request("GET", "/me").status_code == 401


def test_logout(client: Client) -> None:
    session = Session(client)
    response = session.request("POST", "/auth/logout")
    assert response.status_code == 204
    assert response.cookies["sessionid"].value == ""
    assert not CustomerSession.objects.exists()
    # Sessiyasiz ham xato bermaydi
    assert call(Client(), "POST", "/auth/logout").status_code == 204


def test_delete_account(client: Client, business: Business) -> None:
    session = Session(client)
    published = Review.objects.create(
        business=business, user=session.user, rating=5, status="published"
    )
    Review.objects.create(business=make_business(**publishable()), user=session.user, rating=2)
    Complaint.objects.create(business=business, user=session.user, reason="wrong_info")
    Favorite.objects.create(business=business, user=session.user)
    response = session.request("DELETE", "/me")
    assert response.status_code == 204
    assert not User.objects.filter(id=session.user.id).exists()
    published.refresh_from_db()
    assert published.user is None  # chop etilgani muallifsiz qoladi
    assert Review.objects.count() == 1
    assert not Complaint.objects.exists()
    assert not Favorite.objects.exists()
    assert not CustomerSession.objects.exists()


# --- Sevimlilar ---


def test_favorites(client: Client, business: Business) -> None:
    session = Session(client)
    path = f"/me/favorites/{business.id}"
    assert session.request("PUT", path).status_code == 204
    assert session.request("PUT", path).status_code == 204  # takroriy — xato emas
    assert session.request("GET", "/me/favorites/ids").json() == [str(business.id)]
    favorites = session.request("GET", "/me/favorites", None).json()
    assert [f["slug"] for f in favorites] == ["ustoz"]
    draft = make_business()
    assert session.request("PUT", f"/me/favorites/{draft.id}").status_code == 404
    assert session.request("DELETE", path).status_code == 204
    assert session.request("GET", "/me/favorites/ids").json() == []
    assert call(Client(), "GET", "/me/favorites").status_code == 401


# --- Sharhlar ---


def test_review_pending_by_default_and_one_per_user(client: Client, business: Business) -> None:
    assert call(client, "POST", "/businesses/ustoz/reviews", {"rating": 5}).status_code == 401
    session = Session(client)
    response = session.request("POST", "/businesses/ustoz/reviews", {"rating": 5, "text": " Zoʻr "})
    assert response.status_code == 201
    assert response.json()["status"] == "pending"
    assert response.json()["text"] == "Zoʻr"
    business.refresh_from_db()
    assert business.rating_count == 0  # moderatsiyagacha reytingga kirmaydi
    again = session.request("POST", "/businesses/ustoz/reviews", {"rating": 4})
    assert again.status_code == 409
    assert again.json()["code"] == "review_exists"
    assert session.request("POST", "/businesses/ustoz/reviews", {"rating": 6}).status_code == 400


def test_review_published_immediately_without_premoderation(
    client: Client, business: Business, django_capture_on_commit_callbacks: Any
) -> None:
    settings = PlatformSettings.load()
    settings.reviews_premoderation = False
    settings.save()
    session = Session(client)
    with (
        patch("apps.core.revalidate._send") as send,
        django_capture_on_commit_callbacks(execute=True),
    ):
        response = session.request("POST", "/businesses/ustoz/reviews", {"rating": 4})
    assert response.json()["status"] == "published"
    business.refresh_from_db()
    assert (business.rating_count, business.rating_sum) == (1, 4)
    send.assert_called_once_with(["businesses", "business:ustoz", "reviews:ustoz"])


def test_my_reviews_and_delete_updates_rating(client: Client, business: Business) -> None:
    session = Session(client)
    review = Review.objects.create(
        business=business, user=session.user, rating=5, status="published"
    )
    Business.objects.filter(pk=business.pk).update(rating_count=1, rating_sum=5)
    mine = session.request("GET", "/me/reviews").json()
    assert mine[0]["business"] == {"slug": "ustoz", "name": "Ustoz sartaroshxonasi"}
    other = Session(Client())
    assert other.request("DELETE", f"/me/reviews/{review.id}").status_code == 404
    assert session.request("DELETE", f"/me/reviews/{review.id}").status_code == 204
    business.refresh_from_db()
    assert (business.rating_count, business.rating_sum) == (0, 0)


def test_review_rate_limit(client: Client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "reviews", "1/hour")
    session = Session(client)
    for slug in ("a-biznes", "b-biznes"):
        make_business(**publishable(slug=slug))
    assert session.request("POST", "/businesses/a-biznes/reviews", {"rating": 5}).status_code == 201
    assert session.request("POST", "/businesses/b-biznes/reviews", {"rating": 5}).status_code == 429


def test_complaint_rate_limit(
    client: Client, business: Business, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "complaints", "1/hour")
    session = Session(client)
    body = {"businessId": str(business.id), "reason": "wrong_info", "text": None}
    assert session.request("POST", "/complaints", body).status_code == 201
    assert session.request("POST", "/complaints", body).status_code == 429


def test_review_on_draft_business_is_404(client: Client) -> None:
    make_business(slug="qoralama")
    assert (
        Session(client).request("POST", "/businesses/qoralama/reviews", {"rating": 5}).status_code
        == 404
    )


# --- Shikoyatlar ---


def test_complaints(client: Client, business: Business) -> None:
    session = Session(client)
    short = session.request(
        "POST", "/complaints", {"businessId": str(business.id), "reason": "other", "text": "qisqa"}
    )
    assert short.status_code == 400
    assert "text" in short.json()["fields"]
    unknown = session.request(
        "POST", "/complaints", {"businessId": str(make_business().id), "reason": "fraud"}
    )
    assert "businessId" in unknown.json()["fields"]
    created = session.request(
        "POST",
        "/complaints",
        {"businessId": str(business.id), "reason": "wrong_info", "text": None},
    )
    assert created.status_code == 201
    assert created.json()["status"] == "open"
    mine = session.request("GET", "/me/complaints").json()
    assert [c["reason"] for c in mine] == ["wrong_info"]


# --- Frontend keshini yangilash ---


@override_settings(FRONTEND_REVALIDATE_URL="http://frontend/api/revalidate", REVALIDATE_SECRET="s3")
def test_revalidate_webhook_request() -> None:
    with patch("apps.core.revalidate.urllib.request.urlopen") as urlopen:
        _send(["businesses", "business:ustoz"])
    request = urlopen.call_args.args[0]
    assert request.full_url == "http://frontend/api/revalidate"
    assert request.get_header("Authorization") == "Bearer s3"
    assert request.data == b'{"tags": ["businesses", "business:ustoz"]}'
    # Frontend javob bermasa — xato tashlanmaydi (faqat log)
    with patch("apps.core.revalidate.urllib.request.urlopen", side_effect=OSError("timeout")):
        _send(["businesses"])
