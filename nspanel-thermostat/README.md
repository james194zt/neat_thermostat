# NSPanel wall UI (Neat Thermostat) — stable fallback

Copied from the working HADashboard thermostat. Adapted so:

- **setup.html** only picks which wall panel this screen is
- Full config loads from **Neat Thermostat** (`neat_thermostat/get_wall_panel_config`)
- Defaults point at `climate.neat_home` / `climate.neat_*`

**Do not restyle this folder.** Visual redesign happens in [`../nspanel-thermostat-v2/`](../nspanel-thermostat-v2/).

The live deploy under `HADashboard/nspanel-thermostat` is also left alone unless you intentionally redeploy.

## Local secrets

Store HA URL + long-lived token once on the device (setup page). Panel assignment is the only other local setting (`deviceId`).

## Deploy (fallback)

Copy this folder to HA `www/nspanel-thermostat` (or use your existing deploy script pointed at this tree).
