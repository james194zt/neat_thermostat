"""Wall panel hardware model is stored per panel (needs HA test venv)."""

import pytest

pytest.importorskip("pytest_homeassistant_custom_component")

from custom_components.neat_thermostat.const import DEFAULT_WALL_PANEL_MODEL  # noqa: E402
from custom_components.neat_thermostat.models import WallPanelConfig  # noqa: E402


def test_panel_saved_before_models_gets_default():
    panel = WallPanelConfig.from_dict({"id": "hallway", "label": "Hallway panel"})
    assert panel.model == DEFAULT_WALL_PANEL_MODEL == "nspanel_pro_gen2"


def test_model_round_trips():
    panel = WallPanelConfig.from_dict({"id": "kitchen", "model": "some_future_panel"})
    assert WallPanelConfig.from_dict(panel.to_dict()).model == "some_future_panel"
