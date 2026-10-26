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
