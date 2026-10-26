"""Atomar ruxsatlar (ADR-0009) — kontraktdagi AdminPermission enum'i bilan bir xil (testda)."""

from django.db import models


class Permission(models.TextChoices):
    BUSINESS_VIEW = "business.view"
    BUSINESS_EDIT = "business.edit"
    BUSINESS_PUBLISH = "business.publish"
    CATEGORY_MANAGE = "category.manage"
    REVIEW_MODERATE = "review.moderate"
    COMPLAINT_MANAGE = "complaint.manage"
    USER_VIEW = "user.view"
    USER_MANAGE = "user.manage"
    STAFF_MANAGE = "staff.manage"
    AUDIT_VIEW = "audit.view"
    SETTINGS_MANAGE = "settings.manage"
    STATS_VIEW = "stats.view"


ALL_PERMISSIONS: tuple[str, ...] = tuple(Permission.values)

# Tizim rollari (frontend mock'idagi bilan bir xil) — data migratsiyada yaratiladi
BUILT_IN_ROLES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    (
        "Moderator",
        "Sharhlar va shikoyatlar, foydalanuvchilarni koʻrish",
        ("review.moderate", "complaint.manage", "user.view"),
    ),
    (
        "Kontent menejeri",
        "Bizneslarni qoʻshish, tahrirlash va eʼlon qilish, kategoriyalar",
        ("business.view", "business.edit", "business.publish", "category.manage"),
    ),
    (
        "Tahlilchi",
        "Statistika va audit jurnali (faqat koʻrish)",
        ("business.view", "stats.view", "audit.view"),
    ),
)
