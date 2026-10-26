from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import pytest

from apps.core.schedule import is_open_now, schedule_problem


def day(weekday: int, *intervals: tuple[str, str]) -> dict[str, Any]:
    return {"weekday": weekday, "intervals": [{"open": o, "close": c} for o, c in intervals]}


@pytest.mark.parametrize(
    "schedule",
    [
        {"is24x7": True, "days": []},
        {"is24x7": False, "days": [day(1, ("09:00", "18:00"))]},
        # Yarim tundan o'tadi va kun oxiri
        {"is24x7": False, "days": [day(5, ("18:00", "02:00")), day(6, ("10:00", "24:00"))]},
        # Tushlik tanaffusi bilan
        {"is24x7": False, "days": [day(2, ("09:00", "13:00"), ("14:00", "18:00"))]},
    ],
)
def test_valid_schedules(schedule: dict[str, Any]) -> None:
    assert schedule_problem(schedule) is None


@pytest.mark.parametrize(
    "schedule",
    [
        None,
        {"days": []},
        {"is24x7": "ha", "days": []},
        {"is24x7": False, "days": [day(0, ("09:00", "18:00"))]},
        {"is24x7": False, "days": [day(8, ("09:00", "18:00"))]},
        {"is24x7": False, "days": [day(1, ("09:00", "18:00")), day(1, ("10:00", "11:00"))]},
        {"is24x7": False, "days": [day(1, ("9:00", "18:00"))]},
        {"is24x7": False, "days": [day(1, ("24:00", "18:00"))]},
        {"is24x7": False, "days": [day(1, ("09:00", "09:00"))]},
        {"is24x7": False, "days": [day(1, *[("09:00", "10:00")] * 5)]},
        {"is24x7": False, "days": [{"weekday": True, "intervals": []}]},
        {"is24x7": False, "days": [], "qoshimcha": 1},
    ],
)
def test_invalid_schedules(schedule: Any) -> None:
    assert schedule_problem(schedule) is not None


# --- "Hozir ochiq" (Toshkent vaqti, UTC+5) ---

TASHKENT = ZoneInfo("Asia/Tashkent")


def at(weekday: int, time: str) -> datetime:
    """2026-10-26 — dushanba; weekday 1..7."""
    hours, minutes = map(int, time.split(":"))
    return datetime(2026, 10, 25 + weekday, hours, minutes, tzinfo=TASHKENT)


WEEKDAYS = {"is24x7": False, "days": [day(d, ("09:00", "18:00")) for d in range(1, 6)]}
NIGHT = {"is24x7": False, "days": [day(5, ("18:00", "02:00")), day(7, ("20:00", "03:00"))]}


@pytest.mark.parametrize(
    ("schedule", "moment", "expected"),
    [
        (WEEKDAYS, at(1, "09:00"), True),
        (WEEKDAYS, at(1, "17:59"), True),
        (WEEKDAYS, at(1, "18:00"), False),  # yopilish vaqti — yopiq
        (WEEKDAYS, at(6, "12:00"), False),  # dam olish kuni
        (NIGHT, at(6, "01:30"), True),  # juma kechasidan shanbaga o'tadi
        (NIGHT, at(1, "02:30"), True),  # yakshanba kechasidan dushanbaga o'tadi
        (NIGHT, at(1, "03:00"), False),
        ({"is24x7": True, "days": []}, at(3, "04:00"), True),
        (None, at(3, "12:00"), False),  # ish vaqti nomaʼlum
    ],
)
def test_is_open_now(schedule: Any, moment: datetime, expected: bool) -> None:
    assert is_open_now(schedule, moment) is expected


def test_is_open_now_converts_utc_to_tashkent() -> None:
    # 04:30 UTC = 09:30 Toshkent (dushanba)
    utc = datetime(2026, 10, 26, 4, 30, tzinfo=ZoneInfo("UTC"))
    assert is_open_now(WEEKDAYS, utc) is True
