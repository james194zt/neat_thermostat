# NSPanel wall UI (Neat Thermostat)

Copied from the working HADashboard thermostat. Adapted so:

- **setup.html** only picks which wall panel this screen is
- Full config loads from **Neat Thermostat** (`neat_thermostat/get_wall_panel_config`)
- Defaults point at `climate.neat_home` / `climate.neat_*`

The live deploy under `HADashboard/nspanel-thermostat` is unchanged until you switch over.

## Local secrets

Store HA URL + long-lived token once on the device (setup page). Panel assignment is the only other local setting (`deviceId`).

## Deploy (when ready)

Copy this folder to HA `www/nspanel-thermostat` (or use your existing deploy script pointed at this tree).
