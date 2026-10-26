"""Frontend keshini yangilash: o'zgarishdan keyin Next.js'ning `POST /api/revalidate` webhook'i.

Teglar — docs/backend-handoff.md (6-bo'lim). Chaqiruv tranzaksiya muvaffaqiyatli yakunlangandan
keyin (on_commit) bajariladi; frontend javob bermasa — log yoziladi, foydalanuvchi so'rovi
buzilmaydi (kesh baribir o'z muddatida yangilanadi).
"""

import json
import logging
import urllib.request

from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)

MAX_TAGS = 50
TIMEOUT_SECONDS = 3


def _send(tags: list[str]) -> None:
    url = settings.FRONTEND_REVALIDATE_URL
    secret = settings.REVALIDATE_SECRET
    if not url or not secret:
        return
    request = urllib.request.Request(  # noqa: S310 — manzil sozlamadan (http/https), foydalanuvchidan emas
        url,
        data=json.dumps({"tags": tags[:MAX_TAGS]}).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {secret}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS):  # noqa: S310
            pass
    except OSError:
        logger.warning("Frontend keshini yangilab boʻlmadi: %s", tags, exc_info=True)


def revalidate(*tags: str) -> None:
    unique = list(dict.fromkeys(tags))
    if unique:
        transaction.on_commit(lambda: _send(unique))
