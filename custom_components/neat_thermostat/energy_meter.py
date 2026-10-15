"""kWh used by the heating, read from a meter's statistics in Home Assistant.

Any kWh sensor HA keeps statistics for works (a boiler's own counter, or a smart
meter's gas import): a lifetime total or one that resets daily. The recorder's
"change" handles both, and it includes the last few minutes (5-minute statistics),
so "today" is current.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

UNITS = {"energy": "kWh"}


def _change(hass: HomeAssistant, entity_id: str, start: datetime, end: datetime | None) -> float | None:
    from homeassistant.components.recorder.statistics import statistic_during_period

    result = statistic_during_period(hass, start, end, entity_id, {"change"}, UNITS)
    value = result.get("change")
    return None if value is None else max(0.0, float(value))


def _read(hass: HomeAssistant, entity_id: str, now: datetime, hours: int) -> dict[str, Any] | None:
    from homeassistant.components.recorder.statistics import statistics_during_period

    since = now - timedelta(hours=hours)
    day_start = dt_util.start_of_local_day(dt_util.as_local(now))
    today = _change(hass, entity_id, day_start, None)
    if today is None:
        return None  # no statistics for this sensor (no state_class, or not recorded)
    # Yesterday up to the same time of day, for "vs yesterday".
    yesterday = _change(hass, entity_id, day_start - timedelta(days=1), now - timedelta(days=1))

    hour_start = now.replace(minute=0, second=0, microsecond=0)
    first = since.replace(minute=0, second=0, microsecond=0)
    rows = statistics_during_period(
        hass, first, hour_start, {entity_id}, "hour", UNITS, {"change"}
    ).get(entity_id, [])
    hourly: list[dict[str, float]] = []
    for row in rows:
        start = row.get("start")
        change = row.get("change")
        if start is None or change is None:
            continue
        at = datetime.fromtimestamp(float(start), tz=dt_util.UTC)
        hourly.append(
            {"m": round((at - since).total_seconds() / 60.0, 1), "kwh": round(max(0.0, float(change)), 3)}
        )
    # The hour in progress isn't an hourly statistic yet.
    current = _change(hass, entity_id, hour_start, None)
    if current is not None:
        hourly.append({"m": round((hour_start - since).total_seconds() / 60.0, 1), "kwh": round(current, 3)})

    return {
        "today_kwh": round(today, 2),
        "yesterday_kwh": None if yesterday is None else round(yesterday, 2),
        "hourly": hourly,
        "last_24h_kwh": round(sum(h["kwh"] for h in hourly if h["m"] >= 0), 2),
    }


async def async_energy_usage(hass: HomeAssistant, entity_id: str, hours: int = 24) -> dict[str, Any] | None:
    """kWh today, yesterday by now, and per hour over the window; None if unknown."""
    if not entity_id or "recorder" not in hass.config.components:
        return None
    from homeassistant.components.recorder import get_instance

    try:
        data = await get_instance(hass).async_add_executor_job(
            _read, hass, entity_id, dt_util.utcnow(), hours
        )
    except Exception:  # noqa: BLE001 - a usage page must never break on a meter
        _LOGGER.debug("Neat: couldn't read statistics for %s", entity_id, exc_info=True)
        return None
    if data is None:
        return None
    state = hass.states.get(entity_id)
    data["entity_id"] = entity_id
    data["name"] = (state.attributes.get("friendly_name") if state else None) or entity_id
    return data
