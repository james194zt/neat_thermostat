/**
 * Neat Thermostat — HA sidebar panel.
 * Fox Plant–style shell + dial overview / schedule.
 * @version 0.6.4
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

const PANEL_VERSION = "0.6.4";
const HEAT_ORANGE = "#F57C00";
const HEAT_ORANGE_SOFT = "#FF9800";
// The integration ships a copy of the wall app (scripts/sync_wall_app.py);
// the preview runs it embedded, so it always matches the installed version.
const WALL_APP_URL = "/neat_thermostat/static/wall/index.html";
// Wall panel hardware: the preview renders the app at each model's screen size.
// Add new devices here; the first entry is the default (matches DEFAULT_WALL_PANEL_MODEL).
const WALL_MODELS = [
  { id: "nspanel_pro_gen2", label: "Sonoff NSPanel Pro Gen2", width: 480, height: 480, screen: '3.95" 480×480' },
];

function wallModel(id) {
  return WALL_MODELS.find((m) => m.id === id) || WALL_MODELS[0];
}

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
  width: 40px; height: 40px; flex-shrink: 0; border-radius: 12px; overflow: hidden;
  box-shadow: 0 4px 12px rgba(8,151,156,0.35), inset 0 0 0 1px rgba(255,255,255,0.08);
}
.panel-brand-mark svg { display: block; width: 100%; height: 100%; }
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
  display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 14px;
}
.stat {
  --tone: var(--secondary-text-color);
  display: flex; align-items: center; gap: 12px;
  background: var(--card-background-color); border-radius: var(--nt-radius);
  padding: 14px 16px; border: 1px solid var(--divider-color, transparent);
  box-shadow: var(--ha-card-box-shadow, 0 1px 2px rgba(0,0,0,0.06));
}
.stat.heat { --tone: var(--nt-heat-soft); }
.stat.warn { --tone: var(--nt-amber); }
.stat.good { --tone: var(--nt-accent-hi); }
.stat-icon {
  flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center;
  color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent);
}
.stat-icon svg { width: 22px; height: 22px; }
.stat .label { font-size: 12px; color: var(--secondary-text-color); font-weight: 500; }
.stat .value { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; margin-top: 1px; }
.stat.heat .value, .stat.warn .value { color: var(--tone); }

/* —— Overview detail cards —— */
.ov-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; margin-bottom: 14px; }
.ov-grid > .card { margin-bottom: 0; display: flex; flex-direction: column; }
.leaf-week { flex: 1; display: flex; flex-direction: column; margin-top: 18px; min-height: 120px; }
.leaf-week-title { display: flex; justify-content: space-between; font-size: 12px; color: var(--secondary-text-color); margin-bottom: 10px; }
.leaf-week-bars { flex: 1; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; align-items: end; }
.leaf-day { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; }
.leaf-day-track {
  flex: 1; width: 100%; max-width: 34px; min-height: 60px; position: relative; border-radius: 8px;
  background: color-mix(in srgb, var(--primary-text-color) 5%, transparent);
}
.leaf-day-bar {
  position: absolute; left: 0; right: 0; bottom: 0; border-radius: 8px; min-height: 4px;
  background: color-mix(in srgb, var(--primary-text-color) 22%, transparent);
}
.leaf-day.earned .leaf-day-bar { background: linear-gradient(180deg, #7BE05A, var(--nt-green)); }
.leaf-day-label { font-size: 11px; color: var(--secondary-text-color); font-weight: 500; }
.leaf-day.today .leaf-day-label { color: var(--primary-text-color); font-weight: 700; }
.leaf-day.today .leaf-day-track { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-text-color) 25%, transparent); }
.card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.card-head .card-title { margin: 0; }
.card-head-text { flex: 1; min-width: 0; }
.card-sub { margin: 3px 0 0; font-size: 13px; color: var(--secondary-text-color); line-height: 1.4; }
.card-icon {
  flex-shrink: 0; width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center;
  color: var(--secondary-text-color); background: color-mix(in srgb, var(--primary-text-color) 7%, transparent);
}
.card-icon svg { width: 20px; height: 20px; }
.card-icon.leaf { color: var(--nt-green); background: color-mix(in srgb, var(--nt-green) 14%, transparent); }
.card-icon.intel { color: var(--nt-accent-hi); background: color-mix(in srgb, var(--nt-accent) 16%, transparent); }
.card-icon.heat { color: var(--nt-heat-soft); background: color-mix(in srgb, var(--nt-heat) 14%, transparent); }
.card-icon.warn { color: var(--nt-amber); background: color-mix(in srgb, var(--nt-amber) 14%, transparent); }

/* —— Settings —— */
.set-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
.set-field { min-width: 0; }
.set-field-label { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.set-field .set-row-desc { margin-top: 6px; }
.set-row {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 12px 0; border-top: 1px solid var(--divider-color);
}
.card-head + .set-row { border-top: 0; padding-top: 0; }
.set-row-text { min-width: 0; }
.set-row-name { font-size: 14px; font-weight: 500; }
.set-row-desc { font-size: 12px; color: var(--secondary-text-color); margin-top: 2px; line-height: 1.4; }
.set-row-control { flex-shrink: 0; }
.num-input {
  display: inline-flex; align-items: center; border-radius: 10px; overflow: hidden;
  border: 1px solid var(--divider-color); background: var(--card-background-color);
}
.num-input input { width: 76px; border: 0; border-radius: 0; text-align: right; padding: 8px 10px; background: transparent; }
.num-input input:focus { outline: none; }
.num-input:focus-within { border-color: var(--nt-accent-hi); }
.num-input span { padding: 0 10px 0 0; font-size: 13px; color: var(--secondary-text-color); }
.switch { position: relative; display: inline-block; width: 44px; height: 26px; cursor: pointer; }
.switch input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
.switch span {
  position: absolute; inset: 0; border-radius: 999px; pointer-events: none;
  background: color-mix(in srgb, var(--primary-text-color) 22%, transparent); transition: background 0.15s ease;
}
.switch span::after {
  content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: transform 0.15s ease;
}
.switch input:checked + span { background: var(--nt-accent); }
.switch input:checked + span::after { transform: translateX(18px); }
.switch input:focus-visible + span { outline: 2px solid var(--nt-accent-hi); outline-offset: 2px; }
.set-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.set-list-empty { margin: 0 0 10px; font-size: 13px; color: var(--secondary-text-color); }
.set-list-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px;
  background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
}
.set-avatar {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; object-fit: cover;
  display: grid; place-items: center; font-size: 14px; font-weight: 700; color: #fff;
  background: linear-gradient(145deg, var(--nt-accent-hi), var(--nt-accent));
}
.set-avatar.icon { background: color-mix(in srgb, var(--primary-text-color) 8%, transparent); color: var(--secondary-text-color); border-radius: 10px; }
.set-avatar.icon svg { width: 18px; height: 18px; }
.set-list-text { flex: 1; min-width: 0; }
.set-list-name { font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.set-list-text code {
  display: block; padding: 0; background: none; font-size: 11px; color: var(--secondary-text-color);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.set-state {
  flex-shrink: 0; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600;
  background: color-mix(in srgb, var(--primary-text-color) 7%, transparent); color: var(--secondary-text-color);
}
.set-state.good { background: color-mix(in srgb, var(--nt-green) 16%, transparent); color: var(--nt-green); }
.set-state.away { background: color-mix(in srgb, var(--nt-accent) 16%, transparent); color: var(--nt-accent-hi); }
.set-state.warn { background: color-mix(in srgb, var(--nt-amber) 16%, transparent); color: var(--nt-amber); }
.set-state.bad { background: color-mix(in srgb, var(--nt-red) 16%, transparent); color: var(--nt-red); }
.set-remove {
  flex-shrink: 0; width: 32px; height: 32px; border: 0; border-radius: 50%; display: grid; place-items: center;
  background: transparent; color: var(--secondary-text-color); cursor: pointer;
}
.set-remove:hover { background: color-mix(in srgb, var(--nt-red) 14%, transparent); color: var(--nt-red); }
.set-add { margin-bottom: 4px; }
/* —— Page header with an action button —— */
/* The row owns the gap below it, so it's the same whether the button sits beside the title or wraps under it. */
.page-head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px 16px; flex-wrap: wrap; margin-bottom: 18px; }
.page-head-row > .header { margin-bottom: 0; }
.page-head-row > button { margin-top: 4px; }
button.primary svg, button.secondary svg { vertical-align: -4px; margin: 0 6px 0 -4px; }
.empty-state { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }

/* —— Wall panel list —— */
.wp-list { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
.wp-card {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px; cursor: pointer;
  background: var(--card-background-color); border-radius: var(--nt-radius);
  border: 1px solid var(--divider-color, transparent);
}
.wp-card:hover { border-color: color-mix(in srgb, var(--primary-text-color) 22%, transparent); }
.wp-card.selected { border-color: var(--nt-accent-hi); }
.wp-card-text { flex: 1; min-width: 0; }
.wp-card-name { font-size: 15px; font-weight: 600; }
.wp-card-meta { font-size: 12px; color: var(--secondary-text-color); margin-top: 3px; }
.wp-card-meta strong { color: var(--primary-text-color); font-weight: 500; }
.wp-card-meta .set-state { padding: 1px 8px; font-size: 11px; }
.warn-note { color: var(--nt-amber) !important; }
.kiosk-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.kiosk-act { padding: 2px 6px; font-size: 11px; letter-spacing: 0.04em; }
.kiosk-act:hover { color: var(--nt-accent-hi); }
.kiosk-select { width: auto; min-width: 150px; }
.kiosk-num input { width: 128px; }

/* —— Dialog (add / edit) —— */
.dlg-backdrop {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
  padding: 24px; background: rgba(0,0,0,0.55); backdrop-filter: blur(2px);
  animation: dlg-fade 0.15s ease;
}
.dlg {
  width: 100%; max-width: 640px; max-height: calc(100vh - 48px); display: flex; flex-direction: column;
  background: var(--card-background-color); border-radius: 20px; border: 1px solid var(--divider-color);
  box-shadow: 0 24px 60px rgba(0,0,0,0.5); animation: dlg-rise 0.18s ease;
}
.dlg-head { display: flex; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--divider-color); }
.dlg-title { margin: 0; font-size: 17px; font-weight: 600; }
.dlg-x {
  margin-left: auto; flex-shrink: 0; width: 36px; height: 36px; border: 0; border-radius: 50%;
  display: grid; place-items: center; background: transparent; color: var(--secondary-text-color); cursor: pointer;
}
.dlg-x:hover { background: color-mix(in srgb, var(--primary-text-color) 8%, transparent); color: var(--primary-text-color); }
.dlg-body {
  padding: 4px 20px 8px; overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--primary-text-color) 25%, transparent) transparent;
}
.dlg-section { display: flex; flex-direction: column; gap: 14px; padding: 16px 0; border-top: 1px solid var(--divider-color); }
.dlg-section:first-child { border-top: 0; }
.dlg-section-title { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--secondary-text-color); }
.dlg-section .set-row { padding: 0; border-top: 0; }
.dlg-section .set-row + .set-row { padding-top: 14px; border-top: 1px solid var(--divider-color); }
.dlg-section .set-list { margin-bottom: 8px; }
.dlg-foot { display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--divider-color); }
input[readonly] { opacity: 0.7; cursor: default; }
@keyframes dlg-fade { from { opacity: 0; } }
@keyframes dlg-rise { from { opacity: 0; transform: translateY(12px); } }
@media (max-width: 720px) {
  .dlg-backdrop { align-items: flex-end; padding: 0; }
  .dlg { max-width: none; max-height: 92vh; border-radius: 20px 20px 0 0; }
}

/* —— Rooms —— */
.room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.room-card {
  display: flex; flex-direction: column; gap: 10px; padding: 16px 18px; cursor: pointer;
  background: var(--card-background-color); border-radius: var(--nt-radius);
  border: 1px solid var(--divider-color, transparent);
  box-shadow: var(--ha-card-box-shadow, 0 1px 2px rgba(0,0,0,0.06));
  transition: border-color 0.15s ease, background 0.15s ease;
}
.room-card:hover { border-color: color-mix(in srgb, var(--primary-text-color) 22%, transparent); }
.room-card:focus-visible { outline: 2px solid var(--nt-nest-tab); outline-offset: 2px; }
.room-card.selected { border-color: var(--nt-accent-hi); }
.room-card.heat { background: color-mix(in srgb, var(--nt-heat) 7%, var(--card-background-color)); }
.room-grid.reorderable .room-card { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.room-card.dragging {
  cursor: grabbing; position: relative; z-index: 2; transform: scale(1.03); opacity: 0.94;
  border-color: var(--nt-accent-hi); box-shadow: 0 12px 28px rgba(0,0,0,0.35);
}
.room-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 24px; }
.room-card-name { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.heat-badge { display: inline-flex; align-items: center; gap: 4px; background: color-mix(in srgb, var(--nt-heat) 16%, transparent); color: var(--nt-heat-soft); }
.heat-badge svg { width: 12px; height: 12px; }
.room-card-temps { display: flex; align-items: baseline; gap: 10px; }
.room-card-now { font-size: 34px; font-weight: 400; letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums; }
.room-card-now.unknown { color: var(--secondary-text-color); }
.room-card-target { font-size: 13px; color: var(--secondary-text-color); }
.room-card-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.room-card-sensors { font-size: 12px; color: var(--secondary-text-color); }
.room-card-calls {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding-top: 10px; border-top: 1px solid var(--divider-color); font-size: 13px; font-weight: 500;
}
.form-actions { display: flex; align-items: center; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--divider-color); flex-wrap: wrap; }
.save-bar {
  position: sticky; bottom: 12px; z-index: 5; margin-top: 14px;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; border-radius: var(--nt-radius);
  background: color-mix(in srgb, var(--card-background-color) 92%, transparent);
  border: 1px solid var(--divider-color); box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  backdrop-filter: blur(8px);
}
.badge {
  flex-shrink: 0; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600;
  background: color-mix(in srgb, var(--primary-text-color) 7%, transparent); color: var(--secondary-text-color);
}
.badge.on { background: color-mix(in srgb, var(--nt-green) 16%, transparent); color: var(--nt-green); }
.metric-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.metric {
  padding: 12px 14px; border-radius: 12px;
  background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
}
.metric-value { font-size: 26px; font-weight: 500; letter-spacing: -0.03em; line-height: 1.1; font-variant-numeric: tabular-nums; }
.metric-value small { font-size: 14px; font-weight: 500; color: var(--secondary-text-color); margin-left: 3px; letter-spacing: 0; }
.metric-label { font-size: 12px; color: var(--secondary-text-color); margin-top: 4px; }
.card-foot { margin: 14px 0 0; font-size: 12px; color: var(--secondary-text-color); line-height: 1.45; }
.feature-list { display: flex; flex-direction: column; }
.feature {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 0; border-top: 1px solid var(--divider-color);
}
.feature:first-child { border-top: 0; padding-top: 0; }
.feature-name { font-size: 14px; font-weight: 500; }
.feature-desc { font-size: 12px; color: var(--secondary-text-color); margin-top: 2px; line-height: 1.35; }
.feature-value { font-size: 14px; font-weight: 600; white-space: nowrap; text-align: right; }
.feature-value small { display: block; font-size: 11px; font-weight: 500; color: var(--secondary-text-color); }
details.card > summary {
  list-style: none; cursor: pointer; display: flex; align-items: center; gap: 12px;
}
details.card > summary::-webkit-details-marker { display: none; }
details.card > summary .card-title { margin: 0; }
details.card > summary .chev { margin-left: auto; transition: transform 0.15s ease; color: var(--secondary-text-color); }
details.card[open] > summary .chev { transform: rotate(180deg); }
details.card[open] > summary { margin-bottom: 14px; }
.entity-rows { display: flex; flex-direction: column; gap: 10px; }
.entity-row { display: grid; grid-template-columns: 110px 1fr; gap: 12px; align-items: start; }
.entity-row-label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color); padding-top: 8px; }
.entity-chips { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
.entity-chip {
  display: flex; flex-direction: column; gap: 1px; min-width: 0; max-width: 100%;
  padding: 7px 12px; border-radius: 10px;
  background: color-mix(in srgb, var(--primary-text-color) 5%, transparent);
}
.entity-chip-name { font-size: 13px; font-weight: 500; display: flex; gap: 8px; justify-content: space-between; }
.entity-chip-state { color: var(--secondary-text-color); font-weight: 500; }
.entity-chip-state.bad { color: var(--nt-red); }
.entity-chip code { padding: 0; background: none; font-size: 11px; color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 720px) {
  .stats-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ov-grid { grid-template-columns: minmax(0, 1fr); }
  .metric-value { font-size: 22px; }
  .entity-row { grid-template-columns: minmax(0, 1fr); gap: 6px; }
  .entity-row-label { padding-top: 0; }
}
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
  cursor: pointer;
}
table.data tbody tr.room-row {
  cursor: pointer;
}
table.data tbody tr.room-row:hover {
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}
table.data tbody tr.room-row.selected {
  background: color-mix(in srgb, var(--primary-color) 18%, transparent);
}
.field-toggle {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
}
.field-toggle .toggle-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--secondary-text-color);
}
.field-toggle select {
  width: 100%;
  max-width: 280px;
}
.call-heat-btn {
  border: 1px solid var(--divider-color);
  background: var(--secondary-background-color, transparent);
  color: var(--primary-text-color);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.call-heat-btn.on {
  border-color: color-mix(in srgb, var(--success-color, #4caf50) 55%, var(--divider-color));
  color: var(--success-color, #4caf50);
}
.call-heat-btn.off {
  opacity: 0.75;
}
.panel-build-footer {
  position: absolute; right: 12px; bottom: 8px; font-size: 9px;
  color: var(--secondary-text-color); opacity: 0.42; pointer-events: none;
}

/* —— Overview hero —— */
.hero {
  --hero-tint: #FFB74D;
  position: relative;
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 28px;
  align-items: center;
  padding: 24px 28px;
  border-radius: 20px;
  background:
    radial-gradient(70% 120% at 0% 0%, color-mix(in srgb, var(--hero-tint) 14%, transparent), transparent 65%),
    var(--card-background-color);
  border: 1px solid var(--divider-color, transparent);
  box-shadow: var(--ha-card-box-shadow, 0 1px 2px rgba(0,0,0,0.08));
  overflow: hidden;
}
.hero.heating { --hero-tint: var(--nt-heat-soft); }
.hero.off { --hero-tint: #9aa0a6; }
.hero-dial {
  position: relative; width: 100%; max-width: 260px; aspect-ratio: 1; margin: 0 auto;
  background: transparent; border: 0; padding: 0; color: inherit; font-family: inherit;
  border-radius: 50%;
}
.dial-steps {
  position: absolute; left: 50%; bottom: 3%; transform: translateX(-50%);
  display: flex; gap: 44px; z-index: 1;
}
.dial-step {
  width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--primary-text-color) 14%, transparent);
  background: color-mix(in srgb, var(--primary-text-color) 6%, var(--card-background-color));
  color: var(--primary-text-color); transition: background 0.15s ease, transform 0.1s ease;
}
.dial-step svg { width: 22px; height: 22px; }
.dial-step:hover { background: color-mix(in srgb, var(--primary-text-color) 12%, var(--card-background-color)); }
.dial-step:active { transform: scale(0.92); }
.dial-step:focus-visible { outline: 2px solid var(--nt-accent-hi); outline-offset: 2px; }
.dial-step:disabled { opacity: 0.35; cursor: default; }
.hero.heating .dial-step { border-color: color-mix(in srgb, var(--nt-heat) 40%, transparent); }
.hero-dial > svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.hero-dial .track { stroke: color-mix(in srgb, var(--primary-text-color) 9%, transparent); }
.hero-dial .fill { transition: stroke-dasharray 0.6s ease; }
.hero-dial .now-dot { fill: var(--primary-text-color); opacity: 0.75; }
.hero-left { display: flex; flex-direction: column; align-items: center; gap: 16px; min-width: 0; }
.hm-modes { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.hm-seg { display: inline-flex; padding: 3px; border-radius: 999px; background: color-mix(in srgb, var(--primary-text-color) 7%, transparent); }
.hm-mode {
  border: 0; background: transparent; color: var(--secondary-text-color); cursor: pointer;
  padding: 7px 13px; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 6px;
}
.hm-mode svg { width: 15px; height: 15px; }
.hm-mode:hover { color: var(--primary-text-color); }
.hm-mode:focus-visible { outline: 2px solid var(--nt-accent-hi); outline-offset: 2px; }
.hm-mode.active { background: var(--card-background-color); color: var(--primary-text-color); box-shadow: 0 1px 3px rgba(0,0,0,0.25); }
.hm-mode.active.heat, .hm-mode.active.boost { color: var(--nt-heat-soft); }
.hm-mode.active.eco { color: var(--nt-green); }
.hm-mode.active.away { color: var(--nt-accent-hi); }
.hero-dial-core {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center;
}
.hero-dial-caption {
  font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--secondary-text-color);
}
.hero.heating .hero-dial-caption { color: var(--nt-heat-soft); }
.hero-dial-temp {
  font-size: 68px; font-weight: 300; line-height: 1; letter-spacing: -0.04em; margin: 6px 0 4px;
  font-variant-numeric: tabular-nums;
}
.hero-dial-temp sup { font-size: 0.38em; font-weight: 400; vertical-align: top; position: relative; top: 0.35em; margin-left: 2px; }
.hero-dial-sub { font-size: 13px; color: var(--secondary-text-color); font-weight: 500; }
.hero-dial-eta { margin-top: 2px; font-size: 12px; font-weight: 600; color: var(--nt-heat-soft); }
.hero-side { min-width: 0; display: flex; flex-direction: column; gap: 18px; }
.hero-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.hero-title { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
.hero-headline { font-size: 14px; color: var(--secondary-text-color); margin: 4px 0 0; }
.hero-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.hero-pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px;
  font-size: 12px; font-weight: 600; white-space: nowrap;
  background: color-mix(in srgb, var(--primary-text-color) 7%, transparent);
  color: var(--secondary-text-color);
}
.hero-pill svg { width: 14px; height: 14px; }
.hero-pill.heat { background: color-mix(in srgb, var(--nt-heat) 16%, transparent); color: var(--nt-heat-soft); }
.hero-pill.leaf { background: color-mix(in srgb, var(--nt-green) 16%, transparent); color: var(--nt-green); }
.hero-pill.info { background: color-mix(in srgb, var(--nt-accent) 16%, transparent); color: var(--nt-accent-hi); }
.hero-pill.warn { background: color-mix(in srgb, var(--nt-amber) 16%, transparent); color: var(--nt-amber); }
.hero-rooms { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.hero-room {
  display: flex; flex-direction: column; gap: 2px; text-align: left;
  padding: 14px 16px; border-radius: 14px; cursor: pointer; font-family: inherit; color: inherit;
  background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary-text-color) 8%, transparent);
  transition: background 0.15s ease, border-color 0.15s ease;
}
.hero-room:hover { background: color-mix(in srgb, var(--primary-text-color) 7%, transparent); }
.hero-room:focus-visible { outline: 2px solid var(--nt-nest-tab); outline-offset: 2px; }
.hero-room.selected { border-color: color-mix(in srgb, var(--primary-text-color) 30%, transparent); }
.hero-room.heat {
  background: color-mix(in srgb, var(--nt-heat) 10%, transparent);
  border-color: color-mix(in srgb, var(--nt-heat) 35%, transparent);
}
.hero-rooms.reorderable .hero-room { cursor: grab; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.hero-room.dragging {
  cursor: grabbing; position: relative; z-index: 2;
  transform: scale(1.04); opacity: 0.92;
  border-color: var(--nt-accent-hi);
  box-shadow: 0 12px 28px rgba(0,0,0,0.35);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.hero-rooms.is-dragging .hero-room:not(.dragging) { transition: transform 0.18s ease; }
.hero-rooms-hint { margin: -10px 0 0; font-size: 11px; color: var(--secondary-text-color); opacity: 0.7; }
.hero-room-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.hero-room-name {
  font-size: 13px; font-weight: 600; color: var(--secondary-text-color);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.hero-room-off {
  flex-shrink: 0; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
  background: color-mix(in srgb, var(--nt-red) 16%, transparent); color: var(--nt-red);
}
.hero-room-target .hero-room-off { display: inline-block; margin-top: 2px; }
.hero-room-flame { width: 16px; height: 16px; color: var(--nt-heat-soft); flex-shrink: 0; }
.hero-room-temp { font-size: 30px; font-weight: 400; letter-spacing: -0.03em; line-height: 1.15; font-variant-numeric: tabular-nums; }
.hero-room-temp.unknown { color: var(--secondary-text-color); }
.hero-room-target { font-size: 12px; color: var(--secondary-text-color); }
.hero-room.heat .hero-room-target { color: var(--nt-heat-soft); }
.hero-empty { font-size: 13px; color: var(--secondary-text-color); margin: 0; }
@media (max-width: 720px) {
  .hero { grid-template-columns: minmax(0, 1fr); gap: 16px; padding: 20px 16px; }
  .hero-dial { max-width: 220px; }
  .hero-dial-temp { font-size: 56px; }
  .hero-head { flex-direction: column; align-items: center; text-align: center; }
  .hero-pill { white-space: normal; }
  .hero-pills { justify-content: center; }
  .hero-rooms { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* —— Wall panel preview —— */
.wp-preview-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
.wp-preview-bar select { width: auto; min-width: 180px; }
.wp-preview-taps { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
.wp-preview-taps input { width: auto; margin: 0; }
.wp-preview-taps.live { color: var(--nt-heat-soft); font-weight: 600; }
.wp-preview-stage { display: flex; justify-content: center; }
.wp-preview-device {
  width: 100%; box-sizing: border-box;
  padding: 14px; border-radius: 26px; background: #0d0f12;
  box-shadow: 0 18px 40px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.06);
}
.wp-preview-screen {
  position: relative; width: 100%; overflow: hidden;
  border-radius: 6px; background: #000;
}
.wp-preview-screen iframe {
  position: absolute; top: 0; left: 0; border: 0;
  transform-origin: 0 0; transform: scale(var(--wp-scale, 1));
}
.wp-preview-shield { position: absolute; inset: 0; cursor: not-allowed; }
.wp-preview-missing { text-align: center; padding: 32px 16px; }

/* —— Schedule grid —— */
.nest-schedule-sheet {
  background: var(--card-background-color);
  border-radius: 20px;
  border: 1px solid var(--divider-color, transparent);
  box-shadow: var(--ha-card-box-shadow, 0 1px 2px rgba(0,0,0,0.08));
  padding: 8px 8px 12px;
  margin: 14px 0;
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
.eh-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
.eh-total-label { font-size: 12px; color: var(--secondary-text-color); }
.eh-total-value { font-size: 22px; font-weight: 500; letter-spacing: -0.02em; }
.eh-legend { display: flex; gap: 16px; font-size: 12px; color: var(--secondary-text-color); align-items: center; }
.eh-legend i { display: inline-block; width: 14px; height: 8px; border-radius: 4px; background: var(--nt-heat); margin-right: 6px; vertical-align: middle; }
.eh-legend b { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: var(--nt-heat); margin-right: 6px; vertical-align: middle; }
.eh-legend svg { width: 14px; height: 14px; color: var(--nt-green); margin-right: 4px; vertical-align: middle; }
.eh-grid-row { display: grid; grid-template-columns: 84px minmax(0, 1fr) 64px; gap: 14px; align-items: center; }
.eh-axis-row { padding: 10px 0 6px; border-bottom: 1px solid var(--divider-color); }
.eh-axis { position: relative; height: 14px; font-size: 11px; color: var(--secondary-text-color); }
.eh-axis span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
.eh-axis span:first-child { transform: none; }
.eh-axis span:last-child { transform: translateX(-100%); }
.eh-month {
  margin: 18px 0 2px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--secondary-text-color);
}
.eh-day { padding: 8px 0; border-bottom: 1px solid color-mix(in srgb, var(--divider-color) 70%, transparent); }
.eh-day:last-child { border-bottom: 0; }
.eh-day-label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; white-space: nowrap; }
.eh-day-label svg { width: 14px; height: 14px; color: var(--nt-green); flex-shrink: 0; }
.eh-timeline { position: relative; height: 50px; }
/* Setpoint bubbles, in their own lane above the track (never over the row above). */
.eh-sp {
  position: absolute; top: 0; z-index: 1;
  width: 26px; height: 26px; margin-left: -13px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--nt-heat); color: #fff;
  font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 2px var(--card-background-color), 0 2px 6px rgba(0,0,0,0.25);
  cursor: default;
}
.eh-sp:hover { z-index: 2; transform: scale(1.12); }
.eh-track {
  position: absolute; left: 0; right: 0; top: 34px; height: 12px; border-radius: 6px; overflow: hidden;
  background:
    linear-gradient(90deg, transparent calc(25% - 0.5px), var(--divider-color) calc(25% - 0.5px), var(--divider-color) calc(25% + 0.5px), transparent calc(25% + 0.5px),
      transparent calc(50% - 0.5px), var(--divider-color) calc(50% - 0.5px), var(--divider-color) calc(50% + 0.5px), transparent calc(50% + 0.5px),
      transparent calc(75% - 0.5px), var(--divider-color) calc(75% - 0.5px), var(--divider-color) calc(75% + 0.5px), transparent calc(75% + 0.5px)),
    color-mix(in srgb, var(--primary-text-color) 6%, transparent);
}
.eh-seg { position: absolute; top: 0; bottom: 0; min-width: 3px; background: var(--nt-heat); border-radius: 3px; }
.eh-day-total { text-align: right; font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
.eh-day-total.none { color: var(--secondary-text-color); font-weight: 500; }
@media (max-width: 720px) {
  .eh-grid-row { grid-template-columns: 58px minmax(0, 1fr) 48px; gap: 8px; }
  .eh-day-label { font-size: 12px; }
  .eh-sp { width: 22px; height: 22px; margin-left: -11px; font-size: 9px; }
  .eh-axis span.half { display: none; }
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

// Fully Kiosk settings Neat manages (keys match the backend's kiosk.KIOSK_SETTINGS).
const KIOSK_FIELDS = [
  { key: "screen_brightness", label: "Screen brightness", desc: "While the panel is in use.", kind: "pct" },
  { key: "screensaver_timer", label: "Fully screensaver after", desc: "Fully's own screensaver. 0 = never — the Neat app already dims to its clock.", kind: "sec" },
  { key: "screensaver_brightness", label: "Screensaver brightness", desc: "", kind: "pct" },
  { key: "screen_off_timer", label: "Screen off after", desc: "0 = never.", kind: "sec" },
  { key: "kiosk_lock", label: "Kiosk lock", desc: "Stops anyone leaving the app on the panel.", kind: "bool" },
  { key: "motion_detection", label: "Wake on motion", desc: "Uses the panel's camera.", kind: "bool" },
];

/** Fully stores brightness 0–255; people think in %. */
function kioskDisplay(field, raw) {
  if (raw == null) return "";
  if (field.kind === "bool") return raw ? "On" : "Off";
  if (field.kind === "pct") return `${Math.round(Number(raw) / 2.55)}%`;
  return Number(raw) === 0 ? "Never" : `${raw} s`;
}

/** Lower-case id from a name: "Hallway Panel" → "hallway-panel". */
function slugId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function flameSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12 2c.5 3.2-1.6 5-3.2 6.9C7.4 10.6 6 12.4 6 15a6 6 0 0 0 12 0c0-2.6-1.3-4.6-2.6-6.1-.3 1.6-1.1 2.7-2.3 3.2.6-3.7-.3-7.6-1.1-10.1z"/>
  </svg>`;
}

/** Brand mark: the hero's 270° dial ring, cool-to-warm, around a leaf, on a deep teal tile. */
function logoSvg() {
  return `<svg viewBox="0 0 40 40">
    <defs>
      <linearGradient id="ntLogoBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0E6F74"/>
        <stop offset="1" stop-color="#062B33"/>
      </linearGradient>
      <linearGradient id="ntLogoRing" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#19D4DE"/>
        <stop offset="0.5" stop-color="#FFB74D"/>
        <stop offset="1" stop-color="#FF6A3D"/>
      </linearGradient>
    </defs>
    <rect width="40" height="40" fill="url(#ntLogoBg)"/>
    <path d="M12.22 27.78 A11 11 0 1 1 27.78 27.78" fill="none" stroke="url(#ntLogoRing)" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M24.6 13.2c-3.6.2-6.8 1.9-8.3 4.6-1.2 2.1-1.2 4.6-.4 6.6 2.7-.3 5.1-1.6 6.6-3.8 1.4-2.1 2-4.6 2.1-7.4z" fill="#EFFFFB"/>
    <path d="M16.6 24.6c1.4-2.5 3.4-4.5 5.8-5.9" fill="none" stroke="#0E6F74" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`;
}

const ICONS = {
  tune: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>`,
  window: `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M12 3v18M4 12h16"/></g></svg>`,
  sun: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2l1.9 5.6L17.5 9.5l-5.6 1.9L10 17l-1.9-5.6L2.5 9.5l5.6-1.9zM18 13l1 2.9 3 1.1-3 1-1 3-1-3-3-1 3-1.1z"/></svg>`,
  people: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 15-4-4 1.41-1.41L11 13.17l5.59-5.59L18 9l-7 7z"/></svg>`,
  gauge: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M5.6 18.4a9 9 0 1 1 12.8 0M12 13l4-4"/><circle cx="12" cy="13" r="1.6" fill="currentColor"/></svg>`,
  thermo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0zm-3 7a3 3 0 0 1-1.5-5.6l.5-.29V5a1 1 0 0 1 2 0v9.11l.5.29A3 3 0 0 1 12 20z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
  panel: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="11" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 17h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  link: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>`,
};

/** SVG arc gauge: 270° sweep, `fill` and `now` are 0–1 positions along it. */
function dialSvg({ fill, now, color }) {
  const r = 84;
  const arc = "M40.6 159.4 A84 84 0 1 1 159.4 159.4";
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  let nowDot = "";
  if (now != null) {
    const a = ((135 + 270 * Math.max(0, Math.min(1, now))) * Math.PI) / 180;
    nowDot = `<circle class="now-dot" cx="${(100 + r * Math.cos(a)).toFixed(1)}" cy="${(100 + r * Math.sin(a)).toFixed(1)}" r="3.5"/>`;
  }
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <linearGradient id="heroArc" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="${color[0]}"/>
        <stop offset="1" stop-color="${color[1]}"/>
      </linearGradient>
    </defs>
    <path class="track" d="${arc}" fill="none" stroke-width="12" stroke-linecap="round"/>
    ${pct > 0 ? `<path class="fill" d="${arc}" pathLength="100" fill="none" stroke="url(#heroArc)" stroke-width="12"
      stroke-linecap="round" stroke-dasharray="${pct.toFixed(1)} 100"/>` : ""}
    ${nowDot}
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

function humiditySensorFilter(stateObj) {
  if (!stateObj) return false;
  if (stateObj.attributes?.device_class === "humidity") return true;
  return stateObj.attributes?.unit_of_measurement === "%";
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
    this._roomDraft = { trv: "", sensor: "", extras: [], calls_for_heat: true };
    this._editingRoomId = null;
    this._roomPickerMountGen = 0;
    this._kiosk = null;
    this._kioskTimer = null;
    this._dialogKind = null;
    this._wallEditingId = null;
    this._wallIdTouched = false;
    this._wallDraft = {
      primary: "",
      insideTemp: "",
      outsideTemp: "",
      humidity: "",
      weather: "weather.home",
    };
    this._wallPickerMountGen = 0;
    this._previewPanel = "";
    this._previewTaps = false;
    this._entitiesOpen = false;
    this._previewResize = null;
    this._settingsDraft = null;
    this._settingsPickerMountGen = 0;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.addEventListener("click", (ev) => {
      const sync = ev.target.closest?.("[data-kiosk-sync]");
      const reload = ev.target.closest?.("[data-kiosk-reload]");
      if (sync) {
        ev.stopPropagation();
        this._kioskSync(sync.dataset.kioskSync || null);
      } else if (reload) {
        ev.stopPropagation();
        this._kioskReload(reload.dataset.kioskReload);
      }
    });
    // Dialog closing: ×, Cancel, backdrop click (not clicks inside the dialog), Esc.
    this.shadowRoot.addEventListener("click", (ev) => {
      const closer = ev.target.closest?.("[data-close-dialog]");
      if (!closer || !this._dialogKind) return;
      if (closer.classList.contains("dlg-backdrop") && ev.target !== closer) return;
      this._closeDialog();
    });
    this.shadowRoot.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && this._dialogKind) this._closeDialog();
    });
    // Settings lists (presence, windows) redraw in place, so remove buttons are delegated.
    this.shadowRoot.addEventListener("click", (ev) => {
      const btn = ev.target.closest?.("[data-remove-key]");
      if (!btn) return;
      const key = btn.dataset.removeKey;
      if (key === "room_extras") {
        this._roomDraft.extras = (this._roomDraft.extras || []).filter((id) => id !== btn.dataset.removeId);
        this._refreshRoomExtras();
        return;
      }
      if (!this._settingsDraft) return;
      this._settingsDraft[key] = (this._settingsDraft[key] || []).filter((id) => id !== btn.dataset.removeId);
      this._refreshSettingsList(key);
    });
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
    clearInterval(this._kioskTimer);
    this._previewResize?.disconnect();
    this._previewResize = null;
    this._ehResize?.disconnect();
    this._ehResize = null;
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
    // Re-rendering mid-drag would drop the tile out from under the pointer.
    if (this._dragging) return;
    this._refreshingLive = true;
    const startedAt = Date.now();
    try {
      const next = await this._ws("neat_thermostat/get_state");
      // A drag or room-order save during the fetch makes this snapshot stale.
      if (this._dragging || (this._orderSavedAt || 0) >= startedAt) return;
      this._state = next;
      if (this._view === "energy") await this._loadEnergy();
      if ((this._view === "overview" || this._view === "energy") && !this._dragging) this._render();
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
      if (this._view === "wall_panels" && !this._kiosk) this._loadKiosk();
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
    this._settingsDraft = null;
    clearInterval(this._kioskTimer);
    if (id === "wall_panels") {
      this._loadKiosk();
      // Panel status (online / in sync) changes on its own; refresh just the pills.
      this._kioskTimer = setInterval(() => this._loadKiosk(true), 15000);
    }
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

  /** Real Neat climate entity ids (HA may have prefixed them, e.g. climate.neat_thermostat_neat_home). */
  _neatClimateEntities() {
    const registry = this._hass?.entities || {};
    const ids = Object.keys(registry).filter(
      (id) => id.startsWith("climate.") && registry[id]?.platform === "neat_thermostat"
    );
    // Only the house entity carries boiler attributes.
    const home = ids.find((id) => this._entityState(id)?.attributes?.boiler_demand !== undefined) || "";
    return { home, rooms: ids.filter((id) => id !== home).sort() };
  }

  _mainTarget() {
    const live = this._live().main || {};
    const cfg = this._cfg();
    const reported = this._entityState(this._neatClimateEntities().home)?.attributes?.temperature ?? live.target ?? cfg.target_temp ?? null;
    if (this._pendingTarget != null) {
      const settled = reported != null && Number(reported) === this._pendingTarget && !this._sendTimer;
      if (settled || Date.now() - this._pendingAt > 15000) this._pendingTarget = null;
      else return this._pendingTarget;
    }
    return reported;
  }

  /** − / + on the dial: update at once, send to HA when the taps stop. */
  _stepTarget(direction) {
    const home = this._neatClimateEntities().home;
    if (!home) {
      this._showToast("Neat's house thermostat isn't available", "err");
      return;
    }
    const attrs = this._entityState(home)?.attributes || {};
    const step = Number(attrs.target_temp_step) || 0.5;
    const lo = Number(attrs.min_temp ?? 7);
    const hi = Number(attrs.max_temp ?? 30);
    const base = Number(this._mainTarget() ?? 20);
    const next = Math.min(hi, Math.max(lo, Math.round((base + step * direction) / step) * step));
    this._pendingTarget = next;
    this._pendingAt = Date.now();
    this._render();
    clearTimeout(this._sendTimer);
    this._sendTimer = setTimeout(async () => {
      this._sendTimer = null;
      const value = this._pendingTarget;
      if (value == null) return;
      try {
        await this._hass.callService("climate", "set_temperature", { entity_id: home, temperature: value });
        this._pendingAt = Date.now();
      } catch (e) {
        this._pendingTarget = null;
        this._showToast(`Couldn't change the temperature: ${e?.message || e}`, "err");
        this._render();
      }
    }, 700);
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

  /** Same sources as the coordinator's room_current_temp: sensors averaged, else the TRV. */
  _roomCurrent(room) {
    const readings = [room.temperature_sensor, ...(room.extra_temperature_sensors || [])]
      .filter(Boolean)
      .map((id) => Number(this._entityState(id)?.state))
      .filter((n) => Number.isFinite(n));
    if (readings.length) return readings.reduce((a, b) => a + b, 0) / readings.length;
    const t = Number(this._entityState(room.trv_entity)?.attributes?.current_temperature);
    return Number.isFinite(t) ? t : null;
  }

  /** Status pills for the hero: heating state first, then whatever Neat is doing. */
  _heroPills() {
    const live = this._live();
    const intel = live.intelligence || {};
    const preheat = live.preheat || {};
    const preset = (live.main || {}).preset;
    const pills = [];
    const pill = (cls, text, icon = "") =>
      pills.push(`<span class="hero-pill ${cls}">${icon}${this._escape(text)}</span>`);
    if (live.safety_active) pill("heat", "Safety temp · protecting", flameSvg());
    else if (live.boiler_on) pill("heat", "Boiler on", flameSvg());
    if (preheat.preheating) pill("heat", `Preheating for ${preheat.block_start ?? ""}`.trim());
    if (live.leaf?.active) pill("leaf", "Leaf", leafSvg());
    if (live.away) pill("warn", "Away · Eco");
    if (live.window_open) pill("warn", "Window open");
    if (live.summer_mode) pill("warn", "Summer mode");
    if (preset && preset !== "none" && !live.away) pill("info", preset[0].toUpperCase() + preset.slice(1));
    if (Number(live.adaptive_offset_c)) {
      const off = Number(live.adaptive_offset_c);
      pill("info", `Adaptive ${off > 0 ? "+" : ""}${off}°C`);
    } else if (intel.true_radiant && intel.warmup_c_per_hour != null) {
      pill("info", `True Radiant · ${intel.warmup_c_per_hour}°C/h`);
    }
    return pills.join("");
  }

  _renderHero() {
    const live = this._live();
    const rooms = (this._cfg().rooms || []).filter((r) => r.enabled !== false);
    const targetNum = this._mainTarget();
    const currentNum = this._mainCurrent();
    const target = formatTemp(targetNum) ?? "—";
    const current = currentNum != null ? formatTemp(Math.round(currentNum * 10) / 10) : null;
    const heating = Boolean(live.boiler_on);
    const homeState = this._entityState(this._neatClimateEntities().home);
    const off = homeState ? homeState.state === "off" : (live.main || {}).hvac_mode === "off";
    const preset = homeState?.attributes?.preset_mode ?? (live.main || {}).preset ?? "none";
    const preheat = live.preheat || {};
    let caption = off ? "Off" : heating ? "Heating to" : "Set to";
    if (preheat.preheating) caption = "Preheating to";
    let headline = "Holding temperature";
    if (off) headline = "Heating is off";
    else if (heating) headline = "Warming the house";
    else if (currentNum != null && targetNum != null && currentNum >= Number(targetNum)) headline = "Up to temperature";

    const home = this._entityState(this._neatClimateEntities().home);
    const lo = Number(home?.attributes?.min_temp ?? 7);
    const hi = Number(home?.attributes?.max_temp ?? 30);
    const pos = (t) => (t == null || !Number.isFinite(Number(t)) ? null : (Number(t) - lo) / (hi - lo));
    // Warm, Nest-like: amber in Heat, deep orange while heating, grey when off (same as the card).
    const color = off
      ? ["#5f656b", "#8a9096"]
      : heating
        ? ["#FFB74D", "#F4511E"]
        : ["#FFD180", "#FF9800"];
    const eta = heating ? this._formatEta(live.time_to_temp_minutes) : null;

    const heroClass = `hero${heating ? " heating" : ""}${off ? " off" : ""}`;
    const roomTiles = rooms
      .map((room) => {
        const now = this._roomCurrent(room);
        const set = formatTemp(this._roomDisplayTemp(room));
        const heat = this._roomHeating(room);
        const selected = this._focusZone === room.id;
        const trv = this._entityState(room.trv_entity);
        const offline = Boolean(room.trv_entity) && (!trv || trv.state === "unavailable" || trv.state === "unknown");
        return `
          <button type="button" class="hero-room${heat ? " heat" : ""}${selected ? " selected" : ""}${offline ? " offline" : ""}" data-zone="${this._escape(room.id)}" ${offline ? `title="${this._escape(room.name)} — TRV offline"` : ""}>
            <span class="hero-room-top">
              <span class="hero-room-name">${this._escape(room.name)}</span>
              ${!offline && heat ? `<span class="hero-room-flame" title="Calling for heat">${flameSvg()}</span>` : ""}
            </span>
            <span class="hero-room-temp${now == null ? " unknown" : ""}">${now == null ? "—" : `${this._escape(formatTemp(Math.round(now * 10) / 10))}°`}</span>
            ${offline
              ? `<span class="hero-room-target"><span class="hero-room-off">Offline</span></span>`
              : `<span class="hero-room-target">${heat ? "Heating to" : "Set"} ${this._escape(set ?? "—")}°</span>`}
          </button>`;
      })
      .join("");

    return `
      <section class="${heroClass}">
        <div class="hero-left">
        <div class="hero-dial">
          ${dialSvg({ fill: off ? 0 : pos(targetNum) ?? 0, now: pos(currentNum), color })}
          <span class="hero-dial-core">
            <span class="hero-dial-caption">${this._escape(caption)}</span>
            <span class="hero-dial-temp">${this._escape(target)}${target !== "—" ? "<sup>°C</sup>" : ""}</span>
            ${current != null ? `<span class="hero-dial-sub">Indoor ${this._escape(current)}°</span>` : ""}
            ${eta ? `<span class="hero-dial-eta">${this._escape(eta)} to go</span>` : ""}
          </span>
          <span class="dial-steps">
            <button type="button" class="dial-step" data-step="-1" aria-label="Lower the temperature" ${targetNum != null && targetNum <= lo ? "disabled" : ""}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 13H5v-2h14z"/></svg>
            </button>
            <button type="button" class="dial-step" data-step="1" aria-label="Raise the temperature" ${targetNum != null && targetNum >= hi ? "disabled" : ""}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
          </span>
        </div>
        <div class="hm-modes">
          <div class="hm-seg" role="group" aria-label="Heating mode">
            <button type="button" class="hm-mode heat${!off ? " active" : ""}" data-hero-hvac="heat">${flameSvg()}Heat</button>
            <button type="button" class="hm-mode${off ? " active" : ""}" data-hero-hvac="off">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 3v8M6.4 6.6a8 8 0 1 0 11.2 0"/></svg>Off</button>
          </div>
          <div class="hm-seg" role="group" aria-label="Preset">
            ${["eco", "boost", "away"]
              .map((p) => `<button type="button" class="hm-mode ${p}${preset === p ? " active" : ""}" data-hero-preset="${p}">${p[0].toUpperCase() + p.slice(1)}</button>`)
              .join("")}
          </div>
        </div>
        </div>
        <div class="hero-side">
          <div class="hero-head">
            <div>
              <h2 class="hero-title">Home</h2>
              <p class="hero-headline">${this._escape(headline)}</p>
            </div>
            <div class="hero-pills">${this._heroPills()}</div>
          </div>
          ${roomTiles
            ? `<div class="hero-rooms${rooms.length > 1 ? " reorderable" : ""}">${roomTiles}</div>
              ${rooms.length > 1 ? `<p class="hero-rooms-hint">Drag rooms to reorder${"ontouchstart" in window ? " — press and hold first" : ""}</p>` : ""}`
            : `<p class="hero-empty">No rooms yet — add TRVs on the Rooms tab.</p>`}
        </div>
      </section>`;
  }

  _renderOverview() {
    const live = this._live();
    const intel = live.intelligence || {};
    const leaf = live.leaf || {};
    const hours = (h, m) => {
      const v = h != null ? Number(h) : m != null ? Number(m) / 60 : null;
      if (v == null || !Number.isFinite(v)) return "—";
      return v < 10 ? v.toFixed(1).replace(/\.0$/, "") : Math.round(v).toLocaleString();
    };
    const streak = Number(leaf.days_streak ?? 0);
    const heater = this._cfg().heater || "";
    const heaterWarning =
      live.heater_available === false
        ? `<div class="banner err">Boiler relay <code>${this._escape(heater || "not set")}</code> is unavailable — Neat cannot switch the boiler. Check the device, or pick another relay in Settings.</div>`
        : "";
    const preset = (live.main || {}).preset;
    const presetLabel = !preset || preset === "none" ? "Normal" : preset[0].toUpperCase() + preset.slice(1);

    const stat = (tone, icon, label, value) => `
      <div class="stat ${tone}">
        <span class="stat-icon">${icon}</span>
        <div><div class="label">${label}</div><div class="value">${this._escape(value)}</div></div>
      </div>`;

    const onOff = (on) => `<span class="badge${on ? " on" : ""}">${on ? "On" : "Off"}</span>`;
    const feature = (name, desc, valueHtml) => `
      <div class="feature">
        <div><div class="feature-name">${name}</div><div class="feature-desc">${desc}</div></div>
        <div class="feature-value">${valueHtml}</div>
      </div>`;
    const samples = Number(intel.warmup_samples ?? 0);
    const rate = intel.warmup_c_per_hour;

    return `
      ${heaterWarning}
      ${this._renderHero()}
      <div style="height:14px"></div>
      <div class="stats-row">
        ${stat(live.boiler_on ? "heat" : "", flameSvg(), "Boiler", live.boiler_on ? "On" : "Off")}
        ${stat(preset && preset !== "none" ? "good" : "", ICONS.tune, "Preset", presetLabel)}
        ${stat(live.window_open ? "warn" : "", ICONS.window, "Windows", live.window_open ? "Open" : "Closed")}
        ${stat(live.summer_mode ? "warn" : "", ICONS.sun, "Summer mode", live.summer_mode ? "On" : "Off")}
        ${stat(live.away ? "warn" : "", ICONS.home, "Presence", live.away ? "Away" : "Home")}
      </div>
      <div class="ov-grid">
        <div class="card">
          <div class="card-head">
            <span class="card-icon leaf">${leafSvg()}</span>
            <div class="card-head-text">
              <p class="card-title">Leaf</p>
              <p class="card-sub">${leaf.active ? "You're running efficiently right now." : "Turn the heat down, use Eco/Away, or switch off to earn Leaf time."}</p>
            </div>
            ${leaf.active ? `<span class="badge on">Earning</span>` : ""}
          </div>
          <div class="metric-row">
            <div class="metric"><div class="metric-value">${this._escape(hours(leaf.hours_week, leaf.minutes_week))}<small>h</small></div><div class="metric-label">This week</div></div>
            <div class="metric"><div class="metric-value">${this._escape(hours(leaf.hours_total, leaf.minutes_total))}<small>h</small></div><div class="metric-label">All time</div></div>
            <div class="metric"><div class="metric-value">${this._escape(streak)}<small>day${streak === 1 ? "" : "s"}</small></div><div class="metric-label">Streak</div></div>
          </div>
          ${this._renderLeafWeek(leaf.week_days)}
          <p class="card-foot">Leaf time only adds up — turning the heat up hides the leaf but never takes earned time away.</p>
        </div>
        <div class="card">
          <div class="card-head">
            <span class="card-icon intel">${ICONS.sparkle}</span>
            <div class="card-head-text">
              <p class="card-title">Neat Intelligence</p>
              <p class="card-sub">How Neat learns and plans for the house.</p>
            </div>
          </div>
          <div class="feature-list">
            ${feature("True Radiant", "Starts heating early so the house is warm when a schedule block begins", onOff(intel.true_radiant))}
            ${feature("Auto-Schedule", "Learns schedule changes from your manual adjustments", onOff(intel.auto_schedule))}
            ${feature("Leaf coaching", "Shows the leaf when you're saving energy", onOff(intel.leaf_enabled !== false))}
            ${feature("Away delay", "Switches to Eco once nobody's been home this long", `${this._escape(intel.away_delay_minutes ?? 20)} min`)}
            ${feature("Warm-up rate", "How fast the house heats, used to time preheating",
              `${rate != null ? `${this._escape(rate)} °C/h` : "—"}<small>${samples ? `${samples} sample${samples === 1 ? "" : "s"}` : "Default · still learning"}</small>`)}
          </div>
        </div>
      </div>
      ${this._renderEntitiesCard(heater)}
    `;
  }

  /** Last 7 days of Leaf time as bars; green = a Leaf day. Older backends send no week_days. */
  _renderLeafWeek(days) {
    if (!Array.isArray(days) || !days.length) return "";
    // Scale to the best day, but never below 2 h so a few minutes don't look like a full bar.
    const max = Math.max(120, ...days.map((d) => Number(d.minutes) || 0));
    const earnedCount = days.filter((d) => d.earned).length;
    const bars = days
      .map((d, i) => {
        const mins = Number(d.minutes) || 0;
        const date = new Date(`${d.date}T12:00:00`);
        const name = date.toLocaleDateString([], { weekday: "short" });
        const today = i === days.length - 1;
        const tip = `${name} ${date.getDate()} · ${mins ? `${this._ehDuration(mins)} Leaf time` : "no Leaf time"}${d.earned ? " · Leaf day" : ""}`;
        return `
          <div class="leaf-day${d.earned ? " earned" : ""}${today ? " today" : ""}" title="${this._escape(tip)}">
            <div class="leaf-day-track"><div class="leaf-day-bar" style="height:${mins ? Math.max(4, (mins / max) * 100) : 0}%"></div></div>
            <span class="leaf-day-label">${today ? "Today" : this._escape(name.slice(0, 3))}</span>
          </div>`;
      })
      .join("");
    return `
      <div class="leaf-week">
        <div class="leaf-week-title"><span>Last 7 days</span><span>${earnedCount} of 7 Leaf days</span></div>
        <div class="leaf-week-bars">${bars}</div>
      </div>`;
  }

  _renderEntitiesCard(heater) {
    const neat = this._neatClimateEntities();
    const chip = (entityId) => {
      if (!entityId) return `<span class="muted">—</span>`;
      const st = this._entityState(entityId);
      const name = this._entityName(entityId);
      const state = st ? st.state : "missing";
      const bad = !st || state === "unavailable" || state === "unknown";
      return `
        <div class="entity-chip" title="${this._escape(entityId)}">
          <span class="entity-chip-name">${this._escape(name)}<span class="entity-chip-state${bad ? " bad" : ""}">${this._escape(state)}</span></span>
          <code>${this._escape(entityId)}</code>
        </div>`;
    };
    const row = (label, ids) => `
      <div class="entity-row">
        <div class="entity-row-label">${label}</div>
        <div class="entity-chips">${ids.length ? ids.map(chip).join("") : chip("")}</div>
      </div>`;
    const total = (neat.home ? 1 : 0) + neat.rooms.length + (heater ? 1 : 0);
    return `
      <details class="card" id="ovEntities" ${this._entitiesOpen ? "open" : ""}>
        <summary>
          <span class="card-icon">${ICONS.link}</span>
          <div class="card-head-text">
            <p class="card-title">Entities</p>
            <p class="card-sub">${total} linked in Home Assistant</p>
          </div>
          <svg class="chev" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"/></svg>
        </summary>
        <div class="entity-rows">
          ${row("House", neat.home ? [neat.home] : [])}
          ${row("Rooms", neat.rooms)}
          ${row("Boiler relay", heater ? [heater] : [])}
        </div>
      </details>`;
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

  /** Minutes of boiler time in a day, clipped to that day. */
  _ehHeatMinutes(day) {
    return (day.heat_intervals || []).reduce((sum, iv) => {
      const left = this._ehPct(iv.start_ts, day.date);
      const right = this._ehPct(iv.end_ts || new Date().toISOString(), day.date);
      return sum + Math.max(0, right - left) * 14.4;
    }, 0);
  }

  _ehDuration(mins) {
    const m = Math.round(mins);
    if (m <= 0) return "—";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  }

  _renderEnergyDay(day) {
    const parts = this._ehDayParts(day.date);
    const segs = (day.heat_intervals || [])
      .map((iv) => {
        const left = this._ehPct(iv.start_ts, day.date);
        const right = this._ehPct(iv.end_ts || new Date().toISOString(), day.date);
        const span = `${this._ehClock(iv.start_ts)}–${iv.end_ts ? this._ehClock(iv.end_ts) : "now"}`;
        return `<div class="eh-seg" style="left:${left}%;width:${Math.max(0, right - left)}%" title="Heating ${span}"></div>`;
      })
      .join("");
    // Setpoint bubbles; clamped so ones near midnight stay inside the timeline.
    const points = [...(day.setpoints || [])]
      .sort((a, b) => String(a.ts).localeCompare(String(b.ts)))
      .map((sp) => {
        const left = this._ehPct(sp.ts, day.date);
        const temp = formatTemp(sp.temperature) ?? "—";
        return `<div class="eh-sp" data-pct="${left}" style="left:clamp(13px, ${left}%, calc(100% - 13px))" title="Set to ${this._escape(temp)}° at ${this._ehClock(sp.ts)}">${this._escape(temp)}</div>`;
      })
      .join("");
    const mins = this._ehHeatMinutes(day);
    return `
      <div class="eh-day eh-grid-row">
        <div class="eh-day-label">${this._escape(parts.label)}${day.leaf ? `<span title="Leaf earned">${leafSvg()}</span>` : ""}</div>
        <div class="eh-timeline">
          ${points}
          <div class="eh-track">${segs}</div>
        </div>
        <div class="eh-day-total${mins > 0 ? "" : " none"}" title="Boiler running time">${this._ehDuration(mins)}</div>
      </div>`;
  }

  /**
   * Nudge setpoint bubbles apart so close changes sit side by side instead of on top of
   * each other (time is exact in each bubble's tooltip). Re-runs when the card resizes.
   */
  _layoutEnergyBubbles() {
    this._ehResize?.disconnect();
    this._ehResize = null;
    const card = this.shadowRoot.querySelector(".eh-timeline")?.closest(".card");
    if (!card) return;
    const pack = () => {
      card.querySelectorAll(".eh-timeline").forEach((line) => {
        const width = line.clientWidth;
        const bubbles = [...line.querySelectorAll(".eh-sp")];
        if (!width || !bubbles.length) return;
        const size = bubbles[0].offsetWidth || 26;
        const gap = size + 2;
        const half = size / 2;
        const xs = bubbles.map((b) => Math.min(width - half, Math.max(half, (Number(b.dataset.pct) / 100) * width)));
        for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i], xs[i - 1] + gap);
        // Pushed past the end: pull the tail back, keeping the spacing.
        if (xs[xs.length - 1] > width - half) {
          xs[xs.length - 1] = width - half;
          for (let i = xs.length - 2; i >= 0; i--) xs[i] = Math.min(xs[i], xs[i + 1] - gap);
        }
        bubbles.forEach((b, i) => (b.style.left = `${xs[i]}px`));
      });
    };
    pack();
    this._ehResize = new ResizeObserver(pack);
    this._ehResize.observe(card);
  }

  _ehClock(ts) {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
    const totalMins = hist.reduce((sum, day) => sum + this._ehHeatMinutes(day), 0);
    const leafDays = hist.filter((d) => d.leaf).length;
    const axis = [
      ["12AM", 0, ""], ["6AM", 25, "half"], ["12PM", 50, ""], ["6PM", 75, "half"], ["12AM", 100, ""],
    ].map(([t, at, cls]) => `<span class="${cls}" style="left:${at}%">${t}</span>`).join("");
    return `
      ${this._pageHeader("Energy History", "When the boiler ran, setpoint changes, and Leaf days.")}
      ${banner}
      <div class="card">
        ${rows
          ? `<div class="eh-head">
              <div>
                <div class="eh-total-label">Boiler running time · last ${hist.length} days</div>
                <div class="eh-total-value">${this._ehDuration(totalMins)}${leafDays ? ` <span class="muted" style="font-size:13px">· ${leafDays} Leaf day${leafDays === 1 ? "" : "s"}</span>` : ""}</div>
              </div>
              <div class="eh-legend"><span><i></i>Heating</span><span><b></b>Setpoint</span><span>${leafSvg()}Leaf day</span></div>
            </div>
            <div class="eh-axis-row eh-grid-row"><span></span><div class="eh-axis">${axis}</div><span></span></div>
            ${rows}`
          : `<p class="muted" style="margin:0">No history yet — heat cycles will appear here.</p>`}
      </div>
    `;
  }

  _pointLeftPercent(start) {
    // Map 0–24h across the full width.
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
      ${this._renderHero()}
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
        <p class="muted" style="margin:0 12px 8px">Outside comfort blocks, Eco (${this._escape(eco)}°) applies and rooms drop to their own Eco temp. Dial changes hold until the next block change. Orange dots are block start setpoints.</p>
      </div>
    `;
  }

  _renderRooms() {
    const rooms = this._cfg().rooms || [];
    const editing = this._editingRoomId;
    const editingRoom = editing ? rooms.find((r) => r.id === editing) : null;
    const cards = rooms
      .map((r) => {
        const live = (this._live().rooms || {})[r.id] || {};
        const calls = r.calls_for_heat !== false;
        const now = this._roomCurrent(r);
        const target = formatTemp(live.target ?? r.target_temp);
        const trv = this._entityState(r.trv_entity);
        const trvBad = !trv || trv.state === "unavailable" || trv.state === "unknown";
        const sensors = [r.temperature_sensor, ...(r.extra_temperature_sensors || [])].filter(Boolean).length;
        return `
          <div class="room-card${editing === r.id ? " selected" : ""}${live.needs_heat ? " heat" : ""}" data-room-id="${this._escape(r.id)}" role="button" tabindex="0" title="Click to edit · drag to reorder">
            <div class="room-card-top">
              <span class="room-card-name">${this._escape(r.name)}</span>
              ${live.needs_heat ? `<span class="set-state heat-badge">${flameSvg()}Heating</span>` : ""}
            </div>
            <div class="room-card-temps">
              <span class="room-card-now${now == null ? " unknown" : ""}">${now == null ? "—" : `${this._escape(formatTemp(Math.round(now * 10) / 10))}°`}</span>
              <span class="room-card-target">Set ${this._escape(target ?? "—")}°</span>
            </div>
            <div class="room-card-meta">
              <span class="set-state ${trvBad ? "bad" : "good"}" title="${this._escape(r.trv_entity)}">TRV ${trvBad ? (trv ? trv.state : "missing") : "online"}</span>
              <span class="room-card-sensors">${sensors ? `${sensors} sensor${sensors === 1 ? "" : "s"}` : "TRV temperature"}</span>
            </div>
            <div class="room-card-calls">
              <span>Calls boiler</span>
              <label class="switch" title="Let this room turn the boiler on"><input type="checkbox" data-toggle-calls="${this._escape(r.id)}" ${calls ? "checked" : ""} /><span></span></label>
            </div>
          </div>`;
      })
      .join("");
    return `
      <div class="page-head-row">
        ${this._pageHeader("Rooms", "Each room has its own Neat climate, driven by its TRV.")}
        <button class="primary" id="addRoom" type="button">${ICONS.plus}Add room</button>
      </div>
      ${rooms.length
        ? `<div class="room-grid${rooms.length > 1 ? " reorderable" : ""}">${cards}</div>
           <p class="hero-rooms-hint" style="margin:8px 0 14px">Click a room to edit it · drag to reorder</p>`
        : `<div class="card empty-state"><p class="muted" style="margin:0">No rooms yet.</p><button class="primary" id="addRoomEmpty" type="button">${ICONS.plus}Add your first room</button></div>`}
    `;
  }

  _renderRoomDialog() {
    const editing = this._editingRoomId;
    const room = editing ? (this._cfg().rooms || []).find((r) => r.id === editing) : null;
    return this._dialog({
      icon: editing ? ICONS.tune : ICONS.home,
      title: editing ? `Edit ${this._escape(room?.name || "room")}` : "Add a room",
      sub: editing ? "Change the TRV, sensors or boiler behaviour." : "Pick the room's TRV — sensors are optional.",
      body: `
        <div class="dlg-section">
          <div class="set-field">
            <div class="set-field-label">Name</div>
            <input id="roomName" placeholder="e.g. Kitchen" value="${this._escape(this._roomDraft.name || "")}" />
          </div>
          <div class="set-field">
            <div class="set-field-label">TRV</div>
            <div class="entity-picker-host" data-room-picker="trv"></div>
            <div class="set-row-desc">The radiator valve Neat controls.</div>
          </div>
        </div>
        <div class="dlg-section">
          <div class="dlg-section-title">Temperature</div>
          <div class="set-field">
            <div class="set-field-label">Room sensor</div>
            <div class="entity-picker-host" data-room-picker="sensor"></div>
            <div class="set-row-desc">Optional — otherwise the TRV's own reading is used.</div>
          </div>
          <div class="set-field">
            <div class="set-field-label">Extra sensors</div>
            <div class="set-row-desc" style="margin:0 0 8px">Optional — averaged with the room sensor.</div>
            <div class="set-list" data-room-extras-list>${this._renderRoomExtras()}</div>
            <div class="entity-picker-host set-add" data-room-picker="extras"></div>
          </div>
        </div>
        <div class="dlg-section">
          <div class="set-row">
            <div class="set-row-text">
              <div class="set-row-name">Call for heat</div>
              <div class="set-row-desc">Lets this room turn the boiler on when it's cold. Leave on for most TRVs — otherwise the valve can open with no hot water.</div>
            </div>
            <div class="set-row-control"><label class="switch"><input type="checkbox" id="roomCallsForHeat" ${this._roomDraft.calls_for_heat !== false ? "checked" : ""} /><span></span></label></div>
          </div>
        </div>`,
      foot: `
        ${editing ? `<button class="danger" id="deleteRoom" type="button">Delete</button>` : ""}
        <span style="flex:1"></span>
        <button class="secondary" data-close-dialog type="button">Cancel</button>
        <button class="primary" id="saveRoom" type="button">${editing ? "Save changes" : "Add room"}</button>`,
    });
  }

  _renderRoomExtras() {
    const ids = this._roomDraft.extras || [];
    if (!ids.length) return "";
    return this._renderEntityRows(ids, "sensor", "room_extras");
  }

  _refreshRoomExtras() {
    const box = this.shadowRoot.querySelector("[data-room-extras-list]");
    if (box) box.innerHTML = this._renderRoomExtras();
  }

  _clearRoomForm() {
    this._closeDialog();
  }

  /** Open the room dialog: a room to edit, or nothing to add one. */
  _loadRoomIntoForm(room) {
    this._editingRoomId = room?.id || null;
    this._roomDraft = {
      name: room?.name || "",
      trv: room?.trv_entity || "",
      sensor: room?.temperature_sensor || "",
      extras: [...(room?.extra_temperature_sensors || [])],
      calls_for_heat: room ? room.calls_for_heat !== false : true,
    };
    this._openDialog("room");
  }

  async _mountRoomPickers() {
    if (this._view !== "rooms" || !this._hass) return;
    const gen = ++this._roomPickerMountGen;
    const hosts = [...(this.shadowRoot?.querySelectorAll("[data-room-picker]") || [])];
    if (!hosts.length) return;
    for (const host of hosts) {
      if (!host.querySelector("ha-entity-picker")) {
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

    const make = (key, { domains, filter, placeholder }) => {
      const host = this.shadowRoot.querySelector(`[data-room-picker="${key}"]`);
      if (!host) return null;
      host.replaceChildren();
      const picker = document.createElement("ha-entity-picker");
      picker.setAttribute("allow-custom-entity", "");
      if (this._hass.userData?.showEntityIdPicker) picker.setAttribute("show-entity-id", "");
      picker.includeDomains = domains;
      if (filter) picker.entityFilter = filter;
      if (placeholder) picker.placeholder = placeholder;
      picker.hass = this._hass;
      host.appendChild(picker);
      return picker;
    };

    for (const [key, opts] of [
      ["trv", { domains: ["climate"] }],
      ["sensor", { domains: ["sensor"], filter: temperatureSensorFilter }],
    ]) {
      const picker = make(key, opts);
      if (!picker) continue;
      picker.value = this._roomDraft[key] || undefined;
      picker.addEventListener("value-changed", (ev) => {
        this._roomDraft[key] = ev.detail?.value || "";
      });
    }

    const extras = make("extras", { domains: ["sensor"], filter: temperatureSensorFilter, placeholder: "Add a temperature sensor" });
    extras?.addEventListener("value-changed", (ev) => {
      const id = ev.detail?.value;
      if (!id) return;
      if (!this._roomDraft.extras.includes(id)) this._roomDraft.extras = [...this._roomDraft.extras, id];
      this._refreshRoomExtras();
      setTimeout(() => (extras.value = undefined), 0);
    });
  }

  _readRoomPickerValues() {
    // Pickers write into the draft as they change.
    return this._roomDraft;
  }

  _renderWallPanels() {
    const panels = this._cfg().wall_panels || [];
    const neat = this._neatClimateEntities();
    // The outline marks which panel the preview shows — meaningless with only one.
    const several = panels.length > 1;
    const cards = panels
      .map((p) => {
        const model = wallModel(p.model);
        const primary = this._wallPrimary(p.primary_entity);
        const primaryName = (primary && this._entityName(primary)) || "—";
        const notNeat = primary && !this._isNeatClimate(primary);
        return `
          <div class="wp-card${several && this._previewPanelId() === p.id ? " selected" : ""}" data-id="${this._escape(p.id)}" role="button" tabindex="0" ${several ? `title="Show in preview"` : ""}>
            <span class="card-icon">${ICONS.panel}</span>
            <div class="wp-card-text">
              <div class="wp-card-name">${this._escape(p.label || p.id)}</div>
              <div class="wp-card-meta">${this._escape(model.label)} · device ID <code>${this._escape(p.id)}</code></div>
              <div class="wp-card-meta">Controls <strong>${this._escape(primaryName)}</strong>${notNeat ? ` <span class="set-state warn">not Neat</span>` : ""}${p.temperature_lock ? ` · <span class="set-state">Locked</span>` : ""}</div>
              <div class="wp-card-meta kiosk-line" data-kiosk-pill="${this._escape(p.id)}">${this._kioskPillHtml(p.id)}</div>
            </div>
            <button class="secondary compact edit-panel" type="button" data-id="${this._escape(p.id)}">Edit</button>
          </div>`;
      })
      .join("");
    void neat;
    return `
      <div class="page-head-row">
        ${this._pageHeader("Wall panels", "Each physical NSPanel. On the device, you only pick which panel it is.")}
        <button class="primary" id="addWallPanel" type="button">${ICONS.plus}Add wall panel</button>
      </div>
      ${panels.length
        ? `${this._renderWallPreview(panels)}<div class="wp-list">${cards}</div><div style="height:14px"></div>${this._renderKioskCard()}`
        : `<div class="card empty-state"><p class="muted" style="margin:0">No wall panels yet.</p><button class="primary" id="addWallPanelEmpty" type="button">${ICONS.plus}Add your first wall panel</button></div>`}
    `;
  }

  async _loadKiosk(pillsOnly = false) {
    try {
      this._kiosk = await this._ws("neat_thermostat/kiosk_status");
    } catch {
      this._kiosk = null;
    }
    if (this._view !== "wall_panels") return;
    if (pillsOnly || this._dialogKind) this._refreshKioskPills();
    else {
      const card = this.shadowRoot.getElementById("kioskCard");
      if (card) {
        card.outerHTML = this._renderKioskCard();
        this._bindKioskCard();
      }
      this._refreshKioskPills();
    }
  }

  _kioskPillHtml(panelId) {
    const s = this._kiosk?.panels?.[panelId];
    if (!s || !s.linked) return `<span class="set-state">Kiosk not linked</span>`;
    if (!s.online) return `<span class="set-state bad">Panel offline</span>`;
    const pill = s.in_sync
      ? `<span class="set-state good">In sync</span>`
      : `<span class="set-state warn" title="${this._escape(this._kioskDriftText(s))}">${s.page_ok === false ? "Wrong page" : "Out of sync"}</span>`;
    return `${pill}
      ${s.in_sync ? "" : `<button class="linkish kiosk-act" type="button" data-kiosk-sync="${this._escape(panelId)}">Sync now</button>`}
      <button class="linkish kiosk-act" type="button" data-kiosk-reload="${this._escape(panelId)}">Reload</button>`;
  }

  _kioskDriftText(s) {
    const out = [];
    if (s.page_ok === false) out.push(`Showing ${s.current_page || "another page"}`);
    for (const f of KIOSK_FIELDS) {
      const it = s.settings?.[f.key];
      if (it && it.ok === false) out.push(`${f.label}: ${kioskDisplay(f, it.actual)} (should be ${kioskDisplay(f, it.target)})`);
    }
    return out.join(" · ");
  }

  _refreshKioskPills() {
    this.shadowRoot.querySelectorAll("[data-kiosk-pill]").forEach((el) => {
      const html = this._kioskPillHtml(el.dataset.kioskPill);
      if (el.innerHTML !== html) el.innerHTML = html;
    });
  }

  /** One setting's input. Blank = not managed (house) / use the house default (panel). */
  _kioskControl(field, value, idPrefix, placeholder) {
    const id = `${idPrefix}${field.key}`;
    if (field.kind === "bool") {
      const v = value == null ? "" : value ? "on" : "off";
      return `<select id="${id}" class="kiosk-select">
          <option value="" ${v === "" ? "selected" : ""}>${this._escape(placeholder)}</option>
          <option value="on" ${v === "on" ? "selected" : ""}>On</option>
          <option value="off" ${v === "off" ? "selected" : ""}>Off</option>
        </select>`;
    }
    const shown = value == null ? "" : field.kind === "pct" ? Math.round(Number(value) / 2.55) : value;
    const max = field.kind === "pct" ? 100 : 86400;
    return `<div class="num-input kiosk-num"><input id="${id}" type="number" min="0" max="${max}" step="1" placeholder="${this._escape(placeholder)}" value="${this._escape(shown)}" /><span>${field.kind === "pct" ? "%" : "sec"}</span></div>`;
  }

  /** Read a set of kiosk inputs back into backend values (blank fields left out). */
  _readKioskControls(idPrefix) {
    const out = {};
    for (const f of KIOSK_FIELDS) {
      const el = this.shadowRoot.getElementById(`${idPrefix}${f.key}`);
      if (!el || el.value === "") continue;
      if (f.kind === "bool") out[f.key] = el.value === "on";
      else if (f.kind === "pct") out[f.key] = Math.round(Math.min(100, Math.max(0, Number(el.value))) * 2.55);
      else out[f.key] = Math.max(0, Math.round(Number(el.value)));
    }
    return out;
  }

  _renderKioskCard() {
    const k = this._kiosk;
    const head = `
      <div class="card-head">
        <span class="card-icon intel">${ICONS.tune}</span>
        <div class="card-head-text"><p class="card-title">Kiosk browser</p><p class="card-sub">Fully Kiosk settings every panel shares. Leave a setting blank and Neat won't touch it.</p></div>
      </div>`;
    if (!k) return `<div class="card" id="kioskCard">${head}<p class="muted" style="margin:0">Loading…</p></div>`;
    if (!k.devices?.length) {
      return `<div class="card" id="kioskCard">${head}<p class="muted" style="margin:0">Add the <strong>Fully Kiosk Browser</strong> integration in Home Assistant (needs Fully's Plus licence) to manage your panels from here.</p></div>`;
    }
    const d = k.defaults || {};
    const rows = KIOSK_FIELDS.map(
      (f) => `
        <div class="set-row">
          <div class="set-row-text"><div class="set-row-name">${f.label}</div>${f.desc ? `<div class="set-row-desc">${f.desc}</div>` : ""}</div>
          <div class="set-row-control">${this._kioskControl(f, d[f.key], "kd_", "Not managed")}</div>
        </div>`
    ).join("");
    return `
      <div class="card" id="kioskCard">
        ${head}
        <div class="set-row">
          <div class="set-row-text"><div class="set-row-name">Keep panels in sync</div><div class="set-row-desc">Re-applies these when a panel reconnects or drifts. The start URL is always set for you.</div></div>
          <div class="set-row-control"><label class="switch"><input type="checkbox" id="kioskAutoSync" ${k.auto_sync !== false ? "checked" : ""} /><span></span></label></div>
        </div>
        ${rows}
        <div class="form-actions">
          <select id="kioskImportFrom" class="kiosk-select" aria-label="Panel to import from">
            ${k.devices.map((dev) => `<option value="${this._escape(dev.id)}">${this._escape(dev.name)}</option>`).join("")}
          </select>
          <button class="secondary" id="kioskImport" type="button">Import from panel</button>
          <span style="flex:1"></span>
          <button class="primary" id="kioskSaveDefaults" type="button">Save &amp; sync all</button>
        </div>
      </div>`;
  }

  _bindKioskCard() {
    this.shadowRoot.getElementById("kioskImport")?.addEventListener("click", async () => {
      const select = this.shadowRoot.getElementById("kioskImportFrom");
      const name = select?.selectedOptions?.[0]?.textContent || "the panel";
      try {
        const { settings } = await this._ws("neat_thermostat/kiosk_read", { device_id: select.value });
        let n = 0;
        for (const f of KIOSK_FIELDS) {
          const el = this.shadowRoot.getElementById(`kd_${f.key}`);
          if (!el || settings[f.key] == null) continue;
          el.value = f.kind === "bool" ? (settings[f.key] ? "on" : "off") : f.kind === "pct" ? Math.round(settings[f.key] / 2.55) : settings[f.key];
          n++;
        }
        const missed = KIOSK_FIELDS.filter((f) => settings[f.key] == null).map((f) => f.label.toLowerCase());
        this._showToast(`Imported ${n} setting${n === 1 ? "" : "s"} from ${name}${missed.length ? ` — couldn't read ${missed.join(", ")} (left as they were)` : ""}. Save to apply.`);
      } catch (e) {
        this._showToast(`Couldn't read ${name}: ${e?.message || e}`, "err");
      }
    });
    this.shadowRoot.getElementById("kioskSaveDefaults")?.addEventListener("click", async () => {
      try {
        const res = await this._ws("neat_thermostat/update_settings", {
          kiosk_defaults: this._readKioskControls("kd_"),
          kiosk_auto_sync: Boolean(this.shadowRoot.getElementById("kioskAutoSync")?.checked),
        });
        const changed = Object.values(res.kiosk_synced || {}).reduce((n, list) => n + list.length, 0);
        this._showToast(changed ? `Saved — ${changed} change${changed === 1 ? "" : "s"} sent to your panels` : "Saved — panels already match");
        await this._loadKiosk();
      } catch (e) {
        this._showToast(`Couldn't save: ${e?.message || e}`, "err");
      }
    });
  }

  async _kioskSync(panelId) {
    try {
      const res = await this._ws("neat_thermostat/kiosk_apply", panelId ? { panel_id: panelId } : {});
      this._kiosk = res;
      this._refreshKioskPills();
      const changed = Object.values(res.synced || {}).reduce((n, list) => n + list.length, 0);
      this._showToast(changed ? `Synced — ${changed} change${changed === 1 ? "" : "s"} sent` : "Already in sync");
    } catch (e) {
      this._showToast(`Couldn't sync: ${e?.message || e}`, "err");
    }
  }

  async _kioskReload(panelId) {
    try {
      await this._ws("neat_thermostat/kiosk_reload", { panel_id: panelId });
      this._showToast("Reloading the panel");
    } catch (e) {
      this._showToast(`Couldn't reload: ${e?.message || e}`, "err");
    }
  }

  /** Display name. HA prefixes Neat's entities with the device name ("Neat Thermostat Neat Home"); drop it. */
  _entityName(entityId) {
    const name = this._entityState(entityId)?.attributes?.friendly_name || entityId || "";
    return this._hass?.entities?.[entityId]?.platform === "neat_thermostat" ? name.replace(/^Neat Thermostat\s+/, "") : name;
  }

  _isNeatClimate(entityId) {
    return this._hass?.entities?.[entityId]?.platform === "neat_thermostat";
  }

  /** Same rule as the backend: blank, or the old "climate.neat_home" default that isn't Neat's, means Neat's house climate. */
  _wallPrimary(configured) {
    const home = this._neatClimateEntities().home;
    if (!configured) return home || "";
    if (configured === "climate.neat_home" && home && !this._isNeatClimate(configured)) return home;
    return configured;
  }

  _renderWallDialog() {
    const d = this._wallDraft;
    const editing = this._wallEditingId;
    const cfg = this._cfg();
    return this._dialog({
      icon: ICONS.panel,
      title: editing ? `Edit ${this._escape(d.label || editing)}` : "Add a wall panel",
      sub: editing ? "Change what this panel shows and controls." : "Set up a new NSPanel. You'll pick this panel on the device.",
      body: `
        <div class="dlg-section">
          <div class="set-fields">
            <div class="set-field">
              <div class="set-field-label">Name</div>
              <input id="wpLabel" placeholder="e.g. Hallway panel" value="${this._escape(d.label || "")}" />
            </div>
            <div class="set-field">
              <div class="set-field-label">Device ID</div>
              <input id="wpId" placeholder="hallway" value="${this._escape(d.id || "")}" ${editing ? "readonly" : ""} />
              <div class="set-row-desc">${editing ? "Fixed — the panel uses it to find its settings." : "Filled in from the name. You'll choose this on the panel."}</div>
            </div>
          </div>
          <div class="set-field">
            <div class="set-field-label">Model</div>
            <select id="wpModel">
              ${WALL_MODELS.map((m) => `<option value="${m.id}" ${wallModel(d.model).id === m.id ? "selected" : ""}>${this._escape(m.label)} (${this._escape(m.screen)})</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="dlg-section">
          <div class="dlg-section-title">Controls</div>
          <div class="set-field">
            <div class="set-field-label">Thermostat</div>
            <div class="entity-picker-host" data-wall-picker="primary"></div>
            <div class="set-row-desc" id="wpPrimaryNote"></div>
          </div>
        </div>
        <div class="dlg-section">
          <div class="dlg-section-title">Shows</div>
          <div class="set-fields">
            <div class="set-field">
              <div class="set-field-label">Inside temperature</div>
              <div class="entity-picker-host" data-wall-picker="insideTemp"></div>
            </div>
            <div class="set-field">
              <div class="set-field-label">Outside temperature</div>
              <div class="entity-picker-host" data-wall-picker="outsideTemp"></div>
            </div>
            <div class="set-field">
              <div class="set-field-label">Humidity</div>
              <div class="entity-picker-host" data-wall-picker="humidity"></div>
            </div>
            <div class="set-field">
              <div class="set-field-label">Weather</div>
              <div class="entity-picker-host" data-wall-picker="weather"></div>
            </div>
          </div>
          <div class="set-row-desc">Blank sensors use the house ones from Settings. Room buttons always follow your Rooms list.</div>
        </div>
        <div class="dlg-section">
          <div class="dlg-section-title">Screen</div>
          <div class="set-row">
            <div class="set-row-text"><div class="set-row-name">Clock after</div><div class="set-row-desc">Idle time before the Neat app dims to its clock.</div></div>
            <div class="set-row-control"><div class="num-input"><input id="wpIdle" type="number" min="5" step="5" value="${this._escape(d.idleSec ?? 30)}" /><span>sec</span></div></div>
          </div>
          <div class="set-row">
            <div class="set-row-text"><div class="set-row-name">Temperature lock</div><div class="set-row-desc">${String(cfg.wall_pin || "").trim() ? "Changes on the panel need the house PIN." : "Needs a Wall panel PIN in Settings first."}</div></div>
            <div class="set-row-control"><label class="switch"><input type="checkbox" id="wpLock" ${d.lock ? "checked" : ""} /><span></span></label></div>
          </div>
        </div>
        ${this._renderKioskDialogSection(d)}`,
      foot: `
        ${editing ? `<button class="danger" id="deleteWallPanel" type="button">Delete</button>` : ""}
        <span style="flex:1"></span>
        <button class="secondary" data-close-dialog type="button">Cancel</button>
        <button class="primary" id="saveWallPanel" type="button">${editing ? "Save changes" : "Add wall panel"}</button>`,
    });
  }

  _renderKioskDialogSection(d) {
    const k = this._kiosk;
    if (!k?.devices?.length) return "";
    const defaults = k.defaults || {};
    const rows = KIOSK_FIELDS.map((f) => {
      const house = defaults[f.key];
      const placeholder = house == null ? "Not managed" : `House: ${kioskDisplay(f, house)}`;
      return `
        <div class="set-row">
          <div class="set-row-text"><div class="set-row-name">${f.label}</div></div>
          <div class="set-row-control">${this._kioskControl(f, d.kioskOverrides?.[f.key], "ko_", placeholder)}</div>
        </div>`;
    }).join("");
    return `
      <div class="dlg-section">
        <div class="dlg-section-title">Kiosk browser</div>
        <div class="set-field">
          <div class="set-field-label">Fully Kiosk device</div>
          <select id="wpKioskDevice">
            <option value="">Not linked</option>
            ${k.devices.map((dev) => `<option value="${this._escape(dev.id)}" ${d.kioskDevice === dev.id ? "selected" : ""}>${this._escape(dev.name)}</option>`).join("")}
          </select>
          <div class="set-row-desc">Linking lets Neat set this panel's start URL and settings for you.</div>
        </div>
        <div class="set-row-desc">Overrides for this panel only — leave blank to use the house setting.</div>
        ${rows}
      </div>`;
  }

  /** Open the wall panel dialog: a panel to edit, or nothing to add one. */
  _openWallDialog(panel) {
    const cfg = this._cfg();
    const sensors = panel?.sensors || {};
    this._wallEditingId = panel?.id || null;
    this._wallIdTouched = Boolean(panel);
    this._wallDraft = {
      id: panel?.id || "",
      label: panel?.label || "",
      model: panel?.model,
      primary: this._wallPrimary(panel?.primary_entity || ""),
      insideTemp: sensors.insideTemp || cfg.temperature_sensor || "",
      outsideTemp: sensors.outsideTemp || cfg.outdoor_temp_sensor || "",
      humidity: sensors.insideHumidity || "",
      weather: sensors.weather || "weather.home",
      idleSec: Math.round(Number(panel?.display?.idleMs ?? 30000) / 1000) || 30,
      lock: Boolean(panel?.temperature_lock),
      kioskDevice: panel?.kiosk_device || (!panel && this._kiosk?.devices?.length === 1 ? this._kiosk.devices[0].id : ""),
      kioskOverrides: { ...(panel?.kiosk_overrides || {}) },
    };
    this._openDialog("wall");
  }

  _updateWallPrimaryNote() {
    const note = this.shadowRoot?.getElementById("wpPrimaryNote");
    if (!note) return;
    const value = this._wallDraft.primary;
    if (!value || this._isNeatClimate(value)) {
      note.className = "set-row-desc";
      note.textContent = "Neat's house thermostat — schedule, presets and boiler control all apply.";
    } else {
      note.className = "set-row-desc warn-note";
      note.textContent = "This isn't a Neat thermostat, so the panel will bypass Neat's schedule and boiler control.";
    }
  }

  // ---- Shared dialog ----
  _dialog({ icon, title, sub, body, foot }) {
    return `
      <div class="dlg-backdrop" data-close-dialog>
        <div class="dlg" role="dialog" aria-modal="true" aria-label="${title}">
          <div class="dlg-head">
            <span class="card-icon intel">${icon}</span>
            <div class="card-head-text"><p class="dlg-title">${title}</p><p class="card-sub">${sub}</p></div>
            <button class="dlg-x" type="button" data-close-dialog aria-label="Close">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="dlg-body">${body}</div>
          <div class="dlg-foot">${foot}</div>
        </div>
      </div>`;
  }

  _renderDialog() {
    if (this._dialogKind === "room" && this._view === "rooms") return this._renderRoomDialog();
    if (this._dialogKind === "wall" && this._view === "wall_panels") return this._renderWallDialog();
    return "";
  }

  _openDialog(kind) {
    this._dialogKind = kind;
    this._render();
    this.shadowRoot.querySelector(".dlg input:not([readonly])")?.focus();
  }

  _closeDialog() {
    this._dialogKind = null;
    this._editingRoomId = null;
    this._wallEditingId = null;
    this._render();
  }

  _previewPanelId(panels = this._cfg().wall_panels || []) {
    if (panels.some((p) => p.id === this._previewPanel)) return this._previewPanel;
    return panels[0]?.id || "";
  }

  _panelModel(id) {
    return wallModel((this._cfg().wall_panels || []).find((p) => p.id === id)?.model);
  }

  _wallPreviewSrc(id) {
    const q = new URLSearchParams({ embedded: "1", preview: "1", device: id, t: String(Date.now()) });
    return `${WALL_APP_URL}?${q}`;
  }

  _previewSizeText(model) {
    return `${model.label} · ${model.screen}`;
  }

  _renderWallPreview(panels) {
    if (!panels.length) return "";
    const current = this._previewPanelId(panels);
    const model = this._panelModel(current);
    const options = panels
      .map((p) => `<option value="${this._escape(p.id)}" ${p.id === current ? "selected" : ""}>${this._escape(p.label || p.id)}</option>`)
      .join("");
    return `
      <div class="card">
        <p class="card-title">Preview</p>
        <div class="wp-preview-bar">
          <select id="wpPreviewPanel" aria-label="Panel to preview">${options}</select>
          <button type="button" class="secondary compact" id="wpPreviewReload">Reload</button>
          <label class="wp-preview-taps${this._previewTaps ? " live" : ""}">
            <input type="checkbox" id="wpPreviewTaps" ${this._previewTaps ? "checked" : ""} />
            ${this._previewTaps ? "Taps are live — they change the real heating" : "Allow taps (controls the real heating)"}
          </label>
        </div>
        <div class="wp-preview-stage">
          <div class="wp-preview-device" style="max-width:${model.width + 28}px">
            <div class="wp-preview-screen" style="aspect-ratio:${model.width} / ${model.height}">
              <iframe id="wpPreviewFrame" title="Wall panel preview" style="width:${model.width}px;height:${model.height}px"
                src="${this._escape(this._wallPreviewSrc(current))}"></iframe>
              ${this._previewTaps ? "" : `<div class="wp-preview-shield" title="View only — tick Allow taps to use it"></div>`}
            </div>
          </div>
        </div>
        <p class="muted" style="margin:12px 0 0">
          <strong id="wpPreviewSize">${this._escape(this._previewSizeText(model))}</strong> —
          the wall app bundled with this Neat version, live against your real entities, at the model's screen size.
          Saving a panel reloads it.
        </p>
      </div>`;
  }

  /** Resize the preview to a model's screen without reloading the app. */
  _applyPreviewModel(model) {
    const device = this.shadowRoot?.querySelector(".wp-preview-device");
    const screen = this.shadowRoot?.querySelector(".wp-preview-screen");
    const frame = this.shadowRoot?.getElementById("wpPreviewFrame");
    if (!device || !screen || !frame) return;
    this._previewWidth = model.width;
    device.style.maxWidth = `${model.width + 28}px`;
    screen.style.aspectRatio = `${model.width} / ${model.height}`;
    frame.style.width = `${model.width}px`;
    frame.style.height = `${model.height}px`;
    screen.style.setProperty("--wp-scale", String(screen.clientWidth / model.width));
    const size = this.shadowRoot.getElementById("wpPreviewSize");
    if (size) size.textContent = this._previewSizeText(model);
  }

  _showPreviewPanel(id) {
    this._previewPanel = id;
    const select = this.shadowRoot?.getElementById("wpPreviewPanel");
    const frame = this.shadowRoot?.getElementById("wpPreviewFrame");
    if (select) select.value = id;
    this._applyPreviewModel(this._panelModel(id));
    if (frame) frame.src = this._wallPreviewSrc(id);
  }

  /**
   * Drag room tiles to reorder them; the order is saved on the HA config entry.
   * Mouse: drag after a few px. Touch: press and hold, then drag (so scrolling still works).
   */
  _bindRoomDrag() {
    const hero = this.shadowRoot.querySelector(".hero-rooms.reorderable");
    if (hero) this._bindRoomDragGrid(hero, ".hero-room", "zone");
    const page = this.shadowRoot.querySelector(".room-grid.reorderable");
    if (page) this._bindRoomDragGrid(page, ".room-card", "roomId");
  }

  _bindRoomDragGrid(grid, tileSel, idKey) {
    let drag = null; // { tile, pointerId, x, y, started, timer }

    const begin = () => {
      if (!drag || drag.started) return;
      drag.started = true;
      this._dragging = true;
      drag.tile.classList.add("dragging");
      grid.classList.add("is-dragging");
      try {
        drag.tile.setPointerCapture(drag.pointerId);
      } catch {
        // Pointer already released.
      }
      navigator.vibrate?.(10);
    };
    const end = async (commit) => {
      if (!drag) return;
      const { tile, started, timer, before } = drag;
      clearTimeout(timer);
      drag = null;
      if (!started) return;
      tile.classList.remove("dragging");
      grid.classList.remove("is-dragging");
      this._suppressZoneClick = true;
      setTimeout(() => (this._suppressZoneClick = false), 0);
      const order = [...grid.querySelectorAll(tileSel)].map((t) => t.dataset[idKey]);
      if (!commit || order.join() === before) {
        if (!commit) this._render();
        this._dragging = false;
        return;
      }
      await this._saveRoomOrder(order);
      this._dragging = false;
    };

    grid.querySelectorAll(tileSel).forEach((tile) => {
      tile.addEventListener("pointerdown", (ev) => {
        if (ev.button !== 0 || drag || ev.target.closest(".switch")) return;
        drag = {
          tile, pointerId: ev.pointerId, x: ev.clientX, y: ev.clientY, started: false, timer: null,
          before: [...grid.querySelectorAll(tileSel)].map((t) => t.dataset[idKey]).join(),
        };
        if (ev.pointerType !== "mouse") drag.timer = setTimeout(begin, 350);
      });
      // A touch drag must stop the page scrolling once it has begun.
      tile.addEventListener("touchmove", (ev) => {
        if (drag?.started) ev.preventDefault();
      }, { passive: false });
      tile.addEventListener("contextmenu", (ev) => {
        if (drag) ev.preventDefault();
      });
    });

    grid.addEventListener("pointermove", (ev) => {
      if (!drag || ev.pointerId !== drag.pointerId) return;
      const moved = Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y);
      if (!drag.started) {
        if (ev.pointerType === "mouse" && moved > 5) begin();
        else if (ev.pointerType !== "mouse" && moved > 8) {
          // Finger moved before the hold finished: it's a scroll, not a drag.
          clearTimeout(drag.timer);
          drag = null;
        }
        return;
      }
      // Move the lifted tile into the slot under the pointer.
      const target = [...grid.querySelectorAll(tileSel)].find((t) => {
        if (t === drag.tile) return false;
        const r = t.getBoundingClientRect();
        return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      });
      if (!target) return;
      const tiles = [...grid.querySelectorAll(tileSel)];
      const from = tiles.indexOf(drag.tile);
      const to = tiles.indexOf(target);
      grid.insertBefore(drag.tile, from < to ? target.nextSibling : target);
    });
    grid.addEventListener("pointerup", (ev) => {
      if (drag && ev.pointerId === drag.pointerId) end(true);
    });
    grid.addEventListener("pointercancel", (ev) => {
      if (drag && ev.pointerId === drag.pointerId) end(false);
    });
  }

  async _saveRoomOrder(visibleOrder) {
    const rooms = this._cfg().rooms || [];
    // Rooms hidden from the hero (disabled) keep their place at the end.
    const ids = [...visibleOrder, ...rooms.map((r) => r.id).filter((id) => !visibleOrder.includes(id))];
    const previous = rooms;
    this._state.config.rooms = ids.map((id) => rooms.find((r) => r.id === id)).filter(Boolean);
    this._orderSavedAt = Date.now();
    try {
      await this._ws("neat_thermostat/reorder_rooms", { room_ids: ids });
      this._showToast("Room order saved");
    } catch (e) {
      this._state.config.rooms = previous;
      this._showToast(`Couldn't save room order: ${e?.message || e}`, "err");
      this._render();
    }
  }

  _bindWallPreview() {
    this._previewResize?.disconnect();
    this._previewResize = null;
    const screen = this.shadowRoot.querySelector(".wp-preview-screen");
    const frame = this.shadowRoot.getElementById("wpPreviewFrame");
    if (!screen || !frame) return;
    this._previewWidth = this._panelModel(this._previewPanelId()).width;
    this._previewResize = new ResizeObserver(() => {
      screen.style.setProperty("--wp-scale", String(screen.clientWidth / this._previewWidth));
    });
    this._previewResize.observe(screen);
    this.shadowRoot.getElementById("wpPreviewPanel")?.addEventListener("change", (ev) => {
      this._showPreviewPanel(ev.target.value);
    });
    this.shadowRoot.getElementById("wpPreviewReload")?.addEventListener("click", () => {
      frame.src = this._wallPreviewSrc(this._previewPanelId());
    });
    // Picking a model in the form resizes the preview straight away when it's the panel on show.
    this.shadowRoot.getElementById("wpModel")?.addEventListener("change", (ev) => {
      const formId = String(this.shadowRoot.getElementById("wpId")?.value || "").trim().toLowerCase().replace(/\s+/g, "-");
      if (formId && formId === this._previewPanelId()) this._applyPreviewModel(wallModel(ev.target.value));
    });
    this.shadowRoot.getElementById("wpPreviewTaps")?.addEventListener("change", (ev) => {
      this._previewTaps = ev.target.checked;
      const label = ev.target.closest(".wp-preview-taps");
      label.classList.toggle("live", this._previewTaps);
      label.lastChild.textContent = this._previewTaps
        ? " Taps are live — they change the real heating"
        : " Allow taps (controls the real heating)";
      let shield = screen.querySelector(".wp-preview-shield");
      if (this._previewTaps) shield?.remove();
      else if (!shield) {
        shield = document.createElement("div");
        shield.className = "wp-preview-shield";
        shield.title = "View only — tick Allow taps to use it";
        screen.appendChild(shield);
      }
    });
    // A missing wall app would otherwise show HA's bare 404 page inside the frame.
    fetch(WALL_APP_URL, { method: "HEAD", cache: "no-store" })
      .then((res) => {
        if (res.ok) return;
        const stage = this.shadowRoot.querySelector(".wp-preview-stage");
        if (stage) {
          stage.innerHTML = `<p class="muted wp-preview-missing">The wall app is missing from this Neat install — nothing at <code>${WALL_APP_URL}</code>.</p>`;
        }
      })
      .catch(() => {});
  }

  _loadWallPanelIntoForm(panel) {
    if (!panel) return;
    if (panel.id !== this._previewPanelId()) this._showPreviewPanel(panel.id);
    const cards = this.shadowRoot.querySelectorAll(".wp-card");
    cards.forEach((c) => c.classList.toggle("selected", cards.length > 1 && c.dataset.id === panel.id));
  }

  async _mountWallPickers() {
    if (this._view !== "wall_panels" || !this._hass) return;
    const gen = ++this._wallPickerMountGen;
    const hosts = [...(this.shadowRoot?.querySelectorAll("[data-wall-picker]") || [])];
    if (!hosts.length) return;
    for (const host of hosts) {
      if (!host.querySelector("ha-entity-picker")) {
        host.innerHTML = `<p class="entity-picker-loading">Loading entity picker…</p>`;
      }
    }
    try {
      await ensureHaEntityPickerLoaded();
    } catch (err) {
      if (gen !== this._wallPickerMountGen) return;
      for (const host of hosts) {
        host.innerHTML = `<p class="entity-picker-error">${this._escape(err?.message || "Entity picker unavailable")}</p>`;
      }
      return;
    }
    if (gen !== this._wallPickerMountGen || this._view !== "wall_panels") return;

    const mountSingle = (key, { domains, filter, label }) => {
      const host = this.shadowRoot.querySelector(`[data-wall-picker="${key}"]`);
      if (!host) return;
      let picker = host.querySelector("ha-entity-picker");
      if (!picker) {
        host.replaceChildren();
        picker = document.createElement("ha-entity-picker");
        picker.setAttribute("allow-custom-entity", "");
        if (this._hass.userData?.showEntityIdPicker) picker.setAttribute("show-entity-id", "");
        void label; // the dialog's own field label is enough
        picker.includeDomains = domains;
        if (filter) picker.entityFilter = filter;
        picker.addEventListener("value-changed", (ev) => {
          this._wallDraft[key] = ev.detail?.value || "";
          if (key === "primary") this._updateWallPrimaryNote();
        });
        host.appendChild(picker);
      }
      picker.hass = this._hass;
      const value = this._wallDraft[key] || "";
      if (picker.value !== value) picker.value = value || undefined;
    };

    mountSingle("primary", { domains: ["climate"], label: "Primary climate" });
    mountSingle("insideTemp", {
      domains: ["sensor"],
      filter: temperatureSensorFilter,
      label: "Inside temperature",
    });
    mountSingle("outsideTemp", {
      domains: ["sensor"],
      filter: temperatureSensorFilter,
      label: "Outside temperature",
    });
    mountSingle("humidity", {
      domains: ["sensor"],
      filter: humiditySensorFilter,
      label: "Humidity",
    });
    mountSingle("weather", { domains: ["weather"], label: "Weather" });
    this._updateWallPrimaryNote();
  }

  _readWallPickerValues() {
    for (const key of ["primary", "insideTemp", "outsideTemp", "humidity", "weather"]) {
      const picker = this.shadowRoot.querySelector(`[data-wall-picker="${key}"] ha-entity-picker`);
      if (picker?.value != null) this._wallDraft[key] = String(picker.value || "");
    }
    return this._wallDraft;
  }

  async _mountSettingsPickers() {
    if (this._view !== "settings" || !this._hass) return;
    const gen = ++this._settingsPickerMountGen;
    const hosts = [...(this.shadowRoot?.querySelectorAll("[data-settings-picker]") || [])];
    if (!hosts.length) return;
    for (const host of hosts) {
      if (!host.querySelector("ha-entity-picker")) {
        host.innerHTML = `<p class="entity-picker-loading">Loading entity picker…</p>`;
      }
    }
    try {
      await ensureHaEntityPickerLoaded();
    } catch (err) {
      if (gen !== this._settingsPickerMountGen) return;
      for (const host of hosts) {
        host.innerHTML = `<p class="entity-picker-error">${this._escape(err?.message || "Entity picker unavailable")}</p>`;
      }
      return;
    }
    if (gen !== this._settingsPickerMountGen || this._view !== "settings") return;
    const draft = this._settingsDraft;

    const makePicker = (host, { domains, filter, placeholder }) => {
      host.replaceChildren();
      const picker = document.createElement("ha-entity-picker");
      picker.setAttribute("allow-custom-entity", "");
      if (this._hass.userData?.showEntityIdPicker) picker.setAttribute("show-entity-id", "");
      picker.includeDomains = domains;
      if (filter) picker.entityFilter = filter;
      if (placeholder) picker.placeholder = placeholder;
      picker.hass = this._hass;
      host.appendChild(picker);
      return picker;
    };

    // Single entities: the picker is the value.
    const single = (key, opts) => {
      const host = this.shadowRoot.querySelector(`[data-settings-picker="${key}"]`);
      if (!host) return;
      const picker = host.querySelector("ha-entity-picker") || makePicker(host, opts);
      picker.addEventListener("value-changed", (ev) => {
        draft[key] = ev.detail?.value || "";
      });
      picker.hass = this._hass;
      picker.value = draft[key] || undefined;
    };

    // Lists (presence, windows): our own list above an "add" picker that empties after each pick.
    const list = (key, opts) => {
      const host = this.shadowRoot.querySelector(`[data-settings-picker="${key}"]`);
      if (!host) return;
      const picker = host.querySelector("ha-entity-picker") || makePicker(host, opts);
      picker.hass = this._hass;
      picker.value = undefined;
      picker.addEventListener("value-changed", (ev) => {
        const id = ev.detail?.value;
        if (!id) return;
        if (!draft[key].includes(id)) draft[key] = [...draft[key], id];
        this._refreshSettingsList(key);
        // Clear for the next pick (after HA's own update settles).
        setTimeout(() => (picker.value = undefined), 0);
      });
    };

    single("heater", { domains: ["switch", "input_boolean", "climate"] });
    single("temperature_sensor", { domains: ["sensor"], filter: temperatureSensorFilter });
    single("outdoor_temp_sensor", { domains: ["sensor"], filter: temperatureSensorFilter });
    list("presence_entities", { domains: ["person", "device_tracker"], placeholder: "Add a person or tracker" });
    list("window_sensors", { domains: ["binary_sensor"], placeholder: "Add a window or door sensor" });
  }

  _readSettingsPickerValues() {
    // Pickers write into the draft as they change; lists are only ever edited in the draft.
    return this._settingsDraft || this._settingsDraftFromCfg();
  }

  _settingsDraftFromCfg() {
    const cfg = this._cfg();
    const presence = [...(cfg.presence_entities || [])];
    if (cfg.person_entity && !presence.includes(cfg.person_entity)) presence.unshift(cfg.person_entity);
    return {
      heater: cfg.heater || "",
      temperature_sensor: cfg.temperature_sensor || "",
      outdoor_temp_sensor: cfg.outdoor_temp_sensor || "",
      window_sensors: [...(cfg.window_sensors || [])],
      presence_entities: presence,
    };
  }

  /** Settings list for a draft key, with an empty-state line. */
  _renderSettingsList(key) {
    const ids = this._settingsDraft?.[key] || [];
    const presence = key === "presence_entities";
    if (!ids.length) {
      return `<p class="set-list-empty">${presence ? "Nobody added yet — Away mode is off until you add someone." : "No sensors added."}</p>`;
    }
    return this._renderEntityRows(ids, presence ? "presence" : "window", key);
  }

  /** One row per entity: picture/initial or icon, name, live state, remove. mode: presence | window | sensor. */
  _renderEntityRows(ids, mode, removeKey) {
    const presence = mode === "presence";
    return ids
      .map((id) => {
        const st = this._entityState(id);
        const name = st?.attributes?.friendly_name || id;
        let stateText = st ? st.state : "missing";
        let tone = "";
        if (!st || st.state === "unavailable" || st.state === "unknown") tone = "bad";
        else if (presence) {
          tone = st.state === "home" ? "good" : "away";
          stateText = st.state === "home" ? "Home" : st.state === "not_home" ? "Away" : st.state;
        } else if (mode === "window") {
          tone = st.state === "on" ? "warn" : "good";
          stateText = st.state === "on" ? "Open" : "Closed";
        } else {
          stateText = `${st.state}${st.attributes?.unit_of_measurement || ""}`;
        }
        const pic = st?.attributes?.entity_picture;
        const avatar = presence
          ? pic
            ? `<img class="set-avatar" src="${this._escape(pic)}" alt="" />`
            : `<span class="set-avatar">${this._escape(String(name).trim().charAt(0).toUpperCase() || "?")}</span>`
          : `<span class="set-avatar icon">${mode === "window" ? ICONS.window : ICONS.thermo}</span>`;
        return `
          <div class="set-list-item">
            ${avatar}
            <div class="set-list-text">
              <div class="set-list-name">${this._escape(name)}</div>
              <code>${this._escape(id)}</code>
            </div>
            <span class="set-state ${tone}">${this._escape(stateText)}</span>
            <button type="button" class="set-remove" data-remove-key="${removeKey}" data-remove-id="${this._escape(id)}" aria-label="Remove ${this._escape(name)}" title="Remove">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>`;
      })
      .join("");
  }

  _refreshSettingsList(key) {
    const box = this.shadowRoot.querySelector(`[data-settings-list="${key}"]`);
    if (box) box.innerHTML = this._renderSettingsList(key);
    const count = this.shadowRoot.querySelector(`[data-settings-count="${key}"]`);
    if (count) count.textContent = String((this._settingsDraft?.[key] || []).length);
  }

  _renderSettings() {
    // Building the form before the config arrives would save blanks over the real settings.
    if (!this._state?.config) {
      return `${this._pageHeader("Settings", "How Neat heats your home.")}<p class="muted">Loading settings…</p>`;
    }
    const cfg = this._cfg();
    if (!this._settingsDraft) this._settingsDraft = this._settingsDraftFromCfg();
    const row = (name, desc, control) => `
      <div class="set-row">
        <div class="set-row-text"><div class="set-row-name">${name}</div>${desc ? `<div class="set-row-desc">${desc}</div>` : ""}</div>
        <div class="set-row-control">${control}</div>
      </div>`;
    const toggle = (id, on) => `<label class="switch"><input type="checkbox" id="${id}" ${on ? "checked" : ""} /><span></span></label>`;
    const num = (id, value, unit, attrs = "") =>
      `<div class="num-input"><input id="${id}" type="number" value="${this._escape(value)}" ${attrs} />${unit ? `<span>${unit}</span>` : ""}</div>`;
    const head = (icon, cls, title, sub, extra = "") => `
      <div class="card-head">
        <span class="card-icon ${cls}">${icon}</span>
        <div class="card-head-text"><p class="card-title">${title}</p><p class="card-sub">${sub}</p></div>
        ${extra}
      </div>`;
    const field = (label, key, hint) => `
      <div class="set-field">
        <div class="set-field-label">${label}</div>
        <div class="entity-picker-host" data-settings-picker="${key}"></div>
        ${hint ? `<div class="set-row-desc">${hint}</div>` : ""}
      </div>`;
    const count = (key) => `<span class="badge" data-settings-count="${key}">${(this._settingsDraft[key] || []).length}</span>`;

    return `
      ${this._pageHeader("Settings", "How Neat heats your home.")}
      <div class="card">
        ${head(flameSvg(), "heat", "Heating devices", "The relay Neat switches and the sensors it heats to.")}
        <div class="set-fields">
          ${field("Boiler relay", "heater", "Changing it turns the old relay off first.")}
          ${field("House temperature", "temperature_sensor", "The temperature Neat heats the house to.")}
          ${field("Outdoor temperature", "outdoor_temp_sensor", "Optional — used by Adaptive Comfort.")}
        </div>
      </div>
      <div class="ov-grid">
        <div class="card">
          ${head(ICONS.people, "intel", "Presence", "Who lives here. Neat switches to Away once everyone has left.", count("presence_entities"))}
          <div class="set-list" data-settings-list="presence_entities">${this._renderSettingsList("presence_entities")}</div>
          <div class="entity-picker-host set-add" data-settings-picker="presence_entities"></div>
          ${row("Away delay", "How long everyone must be gone before Away (Eco) starts.", num("awayDelay", cfg.away_delay_minutes ?? 20, "min", 'min="0" max="180" step="5"'))}
        </div>
        <div class="card">
          ${head(ICONS.window, "", "Windows & doors", "While any of these is open, the house stops calling for heat.", count("window_sensors"))}
          <div class="set-list" data-settings-list="window_sensors">${this._renderSettingsList("window_sensors")}</div>
          <div class="entity-picker-host set-add" data-settings-picker="window_sensors"></div>
        </div>
      </div>
      <div class="ov-grid">
        <div class="card">
          ${head(ICONS.tune, "", "Temperatures & modes", "Setpoints for each preset.")}
          ${row("Eco", "Energy-saving setpoint.", num("ecoTemp", cfg.eco_temp ?? 16, "°C", 'step="0.5"'))}
          ${row("Boost", "Quick warm-up setpoint.", num("boostTemp", cfg.boost_temp ?? 22, "°C", 'step="0.5"'))}
          ${row("Away", "Used while everyone is out.", num("awayTemp", cfg.away_temp ?? 15, "°C", 'step="0.5"'))}
          ${row("Summer mode", "Never calls for heat (the safety floor still applies).", toggle("summerMode", cfg.summer_mode))}
        </div>
        <div class="card">
          ${head(ICONS.sparkle, "intel", "Neat Intelligence", "Learning and comfort features for the house.")}
          ${row("True Radiant", "Starts heating early so it's warm when a schedule block begins.", toggle("trueRadiant", cfg.true_radiant !== false))}
          ${row("Auto-Schedule", "Learns schedule changes from your manual adjustments.", toggle("autoSchedule", cfg.auto_schedule))}
          ${row("Leaf coaching", "Shows the leaf when you're saving energy.", toggle("leafEnabled", cfg.leaf_enabled !== false))}
          ${row("Seasonal Savings", "Gently lowers comfort over 21 days.", toggle("seasonalSavings", cfg.seasonal_savings))}
          ${row("Adaptive Comfort", "Nudges Eco using the outdoor temperature.", toggle("adaptiveComfort", cfg.adaptive_comfort))}
        </div>
      </div>
      <div class="ov-grid">
        <div class="card">
          ${head(ICONS.shield, "warn", "Safety temperature", "Frost and pipe protection.")}
          ${row("Enabled", "Forces heat even in Away, Eco or Off if the house gets this cold.", toggle("safetyEnabled", cfg.safety_temp_enabled !== false))}
          ${row("Minimum house temperature", "", num("safetyMin", cfg.safety_min_temp ?? 7, "°C", 'step="0.5" min="5" max="12"'))}
          ${row("Wall panel PIN", "Unlocks NSPanels that have Temperature lock on.", `<div class="num-input"><input id="wallPin" type="password" inputmode="numeric" maxlength="4" value="${this._escape(cfg.wall_pin || "")}" placeholder="••••" /></div>`)}
        </div>
        <div class="card">
          ${head(ICONS.gauge, "", "Boiler behaviour", "Fine-tuning. The defaults suit most homes.")}
          ${row("Cold tolerance", "Heat starts this far below the target.", num("coldTol", cfg.cold_tolerance ?? 0.3, "°C", 'step="0.1" min="0"'))}
          ${row("Hot tolerance", "Heat stops this far above the target.", num("hotTol", cfg.hot_tolerance ?? 0.3, "°C", 'step="0.1" min="0"'))}
          ${row("Minimum on time", "Shortest boiler run.", num("minOnMin", cfg.min_on_minutes ?? 1, "min", 'step="1" min="0" max="30"'))}
          ${row("Minimum off time", "Shortest rest between runs.", num("minOffMin", cfg.min_off_minutes ?? 1, "min", 'step="1" min="0" max="30"'))}
        </div>
      </div>
      <div class="save-bar">
        <span class="muted">Changes apply when you save.</span>
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
              <div class="panel-brand-mark" aria-hidden="true">${logoSvg()}</div>
              <div>
                <div class="panel-brand-title">Neat Thermostat</div>
                <div class="panel-brand-sub">Intelligent Heating Control</div>
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
      ${this._renderDialog()}
    `;
    this._bind();
    this._bindWallPreview();
    if (this._view === "wall_panels") this._bindKioskCard();
    this._bindRoomDrag();
    this._layoutEnergyBubbles();
    // Overview re-renders every few seconds; keep the Entities section as the user left it.
    this.shadowRoot.getElementById("ovEntities")?.addEventListener("toggle", (ev) => {
      this._entitiesOpen = ev.target.open;
    });
    if (this._view === "rooms") {
      void this._mountRoomPickers();
    }
    if (this._view === "wall_panels") {
      void this._mountWallPickers();
    }
    if (this._view === "settings") {
      void this._mountSettingsPickers();
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

    const heroCall = async (service, data, label) => {
      const home = this._neatClimateEntities().home;
      if (!home) {
        this._showToast("Neat's house thermostat isn't available", "err");
        return;
      }
      try {
        await this._hass.callService("climate", service, { entity_id: home, ...data });
        // The entity updates straight away; redraw once HA has pushed it.
        setTimeout(() => this._render(), 250);
        this._showToast(label);
      } catch (e) {
        this._showToast(`Couldn't change it: ${e?.message || e}`, "err");
      }
    };
    this.shadowRoot.querySelectorAll("[data-hero-hvac]").forEach((btn) => {
      btn.addEventListener("click", () =>
        heroCall("set_hvac_mode", { hvac_mode: btn.dataset.heroHvac }, btn.dataset.heroHvac === "off" ? "Heating off" : "Heating on")
      );
    });
    this.shadowRoot.querySelectorAll("[data-hero-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const current = this._entityState(this._neatClimateEntities().home)?.attributes?.preset_mode;
        const next = current === btn.dataset.heroPreset ? "none" : btn.dataset.heroPreset;
        heroCall("set_preset_mode", { preset_mode: next }, next === "none" ? "Preset cleared" : `${next[0].toUpperCase() + next.slice(1)} on`);
      });
    });
    this.shadowRoot.querySelectorAll(".dial-step").forEach((btn) => {
      btn.addEventListener("click", () => this._stepTarget(Number(btn.dataset.step)));
    });
    this.shadowRoot.querySelectorAll("[data-zone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this._suppressZoneClick) return; // the click that ends a drag
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
        const devices = this._readSettingsPickerValues();
        if (!devices.heater || !devices.temperature_sensor) {
          this._showToast("Pick a boiler relay and a house temperature sensor", "err");
          return;
        }
        try {
          await this._ws("neat_thermostat/update_settings", {
            heater: devices.heater,
            temperature_sensor: devices.temperature_sensor,
            outdoor_temp_sensor: devices.outdoor_temp_sensor || "",
            window_sensors: devices.window_sensors || [],
            presence_entities: devices.presence_entities || [],
            // Presence picker now holds everyone; clear the old single-person field.
            person_entity: "",
            eco_temp: Number(this.shadowRoot.getElementById("ecoTemp").value),
            boost_temp: Number(this.shadowRoot.getElementById("boostTemp").value),
            away_temp: Number(this.shadowRoot.getElementById("awayTemp").value),
            cold_tolerance: Number(this.shadowRoot.getElementById("coldTol").value),
            hot_tolerance: Number(this.shadowRoot.getElementById("hotTol").value),
            min_on_minutes: Number(this.shadowRoot.getElementById("minOnMin").value),
            min_off_minutes: Number(this.shadowRoot.getElementById("minOffMin").value),
            summer_mode: this.shadowRoot.getElementById("summerMode").checked,
            true_radiant: this.shadowRoot.getElementById("trueRadiant").checked,
            auto_schedule: this.shadowRoot.getElementById("autoSchedule").checked,
            leaf_enabled: this.shadowRoot.getElementById("leafEnabled").checked,
            seasonal_savings: this.shadowRoot.getElementById("seasonalSavings").checked,
            adaptive_comfort: this.shadowRoot.getElementById("adaptiveComfort").checked,
            safety_temp_enabled: this.shadowRoot.getElementById("safetyEnabled").checked,
            safety_min_temp: Number(this.shadowRoot.getElementById("safetyMin").value),
            wall_pin: this.shadowRoot.getElementById("wallPin").value.trim(),
            away_delay_minutes: Number(this.shadowRoot.getElementById("awayDelay").value),
          });
          this._settingsDraft = null;
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
        this._roomDraft.name = name;
        const draft = this._readRoomPickerValues();
        const trv = String(draft.trv || "").trim();
        const sensor = String(draft.sensor || "").trim();
        const extras = (draft.extras || []).map((s) => String(s).trim()).filter(Boolean);
        const callsForHeat = this.shadowRoot.getElementById("roomCallsForHeat")?.checked !== false;
        if (!name || !trv) {
          this._error = "Room name and TRV required";
          this._showToast(this._error, "err");
          return;
        }
        const existing = this._editingRoomId
          ? (this._cfg().rooms || []).find((r) => r.id === this._editingRoomId)
          : null;
        const id =
          existing?.id ||
          name
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "");
        const rooms = [...(this._cfg().rooms || [])];
        // Replace in place (keeps the user's room order); new rooms go at the end.
        const at = rooms.findIndex((r) => r.id === id);
        const room = {
          id,
          name,
          trv_entity: trv,
          temperature_sensor: sensor,
          extra_temperature_sensors: extras,
          enabled: existing?.enabled !== false,
          calls_for_heat: callsForHeat,
          target_temp: existing?.target_temp,
          eco_temp: existing?.eco_temp,
          boost_temp: existing?.boost_temp,
          window_sensors: existing?.window_sensors || [],
        };
        if (at >= 0) rooms[at] = room;
        else rooms.push(room);
        try {
          await this._ws("neat_thermostat/update_rooms", { rooms });
          this._dialogKind = null;
          this._editingRoomId = null;
          this._roomDraft = { name: "", trv: "", sensor: "", extras: [], calls_for_heat: true };
          await this._loadState();
          this._showToast(`Room ${name} saved`);
        } catch (e) {
          this._error = String(e.message || e);
          this._showToast(this._error, "err");
          this._render();
        }
      });


      this.shadowRoot.getElementById("deleteRoom")?.addEventListener("click", async () => {
        const id = this._editingRoomId;
        if (!id) return;
        const room = (this._cfg().rooms || []).find((r) => r.id === id);
        if (!window.confirm(`Delete room “${room?.name || id}”?`)) return;
        const rooms = (this._cfg().rooms || []).filter((r) => r.id !== id);
        try {
          await this._ws("neat_thermostat/update_rooms", { rooms });
          this._dialogKind = null;
          this._editingRoomId = null;
          this._roomDraft = { name: "", trv: "", sensor: "", extras: [], calls_for_heat: true };
          await this._loadState();
          this._showToast("Room deleted");
        } catch (e) {
          this._error = String(e.message || e);
          this._showToast(this._error, "err");
          this._render();
        }
      });

      this.shadowRoot.getElementById("roomCallsForHeat")?.addEventListener("change", (ev) => {
        this._roomDraft.calls_for_heat = ev.target.checked;
      });
    }

    if (this._view === "wall_panels") {
      const open = (id) => this._openWallDialog(id ? (this._cfg().wall_panels || []).find((p) => p.id === id) : null);
      this.shadowRoot.getElementById("addWallPanel")?.addEventListener("click", () => open(null));
      this.shadowRoot.getElementById("addWallPanelEmpty")?.addEventListener("click", () => open(null));
      this.shadowRoot.querySelectorAll(".edit-panel").forEach((btn) =>
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          open(btn.dataset.id);
        })
      );
      this.shadowRoot.querySelectorAll(".wp-card[data-id]").forEach((card) => {
        const show = () => this._loadWallPanelIntoForm((this._cfg().wall_panels || []).find((p) => p.id === card.dataset.id));
        card.addEventListener("click", show);
        card.addEventListener("keydown", (ev) => {
          if (ev.target !== card || (ev.key !== "Enter" && ev.key !== " ")) return;
          ev.preventDefault();
          show();
        });
      });
    }
    if (this._view === "rooms") {
      this.shadowRoot.getElementById("addRoom")?.addEventListener("click", () => this._loadRoomIntoForm(null));
      this.shadowRoot.getElementById("addRoomEmpty")?.addEventListener("click", () => this._loadRoomIntoForm(null));
      this.shadowRoot.querySelectorAll(".room-card[data-room-id]").forEach((card) => {
        const open = () => this._loadRoomIntoForm((this._cfg().rooms || []).find((r) => r.id === card.dataset.roomId));
        card.addEventListener("click", (ev) => {
          if (this._suppressZoneClick || ev.target.closest(".switch")) return;
          open();
        });
        card.addEventListener("keydown", (ev) => {
          if (ev.target !== card || (ev.key !== "Enter" && ev.key !== " ")) return;
          ev.preventDefault();
          open();
        });
      });
      this.shadowRoot.querySelectorAll("[data-toggle-calls]").forEach((btn) => {
        btn.addEventListener("change", async () => {
          const id = btn.dataset.toggleCalls;
          const rooms = (this._cfg().rooms || []).map((r) =>
            r.id === id ? { ...r, calls_for_heat: btn.checked } : { ...r }
          );
          try {
            await this._ws("neat_thermostat/update_rooms", { rooms });
            await this._loadState();
            const next = rooms.find((r) => r.id === id);
            this._showToast(`Call for heat ${next?.calls_for_heat !== false ? "On" : "Off"} for ${next?.name || id}`);
          } catch (e) {
            this._showToast(String(e.message || e), "err");
            this._render();
          }
        });
      });
    }

    const saveWall = this.shadowRoot.getElementById("saveWallPanel");
    if (saveWall) {
      saveWall.addEventListener("click", async () => {
        const id = slugId(this.shadowRoot.getElementById("wpId").value);
        const label = this.shadowRoot.getElementById("wpLabel").value.trim() || id;
        if (!id) {
          this._showToast("Give the panel a name", "err");
          return;
        }
        if (!this._wallEditingId && (this._cfg().wall_panels || []).some((p) => p.id === id)) {
          this._showToast(`A panel with ID “${id}” already exists`, "err");
          return;
        }
        const draft = this._readWallPickerValues();
        // Blank = Neat's house climate (resolved to its real entity id by the backend).
        const primary = String(draft.primary || "").trim();
        const idleSec = Number(this.shadowRoot.getElementById("wpIdle").value) || 30;
        // Empty rooms list = wall UI always loads the live Neat room list
        const rooms = [];
        try {
          await this._ws("neat_thermostat/upsert_wall_panel", {
            panel: {
              id,
              label,
              primary_entity: primary,
              rooms,
              sensors: {
                insideTemp: String(draft.insideTemp || "").trim(),
                outsideTemp: String(draft.outsideTemp || "").trim(),
                insideHumidity: String(draft.humidity || "").trim(),
                weather: String(draft.weather || "").trim() || "weather.home",
                sun: "sun.sun",
              },
              display: { idleMs: idleSec * 1000, panelEntity: "" },
              temperature_lock: Boolean(this.shadowRoot.getElementById("wpLock")?.checked),
              model: wallModel(this.shadowRoot.getElementById("wpModel")?.value).id,
              ...(this.shadowRoot.getElementById("wpKioskDevice")
                ? {
                    kiosk_device: this.shadowRoot.getElementById("wpKioskDevice").value,
                    kiosk_overrides: this._readKioskControls("ko_"),
                  }
                : {
                    kiosk_device: this._wallDraft.kioskDevice || "",
                    kiosk_overrides: this._wallDraft.kioskOverrides || {},
                  }),
            },
          });
          this._previewPanel = id;
          this._dialogKind = null;
          this._wallEditingId = null;
          await this._loadState();
          await this._loadKiosk();
          this._showToast(`Wall panel ${label} saved`);
        } catch (e) {
          this._error = String(e.message || e);
          this._showToast(this._error, "err");
          this._render();
        }
      });
      this.shadowRoot.getElementById("deleteWallPanel")?.addEventListener("click", async () => {
        const id = this._wallEditingId;
        const panel = (this._cfg().wall_panels || []).find((p) => p.id === id);
        if (!id || !window.confirm(`Delete wall panel “${panel?.label || id}”? The device will need setting up again.`)) return;
        try {
          await this._ws("neat_thermostat/delete_wall_panel", { panel_id: id });
          this._dialogKind = null;
          this._wallEditingId = null;
          await this._loadState();
          this._showToast("Wall panel deleted");
        } catch (e) {
          this._showToast(String(e.message || e), "err");
        }
      });
      // New panel: the ID follows the name until the user types their own.
      const wpId = this.shadowRoot.getElementById("wpId");
      const wpLabel = this.shadowRoot.getElementById("wpLabel");
      wpLabel?.addEventListener("input", () => {
        this._wallDraft.label = wpLabel.value;
        if (!this._wallEditingId && !this._wallIdTouched && wpId) wpId.value = slugId(wpLabel.value);
      });
      wpId?.addEventListener("input", () => {
        this._wallIdTouched = Boolean(wpId.value);
      });
    }
  }
}

const versionTag = `neat-thermostat-panel-${PANEL_VERSION.replaceAll(".", "_")}`;
if (!customElements.get(versionTag)) {
  customElements.define(versionTag, NeatThermostatPanel);
}
// Plain alias. A class can only be registered once per page, so it needs its own subclass
// (re-using NeatThermostatPanel threw "this constructor has already been used").
if (!customElements.get("neat-thermostat-panel")) {
  customElements.define("neat-thermostat-panel", class extends NeatThermostatPanel {});
}
