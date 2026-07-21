# NSPanel wall UI v2 (restyle fork)

**This is the restyle / redesign tree.** Work here freely.

Do **not** change these fallback trees unless you mean to:

| Path | Role |
|------|------|
| [`../nspanel-thermostat/`](../nspanel-thermostat/) | Neat-wired fallback UI (stable) |
| `HADashboard/nspanel-thermostat` | Live panels in production — leave alone |

Forked from `nspanel-thermostat` so Nest/Neat wiring stays available while the visual design is rebuilt.

## Deploy (only when v2 is ready)

Point your HA www deploy / panel URL at **this** folder (`nspanel-thermostat-v2`), not the v1 folder. Keep v1 in place until you are happy with the fallback story.

## Local secrets

Same as v1: HA URL + token on the device; panel assignment via `deviceId` / setup page.
