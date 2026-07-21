/**
 * Neat Thermostat — HA sidebar panel (Fox Plant–style shell).
 * Horizontal tab nav + HA theme tokens (no custom blue scheme).
 * @version 0.1.1
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
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const PANEL_VERSION = "0.1.1";

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
}
.shell {
  position: relative;
  display: block;
  min-height: 100%;
  background: var(--primary-background-color);
}
.page-header {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--divider-color);
  background: var(--app-header-background-color, var(--primary-background-color));
}
.panel-header-top {
  display: flex;
  align-items: flex-start;
}
.panel-ha-menu-btn {
  display: none;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin: 8px 0 0 4px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--primary-text-color);
  cursor: pointer;
}
.panel-ha-menu-btn:hover {
  background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
}
:host(.narrow) .panel-ha-menu-btn,
.shell.narrow .panel-ha-menu-btn {
  display: inline-flex;
}
@media (max-width: 870px) {
  .panel-ha-menu-btn { display: inline-flex; }
  .panel-brand-row { padding: 12px 12px 4px 0; }
}
.panel-brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 12px 16px 4px;
}
.panel-brand-mark {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, rgba(25,212,222,0.22), rgba(8,151,156,0.12));
  color: var(--nt-accent-hi);
  font-size: 20px;
  font-weight: 700;
}
.panel-brand-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--primary-text-color);
}
.panel-brand-sub {
  font-size: 12px;
  color: var(--secondary-text-color);
  margin-top: 2px;
}
.tab-bar {
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 0 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.tab-bar::-webkit-scrollbar { display: none; }
.tab {
  flex-shrink: 0;
  padding: 14px 20px 12px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--secondary-text-color);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.tab:hover { color: var(--primary-text-color); }
.tab.active {
  color: var(--primary-text-color);
  font-weight: 600;
  border-bottom-color: var(--primary-text-color);
}
.shell.narrow .tab { padding: 12px 14px 10px; font-size: 13px; }
.main { display: block; width: 100%; }
.main-inner {
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 20px 24px 48px;
  box-sizing: border-box;
}
.shell.narrow .main-inner { padding: 16px; }
.header { margin-bottom: 18px; }
.header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.header p {
  margin: 6px 0 0;
  color: var(--secondary-text-color);
  font-size: 14px;
}
.card {
  background: var(--card-background-color);
  border-radius: var(--nt-radius);
  padding: 18px 20px;
  margin-bottom: 14px;
  box-shadow: var(--ha-card-box-shadow, 0 1px 2px rgba(0,0,0,0.08));
  border: 1px solid var(--divider-color, transparent);
}
.card-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--secondary-text-color);
  margin: 0 0 14px;
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.stat {
  background: var(--card-background-color);
  border-radius: var(--nt-radius);
  padding: 16px 18px;
  border: 1px solid var(--divider-color, transparent);
  box-shadow: var(--ha-card-box-shadow, 0 1px 2px rgba(0,0,0,0.06));
  position: relative;
  overflow: hidden;
}
.stat::before {
  content: "";
  position: absolute;
  left: 0; top: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--nt-accent-hi), var(--nt-accent));
}
.stat .label {
  font-size: 12px;
  color: var(--secondary-text-color);
  margin-bottom: 6px;
  font-weight: 500;
}
.stat .value {
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--primary-text-color);
}
.stat.ok .value { color: var(--nt-green); }
.stat.warn .value { color: var(--nt-amber); }
.stat.heat::before {
  background: linear-gradient(90deg, #FA8C16, #08979C);
}
.row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: end;
  margin-bottom: 12px;
}
label.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--secondary-text-color);
  min-width: 140px;
  flex: 1;
}
input, select, textarea {
  font-family: inherit;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--divider-color);
  background: var(--card-background-color);
  color: var(--primary-text-color);
  box-sizing: border-box;
  width: 100%;
}
input:disabled {
  opacity: 0.65;
}
button.primary, button.secondary, button.danger {
  border: 0;
  border-radius: 10px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
}
button.primary {
  background: linear-gradient(90deg, var(--nt-accent-hi), var(--nt-accent));
  color: #041018;
}
button.primary:hover { filter: brightness(1.05); }
button.secondary {
  background: var(--secondary-background-color, color-mix(in srgb, var(--primary-text-color) 8%, transparent));
  color: var(--primary-text-color);
}
button.danger {
  background: color-mix(in srgb, var(--nt-red) 18%, transparent);
  color: var(--nt-red);
}
button.compact { padding: 6px 10px; font-size: 12px; }
table.data {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
table.data th, table.data td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--divider-color);
}
table.data th {
  color: var(--secondary-text-color);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.banner {
  padding: 10px 14px;
  border-radius: 10px;
  margin-bottom: 14px;
  font-size: 13px;
}
.banner.err {
  background: color-mix(in srgb, var(--nt-red) 14%, transparent);
  color: var(--nt-red);
}
.banner.ok {
  background: color-mix(in srgb, var(--nt-accent) 14%, transparent);
  color: var(--nt-accent);
}
.schedule-day { margin-bottom: 8px; }
.schedule-day h3 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-text-color);
  display: flex;
  align-items: center;
  gap: 10px;
}
.block-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.block-head {
  font-size: 11px;
  color: var(--secondary-text-color);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.panel-list { display: grid; gap: 10px; }
.panel-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--divider-color);
  background: var(--secondary-background-color, transparent);
}
.panel-item strong { font-size: 15px; }
.muted { color: var(--secondary-text-color); font-size: 12px; }
code {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.92em;
  padding: 1px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
}
.panel-build-footer {
  position: absolute;
  right: 12px;
  bottom: 8px;
  font-size: 9px;
  color: var(--secondary-text-color);
  opacity: 0.42;
  pointer-events: none;
}
`;

class NeatThermostatPanel extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._narrow = false;
    this._view = "overview";
    this._state = null;
    this._selectedRoom = null;
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
      if (!this._selectedRoom && this._state?.config?.rooms?.length) {
        this._selectedRoom = this._state.config.rooms[0].id;
      }
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

  _pageHeader(title, lead) {
    return `<div class="header"><h1>${title}</h1><p>${lead}</p></div>`;
  }

  _renderOverview() {
    const live = this._live();
    const cfg = this._cfg();
    const main = live.main || {};
    const target = main.target ?? cfg.target_temp ?? "—";
    return `
      ${this._pageHeader("Overview", "House climate and boiler demand.")}
      <div class="stats-row">
        <div class="stat"><div class="label">Mode</div><div class="value">${this._escape(main.hvac_mode || "—")}</div></div>
        <div class="stat"><div class="label">Preset</div><div class="value">${this._escape(main.preset || "none")}</div></div>
        <div class="stat"><div class="label">Target</div><div class="value">${this._escape(target)}°</div></div>
        <div class="stat ${live.boiler_on ? "ok heat" : ""}"><div class="label">Boiler</div><div class="value">${live.boiler_on ? "On" : "Off"}</div></div>
        <div class="stat ${live.window_open ? "warn" : ""}"><div class="label">Windows</div><div class="value">${live.window_open ? "Open" : "Closed"}</div></div>
        <div class="stat ${live.summer_mode ? "warn" : ""}"><div class="label">Summer</div><div class="value">${live.summer_mode ? "On" : "Off"}</div></div>
        <div class="stat ${live.away ? "warn" : ""}"><div class="label">Away</div><div class="value">${live.away ? "Yes" : "Home"}</div></div>
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

  _renderSchedule() {
    const schedule = this._cfg().schedule || {};
    const enabled = this._cfg().schedule_enabled !== false;
    const daysHtml = DAYS.map((day) => {
      const blocks = schedule[day] || [];
      const blockHtml = (blocks.length ? blocks : [{ start: "06:30", end: "08:30", temperature: 20 }])
        .map(
          (b, i) => `
        <div class="block-row" data-day="${day}" data-idx="${i}">
          <input class="b-start" value="${this._escape(b.start || "06:30")}" />
          <input class="b-end" value="${this._escape(b.end || "08:30")}" />
          <input class="b-temp" type="number" step="0.5" value="${this._escape(b.temperature ?? 20)}" />
          <button type="button" class="secondary compact b-del">✕</button>
        </div>`
        )
        .join("");
      return `<div class="card schedule-day" data-day="${day}">
        <h3>${DAY_LABELS[day]} <button type="button" class="secondary compact b-add" data-day="${day}">+ block</button></h3>
        <div class="block-row block-head"><span>Start</span><span>End</span><span>Temp</span><span></span></div>
        ${blockHtml}
      </div>`;
    }).join("");
    return `
      ${this._pageHeader("Schedule", "7-day comfort schedule for the house climate. Outside blocks, Eco temperature applies.")}
      <div class="card">
        <div class="row" style="margin:0">
          <label class="field" style="flex:0;min-width:120px">Enabled
            <select id="schedEnabled">
              <option value="true" ${enabled ? "selected" : ""}>On</option>
              <option value="false" ${!enabled ? "selected" : ""}>Off</option>
            </select>
          </label>
          <button class="primary" id="saveSchedule">Save schedule</button>
        </div>
      </div>
      ${daysHtml}
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
    return `
      ${this._pageHeader("Settings", "House-wide temperatures and modes.")}
      <div class="card">
        <p class="card-title">Temperatures</p>
        <div class="row">
          <label class="field">Eco °C<input id="ecoTemp" type="number" step="0.5" value="${this._escape(cfg.eco_temp ?? 16)}" /></label>
          <label class="field">Boost °C<input id="boostTemp" type="number" step="0.5" value="${this._escape(cfg.boost_temp ?? 22)}" /></label>
          <label class="field">Away °C<input id="awayTemp" type="number" step="0.5" value="${this._escape(cfg.away_temp ?? 15)}" /></label>
        </div>
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
          <label class="field">Person (Away)<input id="personEntity" value="${this._escape(cfg.person_entity || "")}" placeholder="person.you" /></label>
          <label class="field">Heater<input value="${this._escape(cfg.heater || "")}" disabled /></label>
          <label class="field">House sensor<input value="${this._escape(cfg.temperature_sensor || "")}" disabled /></label>
        </div>
        <button class="primary" id="saveSettings">Save settings</button>
      </div>
    `;
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
        rooms.push({
          id,
          name,
          trv_entity: trv,
          temperature_sensor: sensor,
          enabled: true,
        });
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

    const saveSchedule = this.shadowRoot.getElementById("saveSchedule");
    if (saveSchedule) {
      saveSchedule.addEventListener("click", async () => {
        const schedule = {};
        DAYS.forEach((day) => {
          schedule[day] = [];
          this.shadowRoot.querySelectorAll(`.block-row[data-day="${day}"]`).forEach((row) => {
            const start = row.querySelector(".b-start")?.value;
            const end = row.querySelector(".b-end")?.value;
            const temperature = Number(row.querySelector(".b-temp")?.value);
            if (start && end) {
              schedule[day].push({ start, end, temperature, enabled: true });
            }
          });
        });
        try {
          await this._ws("neat_thermostat/update_schedule", {
            schedule,
            schedule_enabled: this.shadowRoot.getElementById("schedEnabled").value === "true",
          });
          this._flash = "Schedule saved";
          await this._loadState();
        } catch (e) {
          this._error = String(e.message || e);
          this._render();
        }
      });
      this.shadowRoot.querySelectorAll(".b-add").forEach((btn) => {
        btn.addEventListener("click", () => {
          const day = btn.dataset.day;
          const schedule = { ...(this._cfg().schedule || {}) };
          const blocks = [...(schedule[day] || [])];
          blocks.push({ start: "18:00", end: "22:00", temperature: 20, enabled: true });
          schedule[day] = blocks;
          this._state.config.schedule = schedule;
          this._render();
        });
      });
      this.shadowRoot.querySelectorAll(".b-del").forEach((btn) => {
        btn.addEventListener("click", () => {
          const row = btn.closest(".block-row");
          const day = row.dataset.day;
          const idx = Number(row.dataset.idx);
          const schedule = { ...(this._cfg().schedule || {}) };
          const blocks = [...(schedule[day] || [])];
          blocks.splice(idx, 1);
          schedule[day] = blocks;
          this._state.config.schedule = schedule;
          this._render();
        });
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
                this.shadowRoot.getElementById("wpPrimary").value.trim() ||
                "climate.neat_home",
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
            await this._ws("neat_thermostat/delete_wall_panel", {
              panel_id: btn.dataset.id,
            });
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
