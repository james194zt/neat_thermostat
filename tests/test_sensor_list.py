"""Settings → Temperature Sensors: Faster updates per sensor (22 Oct 2026: the new
living room sensor reported every 15 min / 0.5 °C, so TRV calibration lagged)."""

import pytest

from custom_components.neat_thermostat.models import NeatConfig

BASE = {"heater": "switch.boiler", "temperature_sensor": "sensor.hall", "backup_temperature_sensor": "sensor.gw"}


def test_old_house_switch_becomes_house_and_backup():
    cfg = NeatConfig.from_entry_data({**BASE, "fast_sensor_reporting": True})
    assert cfg.fast_reporting_sensors == ["sensor.hall", "sensor.gw"]


def test_old_switch_off_means_none():
    assert NeatConfig.from_entry_data(BASE).fast_reporting_sensors == []


def test_saved_list_wins_over_the_old_switch():
    cfg = NeatConfig.from_entry_data(
        {**BASE, "fast_sensor_reporting": True, "fast_reporting_sensors": ["sensor.lounge"]}
    )
    assert cfg.fast_reporting_sensors == ["sensor.lounge"]
    cfg = NeatConfig.from_entry_data({**BASE, "fast_sensor_reporting": True, "fast_reporting_sensors": []})
    assert cfg.fast_reporting_sensors == []
    assert cfg.to_dict()["fast_reporting_sensors"] == []


pytest.importorskip("pytest_homeassistant_custom_component")

from pytest_homeassistant_custom_component.common import MockConfigEntry  # noqa: E402

from custom_components.neat_thermostat.coordinator import NeatThermostatCoordinator  # noqa: E402


async def test_sensor_list_shows_every_sensor_and_its_uses(hass):
    entry = MockConfigEntry(
        domain="neat_thermostat",
        data={"heater": "switch.boiler", "temperature_sensor": "sensor.hall"},
        options={
            "backup_temperature_sensor": "sensor.gw",
            "fast_reporting_sensors": ["sensor.lounge"],
            "rooms": [
                {"id": "lr1", "name": "Living Room 1", "trv_entity": "climate.a", "temperature_sensor": "sensor.lounge"},
                {"id": "lr2", "name": "Living Room 2", "trv_entity": "climate.b", "temperature_sensor": "sensor.lounge"},
                {"id": "hall", "name": "Hallway", "trv_entity": "climate.c", "temperature_sensor": "sensor.hall"},
                {"id": "kitchen", "name": "Kitchen", "trv_entity": "climate.d", "temperature_sensor": "sensor.gw"},
            ],
        },
    )
    entry.add_to_hass(hass)
    coord = NeatThermostatCoordinator(hass, entry)
    await coord.async_initialize_intelligence()
    try:
        info = {s["entity_id"]: s for s in coord.temperature_sensors_info()}
        assert list(info) == ["sensor.hall", "sensor.gw", "sensor.lounge"]
        assert info["sensor.hall"]["uses"] == ["house", "room:Hallway"]
        assert info["sensor.gw"]["uses"] == ["backup", "room:Kitchen"]
        assert info["sensor.lounge"]["uses"] == ["room:Living Room 1", "room:Living Room 2"]
        assert info["sensor.lounge"]["fast"] is True
        assert info["sensor.hall"]["fast"] is False
        assert info["sensor.hall"]["zigbee"] is False  # not a ZHA entity here
        assert "temperature_sensors" in coord._snapshot()  # noqa: SLF001
    finally:
        await coord.async_unload()
        await coord.async_shutdown()
