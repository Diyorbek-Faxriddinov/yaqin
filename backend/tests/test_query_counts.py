"""Ro'yxat endpointlarida N+1 yo'q: SQL so'rovlar soni yozuvlar soniga bog'liq emas.

Har bir ro'yxat 2 ta va 6 ta yozuv bilan chaqiriladi — so'rovlar soni bir xil bo'lishi kerak.
"""

from collections.abc import Callable
from typing import Any

import pytest
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext

from apps.businesses.models import Business, BusinessPhoto, BusinessRequest
from apps.community.models import Complaint, Favorite, Review
from apps.staff.audit import audit
from apps.staff.models import AuditEntry, Role
from apps.stats.models import DailyStats
from apps.stats.series import today
from tests.admin_api import AdminClient
from tests.factories import make_admin, make_business, make_item, make_user, publishable
from tests.test_customer_api import Session

pytestmark = pytest.mark.django_db


def add_business(n: int) -> None:
    business = make_business(**publishable(name=f"Biznes {n}"))
    BusinessPhoto.objects.create(business=business, file=f"p{n}.webp", width=10, height=10)
    make_item(business=business)
    user = make_user()
    Review.objects.create(business=business, user=user, rating=4, status="published")
    Complaint.objects.create(business=business, user=user, reason="wrong_info")
    BusinessRequest.objects.create(
        business_name=f"Soʻrov {n}", contact_name="A", phone="+998901112233"
    )
    DailyStats.objects.create(business=business, date=today(), profile_views=n)
    admin = make_admin()
    admin.roles.add(Role.objects.get(name="Moderator"))
    audit(admin, "business.update", AuditEntry.TargetType.BUSINESS, business.id, "x")


def queries(call: Callable[[], Any]) -> int:
    with CaptureQueriesContext(connection) as captured:
        response = call()
    assert response.status_code == 200, response.content
    return len(captured.captured_queries)


ADMIN_LISTS = [
    "/admin/businesses",
    "/admin/reviews",
    "/admin/complaints",
    "/admin/business-requests",
    "/admin/users",
    "/admin/staff",
    "/admin/roles",
    "/admin/categories",
    "/admin/audit",
    "/admin/stats",
]
PUBLIC_LISTS = ["/businesses", "/map/markers", "/categories", "/businesses/biznes-1/reviews"]


@pytest.mark.parametrize("path", ADMIN_LISTS)
def test_admin_list_queries_constant(client: Client, path: str) -> None:
    root = AdminClient(client, make_admin(is_root=True))
    for n in range(2):
        add_business(n)
    small = queries(lambda: root.call("GET", path))
    for n in range(2, 6):
        add_business(n)
    assert queries(lambda: root.call("GET", path)) == small


@pytest.mark.parametrize("path", PUBLIC_LISTS)
def test_public_list_queries_constant(client: Client, path: str) -> None:
    make_business(**publishable(name="Biznes 1", slug="biznes-1"))
    for n in range(2):
        add_business(n)
    small = queries(lambda: client.get(f"/api/v1{path}"))
    for n in range(2, 6):
        add_business(n)
    assert queries(lambda: client.get(f"/api/v1{path}")) == small


def test_favorites_queries_constant(client: Client) -> None:
    session = Session(client)
    for n in range(2):
        add_business(n)

    def favorite_all() -> None:
        for business in Business.objects.filter(status=Business.Status.PUBLISHED):
            Favorite.objects.get_or_create(user=session.user, business=business)

    favorite_all()
    small = queries(lambda: session.request("GET", "/me/favorites"))
    for n in range(2, 6):
        add_business(n)
    favorite_all()
    assert queries(lambda: session.request("GET", "/me/favorites")) == small
