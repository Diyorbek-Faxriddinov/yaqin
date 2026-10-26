"""Haftalik ish vaqti (kontraktdagi WeeklySchedule) tekshiruvi.

Vaqt mahalliy (Asia/Tashkent), "HH:MM". `close` ≤ `open` bo'lsa, oraliq keyingi kunga o'tadi
(18:00–02:00); "24:00" — kun oxiri. Ro'yxatda yo'q kun — dam olish kuni (ADR-0010).
Frontend mock'idagi `validSchedule` bilan bir xil qoidalar.
"""

import re
from typing import Any

from django.core.exceptions import ValidationError

_OPEN = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_CLOSE = re.compile(r"^(([01]\d|2[0-3]):[0-5]\d|24:00)$")
MAX_INTERVALS_PER_DAY = 4


def schedule_problem(value: Any) -> str | None:
    """Muammo matni yoki None (to'g'ri)."""
    if not isinstance(value, dict) or set(value) != {"is24x7", "days"}:
        return "is24x7 va days maydonlari kerak"
    if not isinstance(value["is24x7"], bool) or not isinstance(value["days"], list):
        return "is24x7 — mantiqiy qiymat, days — roʻyxat"
    seen: set[int] = set()
    for day in value["days"]:
        if not isinstance(day, dict) or set(day) != {"weekday", "intervals"}:
            return "Har bir kun: weekday va intervals"
        weekday = day["weekday"]
        if not isinstance(weekday, int) or isinstance(weekday, bool) or not 1 <= weekday <= 7:
            return "weekday — 1 (dushanba) … 7 (yakshanba)"
        if weekday in seen:
            return "Kun takrorlangan"
        seen.add(weekday)
        intervals = day["intervals"]
        if not isinstance(intervals, list) or len(intervals) > MAX_INTERVALS_PER_DAY:
            return f"Bir kunda koʻpi bilan {MAX_INTERVALS_PER_DAY} ta oraliq"
        for interval in intervals:
            if not isinstance(interval, dict) or set(interval) != {"open", "close"}:
                return "Oraliq: open va close"
            opening, closing = interval["open"], interval["close"]
            if not (
                isinstance(opening, str)
                and isinstance(closing, str)
                and _OPEN.match(opening)
                and _CLOSE.match(closing)
            ):
                return "Vaqt formati HH:MM"
            if opening == closing:
                return "Ochilish va yopilish bir xil"
    return None


def validate_schedule(value: Any) -> None:
    problem = schedule_problem(value)
    if problem:
        raise ValidationError(problem, code="invalid_schedule")
