"""Data models for Neat Thermostat."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from .const import (
    DAYS,
    DEFAULT_ADAPTIVE_COMFORT,
    DEFAULT_AUTO_SCHEDULE,
    DEFAULT_AWAY_DELAY_MINUTES,
    DEFAULT_AWAY_TEMP,
    DEFAULT_BOOST_TEMP,
    DEFAULT_COLD_TOLERANCE,
    DEFAULT_ECO_TEMP,
    DEFAULT_HOT_TOLERANCE,
    DEFAULT_LEAF_ENABLED,
    DEFAULT_MAX_TEMP,
    DEFAULT_MIN_TEMP,
    DEFAULT_SAFETY_MIN_TEMP,
    DEFAULT_SAFETY_TEMP_ENABLED,
    DEFAULT_SEASONAL_SAVINGS,
    DEFAULT_TARGET_TEMP,
    DEFAULT_TRUE_RADIANT,
    DEFAULT_WALL_PIN,
)


@dataclass
class RoomConfig:
    """One heated room (TRV climate wrapper)."""

    id: str
    name: str
    trv_entity: str
    temperature_sensor: str = ""
    extra_temperature_sensors: list[str] = field(default_factory=list)
    window_sensors: list[str] = field(default_factory=list)
    target_temp: float = DEFAULT_TARGET_TEMP
    eco_temp: float = DEFAULT_ECO_TEMP
    boost_temp: float = DEFAULT_BOOST_TEMP
    enabled: bool = True

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RoomConfig:
        extras = list(data.get("extra_temperature_sensors") or [])
        return cls(
            id=str(data.get("id") or data.get("name", "room")).lower().replace(" ", "_"),
            name=str(data.get("name") or "Room"),
            trv_entity=str(data.get("trv_entity") or data.get("entity") or ""),
            temperature_sensor=str(data.get("temperature_sensor") or ""),
            extra_temperature_sensors=[str(x) for x in extras if x],
            window_sensors=list(data.get("window_sensors") or []),
            target_temp=float(data.get("target_temp", DEFAULT_TARGET_TEMP)),
            eco_temp=float(data.get("eco_temp", DEFAULT_ECO_TEMP)),
            boost_temp=float(data.get("boost_temp", DEFAULT_BOOST_TEMP)),
            enabled=bool(data.get("enabled", True)),
        )


@dataclass
class ScheduleBlock:
    """One time block in a day schedule."""

    start: str  # HH:MM
    end: str
    temperature: float
    enabled: bool = True

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ScheduleBlock:
        return cls(
            start=str(data.get("start", "06:00")),
            end=str(data.get("end", "22:00")),
            temperature=float(data.get("temperature", DEFAULT_TARGET_TEMP)),
            enabled=bool(data.get("enabled", True)),
        )


def default_day_schedule() -> list[dict[str, Any]]:
    return [
        ScheduleBlock("06:30", "08:30", 20.0).to_dict(),
        ScheduleBlock("16:00", "22:00", 20.0).to_dict(),
    ]


def default_schedule() -> dict[str, list[dict[str, Any]]]:
    return {day: default_day_schedule() for day in DAYS}


@dataclass
class WallPanelConfig:
    """Central config for one physical wall screen."""

    id: str
    label: str
    primary_entity: str = ""
    rooms: list[dict[str, str]] = field(default_factory=list)
    sensors: dict[str, str] = field(default_factory=dict)
    display: dict[str, Any] = field(default_factory=dict)
    temperature_lock: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> WallPanelConfig:
        return cls(
            id=str(data.get("id") or "").lower().replace(" ", "-"),
            label=str(data.get("label") or data.get("id") or "Panel"),
            primary_entity=str(data.get("primary_entity") or ""),
            rooms=list(data.get("rooms") or []),
            sensors=dict(data.get("sensors") or {}),
            display=dict(data.get("display") or {"idleMs": 30000, "panelEntity": ""}),
            temperature_lock=bool(data.get("temperature_lock", False)),
        )


@dataclass
class NeatConfig:
    """Full integration options stored on the config entry."""

    heater: str
    temperature_sensor: str
    window_sensors: list[str] = field(default_factory=list)
    rooms: list[RoomConfig] = field(default_factory=list)
    eco_temp: float = DEFAULT_ECO_TEMP
    boost_temp: float = DEFAULT_BOOST_TEMP
    away_temp: float = DEFAULT_AWAY_TEMP
    target_temp: float = DEFAULT_TARGET_TEMP
    cold_tolerance: float = DEFAULT_COLD_TOLERANCE
    hot_tolerance: float = DEFAULT_HOT_TOLERANCE
    min_temp: float = DEFAULT_MIN_TEMP
    max_temp: float = DEFAULT_MAX_TEMP
    summer_mode: bool = False
    person_entity: str = ""
    presence_entities: list[str] = field(default_factory=list)
    schedule: dict[str, list[dict[str, Any]]] = field(default_factory=default_schedule)
    wall_panels: list[WallPanelConfig] = field(default_factory=list)
    schedule_enabled: bool = True
    true_radiant: bool = DEFAULT_TRUE_RADIANT
    auto_schedule: bool = DEFAULT_AUTO_SCHEDULE
    away_delay_minutes: int = DEFAULT_AWAY_DELAY_MINUTES
    outdoor_temp_sensor: str = ""
    leaf_enabled: bool = DEFAULT_LEAF_ENABLED
    safety_temp_enabled: bool = DEFAULT_SAFETY_TEMP_ENABLED
    safety_min_temp: float = DEFAULT_SAFETY_MIN_TEMP
    seasonal_savings: bool = DEFAULT_SEASONAL_SAVINGS
    adaptive_comfort: bool = DEFAULT_ADAPTIVE_COMFORT
    wall_pin: str = DEFAULT_WALL_PIN

    def to_dict(self) -> dict[str, Any]:
        return {
            "heater": self.heater,
            "temperature_sensor": self.temperature_sensor,
            "window_sensors": self.window_sensors,
            "rooms": [r.to_dict() for r in self.rooms],
            "eco_temp": self.eco_temp,
            "boost_temp": self.boost_temp,
            "away_temp": self.away_temp,
            "target_temp": self.target_temp,
            "cold_tolerance": self.cold_tolerance,
            "hot_tolerance": self.hot_tolerance,
            "min_temp": self.min_temp,
            "max_temp": self.max_temp,
            "summer_mode": self.summer_mode,
            "person_entity": self.person_entity,
            "presence_entities": self.presence_entities,
            "schedule": self.schedule,
            "wall_panels": [w.to_dict() for w in self.wall_panels],
            "schedule_enabled": self.schedule_enabled,
            "true_radiant": self.true_radiant,
            "auto_schedule": self.auto_schedule,
            "away_delay_minutes": self.away_delay_minutes,
            "outdoor_temp_sensor": self.outdoor_temp_sensor,
            "leaf_enabled": self.leaf_enabled,
            "safety_temp_enabled": self.safety_temp_enabled,
            "safety_min_temp": self.safety_min_temp,
            "seasonal_savings": self.seasonal_savings,
            "adaptive_comfort": self.adaptive_comfort,
            "wall_pin": self.wall_pin,
            "wall_pin_configured": bool(str(self.wall_pin or "").strip()),
        }

    @classmethod
    def from_entry_data(cls, data: dict[str, Any]) -> NeatConfig:
        rooms_raw = data.get("rooms") or []
        panels_raw = data.get("wall_panels") or []
        schedule = data.get("schedule") or default_schedule()
        presence = list(data.get("presence_entities") or [])
        person = str(data.get("person_entity") or "")
        if person and person not in presence:
            presence = [person, *presence]
        pin = str(data.get("wall_pin") or DEFAULT_WALL_PIN).strip()
        if pin and (not pin.isdigit() or len(pin) != 4):
            pin = DEFAULT_WALL_PIN
        return cls(
            heater=str(data.get("heater") or ""),
            temperature_sensor=str(data.get("temperature_sensor") or ""),
            window_sensors=list(data.get("window_sensors") or []),
            rooms=[RoomConfig.from_dict(r) for r in rooms_raw],
            eco_temp=float(data.get("eco_temp", DEFAULT_ECO_TEMP)),
            boost_temp=float(data.get("boost_temp", DEFAULT_BOOST_TEMP)),
            away_temp=float(data.get("away_temp", DEFAULT_AWAY_TEMP)),
            target_temp=float(data.get("target_temp", DEFAULT_TARGET_TEMP)),
            cold_tolerance=float(data.get("cold_tolerance", DEFAULT_COLD_TOLERANCE)),
            hot_tolerance=float(data.get("hot_tolerance", DEFAULT_HOT_TOLERANCE)),
            min_temp=float(data.get("min_temp", DEFAULT_MIN_TEMP)),
            max_temp=float(data.get("max_temp", DEFAULT_MAX_TEMP)),
            summer_mode=bool(data.get("summer_mode", False)),
            person_entity=person,
            presence_entities=presence,
            schedule=schedule,
            wall_panels=[WallPanelConfig.from_dict(p) for p in panels_raw],
            schedule_enabled=bool(data.get("schedule_enabled", True)),
            true_radiant=bool(data.get("true_radiant", DEFAULT_TRUE_RADIANT)),
            auto_schedule=bool(data.get("auto_schedule", DEFAULT_AUTO_SCHEDULE)),
            away_delay_minutes=int(
                data.get("away_delay_minutes", DEFAULT_AWAY_DELAY_MINUTES)
            ),
            outdoor_temp_sensor=str(data.get("outdoor_temp_sensor") or ""),
            leaf_enabled=bool(data.get("leaf_enabled", DEFAULT_LEAF_ENABLED)),
            safety_temp_enabled=bool(
                data.get("safety_temp_enabled", DEFAULT_SAFETY_TEMP_ENABLED)
            ),
            safety_min_temp=float(
                data.get("safety_min_temp", DEFAULT_SAFETY_MIN_TEMP)
            ),
            seasonal_savings=bool(
                data.get("seasonal_savings", DEFAULT_SEASONAL_SAVINGS)
            ),
            adaptive_comfort=bool(
                data.get("adaptive_comfort", DEFAULT_ADAPTIVE_COMFORT)
            ),
            wall_pin=pin,
        )
