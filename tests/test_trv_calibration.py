"""TRV calibration: the TRV's own offset follows "room sensor − TRV" (needs HA test venv).

21 Oct 2026: the hall TRV read 21.3 °C beside its hot radiator and shut, while the
room sensor next to it read 19 — the boiler ran on with only upstairs radiators open.
"""

from datetime import timedelta

import pytest

pytest.importorskip("pytest_homeassistant_custom_component")

from homeassistant.helpers import device_registry as dr  # noqa: E402
from homeassistant.helpers import entity_registry as er  # noqa: E402
from pytest_homeassistant_custom_component.common import MockConfigEntry  # noqa: E402

from custom_components.neat_thermostat.coordinator import (  # noqa: E402
    NeatThermostatCoordinator,
)

START = "2026-10-21 06:00:00+01:00"
TRV = "climate.trv_hall"
OFFSET = "number.trv_hall_local_temperature_offset"
ROOM_SENSOR = "sensor.hall"


@pytest.fixture
async def setup(hass, monkeypatch, freezer):
    await hass.config.async_set_time_zone("Europe/London")
    freezer.move_to(START)
    monkeypatch.setattr(
        "custom_components.neat_thermostat.coordinator.boiler_cycle_guard",
        lambda want_on, is_on, seconds, **_kw: (want_on, 0.0),
    )
    zha = MockConfigEntry(domain="zha")
    zha.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=zha.entry_id, identifiers={("zha", "trv-hall")}
    )
    ent_reg = er.async_get(hass)
    ent_reg.async_get_or_create("climate", "zha", "trv-hall", suggested_object_id="trv_hall", device_id=device.id)
    ent_reg.async_get_or_create(
        "number", "zha", "trv-hall-offset",
        suggested_object_id="trv_hall_local_temperature_offset",
        device_id=device.id,
        translation_key="local_temperature_offset",
    )
    ent_reg.async_get_or_create(
        "number", "zha", "trv-hall-max", suggested_object_id="trv_hall_max_heat_setpoint_limit", device_id=device.id
    )

    # The TRV's raw reading (beside the radiator); what it reports includes its offset.
    trv = {"raw": 21.3, "writes": []}

    def report():
        offset = float(hass.states.get(OFFSET).state)
        hass.states.async_set(TRV, "heat", {"temperature": 20.0, "current_temperature": round(trv["raw"] + offset, 1)})

    async def set_value(call):
        trv["writes"].append(call.data["value"])
        hass.states.async_set(OFFSET, str(call.data["value"]), {"min": -2.5, "max": 2.5, "step": 0.1})

    async def noop(call):
        return

    hass.services.async_register("number", "set_value", set_value)
    for service in ("set_temperature", "set_hvac_mode"):
        hass.services.async_register("climate", service, noop)
    for service in ("turn_on", "turn_off"):
        hass.services.async_register("switch", service, noop)
    hass.states.async_set("switch.boiler", "on")
    hass.states.async_set("sensor.house", "19.0")
    hass.states.async_set(ROOM_SENSOR, "19.0")
    hass.states.async_set(OFFSET, "0.0", {"min": -2.5, "max": 2.5, "step": 0.1})
    hass.states.async_set("number.trv_hall_max_heat_setpoint_limit", "30.0")
    report()
    trv["report"] = report

    entries = []

    async def make(calibrate=True, sensor=ROOM_SENSOR):
        entry = MockConfigEntry(
            domain="neat_thermostat",
            data={"heater": "switch.boiler", "temperature_sensor": "sensor.house"},
            options={
                "true_radiant": False,
                "schedule_enabled": False,
                "target_temp": 20,
                "rooms": [{
                    "id": "hall", "name": "Hall", "trv_entity": TRV, "target_temp": 20,
                    "temperature_sensor": sensor, "calibrate_trv": calibrate,
                }],
            },
        )
        entry.add_to_hass(hass)
        coord = NeatThermostatCoordinator(hass, entry)
        await coord.async_initialize_intelligence()
        entries.append(coord)
        return coord

    yield make, trv
    for coord in entries:
        await coord.async_unload()
        await coord.async_shutdown()


async def _tick(hass, coord, freezer, every=timedelta(minutes=1)):
    freezer.tick(every)
    await coord._async_update_data()  # noqa: SLF001
    await hass.async_block_till_done(wait_background_tasks=True)


async def test_finds_the_offset_setting_on_the_trv_device(hass, setup):
    make, _ = setup
    coord = await make()
    assert coord.trv_offset_entity(TRV) == OFFSET


async def test_hall_trv_gets_room_sensor_offset(hass, setup, freezer):
    make, trv = setup
    coord = await make()
    await _tick(hass, coord, freezer)  # offset only just set up: waits
    assert trv["writes"] == []
    await _tick(hass, coord, freezer, timedelta(minutes=15))
    assert trv["writes"] == [-2.3]


async def test_off_by_default_and_needs_a_room_sensor(hass, setup, freezer):
    make, trv = setup
    for coord in (await make(calibrate=False), await make(sensor="")):
        await _tick(hass, coord, freezer, timedelta(minutes=16))
    assert trv["writes"] == []


async def test_waits_for_a_trv_reading_with_the_new_offset(hass, setup, freezer):
    make, trv = setup
    coord = await make()
    await _tick(hass, coord, freezer, timedelta(minutes=16))
    assert trv["writes"] == [-2.3]
    # The TRV hasn't reported since: its 21.3 was taken with the old offset.
    await _tick(hass, coord, freezer, timedelta(minutes=20))
    assert trv["writes"] == [-2.3]
    trv["report"]()  # now it shows 19.0 = the room
    await _tick(hass, coord, freezer, timedelta(minutes=20))
    assert trv["writes"] == [-2.3]
    # Room warm; radiator cooled: the TRV shows 18.2 with the room at 20.0.
    hass.states.async_set(ROOM_SENSOR, "20.0")
    trv["raw"] = 20.5
    trv["report"]()
    await _tick(hass, coord, freezer)
    assert trv["writes"] == [-2.3, -0.5]


async def test_offset_only_moves_down_while_the_room_warms_up(hass, setup, freezer):
    """21 Oct live: with the radiator cool the hall TRV over-read only ~0.5 °C, so
    easing the offset back mid warm-up would shut the valve once the radiator got hot."""
    make, trv = setup
    trv["raw"] = 20.5
    trv["report"]()
    coord = await make()
    await _tick(hass, coord, freezer, timedelta(minutes=16))
    trv["report"]()
    assert trv["writes"] == [-1.5]
    trv["raw"] = 19.5  # radiator cool: TRV now shows 18.0, room 19.0, target 20
    trv["report"]()
    await _tick(hass, coord, freezer, timedelta(minutes=30))
    assert trv["writes"] == [-1.5]  # not eased back while the room needs heat
    trv["raw"] = 21.5  # radiator hot: shows 20.0 with the room at 19.0 → down again
    trv["report"]()
    await _tick(hass, coord, freezer, timedelta(minutes=5))
    assert trv["writes"] == [-1.5, -2.5]


async def test_downward_corrections_come_quicker_while_warming(hass, setup, freezer):
    make, trv = setup
    coord = await make()
    await _tick(hass, coord, freezer, timedelta(minutes=6))
    assert trv["writes"] == [-2.3]  # 5 min spacing, not 15


async def test_small_changes_are_left_alone(hass, setup, freezer):
    make, trv = setup
    trv["raw"] = 19.2  # 0.2 above the room
    trv["report"]()
    coord = await make()
    await _tick(hass, coord, freezer, timedelta(minutes=16))
    assert trv["writes"] == []


async def test_offset_stays_inside_the_trv_range(hass, setup, freezer):
    make, trv = setup
    trv["raw"] = 23.0  # 4 °C above the room; the TRV only allows −2.5
    trv["report"]()
    coord = await make()
    await _tick(hass, coord, freezer, timedelta(minutes=16))
    trv["report"]()
    await _tick(hass, coord, freezer, timedelta(minutes=16))
    assert trv["writes"] == [-2.5]


async def test_silent_room_sensor_stops_calibration(hass, setup, freezer):
    make, trv = setup
    hass.states.async_set(ROOM_SENSOR, "unavailable")
    coord = await make()
    await _tick(hass, coord, freezer, timedelta(minutes=16))
    assert trv["writes"] == []
