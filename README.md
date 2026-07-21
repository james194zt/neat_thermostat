# Neat Thermostat

Home Assistant custom integration that replaces Better Thermostat-style heating control with a **Neat** hub:

- **House climate** `climate.neat_home` — schedule, Eco / Boost / Away, window & summer hold
- **Room climates** `climate.neat_<room>` — own sensors/setpoints; each room can call for heat
- **Boiler demand** — heats when the house **or** any room needs heat
- **Nest-like intelligence (house only)** — True Radiant, Auto-Schedule, Home/Away, Leaf, Safety Temps, Time-to-Temp, Seasonal Savings, Adaptive Comfort
- **Energy History** — Nest-style 24h heat timeline with Leaf days
- **HA sidebar** — Overview, Energy, Rooms, Schedule, Wall panels, Settings
- **Wall panels** — optional per-panel temperature PIN lock; multi-sensor rooms

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
   - **Rooms** — add TRV climates (creates `climate.neat_*`); optional extra temp sensors (averaged)
   - **Schedule** — 7-day comfort blocks
   - **Energy** — heat runtime history + Leaf days
   - **Wall panels** — one entry per physical NSPanel (optional temperature lock)

## NSPanel / wall UI

The folder [`nspanel-thermostat/`](nspanel-thermostat/) is a **copy of the working wall UI** from HADashboard. The live panels under `HADashboard/nspanel-thermostat` are left alone so they keep working until this copy is adapted and redeployed.

Neat wiring (in this copy):

1. Define wall panels in the Neat sidebar
2. Setup page → connect to HA → **select which wall panel this screen is**
3. Full config loads from Neat via `neat_thermostat/get_wall_panel_config`
4. Locked panels prompt for the house **Wall PIN** before setpoint/mode changes; unlock lasts until screensaver/idle

## Nest intelligence (house only)

Intelligence applies to **`climate.neat_home` / the boiler**, not per-room TRV learning.

| Nest feature | Neat setting | Behaviour |
|--------------|--------------|-----------|
| **True Radiant / Early-On** | Settings → True Radiant (default On) | Learns °C/h warm-up; preheats so the house hits the scheduled temp *at* block start; early-off to limit overshoot. |
| **Auto-Schedule** | Settings → Auto-Schedule (default Off) | Manual Home setpoint changes learn into schedule blocks. |
| **Home/Away Assist** | Presence entities + Away delay | Away Eco when **all** presence entities are away, after the delay. |
| **Leaf** | Settings → Leaf coaching (default On) | Live Leaf when efficient; earned Leaf hours only accumulate. |
| **Safety Temperatures** | Settings → Safety (default On, 7°C) | Forces heat if the house sensor hits the min floor (even Away/Off/summer). |
| **Time-to-Temp** | Automatic from warm-up model | ETA on Overview dial and NSPanel while heating. |
| **Energy History** | Energy tab | 24h heat segments + setpoint bubbles + Leaf per day. |
| **Seasonal Savings** | Settings → Seasonal Savings | Ramps comfort −0.5°C over 21 days; Stop from Energy banner. |
| **Adaptive Comfort** | Settings → Adaptive Comfort | Outdoor bands nudge Eco/Away (±0.5°C). Needs outdoor sensor. |
| **Temperature Lock** | Wall PIN + per-panel lock | NSPanel only; HA sidebar stays unlocked. |

Optional: set an **outdoor temp sensor** for preheat scaling and Adaptive Comfort.

## Migrating from Better Thermostat

1. Install Neat and add rooms pointing at the same TRV climates BT used
2. Point wall panels / automations at `climate.neat_home` (and room entities as needed)
3. Disable or remove the Better Thermostat integration once Neat is behaving

NSPanel attributes kept compatible: `hvac_action`, `preset_mode` (`none`/`eco`/`boost`), `window_open`, `summer_mode_state`, plus `safety_active`, `time_to_temp_minutes`, Leaf attrs.

## WebSocket API (for panels / tools)

| Type | Purpose |
|------|---------|
| `neat_thermostat/get_state` | Full config + live snapshot |
| `neat_thermostat/update_settings` | Eco/Boost/Away, intelligence, safety, PIN, etc. |
| `neat_thermostat/update_schedule` | 7-day schedule |
| `neat_thermostat/update_rooms` | Room list (reloads platforms) |
| `neat_thermostat/get_energy_history` | Energy History days + seasonal banner |
| `neat_thermostat/stop_seasonal_savings` | Clear seasonal ramp and disable |
| `neat_thermostat/verify_wall_pin` | Validate wall PIN (NSPanel unlock) |
| `neat_thermostat/list_wall_panels` | List wall panels |
| `neat_thermostat/upsert_wall_panel` | Create/update wall panel |
| `neat_thermostat/delete_wall_panel` | Remove wall panel |
| `neat_thermostat/get_wall_panel_config` | Full config payload for a wall screen |

## License

MIT
