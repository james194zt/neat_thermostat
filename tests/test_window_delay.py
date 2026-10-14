"""Windows & Doors: heating only pauses once a window or door has stayed open for the
set delay, so walking out of a door doesn't stop it (needs HA test venv)."""

from datetime import timedelta

import pytest

pytest.importorskip("pytest_homeassistant_custom_component")

from tests.test_schedule_ha import setup  # noqa: E402,F401

DOOR = "binary_sensor.back_door"
ROOM_WINDOW = "binary_sensor.lounge_window"


async def _configure(coord, delay=None):
    rooms = [{**coord.config.rooms[0].to_dict(), "window_sensors": [ROOM_WINDOW]}]
    settings = {"window_sensors": [DOOR], "rooms": rooms}
    if delay is not None:
        settings["window_open_delay_minutes"] = delay
    await coord.async_save_config(settings)


async def test_default_delay_is_three_minutes(hass, setup):
    coord, _calls = setup
    await _configure(coord)
    assert coord.config.window_open_delay_minutes == 3


async def test_house_door_open_briefly_keeps_heating(hass, setup, freezer):
    coord, _calls = setup
    hass.states.async_set(DOOR, "off")
    await _configure(coord, delay=3)
    assert coord.main_needs_heat()  # 18 °C house, calling

    hass.states.async_set(DOOR, "on")  # someone walks out
    freezer.tick(timedelta(minutes=1))
    assert coord.main_needs_heat()
    assert not coord._any_window_open([DOOR])  # noqa: SLF001

    freezer.tick(timedelta(minutes=2, seconds=1))  # left open: past 3 min
    assert not coord.main_needs_heat()

    hass.states.async_set(DOOR, "off")  # shut: heat again at once
    assert coord.main_needs_heat()


async def test_zero_delay_pauses_straight_away(hass, setup):
    coord, _calls = setup
    hass.states.async_set(DOOR, "off")
    await _configure(coord, delay=0)
    hass.states.async_set(DOOR, "on")
    assert not coord.main_needs_heat()


async def test_room_window_uses_the_same_delay(hass, setup, freezer):
    coord, _calls = setup
    hass.states.async_set(ROOM_WINDOW, "off")
    await _configure(coord, delay=3)
    room = coord.config.rooms[0]
    assert coord.room_needs_heat(room)

    hass.states.async_set(ROOM_WINDOW, "on")
    freezer.tick(timedelta(minutes=1))
    assert coord.room_needs_heat(room)
    freezer.tick(timedelta(minutes=3))
    assert not coord.room_needs_heat(room)


async def test_coast_measurement_sees_any_opening(hass, setup):
    """A door open even briefly lets heat out, so the radiator-coast measurement is
    still discarded without waiting for the delay."""
    coord, _calls = setup
    hass.states.async_set(DOOR, "off")
    await _configure(coord, delay=3)
    hass.states.async_set(DOOR, "on")
    assert coord._any_window_open([DOOR], delayed=False)  # noqa: SLF001
    assert not coord._any_window_open([DOOR])  # noqa: SLF001


async def test_delay_is_kept_in_range(hass, setup):
    coord, _calls = setup
    await _configure(coord, delay=500)
    assert coord.config.window_open_delay_minutes == 30
    await _configure(coord, delay=-5)
    assert coord.config.window_open_delay_minutes == 0
