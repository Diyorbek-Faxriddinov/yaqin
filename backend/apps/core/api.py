"""API qatlami uchun umumiy yordamchilar: til, sahifalash, pul, kontraktdagi xatolar."""

from collections.abc import Sequence
from typing import Any, Literal

from django.db.models import QuerySet
from rest_framework import serializers, status
from rest_framework.exceptions import APIException
from rest_framework.request import Request

Lang = Literal["uz", "ru"]

MAX_PAGE_SIZE = 50


class ApiError(APIException):
    """Kontraktdagi aniq `code` bilan xato (masalan, 409 review_exists, 403 requests_closed)."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        fields: dict[str, list[str]] | None = None,
    ) -> None:
        super().__init__(detail=message, code=code)
        self.status_code = status_code
        self.error_code = code
        self.message = message
        self.fields = fields

    def payload(self) -> dict[str, Any]:
        body: dict[str, Any] = {"code": self.error_code, "message": self.message}
        if self.fields:
            body["fields"] = self.fields
        return body


def not_found() -> ApiError:
    return ApiError(status.HTTP_404_NOT_FOUND, "not_found", "Topilmadi")


def lang_of(request: Request) -> Lang:
    """`lang` parametri: ru — ruscha, qolgan barcha holatlar — o'zbekcha (standart)."""
    return "ru" if request.query_params.get("lang") == "ru" else "uz"


class PageParams(serializers.Serializer[dict[str, int]]):
    page = serializers.IntegerField(min_value=1, default=1)
    pageSize = serializers.IntegerField(min_value=1, max_value=MAX_PAGE_SIZE, default=20)


def page_params(request: Request) -> tuple[int, int]:
    params = PageParams(data=request.query_params)
    params.is_valid(raise_exception=True)
    return params.validated_data["page"], params.validated_data["pageSize"]


def page_slice[T](items: QuerySet[Any, T] | Sequence[T], page: int, page_size: int) -> list[T]:
    start = (page - 1) * page_size
    return list(items[start : start + page_size])


def money(amount: int | None) -> dict[str, Any] | None:
    """Tiyin → kontraktdagi Money (ADR-0010)."""
    return None if amount is None else {"amount": amount, "currency": "UZS"}
