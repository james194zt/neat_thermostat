"""Data models for Neat Thermostat."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from .const import (
    DAYS,
    DEFAULT_AWAY_TEMP,
    DEFAULT_BOOST_TEMP,
    DEFAULT_COLD_TOLERANCE,
    DEFAULT_ECO_TEMP,
    DEFAULT_HOT_TOLERANCE,
    DEFAULT_MAX_TEMP,
    DEFAULT_MIN_TEMP,
    DEFAULT_TARGET_TEMP,
)


@dataclass
class RoomConfig:
    """One heated room (TRV climate wrapper)."""

    id: str
    name: str
    trv_entity: str
    temperature_sensor: str = ""
    window_sensors: list[str] = field(default_factory=list)
    target_temp: float = DEFAULT_TARGET_TEMP
    eco_temp: float = DEFAULT_ECO_TEMP
    boost_temp: float = DEFAULT_BOOST_TEMP
    enabled: bool = True

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RoomConfig:
        return cls(
            id=str(data.get("id") or data.get("name", "room")).lower().replace(" ", "_"),
            name=str(data.get("name") or "Room"),
            trv_entity=str(data.get("trv_entity") or data.get("entity") or ""),
            temperature_sensor=str(data.get("temperature_sensor") or ""),
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
    schedule: dict[str, list[dict[str, Any]]] = field(default_factory=default_schedule)
    wall_panels: list[WallPanelConfig] = field(default_factory=list)
    schedule_enabled: bool = True

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
            "schedule": self.schedule,
            "wall_panels": [w.to_dict() for w in self.wall_panels],
            "schedule_enabled": self.schedule_enabled,
        }

    @classmethod
    def from_entry_data(cls, data: dict[str, Any]) -> NeatConfig:
        rooms_raw = data.get("rooms") or []
        panels_raw = data.get("wall_panels") or []
        schedule = data.get("schedule") or default_schedule()
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
            person_entity=str(data.get("person_entity") or ""),
            schedule=schedule,
            wall_panels=[WallPanelConfig.from_dict(p) for p in panels_raw],
            schedule_enabled=bool(data.get("schedule_enabled", True)),
        )
