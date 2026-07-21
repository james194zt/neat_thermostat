/**
 * Neat Thermostat — HA sidebar panel.
 * Fox Plant–style shell + Nest-inspired overview / schedule.
 * @version 0.3.2
 */
const NAV = [
  { id: "overview", label: "Overview" },
  { id: "energy", label: "Energy" },
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
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PANEL_VERSION = "0.3.2";
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
.nest-dial.leaf {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--nt-green) 50%, transparent),
    0 14px 28px rgba(0,0,0,0.28),
    inset 0 1px 0 rgba(255,255,255,0.08);
}
.nest-dial.heating.leaf {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--nt-heat) 45%, transparent),
    0 0 0 6px color-mix(in srgb, var(--nt-green) 35%, transparent),
    0 14px 28px rgba(0,0,0,0.28),
    inset 0 1px 0 rgba(255,255,255,0.08);
}
.nest-leaf {
  position: absolute; top: 14px; right: 18px; z-index: 2;
  width: 22px; height: 22px; color: var(--nt-green);
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
}
.nest-leaf svg { width: 100%; height: 100%; display: block; }
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
.intel-chip.leaf {
  background: color-mix(in srgb, var(--nt-green) 16%, transparent);
  color: var(--nt-green);
}
.eh-banner {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  margin: 0 0 16px; padding: 14px 16px; border-radius: var(--nt-radius);
  background: color-mix(in srgb, var(--nt-heat) 12%, var(--card-background-color, #fff));
  border: 1px solid color-mix(in srgb, var(--nt-heat) 25%, transparent);
}
.eh-banner .eh-copy { flex: 1; min-width: 160px; }
.eh-banner strong { display: block; font-size: 15px; margin-bottom: 2px; }
.eh-month {
  margin: 18px 0 8px; padding: 8px 12px; border-radius: 8px;
  background: color-mix(in srgb, var(--primary-text-color) 10%, transparent);
  font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-align: center;
}
.eh-day {
  display: grid; grid-template-columns: 72px 22px 1fr; gap: 8px; align-items: center;
  padding: 10px 0; border-bottom: 1px solid var(--divider-color);
}
.eh-day-label { font-size: 13px; font-weight: 600; }
.eh-leaf { width: 18px; height: 18px; color: var(--nt-green); }
.eh-leaf.empty { opacity: 0; }
.eh-track-wrap { position: relative; padding-top: 18px; padding-bottom: 18px; }
.eh-track {
  position: relative; height: 18px; border-radius: 999px;
  background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
  overflow: hidden;
}
.eh-seg {
  position: absolute; top: 0; bottom: 0;
  background: var(--nt-heat); border-radius: 4px;
}
.eh-bubble {
  position: absolute; top: -2px; transform: translate(-50%, -100%);
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--nt-heat); color: #fff;
  font-size: 10px; font-weight: 700;
  display: grid; place-items: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  z-index: 2;
}
.eh-axis {
  display: flex; justify-content: space-between;
  margin-top: 6px; font-size: 10px; color: var(--secondary-text-color);
}
.nest-dial-eta {
  margin-top: 4px; font-size: 11px; font-weight: 600;
  letter-spacing: 0.04em; color: rgba(255,255,255,0.72);
}
.toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 500;
  z-index: 100; box-shadow: 0 4px 16px rgba(0,0,0,0.25); max-width: 90%;
  pointer-events: none;
}
.toast.ok { background: var(--nt-green); color: #fff; }
.toast.err { background: var(--nt-red); color: #fff; }
.entity-picker-host {
  display: block; min-height: 56px; width: 100%;
}
.entity-picker-host ha-entity-picker,
.entity-picker-host ha-entities-picker {
  display: block; width: 100%;
}
.entity-picker-loading, .entity-picker-error {
  margin: 0; font-size: 13px; color: var(--secondary-text-color);
}
.entity-picker-error { color: var(--error-color, #db4437); }
label.field .entity-picker-host { margin-top: 0; }

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

function leafSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M17.5 3.5c-3.2.2-6.2 1.7-8.2 4.1C7 10.1 6 13 6.2 16c2.8-.1 5.5-1.3 7.4-3.4 2.1-2.3 3.3-5.3 3.9-9.1z"/>
    <path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"
      d="M7.2 17.2c1.6-2.4 3.8-4.2 6.3-5.4"/>
  </svg>`;
}

let _haEntityPickerLoadPromise = null;

async function ensureHaEntityPickerLoaded() {
  if (customElements.get("ha-entity-picker") && customElements.get("ha-entities-picker")) {
    return;
  }
  if (typeof window.loadCardHelpers !== "function") {
    throw new Error("Home Assistant entity picker is not available");
  }
  if (!_haEntityPickerLoadPromise) {
    _haEntityPickerLoadPromise = (async () => {
      const helpers = await window.loadCardHelpers();
      const card = await helpers.createCardElement({ type: "entities", entities: [] });
      const configEl = card.constructor.getConfigElement?.();
      if (configEl && typeof configEl.then === "function") await configEl;
      await customElements.whenDefined("ha-entity-picker");
      // Multi-picker may load with the same helpers path; don't hang if missing
      if (!customElements.get("ha-entities-picker")) {
        await Promise.race([
          customElements.whenDefined("ha-entities-picker"),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
    })();
  }
  await _haEntityPickerLoadPromise;
}

function temperatureSensorFilter(stateObj) {
  if (!stateObj) return false;
  if (stateObj.attributes?.device_class === "temperature") return true;
  const uom = stateObj.attributes?.unit_of_measurement;
  return uom === "°C" || uom === "°F" || uom === "K" || uom === "celsius" || uom === "fahrenheit";
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
    this._energy = null;
    this._liveTimer = null;
    this._refreshingLive = false;
    this._toastTimer = null;
    this._roomDraft = { trv: "", sensor: "", extras: [] };
    this._roomPickerMountGen = 0;
    this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;
    // Do not full-render on every HA hass update — that wipes Settings/Rooms form edits.
    if (!this._state) this._loadState();
  }

  set narrow(n) {
    this._narrow = Boolean(n);
    this.classList.toggle("narrow", this._narrow);
    const shell = this.shadowRoot?.querySelector(".shell");
    if (shell) {
      shell.classList.toggle("narrow", this._narrow);
    } else {
      this._render();
    }
  }

  connectedCallback() {
    this._render();
    this._loadState();
    this._liveTimer = window.setInterval(() => this._softRefreshLive(), 5000);
  }

  disconnectedCallback() {
    if (this._liveTimer) {
      window.clearInterval(this._liveTimer);
      this._liveTimer = null;
    }
    if (this._toastTimer) {
      window.clearTimeout(this._toastTimer);
      this._toastTimer = null;
    }
  }

  _showToast(msg, type = "ok") {
    const root = this.shadowRoot;
    if (!root) return;
    const old = root.querySelector(".toast");
    if (old) old.remove();
    if (this._toastTimer) window.clearTimeout(this._toastTimer);
    const el = document.createElement("div");
    el.className = `toast ${type === "err" ? "err" : "ok"}`;
    el.textContent = msg;
    root.appendChild(el);
    this._toastTimer = window.setTimeout(() => el.remove(), 3500);
  }

  _formViews() {
    return new Set(["settings", "rooms", "wall_panels", "schedule"]);
  }

  async _softRefreshLive() {
    if (!this._hass || !this._state || this._refreshingLive) return;
    // Never rebuild form pages while the user may be editing.
    if (this._formViews().has(this._view)) return;
    this._refreshingLive = true;
    try {
      const next = await this._ws("neat_thermostat/get_state");
      this._state = next;
      if (this._view === "energy") await this._loadEnergy();
      if (this._view === "overview" || this._view === "energy") this._render();
    } catch {
      // Ignore background refresh errors
    } finally {
      this._refreshingLive = false;
    }
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
      if (this._view === "energy") await this._loadEnergy();
      this._render();
    } catch (err) {
      this._error = String(err?.message || err);
      this._render();
    }
  }

  async _loadEnergy() {
    try {
      this._energy = await this._ws("neat_thermostat/get_energy_history", { days: 31 });
    } catch (err) {
      this._energy = null;
      this._error = String(err?.message || err);
    }
  }

  _formatEta(minutes) {
    if (minutes == null || !Number.isFinite(Number(minutes))) return null;
    const m = Math.round(Number(minutes));
    if (m < 60) return `~${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `~${h}h ${rem}m` : `~${h}h`;
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
    if (id === "energy") {
      this._loadEnergy().then(() => this._render());
      return;
    }
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
    const leaf = live.leaf || {};
    const leafActive = Boolean(leaf.active);
    let caption = mode === "off" ? "Off" : heating ? "Heating to" : "Heat set to";
    if (preheat.preheating) caption = "Preheating to";

    const dialClass = `nest-dial${heating ? " heating" : ""}${leafActive ? " leaf" : ""}`;
    const leafBadge = leafActive
      ? `<div class="nest-leaf" title="Leaf — efficient setpoint">${leafSvg()}</div>`
      : "";
    const eta = this._formatEta(live.time_to_temp_minutes);
    const etaHtml = eta ? `<div class="nest-dial-eta">${this._escape(eta)}</div>` : "";

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
              <div class="${dialClass}">
                <div class="nest-ticks" aria-hidden="true"></div>
                ${leafBadge}
                <div class="nest-dial-core">
                  <div class="nest-dial-caption">${this._escape(caption)}</div>
                  <div class="nest-dial-temp">${this._escape(target)}</div>
                  ${current != null ? `<div class="nest-dial-current">Now ${this._escape(current)}°</div>` : ""}
                  ${etaHtml}
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
    const leaf = live.leaf || {};
    const chip = live.safety_active
      ? `<div class="intel-chip">Safety temp · heating to protect</div>`
      : leaf.active
      ? `<div class="intel-chip leaf">Leaf · efficient setpoint</div>`
      : preheat.preheating
        ? `<div class="intel-chip">Preheating for ${this._escape(preheat.block_start)}</div>`
        : live.away
          ? `<div class="intel-chip">Away · Eco</div>`
          : Number(live.adaptive_offset_c)
            ? `<div class="intel-chip home">Adaptive Comfort · ${Number(live.adaptive_offset_c) > 0 ? "+" : ""}${this._escape(live.adaptive_offset_c)}°C</div>`
            : intel.true_radiant
              ? `<div class="intel-chip home">True Radiant · ${this._escape(intel.warmup_c_per_hour ?? "—")}°C/h</div>`
              : "";
    const hoursWeek = leaf.hours_week ?? (leaf.minutes_week != null ? (leaf.minutes_week / 60).toFixed(2) : "—");
    const hoursTotal = leaf.hours_total ?? (leaf.minutes_total != null ? (leaf.minutes_total / 60).toFixed(2) : "—");
    const streak = leaf.days_streak ?? 0;
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
        <p class="card-title">Leaf (earned)</p>
        <p class="muted" style="margin:0;line-height:1.55">
          ${leaf.active ? "Leaf is on right now — you're at an efficient setpoint." : "Turn the heat down a little (or Eco/Away) to earn Leaf time."}<br />
          This week: <strong>${this._escape(hoursWeek)} h</strong>
          · All time: <strong>${this._escape(hoursTotal)} h</strong>
          · Streak: <strong>${this._escape(streak)} day${streak === 1 ? "" : "s"}</strong><br />
          <span style="opacity:0.85">Leaves only accumulate — turning heat up hides the icon, it never takes earned time away.</span>
        </p>
      </div>
      <div class="card">
        <p class="card-title">Nest intelligence (house)</p>
        <p class="muted" style="margin:0;line-height:1.55">
          True Radiant: <strong>${intel.true_radiant ? "On" : "Off"}</strong>
          · Auto-Schedule: <strong>${intel.auto_schedule ? "On" : "Off"}</strong>
          · Leaf coaching: <strong>${intel.leaf_enabled !== false ? "On" : "Off"}</strong>
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

  _ehDayParts(isoDate) {
    const d = new Date(`${isoDate}T12:00:00`);
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    return {
      label: `${weekday} ${d.getDate()}`,
      monthKey: `${d.getFullYear()}-${d.getMonth()}`,
      monthName: MONTHS[d.getMonth()],
    };
  }

  _ehPct(ts, dayIso) {
    if (!ts) return 100;
    const t = new Date(ts);
    const start = new Date(`${dayIso}T00:00:00`);
    const mins = (t - start) / 60000;
    return Math.max(0, Math.min(100, (mins / (24 * 60)) * 100));
  }

  _renderEnergyDay(day) {
    const parts = this._ehDayParts(day.date);
    const segs = (day.heat_intervals || [])
      .map((iv) => {
        const left = this._ehPct(iv.start_ts, day.date);
        const right = this._ehPct(iv.end_ts || new Date().toISOString(), day.date);
        const width = Math.max(0.4, right - left);
        return `<div class="eh-seg" style="left:${left}%;width:${width}%"></div>`;
      })
      .join("");
    const bubbles = (day.setpoints || [])
      .map((sp) => {
        const left = this._ehPct(sp.ts, day.date);
        const temp = formatTemp(sp.temperature) ?? "—";
        return `<div class="eh-bubble" style="left:${left}%" title="${this._escape(temp)}°">${this._escape(temp)}</div>`;
      })
      .join("");
    return `
      <div class="eh-day">
        <div class="eh-day-label">${this._escape(parts.label)}</div>
        <div class="eh-leaf${day.leaf ? "" : " empty"}" title="${day.leaf ? "Leaf earned" : ""}">${day.leaf ? leafSvg() : ""}</div>
        <div class="eh-track-wrap">
          ${bubbles}
          <div class="eh-track">${segs}</div>
          <div class="eh-axis"><span>12AM</span><span>4AM</span><span>8AM</span><span>12PM</span><span>4PM</span><span>8PM</span><span>12AM</span></div>
        </div>
      </div>`;
  }

  _renderEnergy() {
    const hist = this._energy?.history?.days || [];
    const seasonal = this._energy?.seasonal_savings || this._live().seasonal_savings || {};
    const banner = seasonal.active
      ? `<div class="eh-banner">
          <div class="eh-copy">
            <strong>Winter Seasonal Savings</strong>
            <span class="muted">${this._escape(seasonal.days_remaining ?? 0)} days to go · comfort offset ${this._escape(seasonal.offset_c ?? 0)}°C</span>
          </div>
          <button type="button" class="secondary" id="stopSeasonal">Stop</button>
        </div>`
      : "";
    let lastMonth = null;
    const rows = hist
      .map((day) => {
        const parts = this._ehDayParts(day.date);
        let month = "";
        if (parts.monthKey !== lastMonth) {
          lastMonth = parts.monthKey;
          month = `<div class="eh-month">${this._escape(parts.monthName)}</div>`;
        }
        return `${month}${this._renderEnergyDay(day)}`;
      })
      .join("");
    return `
      ${this._pageHeader("Energy History", "When the boiler ran, setpoint changes, and Leaf days.")}
      ${banner}
      <div class="card" style="padding:8px 16px 16px">
        ${rows || `<p class="muted">No history yet — heat cycles will appear here.</p>`}
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
        const extras = (r.extra_temperature_sensors || []).join(", ");
        return `<tr>
          <td>${this._escape(r.name)}</td>
          <td><code>${this._escape(r.trv_entity)}</code></td>
          <td><code>${this._escape(r.temperature_sensor || "—")}</code>${extras ? `<div class="muted">${this._escape(extras)}</div>` : ""}</td>
          <td>${this._escape(live.target ?? r.target_temp)}°</td>
          <td>${live.needs_heat ? "Yes" : "No"}</td>
        </tr>`;
      })
      .join("");
    return `
      ${this._pageHeader("Rooms", "Each room has its own Neat climate and can call for heat independently.")}
      <div class="card">
        <p class="card-title">Configured rooms</p>
        <table class="data">
          <thead><tr><th>Room</th><th>TRV</th><th>Sensors</th><th>Target</th><th>Needs heat</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="muted">No rooms yet — add one below.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="card">
        <p class="card-title">Add / update room</p>
        <div class="row">
          <label class="field">Name<input id="roomName" placeholder="Kitchen" /></label>
        </div>
        <div class="row">
          <label class="field">TRV climate
            <div class="entity-picker-host" data-room-picker="trv"></div>
          </label>
        </div>
        <div class="row">
          <label class="field">Temp sensor (optional)
            <div class="entity-picker-host" data-room-picker="sensor"></div>
          </label>
        </div>
        <div class="row">
          <label class="field">Extra temp sensors (optional)
            <div class="entity-picker-host" data-room-picker="extras"></div>
          </label>
        </div>
        <p class="muted">Pick entities from Home Assistant. Neat averages all available room temperature sensors.</p>
        <button class="primary" id="saveRoom">Save room</button>
      </div>
    `;
  }

  async _mountRoomPickers() {
    if (this._view !== "rooms" || !this._hass) return;
    const gen = ++this._roomPickerMountGen;
    const hosts = [...(this.shadowRoot?.querySelectorAll("[data-room-picker]") || [])];
    if (!hosts.length) return;
    for (const host of hosts) {
      if (!host.querySelector("ha-entity-picker, ha-entities-picker")) {
        host.innerHTML = `<p class="entity-picker-loading">Loading entity picker…</p>`;
      }
    }
    try {
      await ensureHaEntityPickerLoaded();
    } catch (err) {
      if (gen !== this._roomPickerMountGen) return;
      for (const host of hosts) {
        host.innerHTML = `<p class="entity-picker-error">${this._escape(err?.message || "Entity picker unavailable")}</p>`;
      }
      return;
    }
    if (gen !== this._roomPickerMountGen || this._view !== "rooms") return;

    const mountSingle = (key, { domains, filter, label }) => {
      const host = this.shadowRoot.querySelector(`[data-room-picker="${key}"]`);
      if (!host) return;
      let picker = host.querySelector("ha-entity-picker");
      if (!picker) {
        host.replaceChildren();
        picker = document.createElement("ha-entity-picker");
        picker.setAttribute("allow-custom-entity", "");
        if (this._hass.userData?.showEntityIdPicker) picker.setAttribute("show-entity-id", "");
        if (label) picker.label = label;
        picker.includeDomains = domains;
        if (filter) picker.entityFilter = filter;
        picker.addEventListener("value-changed", (ev) => {
          this._roomDraft[key] = ev.detail?.value || "";
        });
        host.appendChild(picker);
      }
      picker.hass = this._hass;
      const value = this._roomDraft[key] || "";
      if (picker.value !== value) picker.value = value || undefined;
    };

    mountSingle("trv", { domains: ["climate"], label: "TRV climate" });
    mountSingle("sensor", {
      domains: ["sensor"],
      filter: temperatureSensorFilter,
      label: "Temperature sensor",
    });

    const extrasHost = this.shadowRoot.querySelector(`[data-room-picker="extras"]`);
    if (extrasHost) {
      if (customElements.get("ha-entities-picker")) {
        let multi = extrasHost.querySelector("ha-entities-picker");
        if (!multi) {
          extrasHost.replaceChildren();
          multi = document.createElement("ha-entities-picker");
          multi.includeDomains = ["sensor"];
          multi.entityFilter = temperatureSensorFilter;
          multi.label = "Extra temperature sensors";
          multi.addEventListener("value-changed", (ev) => {
            const val = ev.detail?.value;
            this._roomDraft.extras = Array.isArray(val) ? val.filter(Boolean) : [];
          });
          extrasHost.appendChild(multi);
        }
        multi.hass = this._hass;
        const extras = this._roomDraft.extras || [];
        multi.value = extras;
      } else {
        // Fallback: single picker that appends to extras list
        let picker = extrasHost.querySelector("ha-entity-picker");
        if (!picker) {
          extrasHost.replaceChildren();
          const hint = document.createElement("p");
          hint.className = "muted";
          hint.style.margin = "0 0 8px";
          hint.textContent = "Pick sensors one at a time (multi-picker unavailable).";
          extrasHost.appendChild(hint);
          const list = document.createElement("div");
          list.id = "roomExtrasList";
          list.className = "muted";
          list.style.marginBottom = "8px";
          extrasHost.appendChild(list);
          picker = document.createElement("ha-entity-picker");
          picker.setAttribute("allow-custom-entity", "");
          picker.includeDomains = ["sensor"];
          picker.entityFilter = temperatureSensorFilter;
          picker.label = "Add extra sensor";
          picker.addEventListener("value-changed", (ev) => {
            const id = ev.detail?.value || "";
            if (!id) return;
            if (!this._roomDraft.extras.includes(id)) {
              this._roomDraft.extras = [...this._roomDraft.extras, id];
            }
            this._refreshRoomExtrasFallbackList();
            picker.value = undefined;
          });
          extrasHost.appendChild(picker);
        }
        picker.hass = this._hass;
        this._refreshRoomExtrasFallbackList();
      }
    }
  }

  _refreshRoomExtrasFallbackList() {
    const list = this.shadowRoot?.getElementById("roomExtrasList");
    if (!list) return;
    const extras = this._roomDraft.extras || [];
    list.textContent = extras.length ? `Selected: ${extras.join(", ")}` : "None selected yet";
  }

  _readRoomPickerValues() {
    const trvPicker = this.shadowRoot.querySelector('[data-room-picker="trv"] ha-entity-picker');
    const sensorPicker = this.shadowRoot.querySelector('[data-room-picker="sensor"] ha-entity-picker');
    const multi = this.shadowRoot.querySelector('[data-room-picker="extras"] ha-entities-picker');
    if (trvPicker?.value != null) this._roomDraft.trv = String(trvPicker.value || "");
    if (sensorPicker?.value != null) this._roomDraft.sensor = String(sensorPicker.value || "");
    if (multi?.value != null) {
      this._roomDraft.extras = Array.isArray(multi.value) ? multi.value.filter(Boolean) : [];
    }
    return this._roomDraft;
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
        <div class="row">
          <label class="field">Temperature lock
            <select id="wpLock">
              <option value="false" selected>Off</option>
              <option value="true">On (requires house PIN)</option>
            </select>
          </label>
        </div>
        <p class="muted">Room chips default to all Neat rooms (${rooms.length ? rooms.map((r) => r.name).join(", ") : "none yet"}). Lock only affects this wall panel.</p>
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
          <label class="field">Leaf coaching
            <select id="leafEnabled">
              <option value="true" ${cfg.leaf_enabled !== false ? "selected" : ""}>On</option>
              <option value="false" ${cfg.leaf_enabled === false ? "selected" : ""}>Off</option>
            </select>
          </label>
          <label class="field">Seasonal Savings
            <select id="seasonalSavings">
              <option value="false" ${!cfg.seasonal_savings ? "selected" : ""}>Off</option>
              <option value="true" ${cfg.seasonal_savings ? "selected" : ""}>On</option>
            </select>
          </label>
          <label class="field">Adaptive Comfort
            <select id="adaptiveComfort">
              <option value="false" ${!cfg.adaptive_comfort ? "selected" : ""}>Off</option>
              <option value="true" ${cfg.adaptive_comfort ? "selected" : ""}>On</option>
            </select>
          </label>
        </div>
        <div class="row">
          <label class="field">Outdoor temp sensor
            <input id="outdoorSensor" value="${this._escape(cfg.outdoor_temp_sensor || "")}" placeholder="sensor.home_temperature" />
          </label>
          <label class="field">Presence entities (comma-separated)
            <input id="presenceEntities" value="${this._escape(presence || cfg.person_entity || "")}" placeholder="person.you, person.partner" />
          </label>
          <label class="field">Wall PIN (4 digits)
            <input id="wallPin" type="password" inputmode="numeric" maxlength="4" value="${this._escape(cfg.wall_pin || "")}" placeholder="1234" />
          </label>
        </div>
        <p class="muted">True Radiant preheats on time. Auto-Schedule learns from Home dial changes. Seasonal Savings gently lowers comfort over 21 days. Adaptive Comfort nudges Eco from outdoor temp. Wall PIN unlocks locked NSPanels only.</p>
      </div>
      <div class="card">
        <p class="card-title">Safety Temperatures</p>
        <div class="row">
          <label class="field">Enabled
            <select id="safetyEnabled">
              <option value="true" ${cfg.safety_temp_enabled !== false ? "selected" : ""}>On</option>
              <option value="false" ${cfg.safety_temp_enabled === false ? "selected" : ""}>Off</option>
            </select>
          </label>
          <label class="field">Min house °C
            <input id="safetyMin" type="number" step="0.5" min="5" max="12" value="${this._escape(cfg.safety_min_temp ?? 7)}" />
          </label>
        </div>
        <p class="muted">If the house sensor drops to this floor, Neat forces heat even when Away / Eco / Off would otherwise leave it cold.</p>
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
      this._view === "energy"
        ? this._renderEnergy()
        : this._view === "rooms"
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
    if (this._view === "rooms") {
      void this._mountRoomPickers();
    }
  }

  _bind() {
    this.shadowRoot.getElementById("haMenu")?.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }));
    });

    this.shadowRoot.querySelectorAll(".tab[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => this._setView(btn.dataset.view));
    });

    this.shadowRoot.getElementById("stopSeasonal")?.addEventListener("click", async () => {
      try {
        await this._ws("neat_thermostat/stop_seasonal_savings");
        await this._loadState();
        this._showToast("Seasonal Savings stopped");
      } catch (e) {
        this._error = String(e.message || e);
        this._showToast(this._error, "err");
        this._render();
      }
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
          await this._loadState();
          this._showToast("Schedule saved");
        } catch (e) {
          this._error = String(e.message || e);
          this._showToast(this._error, "err");
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
            leaf_enabled: this.shadowRoot.getElementById("leafEnabled").value === "true",
            seasonal_savings: this.shadowRoot.getElementById("seasonalSavings").value === "true",
            adaptive_comfort: this.shadowRoot.getElementById("adaptiveComfort").value === "true",
            safety_temp_enabled: this.shadowRoot.getElementById("safetyEnabled").value === "true",
            safety_min_temp: Number(this.shadowRoot.getElementById("safetyMin").value),
            wall_pin: this.shadowRoot.getElementById("wallPin").value.trim(),
            away_delay_minutes: Number(this.shadowRoot.getElementById("awayDelay").value),
            outdoor_temp_sensor: this.shadowRoot.getElementById("outdoorSensor").value.trim(),
            presence_entities: this.shadowRoot
              .getElementById("presenceEntities")
              .value.split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          });
          await this._loadState();
          this._showToast("Settings saved");
        } catch (e) {
          this._error = String(e.message || e);
          this._showToast(this._error, "err");
          this._render();
        }
      });
    }

    const saveRoom = this.shadowRoot.getElementById("saveRoom");
    if (saveRoom) {
      saveRoom.addEventListener("click", async () => {
        const name = this.shadowRoot.getElementById("roomName").value.trim();
        const draft = this._readRoomPickerValues();
        const trv = String(draft.trv || "").trim();
        const sensor = String(draft.sensor || "").trim();
        const extras = (draft.extras || []).map((s) => String(s).trim()).filter(Boolean);
        if (!name || !trv) {
          this._error = "Room name and TRV required";
          this._showToast(this._error, "err");
          return;
        }
        const id = name.toLowerCase().replace(/\s+/g, "_");
        const rooms = [...(this._cfg().rooms || [])].filter((r) => r.id !== id);
        rooms.push({
          id,
          name,
          trv_entity: trv,
          temperature_sensor: sensor,
          extra_temperature_sensors: extras,
          enabled: true,
        });
        try {
          await this._ws("neat_thermostat/update_rooms", { rooms });
          this._roomDraft = { trv: "", sensor: "", extras: [] };
          await this._loadState();
          this._showToast(`Room ${name} saved`);
        } catch (e) {
          this._error = String(e.message || e);
          this._showToast(this._error, "err");
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
          this._showToast(this._error, "err");
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
              temperature_lock: this.shadowRoot.getElementById("wpLock")?.value === "true",
            },
          });
          await this._loadState();
          this._showToast(`Wall panel ${label} saved`);
        } catch (e) {
          this._error = String(e.message || e);
          this._showToast(this._error, "err");
          this._render();
        }
      });
      this.shadowRoot.querySelectorAll(".del-panel").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            await this._ws("neat_thermostat/delete_wall_panel", { panel_id: btn.dataset.id });
            await this._loadState();
            this._showToast("Wall panel deleted");
          } catch (e) {
            this._error = String(e.message || e);
            this._showToast(this._error, "err");
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
