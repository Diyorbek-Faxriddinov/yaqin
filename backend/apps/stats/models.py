from django.db import models

from apps.businesses.models import Business


class DailyStats(models.Model):
    """Biznes statistikasi — kunlik agregat (Toshkent sanasi). Faqat sonlar: IP, qurilma va
    boshqa shaxsiy maʼlumot saqlanmaydi (maxfiylik siyosati, handoff 7-bo'lim).
    """

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="daily_stats")
    date = models.DateField()
    profile_views = models.PositiveIntegerField(default=0)
    calls = models.PositiveIntegerField(default=0)
    telegram_clicks = models.PositiveIntegerField(default=0)
    direction_clicks = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["business", "date"], name="daily_stats_unique"),
        ]
        indexes = [models.Index(fields=["date"], name="daily_stats_date")]

    def __str__(self) -> str:
        return f"{self.business_id} {self.date}"


class ReportLink(models.Model):
    """Biznes egasi uchun maxfiy hisobot havolasi (ADR-0007). Biznesga bittadan; yangisi eskisini
    almashtiradi. Token (~256 bit) faqat bir marta ko'rsatiladi — bazada SHA-256 xeshi.
    """

    business = models.OneToOneField(Business, on_delete=models.CASCADE, related_name="report_link")
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_viewed_at = models.DateTimeField(null=True, blank=True)
    view_count = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return f"{self.business_id} ({self.created_at:%Y-%m-%d})"
