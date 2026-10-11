"""The integration's copy of the wall app must match nspanel-thermostat-v2/.

Fix a failure with: python scripts/sync_wall_app.py
"""

import importlib.util
from pathlib import Path

_SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "sync_wall_app.py"
_spec = importlib.util.spec_from_file_location("sync_wall_app", _SCRIPT)
sync = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sync)


def _bundle_files() -> set[Path]:
    return {p.relative_to(sync.DEST) for p in sync.DEST.rglob("*") if p.is_file()}


def test_bundle_has_exactly_the_wall_app_files():
    assert _bundle_files() == set(sync.wall_app_files())


def test_bundle_files_match_source():
    stale = [
        str(rel)
        for rel in sync.wall_app_files()
        if (sync.SRC / rel).read_bytes() != (sync.DEST / rel).read_bytes()
    ]
    assert not stale, f"Out of date, run scripts/sync_wall_app.py: {stale}"


def test_no_local_panel_config_shipped():
    assert not (sync.DEST / "config.json").exists()
