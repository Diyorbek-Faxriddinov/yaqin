from typing import Any

import pytest

from apps.core.schedule import schedule_problem


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
