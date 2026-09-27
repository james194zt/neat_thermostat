"""Pure heat-demand decisions (stdlib only, unit-testable without HA)."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from .const import DAYS
from .schedule import _parse_hhmm

# True Radiant: radiators keep warming the room for roughly this long after
# the boiler stops, so the house cut-off is pulled down by that coast.
COAST_MINUTES = 12.0
# Never let the cut-off get closer than this to the cut-in point, otherwise
# the boiler short-cycles on sensor noise.
MIN_HYSTERESIS_C = 0.2


def house_off_threshold(
    target: float,
    *,
    cold_tolerance: float,
    hot_tolerance: float,
    true_radiant: bool,
    warmup_c_per_hour: float,
) -> float:
    """Temperature at which a running house call stops."""
    off_at = target + hot_tolerance
    if true_radiant:
        coast = max(0.0, warmup_c_per_hour) / 60.0 * COAST_MINUTES
        off_at -= coast
    return max(off_at, target - cold_tolerance + MIN_HYSTERESIS_C)


def house_calls_for_heat(
    current: float | None,
    target: float,
    *,
    was_calling: bool,
    cold_tolerance: float,
    hot_tolerance: float,
    true_radiant: bool,
    warmup_c_per_hour: float,
) -> bool:
    """Hysteresis thermostat: cut in below target-cold, cut out at off threshold."""
    if current is None:
        return False
    if was_calling:
        return current < house_off_threshold(
            target,
            cold_tolerance=cold_tolerance,
            hot_tolerance=hot_tolerance,
            true_radiant=true_radiant,
            warmup_c_per_hour=warmup_c_per_hour,
        )
    return current <= target - cold_tolerance


def room_calls_for_heat(
    current: float | None,
    target: float,
    *,
    was_calling: bool,
    cold_tolerance: float,
    hot_tolerance: float,
) -> bool:
    """Same hysteresis for a room (no radiant coast: the TRV throttles itself)."""
    if current is None:
        return False
    if was_calling:
        return current < target + hot_tolerance
    return current <= target - cold_tolerance


def next_schedule_change(
    schedule: dict[str, list[dict[str, Any]]],
    now: datetime,
) -> datetime | None:
    """Next block start or end after `now` (when a manual hold should expire)."""
    best: datetime | None = None
    for day_offset in range(-1, 8):
        day = (now + timedelta(days=day_offset)).date()
        for raw in schedule.get(DAYS[day.weekday()]) or []:
            if not raw.get("enabled", True):
                continue
            start = datetime.combine(day, _parse_hhmm(str(raw.get("start", "06:00"))))
            end = datetime.combine(day, _parse_hhmm(str(raw.get("end", "22:00"))))
            if end <= start:
                end += timedelta(days=1)
            for edge in (start, end):
                if edge > now and (best is None or edge < best):
                    best = edge
    return best
