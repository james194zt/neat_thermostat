"""Constants for Neat Thermostat."""

from __future__ import annotations

DOMAIN = "neat_thermostat"
PLATFORMS = ["climate"]

CONF_HEATER = "heater"
CONF_TEMPERATURE_SENSOR = "temperature_sensor"
CONF_WINDOW_SENSORS = "window_sensors"
CONF_ROOMS = "rooms"
CONF_ECO_TEMP = "eco_temp"
CONF_BOOST_TEMP = "boost_temp"
CONF_COLD_TOLERANCE = "cold_tolerance"
CONF_HOT_TOLERANCE = "hot_tolerance"
CONF_MIN_TEMP = "min_temp"
CONF_MAX_TEMP = "max_temp"
CONF_TARGET_TEMP = "target_temp"
CONF_AWAY_TEMP = "away_temp"
CONF_SCHEDULE = "schedule"
CONF_WALL_PANELS = "wall_panels"
CONF_SUMMER_MODE = "summer_mode"
CONF_PERSON_ENTITY = "person_entity"

DEFAULT_ECO_TEMP = 16.0
DEFAULT_BOOST_TEMP = 22.0
DEFAULT_AWAY_TEMP = 15.0
DEFAULT_TARGET_TEMP = 20.0
DEFAULT_COLD_TOLERANCE = 0.3
DEFAULT_HOT_TOLERANCE = 0.3
DEFAULT_MIN_TEMP = 5.0
DEFAULT_MAX_TEMP = 30.0

ATTR_WINDOW_OPEN = "window_open"
ATTR_SUMMER_MODE = "summer_mode_state"
ATTR_SCHEDULE_ACTIVE = "schedule_active"
ATTR_AWAY_MODE = "away_mode"

PRESET_NONE = "none"
PRESET_ECO = "eco"
PRESET_BOOST = "boost"
PRESET_AWAY = "away"

PANEL_URL_PATH = "neat-thermostat"
PANEL_TITLE = "Neat Thermostat"
PANEL_ICON = "mdi:thermostat"
PANEL_STATIC_URL = f"/{DOMAIN}/static"
PANEL_COMPONENT = "neat-thermostat-panel"

STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}.config"

DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
