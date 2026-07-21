"""Coordinator: boiler demand + shared Neat state."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_HOME, STATE_ON, STATE_OPEN
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import (
    async_track_state_change_event,
    async_track_time_interval,
)
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import DOMAIN, PRESET_AWAY, PRESET_BOOST, PRESET_ECO, PRESET_NONE
from .models import NeatConfig, RoomConfig, WallPanelConfig
from .schedule import scheduled_temperature

_LOGGER = logging.getLogger(__name__)
UPDATE_INTERVAL = timedelta(seconds=30)


class NeatThermostatCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Own heating logic and shared config for climates + panel."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        super().__init__(hass, _LOGGER, name=DOMAIN, update_interval=UPDATE_INTERVAL)
        self.entry = entry
        self.config = NeatConfig.from_entry_data({**entry.data, **entry.options})
        self._unsubs: list[Any] = []
        self._main_hvac_mode = "heat"
        self._main_preset = PRESET_NONE
        self._main_target = self.config.target_temp
        self._room_states: dict[str, dict[str, Any]] = {}
        for room in self.config.rooms:
            self._room_states[room.id] = {
                "hvac_mode": "heat",
                "preset": PRESET_NONE,
                "target": room.target_temp,
                "needs_heat": False,
            }
        self.data = self._snapshot()

    def update_config(self, data: dict[str, Any]) -> None:
        self.config = NeatConfig.from_entry_data(data)
        for room in self.config.rooms:
            if room.id not in self._room_states:
                self._room_states[room.id] = {
                    "hvac_mode": "heat",
                    "preset": PRESET_NONE,
                    "target": room.target_temp,
                    "needs_heat": False,
                }

    async def async_save_config(self, updates: dict[str, Any]) -> NeatConfig:
        current = {**self.entry.data, **self.entry.options}
        merged = {**current, **updates}
        data_keys = {"heater", "temperature_sensor"}
        new_data = {k: merged[k] for k in data_keys if k in merged}
        new_options = {k: v for k, v in merged.items() if k not in data_keys}
        self.hass.config_entries.async_update_entry(
            self.entry, data={**self.entry.data, **new_data}, options=new_options
        )
        self.update_config({**self.entry.data, **new_options})
        await self.async_request_refresh()
        return self.config

    def _snapshot(self) -> dict[str, Any]:
        return {
            "config": self.config.to_dict(),
            "main": {
                "hvac_mode": self._main_hvac_mode,
                "preset": self._main_preset,
                "target": self._main_target,
            },
            "rooms": dict(self._room_states),
            "away": self._is_away(),
            "window_open": self._any_window_open(self.config.window_sensors),
            "summer_mode": self.config.summer_mode,
        }

    def _state_float(self, entity_id: str | None) -> float | None:
        if not entity_id:
            return None
        state = self.hass.states.get(entity_id)
        if state is None or state.state in ("unknown", "unavailable", ""):
            return None
        try:
            return float(state.state)
        except (TypeError, ValueError):
            return None

    def _is_on(self, entity_id: str) -> bool:
        state = self.hass.states.get(entity_id)
        return state is not None and state.state in (STATE_ON, "heat", "heating")

    def _any_window_open(self, sensors: list[str]) -> bool:
        for entity_id in sensors:
            state = self.hass.states.get(entity_id)
            if state is None:
                continue
            if state.state in (STATE_OPEN, STATE_ON, "on", "open"):
                return True
        return False

    def _is_away(self) -> bool:
        person = self.config.person_entity
        if not person:
            return False
        state = self.hass.states.get(person)
        if state is None:
            return False
        return state.state != STATE_HOME

    def effective_main_target(self) -> tuple[float, bool]:
        if self._main_preset == PRESET_BOOST:
            return self.config.boost_temp, False
        if self._main_preset in (PRESET_ECO, PRESET_AWAY) or self._is_away():
            temp = self.config.away_temp if self._is_away() else self.config.eco_temp
            return temp, False
        if self.config.schedule_enabled and self._main_preset == PRESET_NONE:
            temp, active = scheduled_temperature(
                self.config.schedule,
                schedule_enabled=True,
                eco_fallback=self.config.eco_temp,
            )
            if active:
                return temp, True
        return self._main_target, False

    def effective_room_target(self, room: RoomConfig) -> float:
        st = self._room_states.get(room.id, {})
        preset = st.get("preset", PRESET_NONE)
        if preset == PRESET_BOOST:
            return room.boost_temp
        if preset == PRESET_ECO or self._is_away():
            return room.eco_temp
        return float(st.get("target", room.target_temp))

    def room_current_temp(self, room: RoomConfig) -> float | None:
        if room.temperature_sensor:
            t = self._state_float(room.temperature_sensor)
            if t is not None:
                return t
        state = self.hass.states.get(room.trv_entity)
        if state is None:
            return None
        raw = state.attributes.get("current_temperature")
        try:
            return float(raw) if raw is not None else None
        except (TypeError, ValueError):
            return None

    def room_needs_heat(self, room: RoomConfig) -> bool:
        st = self._room_states.get(room.id, {})
        if st.get("hvac_mode") != "heat" or not room.enabled:
            return False
        if self.config.summer_mode or self._any_window_open(room.window_sensors):
            return False
        current = self.room_current_temp(room)
        if current is None:
            return False
        target = self.effective_room_target(room)
        return current < target - self.config.cold_tolerance

    def main_needs_heat(self) -> bool:
        if self._main_hvac_mode != "heat" or self.config.summer_mode:
            return False
        if self._any_window_open(self.config.window_sensors):
            return False
        current = self._state_float(self.config.temperature_sensor)
        if current is None:
            return False
        target, _ = self.effective_main_target()
        return current < target - self.config.cold_tolerance

    def main_should_idle(self) -> bool:
        current = self._state_float(self.config.temperature_sensor)
        if current is None:
            return True
        target, _ = self.effective_main_target()
        return current > target + self.config.hot_tolerance

    async def _async_set_heater(self, turn_on: bool) -> None:
        heater = self.config.heater
        if not heater:
            return
        domain = heater.split(".", 1)[0]
        if domain == "climate":
            await self.hass.services.async_call(
                "climate",
                "set_hvac_mode",
                {
                    "entity_id": heater,
                    "hvac_mode": "heat" if turn_on else "off",
                },
                blocking=False,
            )
            return
        await self.hass.services.async_call(
            domain,
            "turn_on" if turn_on else "turn_off",
            {"entity_id": heater},
            blocking=False,
        )

    async def _async_sync_room_trv(self, room: RoomConfig) -> None:
        if not room.trv_entity:
            return
        st = self._room_states.get(room.id, {})
        mode = st.get("hvac_mode", "heat")
        target = self.effective_room_target(room)
        window = self._any_window_open(room.window_sensors)
        if self.config.summer_mode or window or mode != "heat":
            await self.hass.services.async_call(
                "climate",
                "set_hvac_mode",
                {"entity_id": room.trv_entity, "hvac_mode": "off"},
                blocking=False,
            )
            return
        await self.hass.services.async_call(
            "climate",
            "set_temperature",
            {"entity_id": room.trv_entity, "temperature": target},
            blocking=False,
        )
        await self.hass.services.async_call(
            "climate",
            "set_hvac_mode",
            {"entity_id": room.trv_entity, "hvac_mode": "heat"},
            blocking=False,
        )

    async def _async_update_data(self) -> dict[str, Any]:
        for room in self.config.rooms:
            needs = self.room_needs_heat(room)
            self._room_states.setdefault(room.id, {})["needs_heat"] = needs
            await self._async_sync_room_trv(room)

        want_heat = (not self.config.summer_mode) and (
            self.main_needs_heat()
            or any(self.room_needs_heat(r) for r in self.config.rooms)
        )
        # Hysteresis for main zone while heater already running
        if (
            not want_heat
            and self._is_on(self.config.heater)
            and self._main_hvac_mode == "heat"
            and not self.config.summer_mode
            and not self._any_window_open(self.config.window_sensors)
        ):
            current = self._state_float(self.config.temperature_sensor)
            target, _ = self.effective_main_target()
            if current is not None and current < target:
                want_heat = True

        await self._async_set_heater(want_heat)
        self.data = self._snapshot()
        self.data["boiler_on"] = want_heat
        return self.data

    @callback
    def set_main_hvac_mode(self, mode: str) -> None:
        self._main_hvac_mode = mode
        self.hass.async_create_task(self.async_request_refresh())

    @callback
    def set_main_temperature(self, temperature: float) -> None:
        self._main_target = temperature
        self._main_preset = PRESET_NONE
        self.hass.async_create_task(self.async_request_refresh())

    @callback
    def set_main_preset(self, preset: str) -> None:
        self._main_preset = preset or PRESET_NONE
        if preset == PRESET_ECO:
            self._main_target = self.config.eco_temp
        elif preset == PRESET_BOOST:
            self._main_target = self.config.boost_temp
        self.hass.async_create_task(self.async_request_refresh())

    @callback
    def set_room_hvac_mode(self, room_id: str, mode: str) -> None:
        self._room_states.setdefault(room_id, {})["hvac_mode"] = mode
        self.hass.async_create_task(self.async_request_refresh())

    @callback
    def set_room_temperature(self, room_id: str, temperature: float) -> None:
        st = self._room_states.setdefault(room_id, {})
        st["target"] = temperature
        st["preset"] = PRESET_NONE
        self.hass.async_create_task(self.async_request_refresh())

    @callback
    def set_room_preset(self, room_id: str, preset: str) -> None:
        self._room_states.setdefault(room_id, {})["preset"] = preset or PRESET_NONE
        self.hass.async_create_task(self.async_request_refresh())

    def get_wall_panel(self, panel_id: str) -> WallPanelConfig | None:
        for panel in self.config.wall_panels:
            if panel.id == panel_id:
                return panel
        return None

    def wall_panel_payload(self, panel_id: str) -> dict[str, Any] | None:
        panel = self.get_wall_panel(panel_id)
        if panel is None:
            return None
        primary = panel.primary_entity or "climate.neat_home"
        rooms = panel.rooms or [
            {"entity": f"climate.neat_{r.id}", "name": r.name}
            for r in self.config.rooms
            if r.enabled
        ]
        sensors = panel.sensors or {
            "insideTemp": self.config.temperature_sensor,
            "insideHumidity": "",
            "outsideTemp": "",
            "weather": "weather.home",
            "sun": "sun.sun",
        }
        display = panel.display or {"idleMs": 30000, "panelEntity": ""}
        return {
            "deviceId": panel.id,
            "deviceLabel": panel.label,
            "primary": {
                "entity": primary,
                "name": panel.label or "Heating",
                "step": 0.5,
            },
            "rooms": rooms,
            "sensors": sensors,
            "display": display,
            "screensaverIdleMs": display.get("idleMs", 30000),
        }

    async def async_setup_listeners(self) -> None:
        entities = [self.config.heater, self.config.temperature_sensor]
        entities.extend(self.config.window_sensors)
        if self.config.person_entity:
            entities.append(self.config.person_entity)
        for room in self.config.rooms:
            entities.append(room.trv_entity)
            if room.temperature_sensor:
                entities.append(room.temperature_sensor)
            entities.extend(room.window_sensors)
        entities = [e for e in entities if e]

        @callback
        def _on_state(_event: Any) -> None:
            self.hass.async_create_task(self.async_request_refresh())

        if entities:
            self._unsubs.append(
                async_track_state_change_event(self.hass, entities, _on_state)
            )

        def _tick(_now: Any) -> None:
            self.hass.async_create_task(self.async_request_refresh())

        self._unsubs.append(
            async_track_time_interval(self.hass, _tick, UPDATE_INTERVAL)
        )

    async def async_unload(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
