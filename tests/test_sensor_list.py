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


async def test_missed_recheck_of_an_applied_sensor_is_not_an_error(hass, monkeypatch):
    """23 Oct live: the living room SNZB-02P had Faster updates (0.1 °C every ~5 min), but
    slept through the post-restart re-check and the card showed it as not set."""
    from custom_components.neat_thermostat import zigbee_reporting

    async def asleep(_hass, _entity_id, *, fast):
        raise zigbee_reporting.ReportingError("the sensor didn't answer (it may be asleep) — will retry")

    monkeypatch.setattr(zigbee_reporting, "zha_ieee", lambda _hass, _e: "00:11:22:33:44:55:66:77")
    monkeypatch.setattr(zigbee_reporting, "async_configure", asleep)
    entry = MockConfigEntry(
        domain="neat_thermostat",
        data={"heater": "switch.boiler", "temperature_sensor": "sensor.hall"},
        options={"fast_reporting_sensors": ["sensor.hall", "sensor.lounge"]},
    )
    entry.add_to_hass(hass)
    coord = NeatThermostatCoordinator(hass, entry)
    await coord.async_initialize_intelligence()
    try:
        coord.intel.state.fast_reporting = ["sensor.lounge"]  # set on the sensor before the restart
        await coord._async_apply_reporting({"sensor.hall": True, "sensor.lounge": True})  # noqa: SLF001
        status = coord._reporting_status  # noqa: SLF001
        assert status["sensor.lounge"]["ok"] is False and status["sensor.lounge"]["applied"] is True
        assert status["sensor.hall"]["applied"] is False  # never got through: a real "not set"
        assert coord.intel.state.fast_reporting == ["sensor.lounge"]  # a miss doesn't forget it
    finally:
        await coord.async_unload()
        await coord.async_shutdown()


async def test_floors_from_ha_areas_and_watched_sensors(hass):
    from homeassistant.helpers import area_registry as ar
    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er
    from homeassistant.helpers import floor_registry as fr

    ground = fr.async_get(hass).async_create("Ground Floor", level=0)
    first = fr.async_get(hass).async_create("First Floor", level=1)
    hall = ar.async_get(hass).async_create("Hallway", floor_id=ground.floor_id)
    bath = ar.async_get(hass).async_create("Bathroom", floor_id=first.floor_id)
    zha = MockConfigEntry(domain="zha")
    zha.add_to_hass(hass)
    trv_dev = dr.async_get(hass).async_get_or_create(config_entry_id=zha.entry_id, identifiers={("zha", "trv")})
    dr.async_get(hass).async_update_device(trv_dev.id, area_id=hall.id)  # TRV: area via its device
    reg = er.async_get(hass)
    reg.async_get_or_create("climate", "zha", "trv", suggested_object_id="hall_trv", device_id=trv_dev.id)
    sensor = reg.async_get_or_create("sensor", "zha", "bath-t", suggested_object_id="bath")
    reg.async_update_entity(sensor.entity_id, area_id=bath.id)  # sensor: its own area

    entry = MockConfigEntry(
        domain="neat_thermostat",
        data={"heater": "switch.boiler", "temperature_sensor": "sensor.hall"},
        options={
            "watch_temperature_sensors": ["sensor.bath"],
            "rooms": [{"id": "hall", "name": "Hallway", "trv_entity": "climate.hall_trv"}],
        },
    )
    entry.add_to_hass(hass)
    coord = NeatThermostatCoordinator(hass, entry)
    await coord.async_initialize_intelligence()
    try:
        assert coord.room_floors()["hall"]["name"] == "Ground Floor"
        info = coord.temperature_sensors_info()
        # First Floor sorts before "no floor": sensor.hall has no area.
        assert [s["entity_id"] for s in info] == ["sensor.bath", "sensor.hall"]
        assert info[0]["uses"] == ["watch"]
        assert info[0]["floor"] == {"id": first.floor_id, "name": "First Floor", "level": 1, "area": "Bathroom"}
        assert info[1]["floor"] is None
        # Watched sensors never drive the heating.
        assert coord.room_current_temp(coord.config.rooms[0]) is None
    finally:
        await coord.async_unload()
        await coord.async_shutdown()
