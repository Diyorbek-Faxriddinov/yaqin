"""Mijoz kirishi (Telegram, Google, demo) va profil (`/me`)."""

import secrets
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.authentication import (
    CustomerSessionAuthentication,
    IsCustomer,
    check_csrf,
    customer,
)
from apps.accounts.models import User
from apps.accounts.providers import Profile, verify_google, verify_telegram
from apps.accounts.sessions import (
    SESSION_COOKIE,
    clear_session_cookies,
    create_session,
    end_all_sessions,
    find_session,
    set_session_cookies,
)
from apps.community.models import Review
from apps.core.api import ApiError, not_found
from apps.staff.sessions import admin_csrf_token


def me_payload(user: User) -> dict[str, Any]:
    return {
        "id": str(user.id),
        "displayName": user.display_name,
        "avatarUrl": user.avatar_url or None,
        "provider": user.provider,
        "createdAt": user.created_at.isoformat(),
    }


def login(request: Request, profile: Profile) -> Response:
    """Provayder hisobi bo'yicha foydalanuvchini topadi yoki yaratadi va sessiya ochadi."""
    user, _created = User.objects.get_or_create(
        provider=profile.provider,
        provider_uid=profile.uid,
        defaults={"display_name": profile.display_name, "avatar_url": profile.avatar_url},
    )
    if user.is_blocked:
        raise ApiError(403, "account_blocked", "Akkauntingiz bloklangan")
    # Ism foydalanuvchi o'zgartirgan bo'lishi mumkin — faqat rasm yangilanadi
    user.avatar_url = profile.avatar_url or user.avatar_url
    user.last_login_at = timezone.now()
    user.save(update_fields=["avatar_url", "last_login_at"])
    token, session = create_session(user, admin_csrf_token(request))
    response = Response(me_payload(user))
    set_session_cookies(response, token, session.csrf_token)
    return response


class LoginThrottled(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class TelegramLoginView(LoginThrottled):
    def post(self, request: Request) -> Response:
        data = request.data if isinstance(request.data, dict) else {}
        return login(request, verify_telegram(data))


class GoogleInput(serializers.Serializer[dict[str, str]]):
    credential = serializers.CharField(max_length=4096)


class GoogleLoginView(LoginThrottled):
    def post(self, request: Request) -> Response:
        data = GoogleInput(data=request.data)
        if not data.is_valid():
            raise ApiError(401, "invalid_credentials", "Kirish maʼlumotlari tasdiqlanmadi")
        return login(request, verify_google(data.validated_data["credential"]))


class DemoLoginView(LoginThrottled):
    """Faqat ishlab chiqish va integratsiya sinovlari uchun; productionda yo'q (404)."""

    def post(self, request: Request) -> Response:
        if not settings.DEMO_LOGIN_ENABLED:
            raise not_found()
        uid = secrets.token_hex(8)
        return login(
            request,
            Profile(provider="demo", uid=uid, display_name="Demo foydalanuvchi", avatar_url=""),
        )


class LogoutView(APIView):
    def post(self, request: Request) -> Response:
        # Sessiya bo'lsa CSRF talab qilinadi; bo'lmasa — shunchaki cookie'lar tozalanadi
        session = find_session(request.COOKIES.get(SESSION_COOKIE))
        if session is not None:
            check_csrf(request, session.csrf_token)
            session.delete()
        response = Response(status=204)
        clear_session_cookies(response, keep_csrf=admin_csrf_token(request) is not None)
        return response


class MeInput(serializers.Serializer[dict[str, str]]):
    displayName = serializers.CharField(min_length=2, max_length=40, trim_whitespace=True)


class MeView(APIView):
    authentication_classes = [CustomerSessionAuthentication]
    permission_classes = [IsCustomer]

    def get(self, request: Request) -> Response:
        return Response(me_payload(customer(request)))

    def patch(self, request: Request) -> Response:
        data = MeInput(data=request.data)
        data.is_valid(raise_exception=True)
        user = customer(request)
        user.display_name = data.validated_data["displayName"]
        user.save(update_fields=["display_name"])
        return Response(me_payload(user))

    def delete(self, request: Request) -> Response:
        """Kontrakt: shaxsiy maʼlumotlar o'chiriladi, chop etilgan sharhlar muallifsiz qoladi
        (FK SET NULL); moderatsiyadagi va rad etilgan sharhlar, shikoyat va sevimlilar o'chadi.
        """
        user = customer(request)
        with transaction.atomic():
            Review.objects.filter(user=user).exclude(status=Review.Status.PUBLISHED).delete()
            end_all_sessions(user)
            user.delete()
        response = Response(status=204)
        clear_session_cookies(response, keep_csrf=admin_csrf_token(request) is not None)
        return response
