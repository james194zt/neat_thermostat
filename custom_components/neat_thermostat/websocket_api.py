"""WebSocket API for Neat Thermostat panel + wall devices."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN
from .models import RoomConfig, WallPanelConfig, default_schedule

_LOGGER = logging.getLogger(__name__)


def _coordinator(hass: HomeAssistant, entry_id: str | None = None):
    domain_data = hass.data.get(DOMAIN) or {}
    if entry_id and entry_id in domain_data:
        return domain_data[entry_id]["coordinator"]
    for data in domain_data.values():
        if isinstance(data, dict) and "coordinator" in data:
            return data["coordinator"]
    return None


@callback
def async_register_ws_handlers(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_get_state)
    websocket_api.async_register_command(hass, ws_update_settings)
    websocket_api.async_register_command(hass, ws_update_schedule)
    websocket_api.async_register_command(hass, ws_update_rooms)
    websocket_api.async_register_command(hass, ws_list_wall_panels)
    websocket_api.async_register_command(hass, ws_upsert_wall_panel)
    websocket_api.async_register_command(hass, ws_delete_wall_panel)
    websocket_api.async_register_command(hass, ws_get_wall_panel_config)
    websocket_api.async_register_command(hass, ws_get_energy_history)
    websocket_api.async_register_command(hass, ws_verify_wall_pin)
    websocket_api.async_register_command(hass, ws_stop_seasonal_savings)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "neat_thermostat/get_state",
        vol.Optional("entry_id"): cv.string,
    }
)
@websocket_api.async_response
async def ws_get_state(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_loaded", "Neat Thermostat not loaded")
        return
    connection.send_result(
        msg["id"],
        {
            "config": coordinator.config.to_dict(),
            "live": coordinator.data,
            "entry_id": coordinator.entry.entry_id,
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "neat_thermostat/update_settings",
        vol.Optional("entry_id"): cv.string,
        vol.Optional("eco_temp"): vol.Coerce(float),
        vol.Optional("boost_temp"): vol.Coerce(float),
        vol.Optional("away_temp"): vol.Coerce(float),
        vol.Optional("target_temp"): vol.Coerce(float),
        vol.Optional("summer_mode"): cv.boolean,
        vol.Optional("schedule_enabled"): cv.boolean,
        vol.Optional("person_entity"): cv.string,
        vol.Optional("presence_entities"): [cv.entity_id],
        vol.Optional("window_sensors"): [cv.entity_id],
        vol.Optional("cold_tolerance"): vol.Coerce(float),
        vol.Optional("hot_tolerance"): vol.Coerce(float),
        vol.Optional("true_radiant"): cv.boolean,
        vol.Optional("auto_schedule"): cv.boolean,
        vol.Optional("leaf_enabled"): cv.boolean,
        vol.Optional("away_delay_minutes"): vol.All(vol.Coerce(int), vol.Range(min=0, max=180)),
        vol.Optional("outdoor_temp_sensor"): cv.string,
        vol.Optional("safety_temp_enabled"): cv.boolean,
        vol.Optional("safety_min_temp"): vol.All(vol.Coerce(float), vol.Range(min=5, max=12)),
        vol.Optional("seasonal_savings"): cv.boolean,
        vol.Optional("adaptive_comfort"): cv.boolean,
        vol.Optional("wall_pin"): cv.string,
    }
)
@websocket_api.async_response
async def ws_update_settings(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_loaded", "Neat Thermostat not loaded")
        return
    updates = {
        k: msg[k]
        for k in (
            "eco_temp",
            "boost_temp",
            "away_temp",
            "target_temp",
            "summer_mode",
            "schedule_enabled",
            "person_entity",
            "presence_entities",
            "window_sensors",
            "cold_tolerance",
            "hot_tolerance",
            "true_radiant",
            "auto_schedule",
            "leaf_enabled",
            "away_delay_minutes",
            "outdoor_temp_sensor",
            "safety_temp_enabled",
            "safety_min_temp",
            "seasonal_savings",
            "adaptive_comfort",
            "wall_pin",
        )
        if k in msg
    }
    if "wall_pin" in updates:
        pin = str(updates["wall_pin"] or "").strip()
        if pin and (not pin.isdigit() or len(pin) != 4):
            connection.send_error(msg["id"], "invalid", "wall_pin must be 4 digits")
            return
        updates["wall_pin"] = pin
    config = await coordinator.async_save_config(updates)
    connection.send_result(msg["id"], {"config": config.to_dict()})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "neat_thermostat/update_schedule",
        vol.Optional("entry_id"): cv.string,
        vol.Required("schedule"): dict,
        vol.Optional("schedule_enabled"): cv.boolean,
    }
)
@websocket_api.async_response
async def ws_update_schedule(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_loaded", "Neat Thermostat not loaded")
        return
    updates: dict[str, Any] = {"schedule": msg.get("schedule") or default_schedule()}
    if "schedule_enabled" in msg:
        updates["schedule_enabled"] = msg["schedule_enabled"]
    config = await coordinator.async_save_config(updates)
    connection.send_result(msg["id"], {"config": config.to_dict()})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "neat_thermostat/update_rooms",
        vol.Optional("entry_id"): cv.string,
        vol.Required("rooms"): [dict],
    }
)
@websocket_api.async_response
async def ws_update_rooms(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_loaded", "Neat Thermostat not loaded")
        return
    rooms = [RoomConfig.from_dict(r).to_dict() for r in msg.get("rooms") or []]
    config = await coordinator.async_save_config({"rooms": rooms})
    await hass.config_entries.async_reload(coordinator.entry.entry_id)
    connection.send_result(msg["id"], {"config": config.to_dict()})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "neat_thermostat/list_wall_panels",
        vol.Optional("entry_id"): cv.string,
    }
)
@websocket_api.async_response
async def ws_list_wall_panels(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_loaded", "Neat Thermostat not loaded")
        return
    panels = [p.to_dict() for p in coordinator.config.wall_panels]
    connection.send_result(msg["id"], {"wall_panels": panels})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "neat_thermostat/upsert_wall_panel",
        vol.Optional("entry_id"): cv.string,
        vol.Required("panel"): dict,
    }
)
@websocket_api.async_response
async def ws_upsert_wall_panel(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_loaded", "Neat Thermostat not loaded")
        return
    panel = WallPanelConfig.from_dict(msg["panel"])
    if not panel.id:
        connection.send_error(msg["id"], "invalid", "panel.id required")
        return
    panels = [p for p in coordinator.config.wall_panels if p.id != panel.id]
    panels.append(panel)
    config = await coordinator.async_save_config(
        {"wall_panels": [p.to_dict() for p in panels]}
    )
    connection.send_result(
        msg["id"],
        {"wall_panels": [p.to_dict() for p in config.wall_panels], "panel": panel.to_dict()},
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "neat_thermostat/delete_wall_panel",
        vol.Optional("entry_id"): cv.string,
        vol.Required("panel_id"): cv.string,
    }
)
@websocket_api.async_response
async def ws_delete_wall_panel(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_loaded", "Neat Thermostat not loaded")
        return
    panel_id = msg["panel_id"]
    panels = [p.to_dict() for p in coordinator.config.wall_panels if p.id != panel_id]
    config = await coordinator.async_save_config({"wall_panels": panels})
    connection.send_result(
        msg["id"], {"wall_panels": [p.to_dict() for p in config.wall_panels]}
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "neat_thermostat/get_wall_panel_config",
        vol.Required("panel_id"): cv.string,
        vol.Optional("entry_id"): cv.string,
    }
)
@websocket_api.async_response
async def ws_get_wall_panel_config(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_loaded", "Neat Thermostat not loaded")
        return
    payload = coordinator.wall_panel_payload(msg["panel_id"])
    if payload is None:
        connection.send_error(msg["id"], "not_found", f"Unknown panel {msg['panel_id']}")
        return
    connection.send_result(msg["id"], {"config": payload})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "neat_thermostat/get_energy_history",
        vol.Optional("entry_id"): cv.string,
        vol.Optional("days"): vol.All(vol.Coerce(int), vol.Range(min=7, max=60)),
    }
)
@websocket_api.async_response
async def ws_get_energy_history(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_loaded", "Neat Thermostat not loaded")
        return
    days = int(msg.get("days") or 31)
    connection.send_result(
        msg["id"],
        {
            "history": coordinator.energy_history(days=days),
            "seasonal_savings": coordinator.data.get("seasonal_savings")
            if coordinator.data
            else {},
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "neat_thermostat/verify_wall_pin",
        vol.Required("pin"): cv.string,
        vol.Optional("entry_id"): cv.string,
        vol.Optional("panel_id"): cv.string,
    }
)
@websocket_api.async_response
async def ws_verify_wall_pin(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_loaded", "Neat Thermostat not loaded")
        return
    ok = coordinator.verify_wall_pin(msg.get("pin") or "")
    connection.send_result(msg["id"], {"ok": ok})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "neat_thermostat/stop_seasonal_savings",
        vol.Optional("entry_id"): cv.string,
    }
)
@websocket_api.async_response
async def ws_stop_seasonal_savings(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_loaded", "Neat Thermostat not loaded")
        return
    config = await coordinator.async_stop_seasonal_savings()
    connection.send_result(msg["id"], {"config": config.to_dict()})
