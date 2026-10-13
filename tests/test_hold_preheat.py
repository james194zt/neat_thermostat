"""A manual setting overnight must not cancel the morning preheat (needs HA test venv).

13 Oct: the dial was set to 17 °C in the night (held until the 06:30 block),
and the boiler only started at 06:30 instead of preheating.
"""

import pytest

pytest.importorskip("pytest_homeassistant_custom_component")

from tests.test_schedule_ha import MONDAY, _tick, setup  # noqa: E402,F401


async def test_overnight_turn_down_still_preheats(hass, setup, freezer):
    coord, _ = setup
    await coord.async_save_config({"true_radiant": True})
    freezer.move_to(f"{MONDAY} 02:45:00+01:00")
    coord.set_main_temperature(17.0)
    await hass.async_block_till_done()
    assert (await _tick(hass, coord))["main"]["effective_target"] == 17.0

    # 18 → 20 at the default 1.5 °C/h = 80 + 5 min: preheat from 05:05.
    freezer.move_to(f"{MONDAY} 04:30:00+01:00")
    assert (await _tick(hass, coord))["main"]["effective_target"] == 17.0
    freezer.move_to(f"{MONDAY} 05:30:00+01:00")
    data = await _tick(hass, coord)
    assert data["main"]["effective_target"] == 20.0
    assert data["preheat"]["preheating"] is True
    assert data["boiler_on"] is True


async def test_overnight_turn_up_is_kept(hass, setup, freezer):
    coord, _ = setup
    await coord.async_save_config({"true_radiant": True})
    freezer.move_to(f"{MONDAY} 02:45:00+01:00")
    coord.set_main_temperature(21.0)
    await hass.async_block_till_done()
    freezer.move_to(f"{MONDAY} 05:30:00+01:00")
    assert (await _tick(hass, coord))["main"]["effective_target"] == 21.0
    # The hold still ends when the block starts.
    freezer.move_to(f"{MONDAY} 06:31:00+01:00")
    assert (await _tick(hass, coord))["main"]["effective_target"] == 20.0
