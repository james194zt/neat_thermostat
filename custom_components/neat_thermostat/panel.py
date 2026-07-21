"""Register the Neat Thermostat sidebar panel."""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant

from .const import (
    DOMAIN,
    PANEL_COMPONENT,
    PANEL_ICON,
    PANEL_STATIC_URL,
    PANEL_TITLE,
    PANEL_URL_PATH,
)

_LOGGER = logging.getLogger(__name__)

PANEL_JS_FILE = "neat-thermostat-panel.js"
WWW_DIR = Path(__file__).parent / "www"
_STATIC_DATA_KEY = "_neat_thermostat_static_registered"


def panel_js_path() -> Path:
    return WWW_DIR / PANEL_JS_FILE


def _panel_js_version() -> str:
    with (Path(__file__).parent / "manifest.json").open(encoding="utf-8") as mf:
        return json.load(mf).get("version", "0")


def _panel_js_fingerprint() -> str:
    path = panel_js_path()
    if not path.is_file():
        return "missing"
    return hashlib.sha256(path.read_bytes()).hexdigest()[:12]


def _panel_js_cache_name() -> str:
    ver = _panel_js_version().replace(".", "_")
    return f"neat-thermostat-panel.v{ver}.{_panel_js_fingerprint()}.js"


def _panel_component_name() -> str:
    return f"{PANEL_COMPONENT}-{_panel_js_version().replace('.', '_')}"


def _sync_versioned_panel_js() -> None:
    src = panel_js_path()
    if not src.is_file():
        return
    dest = WWW_DIR / _panel_js_cache_name()
    data = src.read_bytes()
    if not dest.is_file() or dest.read_bytes() != data:
        dest.write_bytes(data)
    for old in WWW_DIR.glob("neat-thermostat-panel.v*.js"):
        if old.name != dest.name:
            try:
                old.unlink()
            except OSError:
                pass


def _panel_js_module_url() -> str:
    return f"{PANEL_STATIC_URL}/{_panel_js_cache_name()}"


def _panel_exists(hass: HomeAssistant) -> bool:
    from homeassistant.components import frontend

    if hasattr(frontend, "async_panel_exists"):
        return frontend.async_panel_exists(hass, PANEL_URL_PATH)
    panels = hass.data.get("frontend_panels", {})
    return PANEL_URL_PATH in panels


def build_panel_config(hass: HomeAssistant) -> dict[str, Any]:
    entries = []
    for entry_id, data in hass.data.get(DOMAIN, {}).items():
        if not isinstance(data, dict) or "coordinator" not in data:
            continue
        coordinator = data["coordinator"]
        entries.append(
            {
                "entry_id": entry_id,
                "title": coordinator.entry.title,
            }
        )
    return {
        "entries": entries,
        "brand_domain": DOMAIN,
        "panel_element": _panel_component_name(),
        "panel_js_module_url": _panel_js_module_url(),
    }


async def _async_ensure_static_paths(hass: HomeAssistant) -> bool:
    if hass.data.get(_STATIC_DATA_KEY):
        return True
    if not WWW_DIR.is_dir() or not panel_js_path().is_file():
        _LOGGER.error("Neat Thermostat panel JS missing at %s", panel_js_path())
        return False
    from homeassistant.components.http import StaticPathConfig

    await hass.http.async_register_static_paths(
        [StaticPathConfig(PANEL_STATIC_URL, str(WWW_DIR), False)]
    )
    hass.data[_STATIC_DATA_KEY] = True
    return True


async def async_register_panel(hass: HomeAssistant) -> None:
    from homeassistant.components import frontend

    if not await _async_ensure_static_paths(hass):
        return

    await hass.async_add_executor_job(_sync_versioned_panel_js)

    config = {
        **build_panel_config(hass),
        "_panel_custom": {
            "name": _panel_component_name(),
            "embed_iframe": False,
            "trust_external": False,
            "module_url": _panel_js_module_url(),
        },
    }

    if _panel_exists(hass):
        frontend.async_remove_panel(hass, PANEL_URL_PATH)

    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL_PATH,
        config=config,
        require_admin=False,
        update=False,
        config_panel_domain=DOMAIN,
    )
    _LOGGER.info(
        "Neat Thermostat panel registered at /%s (%s)",
        PANEL_URL_PATH,
        _panel_js_module_url(),
    )
