"""Climate entities for Neat Thermostat."""

from __future__ import annotations

from typing import Any

from homeassistant.components.climate import (
    ClimateEntity,
    ClimateEntityFeature,
    HVACAction,
    HVACMode,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    ATTR_AWAY_MODE,
    ATTR_PREHEAT_FOR,
    ATTR_PREHEATING,
    ATTR_SCHEDULE_ACTIVE,
    ATTR_SUMMER_MODE,
    ATTR_TRUE_RADIANT,
    ATTR_WINDOW_OPEN,
    DOMAIN,
    PRESET_AWAY,
    PRESET_BOOST,
    PRESET_ECO,
    PRESET_NONE,
)
from .coordinator import NeatThermostatCoordinator
from .models import RoomConfig


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: NeatThermostatCoordinator = hass.data[DOMAIN][entry.entry_id][
        "coordinator"
    ]
    entities: list[ClimateEntity] = [NeatHomeClimate(coordinator)]
    for room in coordinator.config.rooms:
        entities.append(NeatRoomClimate(coordinator, room))
    async_add_entities(entities)


class NeatHomeClimate(CoordinatorEntity[NeatThermostatCoordinator], ClimateEntity):
    """House-level Neat climate (boiler demand + schedule)."""

    _attr_name = "Neat Home"
    _attr_unique_id = "neat_home"
    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_supported_features = (
        ClimateEntityFeature.TARGET_TEMPERATURE
        | ClimateEntityFeature.PRESET_MODE
        | ClimateEntityFeature.TURN_ON
        | ClimateEntityFeature.TURN_OFF
    )
    _attr_hvac_modes = [HVACMode.HEAT, HVACMode.OFF]
    _attr_preset_modes = [PRESET_NONE, PRESET_ECO, PRESET_BOOST, PRESET_AWAY]

    def __init__(self, coordinator: NeatThermostatCoordinator) -> None:
        super().__init__(coordinator)
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.entry.entry_id)},
            "name": "Neat Thermostat",
            "manufacturer": "Neat",
            "model": "Thermostat Hub",
        }

    @property
    def min_temp(self) -> float:
        return self.coordinator.config.min_temp

    @property
    def max_temp(self) -> float:
        return self.coordinator.config.max_temp

    @property
    def target_temperature_step(self) -> float:
        return 0.5

    @property
    def current_temperature(self) -> float | None:
        return self.coordinator._state_float(  # noqa: SLF001
            self.coordinator.config.temperature_sensor
        )

    @property
    def target_temperature(self) -> float | None:
        temp, _ = self.coordinator.effective_main_target()
        return temp

    @property
    def hvac_mode(self) -> HVACMode:
        mode = self.coordinator.data.get("main", {}).get("hvac_mode", "heat")
        return HVACMode.HEAT if mode == "heat" else HVACMode.OFF

    @property
    def hvac_action(self) -> HVACAction | None:
        if self.hvac_mode == HVACMode.OFF:
            return HVACAction.OFF
        if self.coordinator.data.get("summer_mode"):
            return HVACAction.OFF
        if self.coordinator.data.get("window_open"):
            return HVACAction.OFF
        if self.coordinator.data.get("boiler_on"):
            return HVACAction.HEATING
        return HVACAction.IDLE

    @property
    def preset_mode(self) -> str | None:
        if self.coordinator.data.get("away"):
            return PRESET_AWAY
        return self.coordinator.data.get("main", {}).get("preset", PRESET_NONE)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        _, schedule_active = self.coordinator.effective_main_target()
        preheat = self.coordinator.data.get("preheat") or {}
        return {
            ATTR_WINDOW_OPEN: bool(self.coordinator.data.get("window_open")),
            ATTR_SUMMER_MODE: bool(self.coordinator.data.get("summer_mode")),
            ATTR_SCHEDULE_ACTIVE: schedule_active,
            ATTR_AWAY_MODE: bool(self.coordinator.data.get("away")),
            ATTR_TRUE_RADIANT: bool(self.coordinator.config.true_radiant),
            ATTR_PREHEATING: bool(preheat.get("preheating")),
            ATTR_PREHEAT_FOR: preheat.get("block_start") if preheat.get("preheating") else None,
            "boiler_on": bool(self.coordinator.data.get("boiler_on")),
            "warmup_c_per_hour": self.coordinator.intel.state.warmup.c_per_hour,
        }

    async def async_set_temperature(self, **kwargs: Any) -> None:
        temperature = kwargs.get(ATTR_TEMPERATURE)
        if temperature is None:
            return
        self.coordinator.set_main_temperature(float(temperature))

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        self.coordinator.set_main_hvac_mode(
            "heat" if hvac_mode == HVACMode.HEAT else "off"
        )

    async def async_set_preset_mode(self, preset_mode: str) -> None:
        self.coordinator.set_main_preset(preset_mode)

    async def async_turn_on(self) -> None:
        await self.async_set_hvac_mode(HVACMode.HEAT)

    async def async_turn_off(self) -> None:
        await self.async_set_hvac_mode(HVACMode.OFF)


class NeatRoomClimate(CoordinatorEntity[NeatThermostatCoordinator], ClimateEntity):
    """Per-room Neat climate wrapping a TRV."""

    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_supported_features = (
        ClimateEntityFeature.TARGET_TEMPERATURE
        | ClimateEntityFeature.PRESET_MODE
        | ClimateEntityFeature.TURN_ON
        | ClimateEntityFeature.TURN_OFF
    )
    _attr_hvac_modes = [HVACMode.HEAT, HVACMode.OFF]
    _attr_preset_modes = [PRESET_NONE, PRESET_ECO, PRESET_BOOST]

    def __init__(
        self, coordinator: NeatThermostatCoordinator, room: RoomConfig
    ) -> None:
        super().__init__(coordinator)
        self._room = room
        self._attr_name = f"Neat {room.name}"
        self._attr_unique_id = f"neat_{room.id}"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.entry.entry_id)},
            "name": "Neat Thermostat",
            "manufacturer": "Neat",
            "model": "Thermostat Hub",
        }

    @property
    def room(self) -> RoomConfig:
        for room in self.coordinator.config.rooms:
            if room.id == self._room.id:
                return room
        return self._room

    @property
    def min_temp(self) -> float:
        return self.coordinator.config.min_temp

    @property
    def max_temp(self) -> float:
        return self.coordinator.config.max_temp

    @property
    def target_temperature_step(self) -> float:
        return 0.5

    @property
    def current_temperature(self) -> float | None:
        return self.coordinator.room_current_temp(self.room)

    @property
    def target_temperature(self) -> float | None:
        return self.coordinator.effective_room_target(self.room)

    @property
    def hvac_mode(self) -> HVACMode:
        mode = (
            self.coordinator.data.get("rooms", {})
            .get(self.room.id, {})
            .get("hvac_mode", "heat")
        )
        return HVACMode.HEAT if mode == "heat" else HVACMode.OFF

    @property
    def hvac_action(self) -> HVACAction | None:
        if self.hvac_mode == HVACMode.OFF:
            return HVACAction.OFF
        if self.coordinator.config.summer_mode:
            return HVACAction.OFF
        if self.coordinator._any_window_open(self.room.window_sensors):  # noqa: SLF001
            return HVACAction.OFF
        if self.coordinator.room_needs_heat(self.room):
            return HVACAction.HEATING
        return HVACAction.IDLE

    @property
    def preset_mode(self) -> str | None:
        return (
            self.coordinator.data.get("rooms", {})
            .get(self.room.id, {})
            .get("preset", PRESET_NONE)
        )

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            ATTR_WINDOW_OPEN: self.coordinator._any_window_open(  # noqa: SLF001
                self.room.window_sensors
            ),
            ATTR_SUMMER_MODE: bool(self.coordinator.config.summer_mode),
            "trv_entity": self.room.trv_entity,
            "needs_heat": bool(
                self.coordinator.data.get("rooms", {})
                .get(self.room.id, {})
                .get("needs_heat")
            ),
        }

    async def async_set_temperature(self, **kwargs: Any) -> None:
        temperature = kwargs.get(ATTR_TEMPERATURE)
        if temperature is None:
            return
        self.coordinator.set_room_temperature(self.room.id, float(temperature))

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        self.coordinator.set_room_hvac_mode(
            self.room.id, "heat" if hvac_mode == HVACMode.HEAT else "off"
        )

    async def async_set_preset_mode(self, preset_mode: str) -> None:
        self.coordinator.set_room_preset(self.room.id, preset_mode)

    async def async_turn_on(self) -> None:
        await self.async_set_hvac_mode(HVACMode.HEAT)

    async def async_turn_off(self) -> None:
        await self.async_set_hvac_mode(HVACMode.OFF)

    @callback
    def _handle_coordinator_update(self) -> None:
        self._room = self.room
        super()._handle_coordinator_update()
