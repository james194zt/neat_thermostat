/**
 * Neat Thermostat — HA sidebar panel.
 * Fox Plant–style shell + Nest-inspired overview / schedule.
 * @version 0.1.2
 */
const NAV = [
  { id: "overview", label: "Overview" },
  { id: "rooms", label: "Rooms" },
  { id: "schedule", label: "Schedule" },
  { id: "wall_panels", label: "Wall panels" },
  { id: "settings", label: "Settings" },
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};
const DAY_SHORT = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const PANEL_VERSION = "0.2.0";
const HEAT_ORANGE = "#F57C00";
const HEAT_ORANGE_SOFT = "#FF9800";

const STYLES = `
:host {
  display: block;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  font-family: var(--ha-font-family, Roboto, Noto Sans, sans-serif);
  background: var(--primary-background-color);
  color: var(--primary-text-color);
  --nt-radius: 14px;
  --nt-accent: #08979C;
  --nt-accent-hi: #19D4DE;
  --nt-green: #52C41A;
  --nt-amber: #FA8C16;
  --nt-red: #e53935;
  --nt-heat: ${HEAT_ORANGE};
  --nt-heat-soft: ${HEAT_ORANGE_SOFT};
  --nt-nest-blue: #5BA3D9;
  --nt-nest-tab: #4285F4;
}
.shell { position: relative; display: block; min-height: 100%; background: var(--primary-background-color); }
.page-header {
  position: sticky; top: 0; z-index: 10;
  border-bottom: 1px solid var(--divider-color);
  background: var(--app-header-background-color, var(--primary-background-color));
}
.panel-header-top { display: flex; align-items: flex-start; }
.panel-ha-menu-btn {
  display: none; flex-shrink: 0; align-items: center; justify-content: center;
  width: 48px; height: 48px; margin: 8px 0 0 4px; padding: 0; border: none;
  border-radius: 50%; background: transparent; color: var(--primary-text-color); cursor: pointer;
}
.panel-ha-menu-btn:hover { background: color-mix(in srgb, var(--primary-text-color) 8%, transparent); }
:host(.narrow) .panel-ha-menu-btn, .shell.narrow .panel-ha-menu-btn { display: inline-flex; }
@media (max-width: 870px) {
  .panel-ha-menu-btn { display: inline-flex; }
  .panel-brand-row { padding: 12px 12px 4px 0; }
}
.panel-brand-row {
  display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; padding: 12px 16px 4px;
}
.panel-brand-mark {
  width: 40px; height: 40px; flex-shrink: 0; border-radius: 10px; display: grid; place-items: center;
  background: linear-gradient(145deg, rgba(25,212,222,0.22), rgba(8,151,156,0.12));
  color: var(--nt-accent-hi); font-size: 20px; font-weight: 700;
}
.panel-brand-title { font-size: 18px; font-weight: 600; line-height: 1.2; }
.panel-brand-sub { font-size: 12px; color: var(--secondary-text-color); margin-top: 2px; }
.tab-bar {
  display: flex; align-items: stretch; gap: 0; padding: 0 8px;
  overflow-x: auto; scrollbar-width: none;
}
.tab-bar::-webkit-scrollbar { display: none; }
.tab {
  flex-shrink: 0; padding: 14px 20px 12px; border: none; border-bottom: 2px solid transparent;
  background: transparent; color: var(--secondary-text-color); font-size: 14px; font-weight: 500;
  font-family: inherit; cursor: pointer; white-space: nowrap;
}
.tab:hover { color: var(--primary-text-color); }
.tab.active { color: var(--primary-text-color); font-weight: 600; border-bottom-color: var(--primary-text-color); }
.shell.narrow .tab { padding: 12px 14px 10px; font-size: 13px; }
.main { display: block; width: 100%; }
.main-inner {
  max-width: 1100px; width: 100%; margin: 0 auto; padding: 20px 24px 48px; box-sizing: border-box;
}
.shell.narrow .main-inner { padding: 16px; }
.header { margin-bottom: 18px; }
.header h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
.header p { margin: 6px 0 0; color: var(--secondary-text-color); font-size: 14px; }
.card {
  background: var(--card-background-color); border-radius: var(--nt-radius);
  padding: 18px 20px; margin-bottom: 14px;
  box-shadow: var(--ha-card-box-shadow, 0 1px 2px rgba(0,0,0,0.08));
  border: 1px solid var(--divider-color, transparent);
}
.card-title {
  font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--secondary-text-color); margin: 0 0 14px;
}
.stats-row {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: 12px; margin-bottom: 14px;
}
.stat {
  background: var(--card-background-color); border-radius: var(--nt-radius);
  padding: 16px 18px; border: 1px solid var(--divider-color, transparent);
  box-shadow: var(--ha-card-box-shadow, 0 1px 2px rgba(0,0,0,0.06));
  position: relative; overflow: hidden;
}
.stat::before {
  content: ""; position: absolute; left: 0; top: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--nt-accent-hi), var(--nt-accent));
}
.stat .label { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 6px; font-weight: 500; }
.stat .value { font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
.stat.ok .value { color: var(--nt-green); }
.stat.warn .value { color: var(--nt-amber); }
.row { display: flex; gap: 12px; flex-wrap: wrap; align-items: end; margin-bottom: 12px; }
label.field {
  display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 500;
  color: var(--secondary-text-color); min-width: 140px; flex: 1;
}
input, select, textarea {
  font-family: inherit; font-size: 14px; padding: 10px 12px; border-radius: 10px;
  border: 1px solid var(--divider-color); background: var(--card-background-color);
  color: var(--primary-text-color); box-sizing: border-box; width: 100%;
}
input:disabled { opacity: 0.65; }
button.primary, button.secondary, button.danger, button.linkish {
  border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer;
  font-size: 13px; font-weight: 600; font-family: inherit;
}
button.primary {
  background: linear-gradient(90deg, var(--nt-accent-hi), var(--nt-accent)); color: #041018;
}
button.secondary {
  background: var(--secondary-background-color, color-mix(in srgb, var(--primary-text-color) 8%, transparent));
  color: var(--primary-text-color);
}
button.danger {
  background: color-mix(in srgb, var(--nt-red) 18%, transparent); color: var(--nt-red);
}
button.linkish {
  background: transparent; color: var(--secondary-text-color); padding: 8px 10px;
  letter-spacing: 0.06em; text-transform: uppercase; font-size: 12px;
}
button.linkish:hover { color: var(--primary-text-color); }
button.linkish.active { color: var(--nt-nest-tab); }
button.compact { padding: 6px 10px; font-size: 12px; }
table.data { width: 100%; border-collapse: collapse; font-size: 13px; }
table.data th, table.data td {
  text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--divider-color);
}
table.data th {
  color: var(--secondary-text-color); font-weight: 600; font-size: 12px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.banner { padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 13px; }
.banner.err { background: color-mix(in srgb, var(--nt-red) 14%, transparent); color: var(--nt-red); }
.banner.ok { background: color-mix(in srgb, var(--nt-accent) 14%, transparent); color: var(--nt-accent); }
.muted { color: var(--secondary-text-color); font-size: 12px; }
code {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.92em;
  padding: 1px 5px; border-radius: 4px;
  background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
}
.panel-list { display: grid; gap: 10px; }
.panel-item {
  display: flex; justify-content: space-between; gap: 12px; align-items: center;
  padding: 14px 16px; border-radius: 12px; border: 1px solid var(--divider-color);
  background: var(--secondary-background-color, transparent);
}
.panel-build-footer {
  position: absolute; right: 12px; bottom: 8px; font-size: 9px;
  color: var(--secondary-text-color); opacity: 0.42; pointer-events: none;
}

/* —— Nest-inspired hero —— */
.nest-hero {
  position: relative;
  border-radius: 18px;
  padding: 28px 20px 36px;
  margin-bottom: 0;
  background:
    radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--nt-nest-blue) 28%, transparent), transparent 70%),
    linear-gradient(180deg,
      color-mix(in srgb, var(--nt-nest-blue) 18%, var(--card-background-color)),
      var(--card-background-color));
  border: 1px solid var(--divider-color, transparent);
  box-shadow: var(--ha-card-box-shadow, 0 1px 2px rgba(0,0,0,0.08));
  overflow: hidden;
}
.nest-zones {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: clamp(16px, 4vw, 36px);
  flex-wrap: wrap;
  min-height: 220px;
}
.nest-house {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  align-self: center; margin-bottom: 28px;
}
.nest-house svg { width: 72px; height: 72px; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.18)); }
.nest-zone {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  background: transparent; border: 0; padding: 0; cursor: pointer; font-family: inherit;
  color: inherit;
}
.nest-zone:focus-visible { outline: 2px solid var(--nt-nest-tab); outline-offset: 4px; border-radius: 12px; }
.nest-zone-label {
  font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--secondary-text-color);
}
.nest-zone.selected .nest-zone-label { color: var(--primary-text-color); }
.nest-sat {
  width: 72px; height: 72px; border-radius: 50%;
  display: grid; place-items: center;
  font-size: 24px; font-weight: 700; color: #fff;
  background: #5c636b;
  box-shadow: 0 8px 18px rgba(0,0,0,0.22);
}
.nest-sat.heat { background: var(--nt-heat); }
.nest-sat.unknown { background: #6a7178; font-size: 28px; font-weight: 500; }
.nest-dial-wrap { position: relative; }
.nest-dial {
  width: 168px; height: 168px; border-radius: 50%;
  background:
    radial-gradient(circle at 50% 42%, #4a5058 0%, #2f343a 62%, #262a30 100%);
  box-shadow:
    0 14px 28px rgba(0,0,0,0.28),
    inset 0 1px 0 rgba(255,255,255,0.08);
  display: grid; place-items: center;
  position: relative;
}
.nest-dial.heating {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--nt-heat) 55%, transparent),
    0 14px 28px rgba(0,0,0,0.28),
    inset 0 1px 0 rgba(255,255,255,0.08);
}
.nest-ticks {
  position: absolute; inset: 10px; border-radius: 50%;
  background:
    repeating-conic-gradient(
      from -90deg,
      rgba(255,255,255,0.55) 0deg 1.2deg,
      transparent 1.2deg 9deg
    );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px));
  pointer-events: none;
}
.nest-dial-core {
  position: relative; z-index: 1; text-align: center; color: #fff; padding: 8px;
}
.nest-dial-caption {
  font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
  color: rgba(255,255,255,0.62); font-weight: 600; margin-bottom: 4px;
}
.nest-dial-temp { font-size: 52px; font-weight: 500; line-height: 1; letter-spacing: -0.03em; }
.nest-dial-current {
  margin-top: 4px; font-size: 12px; color: rgba(255,255,255,0.55); font-weight: 500;
}
.nest-pointer {
  position: absolute; left: 50%; bottom: -2px; transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 12px solid var(--card-background-color);
  filter: drop-shadow(0 -1px 0 var(--divider-color));
  z-index: 2;
}

/* —— Nest schedule grid —— */
.nest-schedule-sheet {
  background: var(--card-background-color);
  border-radius: 0 0 16px 16px;
  border: 1px solid var(--divider-color, transparent);
  border-top: 0;
  box-shadow: var(--ha-card-box-shadow, 0 1px 2px rgba(0,0,0,0.08));
  padding: 8px 8px 12px;
  margin-bottom: 14px;
}
.nest-schedule-toolbar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 12px 6px; flex-wrap: wrap;
}
.nest-schedule-toolbar .pill {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--nt-nest-tab); color: #fff; border-radius: 999px;
  padding: 8px 16px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase;
}
.nest-schedule-grid {
  position: relative;
  display: grid;
  grid-template-columns: 108px 1fr;
  gap: 0;
  padding: 8px 12px 4px;
}
.nest-day-label {
  display: flex; align-items: center;
  font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--secondary-text-color); padding: 0 8px 0 4px; height: 44px;
}
.nest-day-track {
  position: relative; height: 44px;
  border-bottom: 1px solid color-mix(in srgb, var(--divider-color) 80%, transparent);
}
.nest-day-track.selected { background: color-mix(in srgb, var(--nt-nest-tab) 6%, transparent); }
.nest-point {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--nt-heat); color: #fff;
  border: 0; cursor: pointer;
  font-size: 12px; font-weight: 700; font-family: inherit;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  z-index: 2;
}
.nest-point:hover { filter: brightness(1.08); }
.nest-point.selected {
  outline: 2px solid var(--nt-nest-tab);
  outline-offset: 2px;
  z-index: 3;
}
.nest-time-axis {
  grid-column: 2;
  display: flex; justify-content: space-between;
  padding: 10px 0 4px; font-size: 11px; color: var(--secondary-text-color);
  font-weight: 500;
}
.nest-schedule-actions {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px 4px; gap: 8px; flex-wrap: wrap;
}
.nest-schedule-actions .group { display: flex; gap: 4px; }
.nest-add-row {
  display: flex; gap: 10px; flex-wrap: wrap; align-items: end;
  padding: 8px 12px 12px; border-top: 1px solid var(--divider-color);
}
.nest-status-dots {
  display: inline-flex; gap: 6px; align-items: center; margin-left: auto;
}
.nest-status-dots i {
  width: 8px; height: 8px; border-radius: 50%; display: inline-block;
}
.nest-status-dots .heat { background: var(--nt-heat); }
.nest-status-dots .idle { background: #9aa0a6; }
.intel-chip {
  display: inline-flex; align-items: center; gap: 8px;
  margin: 0 0 14px; padding: 8px 14px; border-radius: 999px;
  background: color-mix(in srgb, var(--nt-heat) 16%, transparent);
  color: var(--nt-heat); font-size: 13px; font-weight: 600;
}
.intel-chip.home {
  background: color-mix(in srgb, var(--nt-accent) 14%, transparent);
  color: var(--nt-accent);
}

@media (max-width: 720px) {
  .nest-dial { width: 140px; height: 140px; }
  .nest-dial-temp { font-size: 42px; }
  .nest-sat { width: 60px; height: 60px; font-size: 20px; }
  .nest-schedule-grid { grid-template-columns: 72px 1fr; }
  .nest-day-label { font-size: 10px; padding-right: 4px; }
  .nest-point { width: 28px; height: 28px; font-size: 11px; }
}
`;

function parseHHMM(value) {
  const parts = String(value || "00:00").split(":");
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + m;
}

function minutesToHHMM(mins) {
  const m = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function formatTemp(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

function houseSvg() {
  return `<svg viewBox="0 0 80 80" aria-hidden="true">
    <path d="M12 34 L40 12 L68 34 V70 H12 Z" fill="#d7dde3"/>
    <path d="M12 34 L40 12 L68 34" fill="none" stroke="#9aa3ab" stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 12 L68 34 V22 L52 12 Z" fill="#b8c0c7"/>
    <rect x="30" y="42" width="20" height="28" rx="2" fill="#F5C542"/>
    <rect x="18" y="40" width="10" height="10" rx="1" fill="#8fa0b0"/>
    <rect x="52" y="40" width="10" height="10" rx="1" fill="#8fa0b0"/>
  </svg>`;
}

class NeatThermostatPanel extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._narrow = false;
    this._view = "overview";
    this._state = null;
    this._focusZone = "home";
    this._selectedDay = "mon";
    this._selectedPoint = null; // { day, index }
    this._clipboard = null;
    this._error = "";
    this._flash = "";
    this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._state) this._loadState();
    else this._render();
  }

  set narrow(n) {
    this._narrow = Boolean(n);
    this.classList.toggle("narrow", this._narrow);
    this._render();
  }

  connectedCallback() {
    this._render();
    this._loadState();
  }

  _ws(type, payload = {}) {
    return new Promise((resolve, reject) => {
      if (!this._hass) {
        reject(new Error("HA not ready"));
        return;
      }
      this._hass.connection
        .sendMessagePromise({ type, ...payload })
        .then(resolve)
        .catch(reject);
    });
  }

  async _loadState() {
    try {
      this._state = await this._ws("neat_thermostat/get_state");
      this._error = "";
      this._render();
    } catch (err) {
      this._error = String(err?.message || err);
      this._render();
    }
  }

  _cfg() {
    return this._state?.config || {};
  }

  _live() {
    return this._state?.live || {};
  }

  _setView(id) {
    this._view = id;
    this._flash = "";
    this._render();
  }

  _escape(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  _entityState(entityId) {
    if (!entityId || !this._hass?.states) return null;
    return this._hass.states[entityId] || null;
  }

  _mainTarget() {
    const live = this._live().main || {};
    const cfg = this._cfg();
    return live.target ?? cfg.target_temp ?? null;
  }

  _mainCurrent() {
    const sensor = this._cfg().temperature_sensor;
    const st = this._entityState(sensor);
    if (!st) return null;
    const n = Number(st.state);
    return Number.isFinite(n) ? n : null;
  }

  _roomDisplayTemp(room) {
    const live = (this._live().rooms || {})[room.id] || {};
    if (live.target != null) return live.target;
    const entity = `climate.neat_${room.id}`;
    const st = this._entityState(entity);
    const t = st?.attributes?.current_temperature ?? st?.attributes?.temperature;
    if (t != null) return t;
    return room.target_temp ?? null;
  }

  _roomHeating(room) {
    const live = (this._live().rooms || {})[room.id] || {};
    return Boolean(live.needs_heat);
  }

  _pageHeader(title, lead) {
    return `<div class="header"><h1>${title}</h1><p>${lead}</p></div>`;
  }

  _renderHero({ showPointer = false } = {}) {
    const live = this._live();
    const rooms = (this._cfg().rooms || []).filter((r) => r.enabled !== false);
    const target = formatTemp(this._mainTarget()) ?? "—";
    const current = formatTemp(this._mainCurrent());
    const heating = Boolean(live.boiler_on);
    const mode = (live.main || {}).hvac_mode || "heat";
    const preheat = live.preheat || {};
    let caption = mode === "off" ? "Off" : heating ? "Heating to" : "Heat set to";
    if (preheat.preheating) caption = "Preheating to";

    const roomZones = rooms
      .map((room) => {
        const temp = formatTemp(this._roomDisplayTemp(room));
        const heat = this._roomHeating(room);
        const selected = this._focusZone === room.id;
        const cls = temp == null ? "nest-sat unknown" : `nest-sat${heat ? " heat" : ""}`;
        const value = temp == null ? "?" : temp;
        return `
          <button type="button" class="nest-zone${selected ? " selected" : ""}" data-zone="${this._escape(room.id)}">
            <span class="${cls}">${this._escape(value)}</span>
            <span class="nest-zone-label">${this._escape(room.name)}</span>
          </button>`;
      })
      .join("");

    // Nest layout: house · TRVs · main dial (main dial centered-ish). Put dial in middle of TRVs when many.
    const leftRooms = rooms.slice(0, Math.ceil(rooms.length / 2));
    const rightRooms = rooms.slice(Math.ceil(rooms.length / 2));
    const leftHtml = leftRooms
      .map((room) => {
        const temp = formatTemp(this._roomDisplayTemp(room));
        const heat = this._roomHeating(room);
        const selected = this._focusZone === room.id;
        const cls = temp == null ? "nest-sat unknown" : `nest-sat${heat ? " heat" : ""}`;
        const value = temp == null ? "?" : temp;
        return `
          <button type="button" class="nest-zone${selected ? " selected" : ""}" data-zone="${this._escape(room.id)}">
            <span class="${cls}">${this._escape(value)}</span>
            <span class="nest-zone-label">${this._escape(room.name)}</span>
          </button>`;
      })
      .join("");
    const rightHtml = rightRooms
      .map((room) => {
        const temp = formatTemp(this._roomDisplayTemp(room));
        const heat = this._roomHeating(room);
        const selected = this._focusZone === room.id;
        const cls = temp == null ? "nest-sat unknown" : `nest-sat${heat ? " heat" : ""}`;
        const value = temp == null ? "?" : temp;
        return `
          <button type="button" class="nest-zone${selected ? " selected" : ""}" data-zone="${this._escape(room.id)}">
            <span class="${cls}">${this._escape(value)}</span>
            <span class="nest-zone-label">${this._escape(room.name)}</span>
          </button>`;
      })
      .join("");

    void roomZones;

    return `
      <section class="nest-hero">
        <div class="nest-zones">
          <div class="nest-house" title="Home">${houseSvg()}</div>
          ${leftHtml}
          <button type="button" class="nest-zone${this._focusZone === "home" ? " selected" : ""}" data-zone="home">
            <div class="nest-dial-wrap">
              <div class="nest-dial${heating ? " heating" : ""}">
                <div class="nest-ticks" aria-hidden="true"></div>
                <div class="nest-dial-core">
                  <div class="nest-dial-caption">${this._escape(caption)}</div>
                  <div class="nest-dial-temp">${this._escape(target)}</div>
                  ${current != null ? `<div class="nest-dial-current">Now ${this._escape(current)}°</div>` : ""}
                </div>
              </div>
            </div>
            <span class="nest-zone-label">Home</span>
          </button>
          ${rightHtml}
        </div>
        ${showPointer ? `<div class="nest-pointer" aria-hidden="true"></div>` : ""}
      </section>`;
  }

  _renderOverview() {
    const live = this._live();
    const preheat = live.preheat || {};
    const intel = live.intelligence || {};
    const chip = preheat.preheating
      ? `<div class="intel-chip">Preheating for ${this._escape(preheat.block_start)}</div>`
      : live.away
        ? `<div class="intel-chip">Away · Eco</div>`
        : intel.true_radiant
          ? `<div class="intel-chip home">True Radiant · ${this._escape(intel.warmup_c_per_hour ?? "—")}°C/h</div>`
          : "";
    return `
      ${this._renderHero()}
      <div style="height:14px"></div>
      ${chip}
      <div class="stats-row">
        <div class="stat ${live.boiler_on ? "ok" : ""}"><div class="label">Boiler</div><div class="value">${live.boiler_on ? "On" : "Off"}</div></div>
        <div class="stat"><div class="label">Preset</div><div class="value">${this._escape((live.main || {}).preset || "none")}</div></div>
        <div class="stat ${live.window_open ? "warn" : ""}"><div class="label">Windows</div><div class="value">${live.window_open ? "Open" : "Closed"}</div></div>
        <div class="stat ${live.summer_mode ? "warn" : ""}"><div class="label">Summer</div><div class="value">${live.summer_mode ? "On" : "Off"}</div></div>
        <div class="stat ${live.away ? "warn" : ""}"><div class="label">Away</div><div class="value">${live.away ? "Yes" : "Home"}</div></div>
      </div>
      <div class="card">
        <p class="card-title">Nest intelligence (house)</p>
        <p class="muted" style="margin:0;line-height:1.55">
          True Radiant: <strong>${intel.true_radiant ? "On" : "Off"}</strong>
          · Auto-Schedule: <strong>${intel.auto_schedule ? "On" : "Off"}</strong>
          · Away delay: <strong>${this._escape(intel.away_delay_minutes ?? 20)} min</strong><br />
          Warm-up model: <strong>${this._escape(intel.warmup_c_per_hour ?? "—")} °C/h</strong>
          (${this._escape(intel.warmup_samples ?? 0)} samples)
        </p>
      </div>
      <div class="card">
        <p class="card-title">Entities</p>
        <p class="muted" style="margin:0;line-height:1.5">
          Primary: <code>climate.neat_home</code><br />
          Rooms: <code>climate.neat_&lt;room&gt;</code>
        </p>
      </div>
    `;
  }

  _pointLeftPercent(start) {
    // Nest axis ~ 1a → 11p (1:00–23:00). Map 0–24h across full width for simplicity.
    const mins = parseHHMM(start);
    return Math.max(1, Math.min(99, (mins / (24 * 60)) * 100));
  }

  _timeAxisLabels() {
    const labels = ["1a", "3a", "5a", "7a", "9a", "11a", "Noon", "1p", "3p", "5p", "7p", "9p", "11p"];
    return labels.map((l) => `<span>${l}</span>`).join("");
  }

  _renderSchedule() {
    const schedule = this._cfg().schedule || {};
    const enabled = this._cfg().schedule_enabled !== false;
    const eco = this._cfg().eco_temp ?? 16;
    const sel = this._selectedPoint;

    const rows = DAYS.map((day) => {
      const blocks = schedule[day] || [];
      const selectedDay = this._selectedDay === day;
      const points = blocks
        .map((b, index) => {
          const left = this._pointLeftPercent(b.start);
          const temp = formatTemp(b.temperature) ?? "—";
          const isSel = sel && sel.day === day && sel.index === index;
          return `<button type="button" class="nest-point${isSel ? " selected" : ""}"
            style="left:${left}%"
            data-day="${day}" data-index="${index}"
            title="${this._escape(b.start)} → ${this._escape(b.end)} · ${this._escape(temp)}°">${this._escape(temp)}</button>`;
        })
        .join("");
      return `
        <div class="nest-day-label">${DAY_LABELS[day]}</div>
        <div class="nest-day-track${selectedDay ? " selected" : ""}" data-day-track="${day}">${points}</div>`;
    }).join("");

    return `
      ${this._renderHero({ showPointer: true })}
      <div class="nest-schedule-sheet">
        <div class="nest-schedule-toolbar">
          <span class="pill">Schedule</span>
          <label class="field" style="flex:0;min-width:120px;margin:0">
            Enabled
            <select id="schedEnabled">
              <option value="true" ${enabled ? "selected" : ""}>On</option>
              <option value="false" ${!enabled ? "selected" : ""}>Off</option>
            </select>
          </label>
          <div class="nest-status-dots" title="Heat / idle">
            <i class="heat"></i><i class="idle"></i>
          </div>
        </div>
        <div class="nest-schedule-grid">
          ${rows}
          <div></div>
          <div class="nest-time-axis">${this._timeAxisLabels()}</div>
        </div>
        <div class="nest-schedule-actions">
          <div class="group">
            <button type="button" class="linkish" id="schedCopy">Copy</button>
            <button type="button" class="linkish" id="schedPaste">Paste</button>
          </div>
          <div class="group">
            <button type="button" class="linkish" id="schedRemove">Remove</button>
            <button type="button" class="linkish" id="schedAdd">Add</button>
          </div>
        </div>
        <div class="nest-add-row">
          <label class="field">Day
            <select id="addDay">${DAYS.map((d) => `<option value="${d}" ${this._selectedDay === d ? "selected" : ""}>${DAY_SHORT[d]}</option>`).join("")}</select>
          </label>
          <label class="field">Start<input id="addStart" type="time" value="06:30" /></label>
          <label class="field">End<input id="addEnd" type="time" value="08:30" /></label>
          <label class="field">Temp °C<input id="addTemp" type="number" step="0.5" value="${this._escape(this._mainTarget() ?? 20)}" /></label>
          <button type="button" class="primary" id="saveSchedule">Save schedule</button>
        </div>
        <p class="muted" style="margin:0 12px 8px">Outside comfort blocks, Eco (${this._escape(eco)}°) applies. Orange dots are block start setpoints (Nest-style).</p>
      </div>
    `;
  }

  _renderRooms() {
    const rooms = this._cfg().rooms || [];
    const rows = rooms
      .map((r) => {
        const live = (this._live().rooms || {})[r.id] || {};
        return `<tr>
          <td>${this._escape(r.name)}</td>
          <td><code>${this._escape(r.trv_entity)}</code></td>
          <td>${this._escape(live.target ?? r.target_temp)}°</td>
          <td>${this._escape(live.hvac_mode || "—")}</td>
          <td>${live.needs_heat ? "Yes" : "No"}</td>
        </tr>`;
      })
      .join("");
    return `
      ${this._pageHeader("Rooms", "Each room has its own Neat climate and can call for heat independently.")}
      <div class="card">
        <p class="card-title">Configured rooms</p>
        <table class="data">
          <thead><tr><th>Room</th><th>TRV</th><th>Target</th><th>Mode</th><th>Needs heat</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="muted">No rooms yet — add one below.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="card">
        <p class="card-title">Add / update room</p>
        <div class="row">
          <label class="field">Name<input id="roomName" placeholder="Kitchen" /></label>
          <label class="field">TRV climate<input id="roomTrv" placeholder="climate.kitchen_..." /></label>
          <label class="field">Temp sensor (optional)<input id="roomSensor" placeholder="sensor...." /></label>
        </div>
        <button class="primary" id="saveRoom">Save room</button>
      </div>
    `;
  }

  _renderWallPanels() {
    const panels = this._cfg().wall_panels || [];
    const rooms = this._cfg().rooms || [];
    const list = panels
      .map(
        (p) => `
      <div class="panel-item" data-id="${this._escape(p.id)}">
        <div>
          <strong>${this._escape(p.label || p.id)}</strong>
          <div class="muted">id: <code>${this._escape(p.id)}</code> · primary: <code>${this._escape(p.primary_entity || "climate.neat_home")}</code></div>
        </div>
        <button class="danger del-panel" data-id="${this._escape(p.id)}">Delete</button>
      </div>`
      )
      .join("");
    return `
      ${this._pageHeader("Wall panels", "Define each physical NSPanel here. On the device, only pick which panel it is.")}
      <div class="card">
        <p class="card-title">Registered panels</p>
        <div class="panel-list">${list || `<p class="muted" style="margin:0">No wall panels yet.</p>`}</div>
      </div>
      <div class="card">
        <p class="card-title">Add / update wall panel</p>
        <div class="row">
          <label class="field">Panel ID<input id="wpId" placeholder="hallway" /></label>
          <label class="field">Label<input id="wpLabel" placeholder="Hallway panel" /></label>
          <label class="field">Primary climate<input id="wpPrimary" placeholder="climate.neat_home" value="climate.neat_home" /></label>
        </div>
        <div class="row">
          <label class="field">Idle timeout (sec)<input id="wpIdle" type="number" value="30" min="5" /></label>
          <label class="field">Inside temp sensor<input id="wpInside" placeholder="sensor...." /></label>
          <label class="field">Weather entity<input id="wpWeather" placeholder="weather.home" value="weather.home" /></label>
        </div>
        <p class="muted">Room chips default to all Neat rooms (${rooms.length ? rooms.map((r) => r.name).join(", ") : "none yet"}).</p>
        <button class="primary" id="saveWallPanel">Save wall panel</button>
      </div>
    `;
  }

  _renderSettings() {
    const cfg = this._cfg();
    const presence = (cfg.presence_entities || []).join(", ");
    return `
      ${this._pageHeader("Settings", "House-wide temperatures, Nest intelligence, and modes.")}
      <div class="card">
        <p class="card-title">Temperatures</p>
        <div class="row">
          <label class="field">Eco °C<input id="ecoTemp" type="number" step="0.5" value="${this._escape(cfg.eco_temp ?? 16)}" /></label>
          <label class="field">Boost °C<input id="boostTemp" type="number" step="0.5" value="${this._escape(cfg.boost_temp ?? 22)}" /></label>
          <label class="field">Away °C<input id="awayTemp" type="number" step="0.5" value="${this._escape(cfg.away_temp ?? 15)}" /></label>
        </div>
      </div>
      <div class="card">
        <p class="card-title">Nest intelligence (house only)</p>
        <div class="row">
          <label class="field">True Radiant
            <select id="trueRadiant">
              <option value="true" ${cfg.true_radiant !== false ? "selected" : ""}>On</option>
              <option value="false" ${cfg.true_radiant === false ? "selected" : ""}>Off (on schedule)</option>
            </select>
          </label>
          <label class="field">Auto-Schedule
            <select id="autoSchedule">
              <option value="false" ${!cfg.auto_schedule ? "selected" : ""}>Off</option>
              <option value="true" ${cfg.auto_schedule ? "selected" : ""}>On</option>
            </select>
          </label>
          <label class="field">Away delay (min)
            <input id="awayDelay" type="number" min="0" max="180" value="${this._escape(cfg.away_delay_minutes ?? 20)}" />
          </label>
        </div>
        <div class="row">
          <label class="field">Outdoor temp sensor
            <input id="outdoorSensor" value="${this._escape(cfg.outdoor_temp_sensor || "")}" placeholder="sensor.home_temperature" />
          </label>
          <label class="field">Presence entities (comma-separated)
            <input id="presenceEntities" value="${this._escape(presence || cfg.person_entity || "")}" placeholder="person.you, person.partner" />
          </label>
        </div>
        <p class="muted">True Radiant preheats so the house hits the scheduled temp on time. Auto-Schedule learns from Home dial changes. Away Eco engages only after the delay when all presence entities are not home.</p>
      </div>
      <div class="card">
        <p class="card-title">Behaviour</p>
        <div class="row">
          <label class="field">Cold tolerance<input id="coldTol" type="number" step="0.1" value="${this._escape(cfg.cold_tolerance ?? 0.3)}" /></label>
          <label class="field">Hot tolerance<input id="hotTol" type="number" step="0.1" value="${this._escape(cfg.hot_tolerance ?? 0.3)}" /></label>
          <label class="field">Summer mode
            <select id="summerMode">
              <option value="false" ${!cfg.summer_mode ? "selected" : ""}>Off</option>
              <option value="true" ${cfg.summer_mode ? "selected" : ""}>On</option>
            </select>
          </label>
        </div>
        <div class="row">
          <label class="field">Person (legacy)<input id="personEntity" value="${this._escape(cfg.person_entity || "")}" placeholder="person.you" /></label>
          <label class="field">Heater<input value="${this._escape(cfg.heater || "")}" disabled /></label>
          <label class="field">House sensor<input value="${this._escape(cfg.temperature_sensor || "")}" disabled /></label>
        </div>
        <button class="primary" id="saveSettings">Save settings</button>
      </div>
    `;
  }

  _mutateSchedule(mutator) {
    if (!this._state?.config) return;
    const schedule = JSON.parse(JSON.stringify(this._cfg().schedule || {}));
    mutator(schedule);
    this._state.config.schedule = schedule;
  }

  _render() {
    const body =
      this._view === "rooms"
        ? this._renderRooms()
        : this._view === "schedule"
          ? this._renderSchedule()
          : this._view === "wall_panels"
            ? this._renderWallPanels()
            : this._view === "settings"
              ? this._renderSettings()
              : this._renderOverview();

    const tabs = NAV.map(
      (n) =>
        `<button type="button" class="tab${this._view === n.id ? " active" : ""}" data-view="${n.id}">${n.label}</button>`
    ).join("");

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div class="shell${this._narrow ? " narrow" : ""}">
        <header class="page-header">
          <div class="panel-header-top">
            <button type="button" class="panel-ha-menu-btn" id="haMenu" aria-label="Open menu">
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2Z"/></svg>
            </button>
            <div class="panel-brand-row">
              <div class="panel-brand-mark" aria-hidden="true">N</div>
              <div>
                <div class="panel-brand-title">Neat Thermostat</div>
                <div class="panel-brand-sub">Heating · rooms · wall panels</div>
              </div>
            </div>
          </div>
          <nav class="tab-bar" aria-label="Neat sections">${tabs}</nav>
        </header>
        <div class="main">
          <div class="main-inner">
            ${this._error ? `<div class="banner err">${this._escape(this._error)}</div>` : ""}
            ${this._flash ? `<div class="banner ok">${this._escape(this._flash)}</div>` : ""}
            ${body}
          </div>
        </div>
        <p class="panel-build-footer">neat ${PANEL_VERSION}</p>
      </div>
    `;
    this._bind();
  }

  _bind() {
    this.shadowRoot.getElementById("haMenu")?.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }));
    });

    this.shadowRoot.querySelectorAll(".tab[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => this._setView(btn.dataset.view));
    });

    this.shadowRoot.querySelectorAll(".nest-zone[data-zone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this._focusZone = btn.dataset.zone;
        this._render();
      });
    });

    // Schedule interactions
    this.shadowRoot.querySelectorAll(".nest-point").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this._selectedDay = btn.dataset.day;
        this._selectedPoint = { day: btn.dataset.day, index: Number(btn.dataset.index) };
        this._render();
      });
    });
    this.shadowRoot.querySelectorAll("[data-day-track]").forEach((track) => {
      track.addEventListener("click", () => {
        this._selectedDay = track.dataset.dayTrack;
        this._selectedPoint = null;
        this._render();
      });
    });

    this.shadowRoot.getElementById("schedCopy")?.addEventListener("click", () => {
      const day = this._selectedDay;
      this._clipboard = JSON.parse(JSON.stringify(this._cfg().schedule?.[day] || []));
      this._flash = `Copied ${DAY_SHORT[day]} schedule`;
      this._render();
    });
    this.shadowRoot.getElementById("schedPaste")?.addEventListener("click", () => {
      if (!this._clipboard) {
        this._error = "Nothing copied yet";
        this._render();
        return;
      }
      this._mutateSchedule((schedule) => {
        schedule[this._selectedDay] = JSON.parse(JSON.stringify(this._clipboard));
      });
      this._flash = `Pasted onto ${DAY_SHORT[this._selectedDay]}`;
      this._render();
    });
    this.shadowRoot.getElementById("schedRemove")?.addEventListener("click", () => {
      if (!this._selectedPoint) {
        this._error = "Select an orange setpoint to remove";
        this._render();
        return;
      }
      const { day, index } = this._selectedPoint;
      this._mutateSchedule((schedule) => {
        const blocks = [...(schedule[day] || [])];
        blocks.splice(index, 1);
        schedule[day] = blocks;
      });
      this._selectedPoint = null;
      this._flash = "Setpoint removed (save to keep)";
      this._render();
    });
    this.shadowRoot.getElementById("schedAdd")?.addEventListener("click", () => {
      const day = this.shadowRoot.getElementById("addDay")?.value || this._selectedDay;
      const start = this.shadowRoot.getElementById("addStart")?.value || "06:30";
      const end = this.shadowRoot.getElementById("addEnd")?.value || "08:30";
      const temperature = Number(this.shadowRoot.getElementById("addTemp")?.value || 20);
      this._mutateSchedule((schedule) => {
        const blocks = [...(schedule[day] || [])];
        blocks.push({ start, end, temperature, enabled: true });
        blocks.sort((a, b) => parseHHMM(a.start) - parseHHMM(b.start));
        schedule[day] = blocks;
      });
      this._selectedDay = day;
      this._flash = "Setpoint added (save to keep)";
      this._render();
    });

    const saveSchedule = this.shadowRoot.getElementById("saveSchedule");
    if (saveSchedule) {
      saveSchedule.addEventListener("click", async () => {
        try {
          await this._ws("neat_thermostat/update_schedule", {
            schedule: this._cfg().schedule || {},
            schedule_enabled: this.shadowRoot.getElementById("schedEnabled").value === "true",
          });
          this._flash = "Schedule saved";
          await this._loadState();
        } catch (e) {
          this._error = String(e.message || e);
          this._render();
        }
      });
    }

    const saveSettings = this.shadowRoot.getElementById("saveSettings");
    if (saveSettings) {
      saveSettings.addEventListener("click", async () => {
        try {
          await this._ws("neat_thermostat/update_settings", {
            eco_temp: Number(this.shadowRoot.getElementById("ecoTemp").value),
            boost_temp: Number(this.shadowRoot.getElementById("boostTemp").value),
            away_temp: Number(this.shadowRoot.getElementById("awayTemp").value),
            cold_tolerance: Number(this.shadowRoot.getElementById("coldTol").value),
            hot_tolerance: Number(this.shadowRoot.getElementById("hotTol").value),
            summer_mode: this.shadowRoot.getElementById("summerMode").value === "true",
            person_entity: this.shadowRoot.getElementById("personEntity").value.trim(),
            true_radiant: this.shadowRoot.getElementById("trueRadiant").value === "true",
            auto_schedule: this.shadowRoot.getElementById("autoSchedule").value === "true",
            away_delay_minutes: Number(this.shadowRoot.getElementById("awayDelay").value),
            outdoor_temp_sensor: this.shadowRoot.getElementById("outdoorSensor").value.trim(),
            presence_entities: this.shadowRoot
              .getElementById("presenceEntities")
              .value.split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          });
          this._flash = "Settings saved";
          await this._loadState();
        } catch (e) {
          this._error = String(e.message || e);
          this._render();
        }
      });
    }

    const saveRoom = this.shadowRoot.getElementById("saveRoom");
    if (saveRoom) {
      saveRoom.addEventListener("click", async () => {
        const name = this.shadowRoot.getElementById("roomName").value.trim();
        const trv = this.shadowRoot.getElementById("roomTrv").value.trim();
        const sensor = this.shadowRoot.getElementById("roomSensor").value.trim();
        if (!name || !trv) {
          this._error = "Room name and TRV required";
          this._render();
          return;
        }
        const id = name.toLowerCase().replace(/\s+/g, "_");
        const rooms = [...(this._cfg().rooms || [])].filter((r) => r.id !== id);
        rooms.push({ id, name, trv_entity: trv, temperature_sensor: sensor, enabled: true });
        try {
          await this._ws("neat_thermostat/update_rooms", { rooms });
          this._flash = `Room ${name} saved (integration may reload)`;
          await this._loadState();
        } catch (e) {
          this._error = String(e.message || e);
          this._render();
        }
      });
    }

    const saveWall = this.shadowRoot.getElementById("saveWallPanel");
    if (saveWall) {
      saveWall.addEventListener("click", async () => {
        const id = this.shadowRoot.getElementById("wpId").value.trim().toLowerCase();
        const label = this.shadowRoot.getElementById("wpLabel").value.trim() || id;
        if (!id) {
          this._error = "Panel ID required";
          this._render();
          return;
        }
        const idleSec = Number(this.shadowRoot.getElementById("wpIdle").value) || 30;
        const rooms = (this._cfg().rooms || []).map((r) => ({
          entity: `climate.neat_${r.id}`,
          name: r.name,
        }));
        try {
          await this._ws("neat_thermostat/upsert_wall_panel", {
            panel: {
              id,
              label,
              primary_entity:
                this.shadowRoot.getElementById("wpPrimary").value.trim() || "climate.neat_home",
              rooms,
              sensors: {
                insideTemp: this.shadowRoot.getElementById("wpInside").value.trim(),
                weather:
                  this.shadowRoot.getElementById("wpWeather").value.trim() || "weather.home",
                sun: "sun.sun",
              },
              display: { idleMs: idleSec * 1000, panelEntity: "" },
            },
          });
          this._flash = `Wall panel ${label} saved`;
          await this._loadState();
        } catch (e) {
          this._error = String(e.message || e);
          this._render();
        }
      });
      this.shadowRoot.querySelectorAll(".del-panel").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            await this._ws("neat_thermostat/delete_wall_panel", { panel_id: btn.dataset.id });
            this._flash = "Wall panel deleted";
            await this._loadState();
          } catch (e) {
            this._error = String(e.message || e);
            this._render();
          }
        });
      });
    }
  }
}

const versionTag = `neat-thermostat-panel-${PANEL_VERSION.replaceAll(".", "_")}`;
if (!customElements.get(versionTag)) {
  customElements.define(versionTag, NeatThermostatPanel);
}
if (!customElements.get("neat-thermostat-panel")) {
  customElements.define("neat-thermostat-panel", NeatThermostatPanel);
}
