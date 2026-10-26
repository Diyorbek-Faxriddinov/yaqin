from django.db import models

from apps.core.models import UUIDModel


class User(UUIDModel):
    """Mijoz: Telegram yoki Google orqali kiradi (ADR-0006). Parol yo'q.

    Administratorlar — alohida model (3.5): boshqa kirish usuli, alohida sessiya va ruxsatlar.
    Kontakt maʼlumotlari (telefon, email) saqlanmaydi — maxfiylik siyosati.
    """

    class Provider(models.TextChoices):
        TELEGRAM = "telegram"
        GOOGLE = "google"
        # Faqat ishlab chiqish va integratsiya sinovlari uchun (DEMO_LOGIN_ENABLED);
        # productionda o'chiq
        DEMO = "demo"

    provider = models.CharField(max_length=16, choices=Provider.choices)
    provider_uid = models.CharField(max_length=64, help_text="Provayderdagi hisob identifikatori")
    display_name = models.CharField(max_length=40)
    avatar_url = models.URLField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    is_blocked = models.BooleanField(default=False)
    blocked_reason = models.CharField(max_length=200, blank=True)
    blocked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["provider", "provider_uid"], name="user_provider_uid"),
            models.CheckConstraint(
                condition=models.Q(is_blocked=False) | ~models.Q(blocked_reason=""),
                name="user_blocked_has_reason",
            ),
        ]

    def __str__(self) -> str:
        return self.display_name

    @property
    def is_authenticated(self) -> bool:
        """DRF (cheklovlar, ruxsatlar) uchun: haqiqiy foydalanuvchi doim autentifikatsiyalangan."""
        return True


class CustomerSession(models.Model):
    """Mijoz sessiyasi (ADR-0012). Token bazada faqat SHA-256 xeshi ko'rinishida — baza sizib
    chiqsa ham sessiyani o'g'irlab bo'lmaydi. CSRF tokeni sessiyaga bog'langan (double-submit).
    """

    token_hash = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    csrf_token = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)

    def __str__(self) -> str:
        return f"{self.user} ({self.created_at:%Y-%m-%d})"
