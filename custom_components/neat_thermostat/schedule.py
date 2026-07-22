"""7-day schedule helpers for Neat Thermostat."""

from __future__ import annotations

from datetime import datetime, time
from typing import Any

from .const import DAYS, DEFAULT_ECO_TEMP
from .models import ScheduleBlock


def _parse_hhmm(value: str) -> time:
    parts = (value or "00:00").split(":")
    hour = int(parts[0])
    minute = int(parts[1]) if len(parts) > 1 else 0
    return time(hour=hour, minute=minute)


def _minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def day_key(now: datetime) -> str:
    # Monday=0 → mon
    return DAYS[now.weekday()]


def active_block(
    schedule: dict[str, list[dict[str, Any]]],
    now: datetime | None = None,
) -> ScheduleBlock | None:
    """Return the schedule block active at `now`, if any."""
    now = now or datetime.now()
    blocks = schedule.get(day_key(now)) or []
    current = _minutes(now.time())
    for raw in blocks:
        block = ScheduleBlock.from_dict(raw)
        if not block.enabled:
            continue
        start = _minutes(_parse_hhmm(block.start))
        end = _minutes(_parse_hhmm(block.end))
        if start <= end:
            if start <= current < end:
                return block
        else:
            # Overnight wrap
            if current >= start or current < end:
                return block
    return None


def scheduled_temperature(
    schedule: dict[str, list[dict[str, Any]]],
    *,
    schedule_enabled: bool,
    eco_fallback: float = DEFAULT_ECO_TEMP,
    now: datetime | None = None,
) -> tuple[float, bool]:
    """Return (temperature, schedule_active)."""
    if not schedule_enabled:
        return eco_fallback, False
    block = active_block(schedule, now)
    if block is None:
        return eco_fallback, False
    return block.temperature, True
