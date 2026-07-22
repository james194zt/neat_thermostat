"""Coordinator: boiler demand + Nest-like house intelligence."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_ON, STATE_OPEN
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import (
    async_track_state_change_event,
    async_track_time_interval,
)
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import DOMAIN, PRESET_AWAY, PRESET_BOOST, PRESET_ECO, PRESET_NONE
from .intelligence import (
    IntelligenceStore,
    accrue_leaf_minutes,
    adaptive_eco_offset_c,
    early_off_should_idle,
    energy_history_payload,
    estimate_time_to_temp_minutes,
    evaluate_leaf,
    leaf_week_stats,
    learn_schedule_from_adjustments,
    note_comfort_setpoint,
    note_setpoint_event,
    preheat_status,
    presence_anyone_home,
    record_manual_adjustment,
    seasonal_comfort_offset_c,
    stop_seasonal_savings,
    track_heat_interval,
    update_away_tracking,
    update_warmup_from_cycle,
)
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
        self.intel = IntelligenceStore(hass, entry.entry_id)
        self._away_eco_active = False
        self._preheat: dict[str, Any] | None = None
        self._heat_cycle_start: datetime | None = None
        self._heat_cycle_start_temp: float | None = None
        self._last_boiler_on = False
        self._dirty_intel = False
        self._leaf: dict[str, Any] = {"active": False}
        self._safety_active = False
        self._time_to_temp: int | None = None
        self._seasonal_info: dict[str, Any] = {"active": False, "offset_c": 0.0}
        self._adaptive_offset = 0.0
        self._last_logged_setpoint: float | None = None
        self.data = self._snapshot()

    async def async_initialize_intelligence(self) -> None:
        await self.intel.async_load()

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
        if updates.get("seasonal_savings") is False:
            stop_seasonal_savings(self.intel.state.seasonal)
            self._dirty_intel = True
            await self.intel.async_save()
            self._dirty_intel = False
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

    def verify_wall_pin(self, pin: str) -> bool:
        expected = str(self.config.wall_pin or "").strip()
        if not expected:
            return False
        return str(pin or "").strip() == expected

    async def async_stop_seasonal_savings(self) -> NeatConfig:
        stop_seasonal_savings(self.intel.state.seasonal)
        self._dirty_intel = True
        await self.intel.async_save()
        self._dirty_intel = False
        return await self.async_save_config({"seasonal_savings": False})

    def energy_history(self, days: int = 31) -> dict[str, Any]:
        return energy_history_payload(
            self.intel.state.energy,
            self.intel.state.leaf,
            days=days,
        )

    def _snapshot(self) -> dict[str, Any]:
        return {
            "config": self.config.to_dict(),
            "main": {
                "hvac_mode": self._main_hvac_mode,
                "preset": self._main_preset,
                "target": self._main_target,
            },
            "rooms": dict(self._room_states),
            "away": self._away_eco_active,
            "window_open": self._any_window_open(self.config.window_sensors),
            "summer_mode": self.config.summer_mode,
            "preheat": self._preheat,
            "leaf": self._leaf,
            "safety_active": self._safety_active,
            "time_to_temp_minutes": self._time_to_temp,
            "seasonal_savings": self._seasonal_info,
            "adaptive_offset_c": self._adaptive_offset,
            "intelligence": {
                "true_radiant": self.config.true_radiant,
                "auto_schedule": self.config.auto_schedule,
                "away_delay_minutes": self.config.away_delay_minutes,
                "warmup_c_per_hour": self.intel.state.warmup.c_per_hour,
                "warmup_samples": self.intel.state.warmup.samples,
                "leaf_enabled": self.config.leaf_enabled,
                "safety_temp_enabled": self.config.safety_temp_enabled,
                "seasonal_savings": self.config.seasonal_savings,
                "adaptive_comfort": self.config.adaptive_comfort,
            },
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

    def _presence_entities(self) -> list[str]:
        entities = list(self.config.presence_entities or [])
        if self.config.person_entity and self.config.person_entity not in entities:
            entities.append(self.config.person_entity)
        return entities

    def _refresh_away(self) -> None:
        anyone = presence_anyone_home(
            self.hass.states.get, self._presence_entities()
        )
        self.intel.state, self._away_eco_active = update_away_tracking(
            self.intel.state,
            anyone_home=anyone,
            delay_minutes=self.config.away_delay_minutes,
        )
        self._dirty_intel = True

    def _apply_adaptive(self, base: float, *, eco_mode: bool) -> float:
        if not eco_mode:
            return base
        adjusted = base + self._adaptive_offset
        floor = float(self.config.safety_min_temp) + 1.0
        return max(floor, round(adjusted, 1))

    def _apply_seasonal_comfort(self, base: float, *, comfort: bool) -> float:
        if not comfort:
            return base
        offset = float(self._seasonal_info.get("offset_c") or 0.0)
        return round(base + offset, 1)

    def effective_main_target(self) -> tuple[float, bool]:
        """Return (target_temp, schedule_or_preheat_active)."""
        outdoor = self._state_float(self.config.outdoor_temp_sensor)
        self._adaptive_offset = adaptive_eco_offset_c(
            adaptive_comfort=self.config.adaptive_comfort,
            outdoor_temp=outdoor,
        )
        self._seasonal_info = seasonal_comfort_offset_c(
            self.intel.state.seasonal,
            seasonal_savings_enabled=self.config.seasonal_savings,
        )
        if self.config.seasonal_savings and self.intel.state.seasonal.started_at:
            self._dirty_intel = True

        if self._main_preset == PRESET_BOOST:
            return self.config.boost_temp, False

        if self._away_eco_active or self._main_preset == PRESET_AWAY:
            return (
                self._apply_adaptive(self.config.away_temp, eco_mode=True),
                False,
            )
        if self._main_preset == PRESET_ECO:
            return (
                self._apply_adaptive(self.config.eco_temp, eco_mode=True),
                False,
            )

        if self.config.schedule_enabled and self._main_preset == PRESET_NONE:
            temp, active = scheduled_temperature(
                self.config.schedule,
                schedule_enabled=True,
                eco_fallback=self.config.eco_temp,
            )
            if active:
                return self._apply_seasonal_comfort(temp, comfort=True), True

            status = preheat_status(
                self.config.schedule,
                schedule_enabled=True,
                true_radiant=self.config.true_radiant,
                current_temp=self._state_float(self.config.temperature_sensor),
                warmup=self.intel.state.warmup,
                outdoor_temp=outdoor,
                away_eco_active=self._away_eco_active,
            )
            self._preheat = status
            if status and status.get("preheating"):
                return (
                    self._apply_seasonal_comfort(
                        float(status["temperature"]), comfort=True
                    ),
                    True,
                )
            # Schedule eco fallback
            return (
                self._apply_adaptive(float(temp), eco_mode=True),
                False,
            )

        self._preheat = None
        return (
            self._apply_seasonal_comfort(self._main_target, comfort=True),
            False,
        )

    def effective_room_target(self, room: RoomConfig) -> float:
        st = self._room_states.get(room.id, {})
        preset = st.get("preset", PRESET_NONE)
        if preset == PRESET_BOOST:
            return room.boost_temp
        if preset == PRESET_ECO or self._away_eco_active:
            return self._apply_adaptive(room.eco_temp, eco_mode=True)
        return float(st.get("target", room.target_temp))

    def room_current_temp(self, room: RoomConfig) -> float | None:
        readings: list[float] = []
        if room.temperature_sensor:
            t = self._state_float(room.temperature_sensor)
            if t is not None:
                readings.append(t)
        for entity_id in room.extra_temperature_sensors or []:
            t = self._state_float(entity_id)
            if t is not None:
                readings.append(t)
        if readings:
            return sum(readings) / len(readings)
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
        # Opt-out rooms never demand the boiler (TRV setpoint sync still runs).
        if not bool(getattr(room, "calls_for_heat", True)):
            return False
        if self.config.summer_mode or self._any_window_open(room.window_sensors):
            return False
        current = self.room_current_temp(room)
        if current is None:
            return False
        target = self.effective_room_target(room)
        return current < target - self.config.cold_tolerance

    def safety_needs_heat(self) -> bool:
        if not self.config.safety_temp_enabled:
            return False
        current = self._state_float(self.config.temperature_sensor)
        if current is None:
            return False
        return current <= float(self.config.safety_min_temp)

    def main_needs_heat(self) -> bool:
        if self.safety_needs_heat():
            return True
        if self._main_hvac_mode != "heat" or self.config.summer_mode:
            return False
        if self._any_window_open(self.config.window_sensors):
            return False
        current = self._state_float(self.config.temperature_sensor)
        if current is None:
            return False
        target, _ = self.effective_main_target()
        if early_off_should_idle(
            true_radiant=self.config.true_radiant,
            current_temp=current,
            target_temp=target,
            hot_tolerance=self.config.hot_tolerance,
            warmup=self.intel.state.warmup,
        ):
            return False
        return current < target - self.config.cold_tolerance

    def main_should_idle(self) -> bool:
        if self.safety_needs_heat():
            return False
        current = self._state_float(self.config.temperature_sensor)
        if current is None:
            return True
        target, _ = self.effective_main_target()
        return early_off_should_idle(
            true_radiant=self.config.true_radiant,
            current_temp=current,
            target_temp=target,
            hot_tolerance=self.config.hot_tolerance,
            warmup=self.intel.state.warmup,
        )

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

    def _track_heat_cycle(self, want_heat: bool) -> None:
        now = datetime.now()
        current = self._state_float(self.config.temperature_sensor)
        outdoor = self._state_float(self.config.outdoor_temp_sensor)
        if want_heat and not self._last_boiler_on:
            self._heat_cycle_start = now
            self._heat_cycle_start_temp = current
        elif not want_heat and self._last_boiler_on and self._heat_cycle_start:
            if current is not None and self._heat_cycle_start_temp is not None:
                duration = (now - self._heat_cycle_start).total_seconds() / 60.0
                self.intel.state.warmup = update_warmup_from_cycle(
                    self.intel.state.warmup,
                    start_temp=self._heat_cycle_start_temp,
                    end_temp=current,
                    duration_minutes=duration,
                    outdoor_temp=outdoor,
                )
                self.intel.state.recent_cycles.append(
                    {
                        "started_at": self._heat_cycle_start.isoformat(),
                        "ended_at": now.isoformat(),
                        "start_temp": self._heat_cycle_start_temp,
                        "end_temp": current,
                        "outdoor_temp": outdoor,
                        "duration_minutes": round(duration, 1),
                    }
                )
                self.intel.state.recent_cycles = self.intel.state.recent_cycles[-40:]
                self._dirty_intel = True
            self._heat_cycle_start = None
            self._heat_cycle_start_temp = None
        self._last_boiler_on = want_heat

    async def _maybe_learn_schedule(self) -> None:
        if not self.config.auto_schedule:
            return
        new_schedule, changed = learn_schedule_from_adjustments(
            self.config.schedule,
            self.intel.state,
            auto_schedule=True,
        )
        if changed:
            _LOGGER.info("Auto-Schedule updated house weekly schedule from adjustments")
            await self.async_save_config({"schedule": new_schedule})

    async def _async_update_data(self) -> dict[str, Any]:
        self._refresh_away()

        for room in self.config.rooms:
            needs = self.room_needs_heat(room)
            self._room_states.setdefault(room.id, {})["needs_heat"] = needs
            await self._async_sync_room_trv(room)

        self._safety_active = self.safety_needs_heat()

        want_heat = self._safety_active or (
            (not self.config.summer_mode)
            and (
                self.main_needs_heat()
                or any(self.room_needs_heat(r) for r in self.config.rooms)
            )
        )
        if (
            not want_heat
            and self._is_on(self.config.heater)
            and self._main_hvac_mode == "heat"
            and not self.config.summer_mode
            and not self._any_window_open(self.config.window_sensors)
            and not self.main_should_idle()
        ):
            current = self._state_float(self.config.temperature_sensor)
            target, _ = self.effective_main_target()
            if current is not None and current < target:
                want_heat = True

        if (
            want_heat
            and not self._safety_active
            and self.main_should_idle()
            and not any(self.room_needs_heat(r) for r in self.config.rooms)
        ):
            want_heat = False

        self._track_heat_cycle(want_heat)
        if track_heat_interval(self.intel.state.energy, want_heat=want_heat):
            self._dirty_intel = True

        await self._async_set_heater(want_heat)

        target, _sched = self.effective_main_target()
        if note_setpoint_event(self.intel.state.energy, float(target)):
            self._dirty_intel = True

        eco_or_away = (
            self._main_hvac_mode == "off"
            or self._away_eco_active
            or self._main_preset in (
                PRESET_ECO,
                PRESET_AWAY,
            )
        )
        leaf = self.intel.state.leaf
        prev_total = leaf.minutes_total
        prev_baseline = leaf.baseline
        prev_samples = len(leaf.comfort_samples)
        prev_started = leaf.coaching_started_at

        if _sched and not eco_or_away and self._main_preset == PRESET_NONE:
            noted = float(target)
            if getattr(self, "_last_noted_comfort", None) != noted:
                note_comfort_setpoint(leaf, noted)
                self._last_noted_comfort = noted

        leaf_info = evaluate_leaf(
            leaf=leaf,
            effective_target=float(target),
            eco_or_away=eco_or_away,
            leaf_enabled=self.config.leaf_enabled,
        )
        accrue_leaf_minutes(
            leaf,
            leaf_active=bool(leaf_info.get("active")),
            default_delta_minutes=UPDATE_INTERVAL.total_seconds() / 60.0,
        )
        self._leaf = {**leaf_info, **leaf_week_stats(leaf)}
        if (
            leaf.minutes_total != prev_total
            or leaf.baseline != prev_baseline
            or len(leaf.comfort_samples) != prev_samples
            or leaf.coaching_started_at != prev_started
        ):
            self._dirty_intel = True

        current = self._state_float(self.config.temperature_sensor)
        preheating = bool((self._preheat or {}).get("preheating"))
        self._time_to_temp = estimate_time_to_temp_minutes(
            current_temp=current,
            target_temp=float(target),
            warmup=self.intel.state.warmup,
            heating=want_heat or preheating,
            hvac_mode=self._main_hvac_mode,
        )

        if self._dirty_intel:
            await self.intel.async_save()
            self._dirty_intel = False

        self.data = self._snapshot()
        self.data["boiler_on"] = want_heat
        self.data["main"]["effective_target"] = target
        self.data["main"]["schedule_active"] = _sched
        return self.data

    @callback
    def set_main_hvac_mode(self, mode: str) -> None:
        self._main_hvac_mode = mode
        self.hass.async_create_task(self.async_request_refresh())

    @callback
    def set_main_temperature(self, temperature: float) -> None:
        self._main_target = temperature
        self._main_preset = PRESET_NONE
        record_manual_adjustment(self.intel.state, temperature)
        note_comfort_setpoint(self.intel.state.leaf, temperature)
        self._dirty_intel = True
        self.hass.async_create_task(self._after_manual_setpoint())

    async def _after_manual_setpoint(self) -> None:
        await self.intel.async_save()
        await self._maybe_learn_schedule()
        await self.async_request_refresh()

    @callback
    def set_main_preset(self, preset: str) -> None:
        self._main_preset = preset or PRESET_NONE
        if preset == PRESET_ECO:
            self._main_target = self.config.eco_temp
        elif preset == PRESET_BOOST:
            self._main_target = self.config.boost_temp
        elif preset == PRESET_AWAY:
            self._main_target = self.config.away_temp
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
        # Always mirror current Neat rooms so newly added rooms show on panels
        # without re-saving the wall panel. Prefer Neat room climates; fall back
        # to the TRV entity if a room climate id is missing.
        rooms = []
        for room in self.config.rooms:
            if room.enabled is False:
                continue
            entity = f"climate.neat_{room.id}" if room.id else (room.trv_entity or "")
            if not entity:
                continue
            rooms.append({"entity": entity, "name": room.name})
        defaults = {
            "insideTemp": self.config.temperature_sensor or "",
            "insideHumidity": "",
            "outsideTemp": self.config.outdoor_temp_sensor or "",
            "weather": "weather.home",
            "sun": "sun.sun",
        }
        sensors = {**defaults, **dict(panel.sensors or {})}
        # Don't let blank panel values wipe house-level outdoor/temp defaults
        for key, value in defaults.items():
            if not str(sensors.get(key) or "").strip():
                sensors[key] = value
        display = panel.display or {"idleMs": 30000, "panelEntity": ""}
        lock_on = bool(panel.temperature_lock) and bool(
            str(self.config.wall_pin or "").strip()
        )
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
            "temperatureLock": lock_on,
            "pinConfigured": bool(str(self.config.wall_pin or "").strip()),
            "time_to_temp_minutes": self._time_to_temp
            or (self.data or {}).get("time_to_temp_minutes"),
        }

    async def async_setup_listeners(self) -> None:
        entities = [self.config.heater, self.config.temperature_sensor]
        entities.extend(self.config.window_sensors)
        entities.extend(self._presence_entities())
        if self.config.outdoor_temp_sensor:
            entities.append(self.config.outdoor_temp_sensor)
        for room in self.config.rooms:
            entities.append(room.trv_entity)
            if room.temperature_sensor:
                entities.append(room.temperature_sensor)
            entities.extend(room.extra_temperature_sensors or [])
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
        if self._dirty_intel:
            await self.intel.async_save()
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
