"""Biznes kabineti (ADR-0015): egalik, taklif havolasi, egalar takliflari va ularning rasmlari."""

import uuid

from django.db import models

from apps.accounts.models import User
from apps.businesses.models import Business, Item
from apps.core.models import TimestampedModel, UUIDModel
from apps.staff.models import AdminUser

MAX_OWNERS = 3


class BusinessMembership(TimestampedModel):
    """Foydalanuvchi + biznes + rol (ADR-0009). Hozircha bitta rol — ega. Bekor qilinganda
    yozuv o'chiriladi (tarix audit jurnalida).
    """

    class Role(models.TextChoices):
        OWNER = "owner"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.OWNER)
    invited_by = models.ForeignKey(
        AdminUser, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "business"], name="membership_user_business")
        ]

    def __str__(self) -> str:
        return f"{self.user_id} → {self.business_id}"


class OwnerInvite(models.Model):
    """Egaga bir martalik taklif havolasi (7 kun). Biznesga bittadan — yangisi eskisini
    almashtiradi; qabul qilinganda o'chiriladi. Token (~256 bit) bazada faqat SHA-256 xeshi.
    """

    business = models.OneToOneField(Business, on_delete=models.CASCADE, related_name="owner_invite")
    token_hash = models.CharField(max_length=64, unique=True)
    created_by = models.ForeignKey(
        AdminUser, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)

    def __str__(self) -> str:
        return f"{self.business_id} (→ {self.expires_at:%Y-%m-%d})"


class BusinessChange(TimestampedModel):
    """Egasining o'zgarish taklifi. Biznes faqat moderator tasdiqlaganda o'zgaradi.

    - `target` — bir nishon uchun faqat oxirgi taklif kutadi: "profile", "photos", "item:<id>";
      yangi mahsulot taklifi har doim alohida ("new:<taklif id>").
    - `payload` — tekshirilgan va normallashtirilgan taklif (admin API kirish shaklida).
    - `before` — taklif yuborilgan paytdagi qiymatlar (shu shaklda): moderator "oldin / hozir /
      taklif" ni ko'radi, "oldin" va "hozir" farq qilsa — ziddiyat.
    - `fields` — o'zgargan maydonlar kalitlari (kontraktdagi `ChangeField.field`).
    """

    class Kind(models.TextChoices):
        PROFILE = "profile"
        ITEM_CREATE = "item.create"
        ITEM_UPDATE = "item.update"
        ITEM_DELETE = "item.delete"
        PHOTOS = "photos"

    class Status(models.TextChoices):
        PENDING = "pending"
        APPROVED = "approved"
        REJECTED = "rejected"
        WITHDRAWN = "withdrawn"
        SUPERSEDED = "superseded"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="changes")
    # Akkaunt o'chirilsa ham taklif tarixi qoladi (muallifsiz)
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="business_changes"
    )
    kind = models.CharField(max_length=16, choices=Kind.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    item = models.ForeignKey(
        Item, on_delete=models.SET_NULL, null=True, blank=True, related_name="changes"
    )
    target = models.CharField(max_length=64)
    payload = models.JSONField(default=dict)
    before = models.JSONField(default=dict)
    fields = models.JSONField(default=list)
    important = models.BooleanField(default=False)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        AdminUser, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    rejection_reason = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["business", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.kind} ({self.status})"


def pending_upload_to(instance: "ChangeUpload", filename: str) -> str:
    # Tasodifiy nom: papka ochiq emas (Caddy yopadi), lekin nom taxmin qilinmasin ham
    return f"pending/{uuid.uuid4().hex}.webp"


class ChangeUpload(UUIDModel):
    """Taklif uchun yuklangan rasm — ochiq saytda ko'rinmaydi (`pending/`, Caddy yopiq). Tasdiqda
    biznes yoki mahsulot rasmiga ko'chiriladi; aks holda fayli bilan o'chiriladi.
    """

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="change_uploads")
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    change = models.ForeignKey(
        BusinessChange, on_delete=models.SET_NULL, null=True, blank=True, related_name="uploads"
    )
    file = models.FileField(upload_to=pending_upload_to, max_length=200)
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self) -> str:
        return str(self.file.name)
