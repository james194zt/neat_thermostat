"""Climate entities: setpoint changes show at once; the house entity lists rooms in order (needs HA test venv)."""

import pytest

pytest.importorskip("pytest_homeassistant_custom_component")

from homeassistant.helpers import entity_registry as er  # noqa: E402

from custom_components.neat_thermostat.climate import NeatHomeClimate, NeatRoomClimate  # noqa: E402
from tests.test_schedule_ha import MONDAY, _tick, setup  # noqa: E402,F401


def _attach(hass, entity, entity_id):
    entity.hass = hass
    entity.entity_id = entity_id
    return entity


async def test_set_temperature_writes_state_immediately(hass, setup, freezer):
    coord, _calls = setup
    freezer.move_to(f"{MONDAY} 12:00:00+01:00")
    await _tick(hass, coord)
    home = _attach(hass, NeatHomeClimate(coord), "climate.neat_thermostat_neat_home")
    await home.async_set_temperature(temperature=22.5)
    # No coordinator refresh awaited: the new target must already be in the state machine.
    assert hass.states.get("climate.neat_thermostat_neat_home").attributes["temperature"] == 22.5

    await home.async_set_preset_mode("eco")
    assert hass.states.get("climate.neat_thermostat_neat_home").attributes["preset_mode"] == "eco"


async def test_house_lists_room_entities_in_order_and_rooms_name_themselves(hass, setup, freezer):
    coord, _calls = setup
    freezer.move_to(f"{MONDAY} 12:00:00+01:00")
    await _tick(hass, coord)
    reg = er.async_get(hass)
    reg.async_get_or_create("climate", "neat_thermostat", "neat_lounge", suggested_object_id="hallway_neat_thermostat_neat_lounge")
    home = NeatHomeClimate(coord)
    assert home.extra_state_attributes["room_entities"] == ["climate.hallway_neat_thermostat_neat_lounge"]

    room = NeatRoomClimate(coord, coord.config.rooms[0])
    attrs = room.extra_state_attributes
    assert attrs["room_name"] == "Lounge"
    assert attrs["room_id"] == "lounge"
