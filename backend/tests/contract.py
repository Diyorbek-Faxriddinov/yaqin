"""API javoblarini `docs/api/openapi.yaml` kontraktiga qarshi tekshirish.

Har bir endpoint testi javobni shu yerdan o'tkazadi: status kodi kontraktda e'lon qilinganmi,
tanasi sxemaga mosmi. Kontrakt — frontend va backend uchun yagona manba (ADR-0004 yangilanishi).
"""

from functools import cache

from django.conf import settings
from django.http.response import HttpResponse, HttpResponseBase
from openapi_core import OpenAPI
from openapi_core.contrib.django import DjangoOpenAPIRequest, DjangoOpenAPIResponse


@cache
def contract() -> OpenAPI:
    # Fayl ochilganda spetsifikatsiyaning o'zi ham OpenAPI 3.1 standartiga qarshi tekshiriladi
    return OpenAPI.from_file_path(str(settings.OPENAPI_CONTRACT))


def assert_matches_contract(response: HttpResponseBase) -> None:
    """Javob (va uni keltirib chiqargan so'rov) kontraktga mos — aks holda tushunarli xato."""
    if not isinstance(response, HttpResponse):
        raise TypeError("Faqat oddiy (streaming bo'lmagan) javoblar tekshiriladi")
    request = response.wsgi_request  # type: ignore[attr-defined]
    contract().validate_response(DjangoOpenAPIRequest(request), DjangoOpenAPIResponse(response))
