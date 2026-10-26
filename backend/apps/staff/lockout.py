"""Parol tanlashga qarshi bloklash (admin kirishi).

- IP + login juftligi: 15 daqiqada 5 ta xato — shu juftlik 15 daqiqaga bloklanadi.
- Faqat login (turli IP'lardan taqsimlangan urinishlar): 15 daqiqada 20 ta xato — bloklanadi.
  Bu chegara yuqoriroq: begona odam haqiqiy adminni osongina bloklab qo'ya olmasligi uchun.
- Hisoblagichlar keshda (productionda Redis — 3.8); muvaffaqiyatli kirish juftlikni tozalaydi.
"""

import hashlib

from django.core.cache import cache

WINDOW_SECONDS = 15 * 60
MAX_PER_PAIR = 5
MAX_PER_USERNAME = 20


def _key(*parts: str) -> str:
    # Login matni kesh kalitiga to'g'ridan-to'g'ri tushmaydi (uzunlik, belgilar)
    digest = hashlib.sha256("\0".join(parts).encode()).hexdigest()
    return f"admin-lockout:{digest}"


def _keys(ip: str, username: str) -> tuple[str, str]:
    return _key("pair", ip, username), _key("user", username)


def is_locked(ip: str, username: str) -> bool:
    pair, user = _keys(ip, username)
    return int(cache.get(pair, 0)) >= MAX_PER_PAIR or int(cache.get(user, 0)) >= MAX_PER_USERNAME


def register_failure(ip: str, username: str) -> None:
    for key in _keys(ip, username):
        # add — faqat yo'q bo'lsa (oyna birinchi xatodan boshlanadi), keyin atomar oshirish
        cache.add(key, 0, WINDOW_SECONDS)
        try:
            cache.incr(key)
        except ValueError:  # oraliqda muddati tugagan
            cache.set(key, 1, WINDOW_SECONDS)


def reset(ip: str, username: str) -> None:
    cache.delete(_keys(ip, username)[0])
