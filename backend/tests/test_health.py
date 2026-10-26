from unittest.mock import patch

import pytest
from django.db import DatabaseError
from django.test import Client

from tests.contract import assert_matches_contract


@pytest.mark.django_db
def test_health_ok(client: Client) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
    assert_matches_contract(response)


@pytest.mark.django_db
def test_health_reports_database_failure_without_details(client: Client) -> None:
    with patch("apps.core.views.connection.cursor", side_effect=DatabaseError("parol notoʻgʻri")):
        response = client.get("/api/v1/health")
    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "error"}
    assert "parol" not in response.content.decode()
    assert_matches_contract(response)


@pytest.mark.django_db
def test_security_headers(client: Client) -> None:
    response = client.get("/api/v1/health")
    assert response["X-Content-Type-Options"] == "nosniff"
    assert response["X-Frame-Options"] == "DENY"


@pytest.mark.django_db
def test_unknown_url_returns_json_error(client: Client) -> None:
    response = client.get("/api/v1/bunday-manzil-yoq")
    assert response.status_code == 404
    assert response.json() == {"code": "not_found", "message": "Topilmadi"}
