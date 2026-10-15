"""Wall panel usage page: last 24 h of boiler runs, targets and kWh (needs HA test venv)."""

from datetime import datetime, timedelta

import pytest

pytest.importorskip("pytest_homeassistant_custom_component")

from custom_components.neat_thermostat.intelligence import (  # noqa: E402
    EnergyHistoryState,
    wall_usage_payload,
)

NOW = datetime(2026, 10, 15, 14, 0)  # window = 14 Oct 14:00 → 15 Oct 14:00


def _iv(start: str, end: str | None) -> dict:
    return {"start_ts": start, "end_ts": end}


def test_runs_clipped_joined_at_midnight_and_open_run_counted():
    energy = EnergyHistoryState(
        heat_intervals_by_day={
            # Starts before the window: only the part inside counts (13:30–14:30 → 30 min).
            "2026-10-14": [
                _iv("2026-10-14T13:30:00", "2026-10-14T14:30:00"),
                # Split at midnight by track_heat_interval: one run, 23:40–00:20.
                _iv("2026-10-14T23:40:00", "2026-10-14T23:59:59"),
            ],
            "2026-10-15": [_iv("2026-10-15T00:00:00", "2026-10-15T00:20:00")],
        },
        open_heat_start="2026-10-15T13:45:00",  # boiler on right now
    )
    out = wall_usage_payload(energy, now=NOW)
    assert out["window_minutes"] == 1440
    assert out["run_count"] == 3
    first, night, now_run = out["runs"]
    assert first == {"s": 0.0, "e": 30.0}
    assert night["s"] == pytest.approx(9 * 60 + 40) and night["e"] == pytest.approx(10 * 60 + 20)
    assert now_run == {"s": 1425.0, "e": 1440.0}
    assert out["on_minutes"] == pytest.approx(30 + 40 + 15, abs=0.1)
    assert out["heating_now"] is True
    # 13 Oct 14:00 → 14 Oct 14:00: only the 13:30–14:00 part of the first run.
    assert out["prev_on_minutes"] == pytest.approx(30)


def test_setpoints_start_from_the_value_before_the_window():
    energy = EnergyHistoryState(
        setpoint_events_by_day={
            "2026-10-14": [
                {"ts": "2026-10-14T06:30:00", "temperature": 20.0},
                {"ts": "2026-10-14T22:00:00", "temperature": 17.0},
            ],
            "2026-10-15": [{"ts": "2026-10-15T06:30:00", "temperature": 20.0}],
        }
    )
    out = wall_usage_payload(energy, now=NOW)
    assert out["setpoints"] == [
        {"m": 0.0, "t": 20.0},
        {"m": 480.0, "t": 17.0},
        {"m": 990.0, "t": 20.0},
    ]
    assert out["runs"] == [] and out["on_minutes"] == 0 and out["heating_now"] is False


def test_empty_history():
    out = wall_usage_payload(EnergyHistoryState(), now=NOW)
    assert out["runs"] == [] and out["setpoints"] == [] and out["prev_on_minutes"] == 0


async def test_energy_from_recorder_statistics(recorder_mock, hass):
    from homeassistant.components.recorder.models import StatisticData, StatisticMeanType, StatisticMetaData
    from homeassistant.components.recorder.statistics import async_import_statistics
    from homeassistant.util import dt as dt_util
    from pytest_homeassistant_custom_component.components.recorder.common import (
        async_wait_recording_done,
    )

    from custom_components.neat_thermostat.energy_meter import async_energy_usage

    await hass.config.async_set_time_zone("Europe/London")
    now = dt_util.utcnow()
    hour = now.replace(minute=0, second=0, microsecond=0)
    # A lifetime gas meter in Wh (converted to kWh), +1 kWh every hour for 40 hours.
    rows = []
    total = 500_000.0
    for i in range(40, 0, -1):
        total += 1000.0
        rows.append(StatisticData(start=hour - timedelta(hours=i), state=total, sum=total))
    meta = StatisticMetaData(
        mean_type=StatisticMeanType.NONE,
        has_sum=True,
        name="Gas import",
        source="recorder",
        statistic_id="sensor.gas_import",
        unit_class="energy",
        unit_of_measurement="Wh",
    )
    hass.states.async_set("sensor.gas_import", "540000", {"friendly_name": "Gas import", "unit_of_measurement": "Wh"})
    async_import_statistics(hass, meta, rows)
    await async_wait_recording_done(hass)

    out = await async_energy_usage(hass, "sensor.gas_import")
    assert out is not None
    assert out["entity_id"] == "sensor.gas_import" and out["name"] == "Gas import"
    full = [h for h in out["hourly"] if h["m"] < 1440 - 60]
    assert full and all(h["kwh"] == pytest.approx(1.0) for h in full)
    assert all(-60 < h["m"] <= 1440 for h in out["hourly"])
    day_start = dt_util.start_of_local_day(dt_util.as_local(now))
    hours_today = int((hour - day_start).total_seconds() // 3600)
    assert out["today_kwh"] == pytest.approx(hours_today)
    assert out["last_24h_kwh"] == pytest.approx(sum(h["kwh"] for h in out["hourly"] if h["m"] >= 0))


async def test_energy_none_without_sensor_or_recorder(hass):
    from custom_components.neat_thermostat.energy_meter import async_energy_usage

    assert await async_energy_usage(hass, "") is None
    assert await async_energy_usage(hass, "sensor.gas_import") is None  # recorder not loaded
