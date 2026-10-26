"""Production sozlamalari uchun qo'shimcha tekshiruvlar (`manage.py check --deploy`)."""

from typing import Any

from django.conf import settings
from django.core.checks import Tags, Warning, register


@register(Tags.caches, deploy=True)
def shared_cache(app_configs: Any, **kwargs: Any) -> list[Warning]:
    if settings.REDIS_URL:
        return []
    return [
        Warning(
            "REDIS_URL berilmagan — cheklov va bloklash hisoblagichlari har jarayonda alohida.",
            hint="Bir nechta jarayon (gunicorn worker) bo'lsa, Redis majburiy.",
            id="yaqin.W001",
        )
    ]
