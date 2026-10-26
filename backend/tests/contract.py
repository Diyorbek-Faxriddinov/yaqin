"""API javoblarini `docs/api/openapi.yaml` kontraktiga qarshi tekshirish.

Har bir endpoint testi javobni shu yerdan o'tkazadi: status kodi kontraktda e'lon qilinganmi,
tanasi sxemaga mosmi. Kontrakt — frontend va backend uchun yagona manba (ADR-0004 yangilanishi).

Tekshirilgan javoblar (usul, kontraktdagi yo'l, status) yozib boriladi — to'liq test to'plami
oxirida kontraktdagi har bir operatsiya kamida bir marta tekshirilganmi, ko'riladi (conftest.py).
"""

import re
from functools import cache

import yaml
from django.conf import settings
from django.http.response import HttpResponse, HttpResponseBase
from openapi_core import OpenAPI
from openapi_core.contrib.django import DjangoOpenAPIRequest, DjangoOpenAPIResponse

API_PREFIX = "/api/v1"
METHODS = ("get", "post", "put", "patch", "delete")

# (USUL, kontraktdagi yo'l, status) — test to'plami davomida tekshirilganlar
SEEN: set[tuple[str, str, int]] = set()


@cache
def contract() -> OpenAPI:
    # Fayl ochilganda spetsifikatsiyaning o'zi ham OpenAPI 3.1 standartiga qarshi tekshiriladi
    return OpenAPI.from_file_path(str(settings.OPENAPI_CONTRACT))


@cache
def operations() -> dict[tuple[str, str], set[int]]:
    """Kontraktdagi barcha operatsiyalar: (USUL, yo'l) → e'lon qilingan status kodlari."""
    spec = yaml.safe_load(settings.OPENAPI_CONTRACT.read_text(encoding="utf-8"))
    result: dict[tuple[str, str], set[int]] = {}
    for path, item in spec["paths"].items():
        for method in METHODS:
            if method in item:
                result[(method.upper(), path)] = {int(code) for code in item[method]["responses"]}
    return result


@cache
def _patterns() -> list[tuple[re.Pattern[str], str]]:
    paths = {path for _, path in operations()}
    # Aniq yo'l parametrli yo'ldan oldin (/admin/businesses/stats emas, lekin umumiy holat uchun)
    ordered = sorted(paths, key=lambda p: (p.count("{"), -len(p)))
    return [
        (re.compile("^" + re.sub(r"\\\{\w+\\\}", "[^/]+", re.escape(p)) + "$"), p) for p in ordered
    ]


def contract_path(url_path: str) -> str | None:
    path = url_path.removeprefix(API_PREFIX)
    return next((template for pattern, template in _patterns() if pattern.match(path)), None)


def assert_matches_contract(response: HttpResponseBase) -> None:
    """Javob (va uni keltirib chiqargan so'rov) kontraktga mos — aks holda tushunarli xato."""
    if not isinstance(response, HttpResponse):
        raise TypeError("Faqat oddiy (streaming bo'lmagan) javoblar tekshiriladi")
    request = response.wsgi_request  # type: ignore[attr-defined]
    contract().validate_response(DjangoOpenAPIRequest(request), DjangoOpenAPIResponse(response))
    template = contract_path(request.path)
    if template is not None:
        SEEN.add((request.method, template, response.status_code))
