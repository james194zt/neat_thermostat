# Neat Thermostat

Home Assistant custom integration that replaces Better Thermostat-style heating control with a **Neat** hub:

- **House climate** `climate.neat_home` — schedule, Eco / Boost / Away, window & summer hold
- **Room climates** `climate.neat_<room>` — own sensors/setpoints; each room can call for heat
- **Boiler demand** — heats when the house **or** any room needs heat
- **Nest-like intelligence (house only)** — True Radiant preheat, Auto-Schedule learning, Home/Away Assist, Leaf coaching
- **HA sidebar** — Overview, Rooms, Schedule, Wall panels, Settings
- **Wall panels** — configure NSPanels centrally; each screen only picks which panel it is

## Install

### HACS (recommended)

1. HACS → Integrations → Custom repositories → add `https://github.com/james194zt/neat_thermostat` (category: Integration)
2. Install **Neat Thermostat**
3. Restart Home Assistant
4. Settings → Devices & services → Add integration → **Neat Thermostat**

### Manual

Copy `custom_components/neat_thermostat` into your HA `config/custom_components/` folder, restart, then add the integration.

## Setup

1. Pick **heater/boiler** entity (switch, input_boolean, or climate) and **house temperature sensor**
2. Optional: window sensors, person for Away, Eco/Boost/Away temps
3. Open the **Neat Thermostat** sidebar:
   - **Rooms** — add TRV climates (creates `climate.neat_*`)
   - **Schedule** — 7-day comfort blocks
   - **Wall panels** — one entry per physical NSPanel (id, label, primary climate, sensors, idle timeout)

## NSPanel / wall UI

The folder [`nspanel-thermostat/`](nspanel-thermostat/) is a **copy of the working wall UI** from HADashboard. The live panels under `HADashboard/nspanel-thermostat` are left alone so they keep working until this copy is adapted and redeployed.

Planned Neat wiring (in this copy only):

1. Define wall panels in the Neat sidebar
2. Setup page → connect to HA → **select which wall panel this screen is**
3. Full config loads from Neat via `neat_thermostat/get_wall_panel_config`

## Nest intelligence (house only)

Intelligence applies to **`climate.neat_home` / the boiler**, not per-room TRV learning.

| Nest feature | Neat setting | Behaviour |
|--------------|--------------|-----------|
| **True Radiant / Early-On** | Settings → True Radiant (default On) | Learns °C/h warm-up from heat cycles; starts heating early so the house hits the scheduled temp *at* the block start; stops slightly early to limit overshoot. No preheat while Away Eco is active. |
| **Auto-Schedule** | Settings → Auto-Schedule (default Off) | Manual Home setpoint changes are logged; repeated similar weekday/time adjustments upsert schedule blocks. More eager for the first ~7 days, then needs stronger confirmation. |
| **Home/Away Assist** | Presence entities + Away delay | Away Eco only when **all** listed people/trackers are not home, after the delay (default 20 min). Overrides the schedule while active. |
| **Leaf** | Settings → Leaf coaching (default On) | Live Leaf on the dial when the house setpoint is efficient (≤ 16.5°C, Eco/Away, or ~0.5°C below your comfort baseline). Earned Leaf hours only accumulate — turning heat up hides the icon; it never withdraws earned time. |

Optional: set an **outdoor temp sensor** so preheat estimates scale with cold weather.

Overview shows a chip when Leaf is active, preheating (`Preheating for 07:00`), or Away Eco, plus warm-up model and Leaf earned stats.
## Migrating from Better Thermostat

1. Install Neat and add rooms pointing at the same TRV climates BT used
2. Point wall panels / automations at `climate.neat_home` (and room entities as needed)
3. Disable or remove the Better Thermostat integration once Neat is behaving

NSPanel attributes kept compatible: `hvac_action`, `preset_mode` (`none`/`eco`/`boost`), `window_open`, `summer_mode_state`.

## WebSocket API (for panels / tools)

| Type | Purpose |
|------|---------|
| `neat_thermostat/get_state` | Full config + live snapshot |
| `neat_thermostat/update_settings` | Eco/Boost/Away, True Radiant, Auto-Schedule, Leaf, presence, delays |
| `neat_thermostat/update_schedule` | 7-day schedule |
| `neat_thermostat/update_rooms` | Room list (reloads platforms) |
| `neat_thermostat/list_wall_panels` | List wall panels |
| `neat_thermostat/upsert_wall_panel` | Create/update wall panel |
| `neat_thermostat/delete_wall_panel` | Remove wall panel |
| `neat_thermostat/get_wall_panel_config` | Full config payload for a wall screen |

## License

MIT
