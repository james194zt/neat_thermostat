"""Heater relay handling: unavailable relay, switching relays (needs HA test venv).

Run: <venv>/bin/python -m pytest tests/test_heater_ha.py
"""

import pytest

pytest.importorskip("pytest_homeassistant_custom_component")

from tests.test_schedule_ha import MONDAY, _tick, setup  # noqa: E402,F401


async def test_unavailable_heater_is_not_reported_as_heating(hass, setup, freezer):
    coord, calls = setup
    hass.states.async_set("switch.boiler", "unavailable")
    freezer.move_to(f"{MONDAY} 16:10:00+01:00")
    data = await _tick(hass, coord)
    assert data["boiler_demand"] is True
    assert data["heater_available"] is False
    # Nothing was switched, so nothing may be shown or logged as heating.
    assert data["boiler_on"] is False
    assert coord.intel.state.energy.open_heat_start is None
    assert not [c for c in calls if c[0] == "switch"]

    hass.states.async_set("switch.boiler", "off")
    data = await _tick(hass, coord)
    assert data["heater_available"] is True
    assert data["boiler_on"] is True
    assert ("switch", "turn_on", {"entity_id": "switch.boiler"}) in calls


async def test_changing_heater_turns_old_relay_off_and_watches_new(hass, setup, freezer):
    coord, calls = setup
    await coord.async_setup_listeners()
    freezer.move_to(f"{MONDAY} 16:10:00+01:00")
    await _tick(hass, coord)
    assert hass.states.get("switch.boiler").state == "on"

    hass.states.async_set("switch.zbmini", "off")
    await coord.async_save_config({"heater": "switch.zbmini"})
    await hass.async_block_till_done()

    assert coord.config.heater == "switch.zbmini"
    assert coord.entry.data["heater"] == "switch.zbmini"
    assert ("switch", "turn_off", {"entity_id": "switch.boiler"}) in calls
    assert "switch.zbmini" in coord._watched  # noqa: SLF001
    assert "switch.boiler" not in coord._watched  # noqa: SLF001

    await _tick(hass, coord)
    assert hass.states.get("switch.zbmini").state == "on"
