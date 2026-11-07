"""Qidiruv matnini qayta yig'ish: matn qoidasi o'zgargach, joylashdan keyin bir marta.

python manage.py rebuild_search
"""

from typing import Any

from django.core.management.base import BaseCommand

from apps.businesses.models import Business, Item


class Command(BaseCommand):
    help = "Mahsulot va bizneslarning qidiruv matnini qayta yig'adi"

    def handle(self, *args: Any, **options: Any) -> None:
        items = list(Item.objects.all())
        for item in items:
            item.search_text = item.build_search_text()
        Item.objects.bulk_update(items, ["search_text"], batch_size=500)

        businesses = list(Business.objects.select_related("category__parent", "district"))
        for business in businesses:
            business.search_text = business.build_search_text()
        Business.objects.bulk_update(businesses, ["search_text"], batch_size=500)
        self.stdout.write(f"Mahsulotlar: {len(items)}, bizneslar: {len(businesses)}")
