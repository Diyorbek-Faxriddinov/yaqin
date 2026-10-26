import pytest
from django.contrib.gis.geos import Point
from django.db import connection
from django.http import JsonResponse
from django.test import RequestFactory
from rest_framework import exceptions, serializers

from apps.core.exceptions import api_exception_handler
from tests.contract import assert_matches_contract, contract


def test_contract_is_valid_openapi() -> None:
    # Spetsifikatsiya OpenAPI 3.1 sifatida yuklanadi va tekshiriladi
    assert contract().spec["info"]["title"] == "Yaqin API"


class _Sample(serializers.Serializer[dict[str, object]]):
    name = serializers.CharField(min_length=2)
    address = serializers.DictField(child=serializers.CharField(max_length=3))


def test_validation_errors_use_contract_error_shape() -> None:
    serializer = _Sample(data={"name": "a", "address": {"text": "uzun matn"}})
    assert not serializer.is_valid()
    response = api_exception_handler(exceptions.ValidationError(serializer.errors), {})
    assert response is not None
    assert response.status_code == 400
    assert response.data["code"] == "validation_error"
    assert set(response.data["fields"]) == {"name", "address.text"}


@pytest.mark.parametrize(
    ("exc", "status", "code"),
    [
        (exceptions.NotAuthenticated(), 401, "not_authenticated"),
        (exceptions.PermissionDenied(), 403, "permission_denied"),
        (exceptions.NotFound(), 404, "not_found"),
        (exceptions.Throttled(wait=30), 429, "too_many_attempts"),
    ],
)
def test_known_errors_have_stable_codes(
    exc: exceptions.APIException, status: int, code: str
) -> None:
    response = api_exception_handler(exc, {})
    assert response is not None
    assert response.status_code == status
    assert response.data["code"] == code
    assert set(response.data) == {"code", "message"}


@pytest.mark.django_db
def test_postgis_and_search_extensions_available() -> None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT extname FROM pg_extension")
        extensions = {row[0] for row in cursor.fetchall()}
    assert {"postgis", "pg_trgm", "unaccent"} <= extensions


def test_geodjango_libraries_load() -> None:
    # GDAL/GEOS (Windows'da PostGIS DLL'lari) — masofa hisoblari uchun
    tashkent = Point(69.2797, 41.3111, srid=4326)
    chorsu = Point(69.2342, 41.3264, srid=4326)
    assert tashkent.distance(chorsu) > 0


def test_contract_check_rejects_mismatching_response() -> None:
    # Himoya to'ri ishlayotganini isbotlash: sxemaga zid javob testni yiqitadi
    response = JsonResponse({"status": "balki", "database": "ok"})
    response.wsgi_request = RequestFactory().get("/api/v1/health")  # type: ignore[attr-defined]
    with pytest.raises(Exception, match=r"(?i)invalid|valid"):
        assert_matches_contract(response)
