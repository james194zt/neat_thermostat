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
CONF_PRESENCE_ENTITIES = "presence_entities"
CONF_TRUE_RADIANT = "true_radiant"
CONF_AUTO_SCHEDULE = "auto_schedule"
CONF_AWAY_DELAY_MINUTES = "away_delay_minutes"
CONF_OUTDOOR_TEMP_SENSOR = "outdoor_temp_sensor"
CONF_LEAF_ENABLED = "leaf_enabled"

DEFAULT_ECO_TEMP = 16.0
DEFAULT_BOOST_TEMP = 22.0
DEFAULT_AWAY_TEMP = 15.0
DEFAULT_TARGET_TEMP = 20.0
DEFAULT_COLD_TOLERANCE = 0.3
DEFAULT_HOT_TOLERANCE = 0.3
DEFAULT_MIN_TEMP = 5.0
DEFAULT_MAX_TEMP = 30.0
DEFAULT_TRUE_RADIANT = True
DEFAULT_AUTO_SCHEDULE = False
DEFAULT_AWAY_DELAY_MINUTES = 20
DEFAULT_LEAF_ENABLED = True

ATTR_WINDOW_OPEN = "window_open"
ATTR_SUMMER_MODE = "summer_mode_state"
ATTR_SCHEDULE_ACTIVE = "schedule_active"
ATTR_AWAY_MODE = "away_mode"
ATTR_PREHEATING = "preheating"
ATTR_PREHEAT_FOR = "preheat_for"
ATTR_TRUE_RADIANT = "true_radiant"
ATTR_LEAF = "leaf"
ATTR_LEAF_THRESHOLD = "leaf_threshold"
ATTR_LEAF_BASELINE = "leaf_baseline"

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
