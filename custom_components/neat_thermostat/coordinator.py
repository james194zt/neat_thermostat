"""Coordinator: boiler demand + house intelligence."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from homeassistant.components import persistent_notification
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_ON, STATE_OPEN
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.storage import Store
from homeassistant.helpers.event import (
    async_track_state_change_event,
    async_track_time_interval,
)
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.util import dt as dt_util

from .const import DOMAIN, PRESET_AWAY, PRESET_BOOST, PRESET_ECO, PRESET_NONE
from . import intelligence
from .intelligence import (
    LONG_PREHEAT_MINUTES,
    MAX_PREHEAT_MINUTES,
    IntelligenceStore,
    WarmupModel,
    accrue_leaf_minutes,
    active_block_key,
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
    seasonal_bake,
    seasonal_offset,
    seasonal_push_back,
    seasonal_savings_step,
    stop_seasonal_savings,
    track_heat_interval,
    update_away_tracking,
    update_coast_watch,
    update_heat_check,
    update_warmup_from_cycle,
)
from .control import boiler_cycle_guard, house_calls_for_heat, next_schedule_change, room_calls_for_heat
from . import kiosk
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
        # State-change subscription, rebuilt when the watched entities change.
        self._state_unsub: Any = None
        self._watched: tuple[str, ...] = ()
        # Fully Kiosk panels: watched entities, pending syncs and back-off (transient by design:
        # after a restart everything is simply re-checked against the saved config).
        self._kiosk_unsub: Any = None
        self._kiosk_watched: dict[str, str] = {}
        self._kiosk_timers: dict[str, Any] = {}
        self._kiosk_attempts: dict[str, int] = {}
        # Wall app version the panels were last given a cache-clearing reload for.
        self._kiosk_store: Store = Store(hass, 1, f"{DOMAIN}.kiosk_{entry.entry_id}")
        # Last seen heater availability, so a dropout is logged once.
        self._heater_available = True
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
        intelligence.clock = self._now
        self.intel = IntelligenceStore(hass, entry.entry_id)
        self._away_eco_active = False
        self._preheat: dict[str, Any] | None = None
        self._heat_cycle_start: datetime | None = None
        self._heat_cycle_start_temp: float | None = None
        self._heat_cycle_house_called = False
        self._last_boiler_on = False
        # Hysteresis state: is the house currently calling for heat?
        self._house_calling = False
        # Manual setpoint while the schedule runs: {"temperature", "until"}.
        self._manual_hold: dict[str, Any] | None = None
        # False while the house schedule is in setback (rooms drop to Eco).
        self._house_comfort = True
        self._dirty_intel = False
        self._leaf: dict[str, Any] = {"active": False}
        self._safety_active = False
        self._time_to_temp: int | None = None
        self._seasonal_info: dict[str, Any] = {"active": False, "offset_c": 0.0}
        self._last_logged_setpoint: float | None = None
        self.data = self._snapshot()

    async def async_initialize_intelligence(self) -> None:
        await self.intel.async_load()
        self._restore_control()

    def _restore_control(self) -> None:
        """Bring back mode/preset/setpoints so a restart doesn't flip Off to Heat."""
        saved = self.intel.state.control or {}
        main = saved.get("main") or {}
        if main.get("hvac_mode") in ("heat", "off"):
            self._main_hvac_mode = main["hvac_mode"]
        if main.get("preset") in (PRESET_NONE, PRESET_ECO, PRESET_BOOST, PRESET_AWAY):
            self._main_preset = main["preset"]
        if isinstance(main.get("target"), (int, float)):
            self._main_target = float(main["target"])
        hold = main.get("manual_hold")
        if isinstance(hold, dict) and isinstance(hold.get("temperature"), (int, float)):
            self._manual_hold = hold
        for room_id, room in (saved.get("rooms") or {}).items():
            st = self._room_states.get(room_id)
            if st is None or not isinstance(room, dict):
                continue
            if room.get("hvac_mode") in ("heat", "off"):
                st["hvac_mode"] = room["hvac_mode"]
            if room.get("preset") in (PRESET_NONE, PRESET_ECO, PRESET_BOOST):
                st["preset"] = room["preset"]
            if isinstance(room.get("target"), (int, float)):
                st["target"] = float(room["target"])
            if isinstance(room.get("hold"), dict):
                st["hold"] = room["hold"]

    def _persist_control(self) -> None:
        self.intel.state.control = {
            "main": {
                "hvac_mode": self._main_hvac_mode,
                "preset": self._main_preset,
                "target": self._main_target,
                "manual_hold": self._manual_hold,
            },
            "rooms": {
                room_id: {
                    "hvac_mode": st.get("hvac_mode", "heat"),
                    "preset": st.get("preset", PRESET_NONE),
                    "target": st.get("target"),
                    "hold": st.get("hold"),
                }
                for room_id, st in self._room_states.items()
            },
        }
        self.intel.async_delay_save()

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
        # A new heater/sensor must be watched, or its changes go unnoticed
        # until the next 30s tick.
        if self._state_unsub is not None:
            self._subscribe_state_changes()
        if self._kiosk_unsub is not None:
            self._kiosk_subscribe()

    async def async_save_config(self, updates: dict[str, Any]) -> NeatConfig:
        if updates.get("seasonal_savings") is False:
            stop_seasonal_savings(self.intel.state.seasonal)
            self._dirty_intel = True
            await self.intel.async_save()
            self._dirty_intel = False
        old_heater = self.config.heater
        new_heater = updates.get("heater")
        if new_heater and old_heater and new_heater != old_heater:
            # Don't leave the old relay calling for heat once Neat lets go of it.
            await self._async_switch_heater(old_heater, False)
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

    async def async_reset_warmup(self) -> None:
        """Forget the learned warm-up rate and coast (e.g. learned while the boiler was faulty)."""
        self.intel.state.warmup = WarmupModel()
        self.intel.state.coast_watch.clear()
        self.intel.state.recent_cycles = []
        await self.intel.async_save()
        await self.async_request_refresh()

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
                "manual_hold": self._manual_hold,
            },
            "rooms": {k: dict(v) for k, v in self._room_states.items()},
            "away": self._away_eco_active,
            "window_open": self._any_window_open(self.config.window_sensors),
            "summer_mode": self.config.summer_mode,
            "preheat": self._preheat,
            "leaf": self._leaf,
            "safety_active": self._safety_active,
            "time_to_temp_minutes": self._time_to_temp,
            "heating_fault": self._heating_fault_info(),
            "seasonal_savings": self._seasonal_info,
            "intelligence": {
                "true_radiant": self.config.true_radiant,
                "auto_schedule": self.config.auto_schedule,
                "away_delay_minutes": self.config.away_delay_minutes,
                "warmup_c_per_hour": self.intel.state.warmup.c_per_hour,
                "warmup_samples": self.intel.state.warmup.samples,
                "coast_c": self.intel.state.warmup.coast_c,
                "coast_samples": self.intel.state.warmup.coast_samples,
                "leaf_enabled": self.config.leaf_enabled,
                "safety_temp_enabled": self.config.safety_temp_enabled,
                "seasonal_savings": self.config.seasonal_savings,
                "adaptive_comfort": self.config.adaptive_comfort,
            },
        }

    def _heating_fault_info(self) -> dict[str, Any] | None:
        check = self.intel.state.heat_check
        if not check.fault_since:
            return None
        return {
            "since": check.fault_since,
            "on_minutes": round(check.on_minutes),
            "rise_c": round(check.total_rise(), 1),
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
        prev_since = self.intel.state.away_since
        self.intel.state, self._away_eco_active = update_away_tracking(
            self.intel.state,
            anyone_home=anyone,
            delay_minutes=self.config.away_delay_minutes,
        )
        if self.intel.state.away_since != prev_since:
            self._dirty_intel = True

    def _eco_target(self, base: float) -> float:
        """Eco/Away setpoint, never within 1 °C of the safety floor."""
        floor = float(self.config.safety_min_temp) + 1.0
        return max(floor, round(base, 1))

    def effective_main_target(self) -> tuple[float, bool]:
        """Return (target_temp, schedule_or_preheat_active)."""
        outdoor = self._state_float(self.config.outdoor_temp_sensor)
        seasonal = self.intel.state.seasonal
        # Seasonal Savings only lowers schedule blocks; it needs the schedule.
        self._seasonal_info, stepped = seasonal_savings_step(
            seasonal,
            self.config.schedule,
            enabled=self.config.seasonal_savings and self.config.schedule_enabled,
            now=self._now(),
        )
        if stepped:
            self._dirty_intel = True

        self._preheat = None
        self._house_comfort = True
        if self._main_preset == PRESET_BOOST:
            return self.config.boost_temp, False

        self._house_comfort = False
        if self._away_eco_active or self._main_preset == PRESET_AWAY:
            return self._eco_target(self.config.away_temp), False
        if self._main_preset == PRESET_ECO:
            return self._eco_target(self.config.eco_temp), False

        if self.config.schedule_enabled and self._main_preset == PRESET_NONE:
            now = self._now()
            hold = self._active_hold(self._manual_hold, now)
            if hold is not None:
                self._house_comfort = True
                return hold, False
            if self._manual_hold is not None:
                self._manual_hold = None
                self._persist_control()
            temp, active = scheduled_temperature(
                self.config.schedule,
                schedule_enabled=True,
                eco_fallback=self.config.eco_temp,
                now=now,
            )
            if active:
                self._house_comfort = True
                key = active_block_key(self.config.schedule, now)
                return round(temp + seasonal_offset(seasonal, key), 1), True

            status = preheat_status(
                self.config.schedule,
                schedule_enabled=True,
                true_radiant=self.config.true_radiant,
                current_temp=self._state_float(self.config.temperature_sensor),
                warmup=self.intel.state.warmup,
                outdoor_temp=outdoor,
                away_eco_active=self._away_eco_active,
                cycles=self.intel.state.recent_cycles,
                max_minutes=(
                    LONG_PREHEAT_MINUTES if self.config.adaptive_comfort else MAX_PREHEAT_MINUTES
                ),
                offsets=seasonal.offsets if seasonal.started_at else None,
                now=now,
            )
            self._preheat = status
            if status and status.get("preheating"):
                self._house_comfort = True
                return float(status["temperature"]), True
            # Schedule eco fallback
            return self._eco_target(float(temp)), False

        self._house_comfort = True
        return self._main_target, False

    def _seasonal_block_now(self) -> str | None:
        """The schedule block Seasonal Savings is lowering right now (running or preheating)."""
        if not self.intel.state.seasonal.started_at or self._main_preset != PRESET_NONE:
            return None
        key = active_block_key(self.config.schedule, self._now())
        if key is None and (self._preheat or {}).get("preheating"):
            key = self._preheat.get("block_key")
        return key

    async def _async_finish_seasonal(self) -> None:
        """Seasonal Savings ran its course: keep the result in the schedule."""
        seasonal = self.intel.state.seasonal
        schedule, count = seasonal_bake(self.config.schedule, seasonal)
        lowest = min(seasonal.offsets.values(), default=0.0)
        kept = len(seasonal.kept)
        await self.async_save_config({"schedule": schedule, "seasonal_savings": False})
        message = (
            f"Seasonal Savings has finished. {count} schedule block"
            f"{'' if count == 1 else 's'} now run up to {abs(lowest):.1f}°C cooler"
            + (f"; {kept} you turned up were eased off and left there" if kept else "")
            + ". The new temperatures are in your schedule — change them there any time."
        )
        _LOGGER.info("Neat: %s", message)
        persistent_notification.async_create(
            self.hass,
            message,
            title="Neat: Seasonal Savings finished",
            notification_id=f"{DOMAIN}_seasonal_{self.entry.entry_id}",
        )

    @staticmethod
    def _now() -> datetime:
        """Wall-clock time in HA's configured zone (the OS clock may be UTC)."""
        return dt_util.now().replace(tzinfo=None)

    @staticmethod
    def _active_hold(hold: dict[str, Any] | None, now: datetime) -> float | None:
        """Manual setpoint that overrides the schedule until its next change."""
        if not hold:
            return None
        until = hold.get("until")
        if until:
            try:
                if now >= datetime.fromisoformat(until):
                    return None
            except ValueError:
                return None
        return float(hold["temperature"])

    def _new_hold(self, temperature: float) -> dict[str, Any]:
        until = next_schedule_change(self.config.schedule, self._now())
        return {
            "temperature": temperature,
            "until": until.isoformat() if until else None,
        }

    def clear_holds(self) -> None:
        """Drop manual holds (their expiry was computed from the old schedule)."""
        self._manual_hold = None
        for st in self._room_states.values():
            st.pop("hold", None)
        self._persist_control()

    def effective_room_target(self, room: RoomConfig) -> float:
        st = self._room_states.get(room.id, {})
        preset = st.get("preset", PRESET_NONE)
        if preset == PRESET_BOOST:
            return room.boost_temp
        if preset == PRESET_ECO or self._away_eco_active:
            return self._eco_target(room.eco_temp)
        if not self.config.schedule_enabled:
            return float(st.get("target", room.target_temp))
        # Rooms follow the house schedule: own comfort temp while the house is
        # in a comfort block (or preheating / held), own Eco temp in setback.
        hold = self._active_hold(st.get("hold"), self._now())
        if hold is not None:
            return hold
        if self._house_comfort:
            return float(room.target_temp)
        return self._eco_target(room.eco_temp)

    def room_hold_until(self, room: RoomConfig) -> str | None:
        """When a manual room setpoint hands back to the schedule (ISO), if one is in force."""
        st = self._room_states.get(room.id, {})
        if not self.config.schedule_enabled or st.get("preset", PRESET_NONE) != PRESET_NONE:
            return None
        if self._away_eco_active:
            return None
        hold = st.get("hold")
        if self._active_hold(hold, self._now()) is None:
            return None
        return hold.get("until")

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
        return room_calls_for_heat(
            current,
            self.effective_room_target(room),
            was_calling=bool(st.get("needs_heat")),
            cold_tolerance=self.config.cold_tolerance,
            hot_tolerance=self.config.hot_tolerance,
        )

    def safety_needs_heat(self) -> bool:
        if not self.config.safety_temp_enabled:
            return False
        current = self._state_float(self.config.temperature_sensor)
        if current is None:
            return False
        return current <= float(self.config.safety_min_temp)

    def main_needs_heat(self) -> bool:
        """House call for heat (safety floor handled separately)."""
        if self._main_hvac_mode != "heat" or self.config.summer_mode:
            return False
        if self._any_window_open(self.config.window_sensors):
            return False
        current = self._state_float(self.config.temperature_sensor)
        target, _ = self.effective_main_target()
        return house_calls_for_heat(
            current,
            target,
            was_calling=self._house_calling,
            cold_tolerance=self.config.cold_tolerance,
            hot_tolerance=self.config.hot_tolerance,
            true_radiant=self.config.true_radiant,
            coast_c=self.intel.state.warmup.coast_c,
        )

    def _heater_is_available(self) -> bool:
        if not self.config.heater:
            return False
        state = self.hass.states.get(self.config.heater)
        return state is not None and state.state not in ("unknown", "unavailable")

    async def _async_set_heater(self, turn_on: bool) -> None:
        heater = self.config.heater
        if not heater or not self._heater_is_available():
            return
        if self._is_on(heater) == turn_on:
            return
        await self._async_switch_heater(heater, turn_on)

    async def _async_switch_heater(self, heater: str, turn_on: bool) -> None:
        _LOGGER.info(
            "Neat: turning heater %s %s", heater, "on" if turn_on else "off"
        )
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
        trv = self.hass.states.get(room.trv_entity)
        if trv is None or trv.state in ("unknown", "unavailable"):
            return
        # Only send commands when the TRV differs: TRVs are in our listener
        # list, so unconditional calls every tick loop back into refreshes
        # and flood battery Zigbee valves.
        if self.config.summer_mode or window or mode != "heat":
            if trv.state != "off":
                await self.hass.services.async_call(
                    "climate",
                    "set_hvac_mode",
                    {"entity_id": room.trv_entity, "hvac_mode": "off"},
                    blocking=False,
                )
            return
        try:
            trv_target = float(trv.attributes.get("temperature"))
        except (TypeError, ValueError):
            trv_target = None
        if trv_target is None or abs(trv_target - target) >= 0.05:
            await self.hass.services.async_call(
                "climate",
                "set_temperature",
                {"entity_id": room.trv_entity, "temperature": target},
                blocking=False,
            )
        if trv.state != "heat":
            await self.hass.services.async_call(
                "climate",
                "set_hvac_mode",
                {"entity_id": room.trv_entity, "hvac_mode": "heat"},
                blocking=False,
            )

    def _apply_cycle_guard(self, demand: bool) -> tuple[bool, float]:
        """Hold the boiler in its current state until min on/off time has passed."""
        state = self.hass.states.get(self.config.heater) if self.config.heater else None
        if state is None or state.state in ("unknown", "unavailable"):
            return demand, 0.0
        seconds = (dt_util.utcnow() - state.last_changed).total_seconds()
        command, wait = boiler_cycle_guard(
            demand,
            self._is_on(self.config.heater),
            seconds,
            min_on_seconds=self.config.min_on_minutes * 60.0,
            min_off_seconds=self.config.min_off_minutes * 60.0,
        )
        if command != demand:
            _LOGGER.debug(
                "Neat: boiler %s held for %.0fs (anti-short-cycle)",
                "on" if command else "off",
                wait,
            )
        return command, wait

    def _track_heat_cycle(self, want_heat: bool) -> None:
        now = datetime.now()
        current = self._state_float(self.config.temperature_sensor)
        outdoor = self._state_float(self.config.outdoor_temp_sensor)
        if want_heat and not self._last_boiler_on:
            self._heat_cycle_start = now
            self._heat_cycle_start_temp = current
            self._heat_cycle_house_called = False
        if want_heat and (self._house_calling or self._safety_active):
            self._heat_cycle_house_called = True
        elif not want_heat and self._last_boiler_on and self._heat_cycle_start:
            # A boiler that isn't heating would teach Neat a bogus warm-up rate,
            # and a run only the rooms wanted may not reach the house sensor.
            faulty = self.intel.state.heat_check.fault_since is not None
            if (
                current is not None
                and self._heat_cycle_start_temp is not None
                and not faulty
                and self._heat_cycle_house_called
            ):
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

    def _track_coast(self, heating: bool) -> None:
        """Measure how far the house keeps warming after each run (True Radiant)."""
        watch = self.intel.state.coast_watch
        before = watch.to_dict()
        learned = update_coast_watch(
            watch,
            self.intel.state.warmup,
            boiler_on=heating,
            house_calling=self._house_calling or self._safety_active,
            current_temp=self._state_float(self.config.temperature_sensor),
            disturbed=self._any_window_open(self.config.window_sensors),
            # A boiler that isn't heating has no coast to learn.
            learn=self.intel.state.heat_check.fault_since is None,
            now=self._now(),
        )
        if learned is not None:
            _LOGGER.info(
                "Neat: radiator coast now %.2f°C (%d runs)",
                learned.coast_c,
                learned.coast_samples,
            )
            self.intel.state.warmup = learned
        if learned is not None or watch.to_dict() != before:
            self._dirty_intel = True

    async def _async_check_warming(self, house_heating: bool) -> None:
        """Flag (and notify) when boiler time isn't warming the house."""
        check = self.intel.state.heat_check
        before = {k: v for k, v in check.to_dict().items() if k != "last_tick"}
        current = self._state_float(self.config.temperature_sensor)
        event = update_heat_check(
            check,
            heating=house_heating,
            current_temp=current,
            alert_minutes=(
                self.config.no_heat_alert_minutes if self.config.no_heat_alert else 0
            ),
            now=self._now(),
        )
        if event is not None:
            # Alerts must survive a restart straight after they fire.
            await self.intel.async_save()
        elif {k: v for k, v in check.to_dict().items() if k != "last_tick"} != before:
            self._dirty_intel = True
        if event == "fault":
            await self._async_alert_not_warming(current)
        elif event == "recovered":
            await self._async_alert_warming_again(current)

    def _alert_id(self) -> str:
        return f"{DOMAIN}_not_warming_{self.entry.entry_id}"

    async def _async_alert_not_warming(self, current: float | None) -> None:
        check = self.intel.state.heat_check
        target, _ = self.effective_main_target()
        minutes = round(check.on_minutes)
        rise = round(check.total_rise(), 1)
        title = "Neat: the house isn't warming up"
        message = (
            f"The boiler has been called for {minutes} minutes but the house has "
            f"only warmed {rise:.1f}°C"
            + (f" (now {current:.1f}°C, target {target:.1f}°C)" if current is not None else "")
            + ". Check the boiler is firing: power, pressure, any fault code, "
            "and the call-for-heat relay wiring."
        )
        _LOGGER.warning("Neat: %s — %s", title, message)
        persistent_notification.async_create(
            self.hass, message, title=title, notification_id=self._alert_id()
        )
        self.hass.bus.async_fire(
            f"{DOMAIN}_heating_fault",
            {"on_minutes": minutes, "rise_c": rise, "temperature": current, "target": target},
        )
        await self._async_notify_phones(title, message)

    async def _async_alert_warming_again(self, current: float | None) -> None:
        title = "Neat: heating is working again"
        message = "The house is warming up again" + (
            f" ({current:.1f}°C now)." if current is not None else "."
        )
        _LOGGER.info("Neat: %s", message)
        persistent_notification.async_dismiss(self.hass, self._alert_id())
        self.hass.bus.async_fire(f"{DOMAIN}_heating_recovered", {"temperature": current})
        await self._async_notify_phones(title, message)

    async def _async_notify_phones(self, title: str, message: str) -> None:
        for service in self.config.alert_notify:
            if not self.hass.services.has_service("notify", service):
                _LOGGER.warning("Neat: notify.%s doesn't exist — alert not sent there", service)
                continue
            try:
                await self.hass.services.async_call(
                    "notify",
                    service,
                    # Same tag: the "working again" message replaces the alert.
                    {"title": title, "message": message, "data": {"tag": "neat_heating"}},
                    blocking=False,
                )
            except Exception:  # noqa: BLE001 — one bad phone mustn't stop the loop
                _LOGGER.exception("Neat: couldn't send alert via notify.%s", service)

    async def _maybe_learn_schedule(self) -> None:
        if not self.config.auto_schedule:
            return
        before = len(self.intel.state.adjustments)
        new_schedule, changed = learn_schedule_from_adjustments(
            self.config.schedule,
            self.intel.state,
            auto_schedule=True,
            eco_temp=self.config.eco_temp,
        )
        if len(self.intel.state.adjustments) != before:
            self.intel.async_delay_save()  # old adjustments were forgotten
        if changed:
            _LOGGER.info("Auto-Schedule updated house weekly schedule from adjustments")
            await self.async_save_config({"schedule": new_schedule})

    async def _async_update_data(self) -> dict[str, Any]:
        self._refresh_away()
        self.effective_main_target()
        if self._seasonal_info.get("finished"):
            await self._async_finish_seasonal()
            self.effective_main_target()

        for room in self.config.rooms:
            needs = self.room_needs_heat(room)
            self._room_states.setdefault(room.id, {})["needs_heat"] = needs
            await self._async_sync_room_trv(room)

        self._safety_active = self.safety_needs_heat()
        self._house_calling = self.main_needs_heat()
        rooms_calling = any(
            self._room_states.get(r.id, {}).get("needs_heat")
            for r in self.config.rooms
        )
        demand = self._safety_active or (
            not self.config.summer_mode and (self._house_calling or rooms_calling)
        )
        want_heat, cycle_wait = self._apply_cycle_guard(demand)

        heater_available = self._heater_is_available()
        if heater_available != self._heater_available:
            if heater_available:
                _LOGGER.info("Neat: heater %s is available again", self.config.heater)
            else:
                _LOGGER.warning(
                    "Neat: heater %s is unavailable — the boiler cannot be switched",
                    self.config.heater or "(none set)",
                )
            self._heater_available = heater_available
        # An unavailable relay can't be switched: don't report or learn from
        # heat that never happened.
        heating = want_heat and heater_available

        self._track_heat_cycle(heating)
        if track_heat_interval(self.intel.state.energy, want_heat=heating):
            self._dirty_intel = True
        await self._async_check_warming(
            heating and (self._house_calling or self._safety_active)
        )
        self._track_coast(heating)

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
            heating=heating or (preheating and heater_available),
            hvac_mode=self._main_hvac_mode,
        )

        if self._dirty_intel:
            self.intel.async_delay_save()
            self._dirty_intel = False

        self.data = self._snapshot()
        self.data["boiler_on"] = heating
        self.data["boiler_demand"] = demand
        self.data["boiler_cycle_wait_seconds"] = round(cycle_wait)
        self.data["heater_available"] = heater_available
        self.data["main"]["effective_target"] = target
        self.data["main"]["schedule_active"] = _sched
        return self.data

    @callback
    def set_main_hvac_mode(self, mode: str) -> None:
        self._main_hvac_mode = mode
        self._persist_control()
        self.hass.async_create_task(self.async_request_refresh())

    @callback
    def set_main_temperature(self, temperature: float) -> None:
        before, _ = self.effective_main_target()
        if temperature > before and seasonal_push_back(
            self.intel.state.seasonal, self._seasonal_block_now()
        ):
            _LOGGER.info("Neat: Seasonal Savings eases off this block (turned up)")
        self._main_target = temperature
        self._main_preset = PRESET_NONE
        if self.config.schedule_enabled:
            # A dial change holds until the next schedule change.
            self._manual_hold = self._new_hold(temperature)
        self._persist_control()
        record_manual_adjustment(self.intel.state, temperature)
        if temperature > self.config.eco_temp:
            # Turning down to save energy mustn't drag the comfort baseline down.
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
        self._manual_hold = None
        self._persist_control()
        self.hass.async_create_task(self.async_request_refresh())

    @callback
    def set_room_hvac_mode(self, room_id: str, mode: str) -> None:
        self._room_states.setdefault(room_id, {})["hvac_mode"] = mode
        self._persist_control()
        self.hass.async_create_task(self.async_request_refresh())

    @callback
    def set_room_temperature(self, room_id: str, temperature: float) -> None:
        st = self._room_states.setdefault(room_id, {})
        st["target"] = temperature
        st["preset"] = PRESET_NONE
        if self.config.schedule_enabled:
            st["hold"] = self._new_hold(temperature)
        self._persist_control()
        self.hass.async_create_task(self.async_request_refresh())

    @callback
    def set_room_preset(self, room_id: str, preset: str) -> None:
        self._room_states.setdefault(room_id, {})["preset"] = preset or PRESET_NONE
        self._persist_control()
        self.hass.async_create_task(self.async_request_refresh())

    def get_wall_panel(self, panel_id: str) -> WallPanelConfig | None:
        for panel in self.config.wall_panels:
            if panel.id == panel_id:
                return panel
        return None

    # Live control values: entities read these so a change shows at once,
    # not after the next (debounced) coordinator refresh.
    @property
    def main_hvac_mode(self) -> str:
        return self._main_hvac_mode

    @property
    def main_preset(self) -> str:
        return self._main_preset

    def room_control(self, room_id: str) -> dict[str, Any]:
        return self._room_states.get(room_id, {})

    def neat_entity_id(self, unique_id: str) -> str | None:
        """Real entity id of a Neat climate. HA picks the id (e.g. climate.neat_thermostat_neat_home),
        so never assume climate.neat_<x> — that name can belong to some other integration."""
        return er.async_get(self.hass).async_get_entity_id("climate", DOMAIN, unique_id)

    def _wall_primary(self, configured: str) -> str:
        """The panel's main climate. Blank, or the old hard-coded default "climate.neat_home"
        when that isn't actually Neat's entity, means Neat's house climate."""
        home = self.neat_entity_id("neat_home")
        if not configured:
            return home or "climate.neat_home"
        if configured == "climate.neat_home" and home and home != configured:
            entry = er.async_get(self.hass).async_get(configured)
            if entry is None or entry.platform != DOMAIN:
                return home
        return configured

    def wall_panel_payload(self, panel_id: str) -> dict[str, Any] | None:
        panel = self.get_wall_panel(panel_id)
        if panel is None:
            return None
        primary = self._wall_primary(panel.primary_entity)
        # Always mirror current Neat rooms so newly added rooms show on panels
        # without re-saving the wall panel. Prefer Neat room climates; fall back
        # to the TRV entity if a room climate isn't registered.
        rooms = []
        for room in self.config.rooms:
            if room.enabled is False:
                continue
            entity = (self.neat_entity_id(f"neat_{room.id}") if room.id else None) or room.trv_entity or ""
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

    def _tracked_entities(self) -> tuple[str, ...]:
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
        return tuple(sorted({e for e in entities if e}))

    @callback
    def _subscribe_state_changes(self) -> None:
        entities = self._tracked_entities()
        if self._state_unsub is not None and entities == self._watched:
            return
        if self._state_unsub is not None:
            self._state_unsub()

        @callback
        def _on_state(_event: Any) -> None:
            self.hass.async_create_task(self.async_request_refresh())

        self._watched = entities
        self._state_unsub = (
            async_track_state_change_event(self.hass, list(entities), _on_state)
            if entities
            else (lambda: None)
        )

    # ---- Fully Kiosk wall panels ----
    def kiosk_status(self) -> dict[str, Any]:
        return {
            "devices": kiosk.fully_devices(self.hass),
            "defaults": self.config.kiosk_defaults,
            "auto_sync": self.config.kiosk_auto_sync,
            "panels": {
                p.id: kiosk.panel_status(self.hass, p, self.config.kiosk_defaults) for p in self.config.wall_panels
            },
        }

    async def async_kiosk_apply(self, panel_id: str | None = None, *, force: bool = True) -> dict[str, list[str]]:
        """Push settings to one panel (or all linked panels)."""
        out: dict[str, list[str]] = {}
        for panel in self.config.wall_panels:
            if panel_id and panel.id != panel_id:
                continue
            if not panel.kiosk_device:
                continue
            try:
                out[panel.id] = await kiosk.async_apply(self.hass, panel, self.config.kiosk_defaults, force=force)
            except Exception as err:  # noqa: BLE001 - one bad panel mustn't stop the rest
                _LOGGER.warning("Neat: couldn't sync wall panel %s: %s", panel.id, err)
                out[panel.id] = [f"error: {err}"]
        return out

    def _kiosk_subscribe(self) -> None:
        watched: dict[str, str] = {}
        for panel in self.config.wall_panels:
            if panel.kiosk_device:
                for entity_id in kiosk.device_entities(self.hass, panel.kiosk_device).values():
                    watched[entity_id] = panel.id
        if self._kiosk_unsub is not None and watched == self._kiosk_watched:
            return
        if self._kiosk_unsub is not None:
            self._kiosk_unsub()

        @callback
        def _on_state(event: Any) -> None:
            panel_id = self._kiosk_watched.get(event.data.get("entity_id"))
            if not panel_id or not self.config.kiosk_auto_sync:
                return
            old = event.data.get("old_state")
            new = event.data.get("new_state")
            came_back = (old is None or old.state == "unavailable") and new is not None and new.state != "unavailable"
            # Back online: re-apply everything soon (it may have lost settings or rebooted).
            self._kiosk_schedule(panel_id, delay=5 if came_back else 10, force=came_back)

        self._kiosk_watched = watched
        self._kiosk_unsub = (
            async_track_state_change_event(self.hass, list(watched), _on_state) if watched else (lambda: None)
        )

    @callback
    def _kiosk_schedule(self, panel_id: str, *, delay: float, force: bool = False) -> None:
        """Debounced sync of one panel; backs off while a panel keeps refusing a setting."""
        if panel_id in self._kiosk_timers:
            return
        attempts = self._kiosk_attempts.get(panel_id, 0)
        wait = delay if attempts == 0 else min(1800, 60 * 2 ** (attempts - 1))

        async def _run(_now: Any) -> None:
            self._kiosk_timers.pop(panel_id, None)
            panel = self.get_wall_panel(panel_id)
            if panel is None or not panel.kiosk_device or not self.config.kiosk_auto_sync:
                return
            status = kiosk.panel_status(self.hass, panel, self.config.kiosk_defaults)
            if not status.get("online"):
                return
            if status.get("in_sync") and not force:
                self._kiosk_attempts[panel_id] = 0
                return
            await self.async_kiosk_apply(panel_id, force=force)
            after = kiosk.panel_status(self.hass, panel, self.config.kiosk_defaults)
            self._kiosk_attempts[panel_id] = 0 if after.get("in_sync") else attempts + 1

        self._kiosk_timers[panel_id] = async_call_later(self.hass, wait, _run)

    async def async_kiosk_version_refresh(self) -> list[str]:
        """Once per new wall app version: clear each linked panel's cache and reload it.

        The app reloads itself on a new version, but only Fully's own button can clear the
        browser cache (stale files caused glitches). The version is saved, so this runs once
        per update, not on every restart."""
        from .panel import WWW_DIR

        version = await self.hass.async_add_executor_job(kiosk.bundled_wall_version, WWW_DIR)
        if not version:
            return []
        stored = await self._kiosk_store.async_load() or {}
        if stored.get("wall_version") == version:
            return []
        refreshed: list[str] = []
        for panel in self.config.wall_panels:
            if not panel.kiosk_device:
                continue
            status = kiosk.panel_status(self.hass, panel, self.config.kiosk_defaults)
            if not status.get("online") or not status.get("expected_url"):
                continue
            try:
                await kiosk.async_fresh_load(self.hass, panel.kiosk_device, status["expected_url"])
                refreshed.append(panel.id)
            except Exception as err:  # noqa: BLE001
                _LOGGER.warning("Neat: couldn't refresh wall panel %s: %s", panel.id, err)
        await self._kiosk_store.async_save({"wall_version": version})
        if refreshed:
            _LOGGER.info("Neat: wall app %s — cleared cache and reloaded %s", version, ", ".join(refreshed))
        return refreshed

    async def async_setup_listeners(self) -> None:
        self._subscribe_state_changes()
        self._kiosk_subscribe()

        @callback
        def _version_check(_now: Any) -> None:
            self.hass.async_create_task(self.async_kiosk_version_refresh())

        # Give the Fully Kiosk entities time to come up after a restart.
        self._unsubs.append(async_call_later(self.hass, 30, _version_check))

        @callback
        def _kiosk_check(_now: Any) -> None:
            # Safety net: catch drift on settings HA can only read occasionally.
            for panel in self.config.wall_panels:
                if panel.kiosk_device:
                    self._kiosk_schedule(panel.id, delay=1)

        self._unsubs.append(async_track_time_interval(self.hass, _kiosk_check, timedelta(minutes=10)))

        # @callback keeps it on the event loop; without it HA runs it in a worker thread, where
        # async_create_task is refused and the refresh coroutine is dropped (never awaited).
        @callback
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
        if self._state_unsub is not None:
            self._state_unsub()
            self._state_unsub = None
        if self._kiosk_unsub is not None:
            self._kiosk_unsub()
            self._kiosk_unsub = None
        for cancel in self._kiosk_timers.values():
            cancel()
        self._kiosk_timers.clear()
