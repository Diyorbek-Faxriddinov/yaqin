"""Administratorlar, rollar, admin sessiyalari va audit jurnali (ADR-0006, ADR-0009).

Mijozlardan (accounts.User) butunlay alohida: boshqa kirish usuli (parol + TOTP), alohida sessiya
cookie'si va ruxsatlar. django.contrib.auth ishlatilmaydi.
"""

from django.contrib.postgres.fields import ArrayField
from django.db import models

from apps.core.models import UUIDModel
from apps.staff.permissions import ALL_PERMISSIONS, Permission

USERNAME_PATTERN = r"^[a-z][a-z0-9_.-]{2,31}$"


def permission_array() -> "ArrayField[list[str], list[str]]":
    return ArrayField(
        models.CharField(max_length=32, choices=Permission.choices), default=list, blank=True
    )


class Role(UUIDModel):
    """Ruxsatlar to'plami. Tizim rollari (`is_built_in`) o'chirilmaydi, ruxsatlari tahrirlanadi."""

    name = models.CharField(max_length=60, unique=True)
    description = models.CharField(max_length=200, blank=True)
    permissions = permission_array()
    is_built_in = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "name"]

    def __str__(self) -> str:
        return self.name


class AdminUser(UUIDModel):
    """Administrator. Root — bitta, barcha ruxsatlarga ega; faqat `createroot` buyrug'i bilan.

    - Parol — Argon2 xeshi (Django hashers).
    - TOTP kaliti — Fernet bilan shifrlangan (`apps/staff/totp.py`); bo'sh — hali sozlanmagan
      (keyingi kirishda `next: setup`).
    - `must_change_password` — vaqtinchalik parol berilgan (yangi admin yoki parol tiklangan).
    - Administratorlar o'chirilmaydi, faqat o'chiriladi (`is_active`): audit jurnali ularga bog'liq.
    """

    username = models.CharField(max_length=32, unique=True)
    display_name = models.CharField(max_length=60)
    password_hash = models.CharField(max_length=256)
    is_root = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    must_change_password = models.BooleanField(default=True)
    totp_secret = models.CharField(max_length=256, blank=True)
    # Oxirgi qabul qilingan TOTP vaqt qadami — bir kodni qayta ishlatib bo'lmaydi
    totp_last_step = models.BigIntegerField(null=True, blank=True)
    roles = models.ManyToManyField(Role, related_name="admins", blank=True)
    extra_permissions = permission_array()
    created_at = models.DateTimeField(auto_now_add=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["is_root"], condition=models.Q(is_root=True), name="admin_single_root"
            ),
            models.CheckConstraint(
                condition=models.Q(username__regex=USERNAME_PATTERN), name="admin_username_format"
            ),
            # Root'ni o'chirib (bloklab) bo'lmaydi — tizim boshqaruvsiz qolmasligi uchun
            models.CheckConstraint(
                condition=models.Q(is_root=False) | models.Q(is_active=True),
                name="admin_root_active",
            ),
        ]

    def __str__(self) -> str:
        return self.username

    @property
    def is_authenticated(self) -> bool:
        """DRF (cheklovlar, ruxsatlar) uchun."""
        return True

    def permissions(self) -> list[str]:
        """Amaldagi ruxsatlar (rollar + alohida), kontraktdagi tartibda. Root — hammasi."""
        if self.is_root:
            return list(ALL_PERMISSIONS)
        granted = set(self.extra_permissions)
        for role in self.roles.all():
            granted.update(role.permissions)
        return [p for p in ALL_PERMISSIONS if p in granted]

    def has_permission(self, permission: str) -> bool:
        return permission in self.permissions()


class AdminSession(models.Model):
    """Admin sessiyasi (8 soat). Token bazada faqat SHA-256 xeshi ko'rinishida."""

    token_hash = models.CharField(max_length=64, unique=True)
    admin = models.ForeignKey(AdminUser, on_delete=models.CASCADE, related_name="sessions")
    csrf_token = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)

    def __str__(self) -> str:
        return f"{self.admin} ({self.created_at:%Y-%m-%d %H:%M})"


class LoginChallenge(models.Model):
    """Parol to'g'ri kiritilgandan keyingi oraliq holat (5 daqiqa): 2FA kodi yoki birinchi sozlash.

    Sozlashda yangi parol va TOTP kaliti shu yerda kutadi va faqat to'g'ri kod kiritilgach
    administratorga yoziladi — jarayon yarim yo'lda qolsa, akkaunt o'zgarmaydi.
    """

    class Next(models.TextChoices):
        TOTP = "totp"
        SETUP = "setup"

    token_hash = models.CharField(max_length=64, unique=True)
    admin = models.ForeignKey(AdminUser, on_delete=models.CASCADE, related_name="challenges")
    next = models.CharField(max_length=8, choices=Next.choices)
    pending_password_hash = models.CharField(max_length=256, blank=True)
    pending_totp_secret = models.CharField(max_length=256, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField(db_index=True)

    def __str__(self) -> str:
        return f"{self.admin} → {self.next}"


class AuditEntry(UUIDModel):
    """Audit jurnali — faqat qo'shiladi: o'zgartirish va o'chirish bazada trigger bilan taqiqlangan
    (migratsiya 0002). Maxfiy qiymatlar (parollar, tokenlar) `summary` ga yozilmaydi.
    """

    class TargetType(models.TextChoices):
        AUTH = "auth"
        BUSINESS = "business"
        ITEM = "item"
        PHOTO = "photo"
        REVIEW = "review"
        COMPLAINT = "complaint"
        CATEGORY = "category"
        REQUEST = "request"
        USER = "user"
        ADMIN = "admin"
        ROLE = "role"
        SETTINGS = "settings"
        REPORT = "report"

    at = models.DateTimeField(auto_now_add=True, db_index=True)
    admin = models.ForeignKey(
        AdminUser, on_delete=models.PROTECT, null=True, blank=True, related_name="audit_entries"
    )
    action = models.CharField(max_length=48)
    target_type = models.CharField(max_length=16, choices=TargetType.choices)
    target_id = models.CharField(max_length=64)
    summary = models.CharField(max_length=300)

    class Meta:
        ordering = ["-at"]
        indexes = [models.Index(fields=["target_type", "target_id"])]

    def __str__(self) -> str:
        return f"{self.at:%Y-%m-%d %H:%M} {self.action}"
