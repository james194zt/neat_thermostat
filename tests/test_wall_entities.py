"""Wall panel payload uses Neat's real entity ids (needs HA test venv).

HA names Neat's climates itself (e.g. climate.neat_thermostat_neat_home) while
climate.neat_home can be some other integration's thermostat.
"""

import pytest

pytest.importorskip("pytest_homeassistant_custom_component")

from homeassistant.helpers import entity_registry as er  # noqa: E402

from custom_components.neat_thermostat.models import WallPanelConfig  # noqa: E402
from tests.test_schedule_ha import setup  # noqa: E402,F401


def _register(hass):
    reg = er.async_get(hass)
    # The user's old generic_thermostat owns the "obvious" name.
    reg.async_get_or_create("climate", "generic_thermostat", "boiler", suggested_object_id="neat_home")
    reg.async_get_or_create("climate", "neat_thermostat", "neat_home", suggested_object_id="neat_thermostat_neat_home")
    reg.async_get_or_create("climate", "neat_thermostat", "neat_lounge", suggested_object_id="hallway_neat_thermostat_neat_lounge")


async def _payload(hass, coord, primary):
    panel = WallPanelConfig.from_dict({"id": "hallway", "label": "Hallway", "primary_entity": primary})
    await coord.async_save_config({"wall_panels": [panel.to_dict()]})
    return coord.wall_panel_payload("hallway")


async def test_old_default_points_at_neats_house_climate(hass, setup):
    coord, _calls = setup
    _register(hass)
    payload = await _payload(hass, coord, "climate.neat_home")
    assert payload["primary"]["entity"] == "climate.neat_thermostat_neat_home"
    assert payload["rooms"] == [{"entity": "climate.hallway_neat_thermostat_neat_lounge", "name": "Lounge"}]


async def test_blank_primary_means_neat_house(hass, setup):
    coord, _calls = setup
    _register(hass)
    payload = await _payload(hass, coord, "")
    assert payload["primary"]["entity"] == "climate.neat_thermostat_neat_home"


async def test_deliberate_other_climate_is_kept(hass, setup):
    coord, _calls = setup
    _register(hass)
    payload = await _payload(hass, coord, "climate.living_room_ac")
    assert payload["primary"]["entity"] == "climate.living_room_ac"


async def test_unregistered_room_falls_back_to_trv(hass, setup):
    coord, _calls = setup  # nothing registered
    payload = await _payload(hass, coord, "")
    assert payload["rooms"][0]["entity"] == coord.config.rooms[0].trv_entity
