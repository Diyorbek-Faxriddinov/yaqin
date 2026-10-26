"""O'zgartiruvchi API so'rovlari faqat ruxsat etilgan saytlardan (handoff, 2-bo'lim).

Mehmon uchun ochiq POST'lar (`/events`, `/business-requests`, kirish endpointlari) sessiyasiz —
CSRF tokeni yo'q. Ularni boshqa sayt brauzer orqali yubora olmasligi uchun `Origin` sarlavhasi
tekshiriladi. Sarlavha bo'lmasa (brauzer emas: curl, server) — o'tkaziladi: bunday klient
foydalanuvchining cookie'larini ishlata olmaydi. Sessiyali so'rovlarda CSRF ham tekshiriladi.
"""

from collections.abc import Callable

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


class OriginCheckMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if request.method not in SAFE_METHODS and request.path.startswith("/api/"):
            origin = request.headers.get("Origin")
            if origin is not None and origin not in settings.ALLOWED_ORIGINS:
                return JsonResponse(
                    {
                        "code": "origin_denied",
                        "message": "Soʻrov ruxsat etilmagan saytdan yuborildi",
                    },
                    status=403,
                )
        return self.get_response(request)
