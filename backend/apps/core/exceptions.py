"""Barcha API xatolari kontraktdagi `Error` sxemasida: {code, message, fields?}.

Frontend (`BrowserApiError`) `code` bo'yicha ishlaydi, `message` foydalanuvchiga ko'rsatiladi,
`fields` — forma maydonlariga bog'lanadi.
"""

from typing import Any

from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

# DRF istisnosi → (code, o'zbekcha xabar). Til bo'yicha xabarlar (lang=ru) keyingi qadamlarda.
_KNOWN: dict[type[exceptions.APIException], tuple[str, str]] = {
    exceptions.NotAuthenticated: ("not_authenticated", "Avval tizimga kiring"),
    exceptions.AuthenticationFailed: ("not_authenticated", "Avval tizimga kiring"),
    exceptions.PermissionDenied: ("permission_denied", "Bu amal uchun ruxsatingiz yoʻq"),
    exceptions.NotFound: ("not_found", "Topilmadi"),
    exceptions.MethodNotAllowed: ("method_not_allowed", "Bu usul qoʻllab-quvvatlanmaydi"),
    exceptions.UnsupportedMediaType: ("unsupported_media_type", "Maʼlumot formati notoʻgʻri"),
    exceptions.ParseError: ("validation_error", "Soʻrov maʼlumotlari notoʻgʻri"),
    exceptions.Throttled: (
        "too_many_attempts",
        "Juda koʻp urinish. Keyinroq qayta urinib koʻring.",
    ),
}


def _flatten(detail: Any) -> dict[str, list[str]]:
    """DRF ValidationError tafsilotlari → {"maydon": ["xabar", ...]}."""
    if isinstance(detail, dict):
        fields: dict[str, list[str]] = {}
        for key, value in detail.items():
            if isinstance(value, dict):
                for nested_key, messages in _flatten(value).items():
                    fields[f"{key}.{nested_key}"] = messages
            else:
                items = value if isinstance(value, list) else [value]
                fields[str(key)] = [str(item) for item in items]
        return fields
    items = detail if isinstance(detail, list) else [detail]
    return {"non_field_errors": [str(item) for item in items]}


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    response = exception_handler(exc, context)
    if response is None:
        # Kutilmagan xato — Django 500 qaytaradi va loglaydi (tafsilotlar foydalanuvchiga chiqmaydi)
        return None

    if isinstance(exc, exceptions.ValidationError):
        response.data = {
            "code": "validation_error",
            "message": "Maʼlumotlar notoʻgʻri",
            "fields": _flatten(exc.detail),
        }
        response.status_code = status.HTTP_400_BAD_REQUEST
        return response

    code, message = next(
        (value for cls, value in _KNOWN.items() if isinstance(exc, cls)),
        ("error", "Soʻrovni bajarib boʻlmadi"),
    )
    response.data = {"code": code, "message": message}
    return response
