import uuid

from django.core.exceptions import ValidationError
from django.db import models


class UUIDModel(models.Model):
    """Kontraktdagi barcha ID'lar UUID — ketma-ket raqamlar (ichki hajm) oshkor qilinmaydi."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimestampedModel(UUIDModel):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PlatformSettings(models.Model):
    """Platforma sozlamalari — bitta yozuv (pk=1). Kontraktdagi PlatformSettings."""

    reviews_premoderation = models.BooleanField(
        default=True, help_text="Sharhlar moderatsiyadan keyin chiqadi"
    )
    business_requests_open = models.BooleanField(
        default=True, help_text="“Biznesingizni qoʻshing” formasi soʻrov qabul qiladi"
    )
    contact_telegram = models.CharField(max_length=32, blank=True)
    contact_email = models.EmailField(max_length=120, blank=True)
    contact_phone = models.CharField(max_length=13, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Platforma sozlamalari"
        constraints = [
            models.CheckConstraint(condition=models.Q(id=1), name="platform_settings_singleton"),
        ]

    def __str__(self) -> str:
        return "Platforma sozlamalari"

    def save(self, *args: object, **kwargs: object) -> None:
        if self.pk not in (None, 1):
            raise ValidationError("Sozlamalar faqat bitta yozuv")
        self.pk = 1
        super().save(*args, **kwargs)  # type: ignore[arg-type]

    @classmethod
    def load(cls) -> "PlatformSettings":
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings
