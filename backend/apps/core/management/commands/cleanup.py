"""Davriy tozalash — kuniga bir marta (server cron'i yoki systemd timer, 5-bosqich):

    python manage.py cleanup            # o'chiradi
    python manage.py cleanup --dry-run  # faqat sanaydi

- muddati o'tgan mijoz va admin sessiyalari, kirish challenge'lari;
- yopilganiga 12 oy bo'lgan "Biznesingizni qo'shing" so'rovlari (maxfiylik siyosati: ism va
  telefon raqami 12 oy ichida o'chiriladi).
"""

from datetime import timedelta
from typing import Any

from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from apps.accounts.models import CustomerSession
from apps.businesses.models import BusinessRequest
from apps.staff.models import AdminSession, LoginChallenge

REQUEST_RETENTION = timedelta(days=365)


def targets() -> dict[str, QuerySet[Any]]:
    now = timezone.now()
    return {
        "Mijoz sessiyalari": CustomerSession.objects.filter(expires_at__lte=now),
        "Admin sessiyalari": AdminSession.objects.filter(expires_at__lte=now),
        "Kirish challenge'lari": LoginChallenge.objects.filter(expires_at__lte=now),
        "Yopilgan soʻrovlar (12 oy)": BusinessRequest.objects.filter(
            status__in=[BusinessRequest.Status.CONVERTED, BusinessRequest.Status.REJECTED],
            closed_at__lte=now - REQUEST_RETENTION,
        ),
    }


class Command(BaseCommand):
    help = "Muddati o'tgan sessiyalar va eski so'rovlarni o'chiradi"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--dry-run", action="store_true", help="Faqat sanash")

    def handle(self, *args: Any, **options: Any) -> None:
        with transaction.atomic():
            for label, queryset in targets().items():
                count = queryset.count() if options["dry_run"] else queryset.delete()[0]
                self.stdout.write(f"{label}: {count}")
        if options["dry_run"]:
            self.stdout.write("Hech narsa oʻchirilmadi (--dry-run)")
