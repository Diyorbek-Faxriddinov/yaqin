"""Haftalik ish vaqti (kontraktdagi WeeklySchedule) tekshiruvi.

Vaqt mahalliy (Asia/Tashkent), "HH:MM". `close` ≤ `open` bo'lsa, oraliq keyingi kunga o'tadi
(18:00–02:00); "24:00" — kun oxiri. Ro'yxatda yo'q kun — dam olish kuni (ADR-0010).
Frontend mock'idagi `validSchedule` bilan bir xil qoidalar.
"""

import re
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

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


MINUTES_PER_DAY = 24 * 60
MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY
TASHKENT = ZoneInfo("Asia/Tashkent")


def _minutes(value: str) -> int:
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


def _weekly_ranges(schedule: dict[str, Any]) -> list[tuple[int, int]]:
    """Jadval → haftaning boshidan (dushanba 00:00) daqiqa oraliqlari; yarim tundan o'tish bilan."""
    ranges: list[tuple[int, int]] = []
    for day in schedule["days"]:
        day_start = (day["weekday"] - 1) * MINUTES_PER_DAY
        for interval in day["intervals"]:
            opening = _minutes(interval["open"])
            closing = _minutes(interval["close"])
            if closing <= opening:
                closing += MINUTES_PER_DAY
            ranges.append((day_start + opening, day_start + closing))
    return ranges


def is_open_now(schedule: dict[str, Any] | None, now: datetime) -> bool:
    """Toshkent vaqti bo'yicha hozir ochiqmi — frontenddagi `computeOpenStatus` bilan bir xil.

    Ish vaqti nomaʼlum (None) bo'lsa — ochiq hisoblanmaydi ("hozir ochiq" filtri uni ko'rsatmaydi).
    """
    if not schedule:
        return False
    if schedule.get("is24x7"):
        return True
    local = now.astimezone(TASHKENT)
    current = (local.isoweekday() - 1) * MINUTES_PER_DAY + local.hour * 60 + local.minute
    # Yakshanbadan dushanbaga o'tadigan oraliqlar uchun bir haftalik siljish ham tekshiriladi
    return any(
        start + shift <= current < end + shift
        for start, end in _weekly_ranges(schedule)
        for shift in (0, -MINUTES_PER_WEEK)
    )
