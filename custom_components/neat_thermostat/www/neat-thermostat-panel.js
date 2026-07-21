/**
 * Neat Thermostat — HA sidebar panel.
 * Views: Overview, Rooms, Schedule, Wall panels, Settings
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

class NeatThermostatPanel extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._narrow = false;
    this._view = "overview";
    this._state = null;
    this._selectedPanel = null;
    this._msgId = 1;
    this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._state) this._loadState();
    else this._render();
  }

  set narrow(n) {
    this._narrow = Boolean(n);
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
      if (!this._selectedPanel && this._state?.config?.rooms?.length) {
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
    this._render();
  }

  _escape(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  _styles() {
    return `
      :host { display:block; font-family: system-ui,Segoe UI,sans-serif; color:#e8eef5; background:#0f141a; min-height:100vh; }
      .wrap { display:flex; min-height:100vh; }
      nav { width:200px; background:#151c24; border-right:1px solid #243041; padding:16px 12px; flex-shrink:0; }
      nav h1 { font-size:15px; margin:0 0 16px; font-weight:650; letter-spacing:.02em; color:#9edcff; }
      nav button { display:block; width:100%; text-align:left; background:transparent; border:0; color:#c5d0dc; padding:10px 12px; border-radius:8px; cursor:pointer; margin-bottom:4px; font-size:14px; }
      nav button.active, nav button:hover { background:#1e2a38; color:#fff; }
      main { flex:1; padding:20px 24px 40px; overflow:auto; }
      h2 { margin:0 0 8px; font-size:22px; font-weight:650; }
      .lead { color:#93a4b5; margin:0 0 20px; font-size:14px; }
      .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-bottom:20px; }
      .card { background:#151c24; border:1px solid #243041; border-radius:12px; padding:14px 16px; }
      .card .label { color:#93a4b5; font-size:12px; margin-bottom:6px; }
      .card .value { font-size:22px; font-weight:650; }
      .card.ok .value { color:#7ddea0; }
      .card.warn .value { color:#ffb86b; }
      .row { display:flex; gap:10px; flex-wrap:wrap; align-items:end; margin-bottom:12px; }
      label { display:flex; flex-direction:column; gap:4px; font-size:12px; color:#93a4b5; min-width:140px; flex:1; }
      input, select, textarea { background:#0f141a; border:1px solid #314255; color:#e8eef5; border-radius:8px; padding:8px 10px; font-size:14px; }
      button.primary, button.secondary { border:0; border-radius:8px; padding:9px 14px; cursor:pointer; font-size:13px; font-weight:600; }
      button.primary { background:#25b1f6; color:#041018; }
      button.secondary { background:#243041; color:#e8eef5; }
      button.danger { background:#5a2430; color:#ffb4b4; border:0; border-radius:8px; padding:9px 14px; cursor:pointer; }
      table { width:100%; border-collapse:collapse; font-size:13px; }
      th, td { text-align:left; padding:8px 10px; border-bottom:1px solid #243041; }
      th { color:#93a4b5; font-weight:600; }
      .err { background:rgba(255,92,92,.12); color:#ffb4b4; padding:10px 12px; border-radius:8px; margin-bottom:12px; }
      .okmsg { background:rgba(37,177,246,.12); color:#9edcff; padding:10px 12px; border-radius:8px; margin-bottom:12px; }
      .schedule-day { margin-bottom:16px; }
      .schedule-day h3 { margin:0 0 8px; font-size:14px; color:#9edcff; }
      .block-row { display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:8px; margin-bottom:6px; align-items:center; }
      .panel-list { display:grid; gap:10px; }
      .panel-item { background:#151c24; border:1px solid #243041; border-radius:12px; padding:14px; display:flex; justify-content:space-between; gap:12px; align-items:center; }
      .muted { color:#93a4b5; font-size:12px; }
      @media (max-width:720px) {
        .wrap { flex-direction:column; }
        nav { width:auto; display:flex; flex-wrap:wrap; gap:4px; border-right:0; border-bottom:1px solid #243041; }
        nav h1 { width:100%; }
        nav button { width:auto; }
      }
    `;
  }

  _renderOverview() {
    const live = this._live();
    const cfg = this._cfg();
    const main = live.main || {};
    const target = main.target ?? cfg.target_temp ?? "—";
    return `
      <h2>Overview</h2>
      <p class="lead">House climate and boiler demand.</p>
      <div class="cards">
        <div class="card"><div class="label">Mode</div><div class="value">${this._escape(main.hvac_mode || "—")}</div></div>
        <div class="card"><div class="label">Preset</div><div class="value">${this._escape(main.preset || "none")}</div></div>
        <div class="card"><div class="label">Target</div><div class="value">${this._escape(target)}°</div></div>
        <div class="card ${live.boiler_on ? "ok" : ""}"><div class="label">Boiler</div><div class="value">${live.boiler_on ? "On" : "Off"}</div></div>
        <div class="card ${live.window_open ? "warn" : ""}"><div class="label">Windows</div><div class="value">${live.window_open ? "Open" : "Closed"}</div></div>
        <div class="card ${live.summer_mode ? "warn" : ""}"><div class="label">Summer</div><div class="value">${live.summer_mode ? "On" : "Off"}</div></div>
        <div class="card ${live.away ? "warn" : ""}"><div class="label">Away</div><div class="value">${live.away ? "Yes" : "Home"}</div></div>
      </div>
      <p class="muted">Primary entity: <code>climate.neat_home</code>. Rooms appear as <code>climate.neat_&lt;room&gt;</code>.</p>
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
      <h2>Rooms</h2>
      <p class="lead">Each room has its own Neat climate and can call for heat independently.</p>
      <table>
        <thead><tr><th>Room</th><th>TRV</th><th>Target</th><th>Mode</th><th>Needs heat</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" class="muted">No rooms yet — add them below or in Settings.</td></tr>`}</tbody>
      </table>
      <div class="card" style="margin-top:16px">
        <h3 style="margin:0 0 10px;font-size:15px">Add / update room</h3>
        <div class="row">
          <label>Name<input id="roomName" placeholder="Kitchen" /></label>
          <label>TRV climate<input id="roomTrv" placeholder="climate.kitchen_..." /></label>
          <label>Temp sensor (optional)<input id="roomSensor" placeholder="sensor...." /></label>
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
          <button type="button" class="secondary b-del">✕</button>
        </div>`
        )
        .join("");
      return `<div class="schedule-day" data-day="${day}">
        <h3>${DAY_LABELS[day]} <button type="button" class="secondary compact b-add" data-day="${day}">+ block</button></h3>
        <div class="block-row muted"><span>Start</span><span>End</span><span>Temp</span><span></span></div>
        ${blockHtml}
      </div>`;
    }).join("");
    return `
      <h2>Schedule</h2>
      <p class="lead">7-day comfort schedule for the house climate. Outside blocks, Eco temperature applies.</p>
      <div class="row">
        <label style="flex:0">Enabled
          <select id="schedEnabled"><option value="true" ${enabled ? "selected" : ""}>On</option><option value="false" ${!enabled ? "selected" : ""}>Off</option></select>
        </label>
        <button class="primary" id="saveSchedule">Save schedule</button>
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
    const roomOpts = rooms
      .map((r) => `<option value="${this._escape(r.id)}">${this._escape(r.name)}</option>`)
      .join("");
    return `
      <h2>Wall panels</h2>
      <p class="lead">Define each physical NSPanel here. On the device, only pick which panel it is — everything else comes from this list.</p>
      <div class="panel-list">${list || `<p class="muted">No wall panels yet.</p>`}</div>
      <div class="card" style="margin-top:16px">
        <h3 style="margin:0 0 10px;font-size:15px">Add / update wall panel</h3>
        <div class="row">
          <label>Panel ID<input id="wpId" placeholder="hallway" pattern="[a-z0-9\\-]+" /></label>
          <label>Label<input id="wpLabel" placeholder="Hallway panel" /></label>
          <label>Primary climate<input id="wpPrimary" placeholder="climate.neat_home" value="climate.neat_home" /></label>
        </div>
        <div class="row">
          <label>Idle timeout (sec)<input id="wpIdle" type="number" value="30" min="5" /></label>
          <label>Inside temp sensor<input id="wpInside" placeholder="sensor...." /></label>
          <label>Weather entity<input id="wpWeather" placeholder="weather.home" value="weather.home" /></label>
        </div>
        <p class="muted">Room chips default to all Neat rooms unless you customise later.</p>
        <button class="primary" id="saveWallPanel">Save wall panel</button>
      </div>
      <p class="muted" style="margin-top:12px">Seed rooms available: ${roomOpts ? rooms.map((r) => r.name).join(", ") : "none yet"}</p>
    `;
  }

  _renderSettings() {
    const cfg = this._cfg();
    return `
      <h2>Settings</h2>
      <p class="lead">House-wide temperatures and modes. Rooms & wall panels have their own tabs.</p>
      <div class="row">
        <label>Eco °C<input id="ecoTemp" type="number" step="0.5" value="${this._escape(cfg.eco_temp ?? 16)}" /></label>
        <label>Boost °C<input id="boostTemp" type="number" step="0.5" value="${this._escape(cfg.boost_temp ?? 22)}" /></label>
        <label>Away °C<input id="awayTemp" type="number" step="0.5" value="${this._escape(cfg.away_temp ?? 15)}" /></label>
      </div>
      <div class="row">
        <label>Cold tolerance<input id="coldTol" type="number" step="0.1" value="${this._escape(cfg.cold_tolerance ?? 0.3)}" /></label>
        <label>Hot tolerance<input id="hotTol" type="number" step="0.1" value="${this._escape(cfg.hot_tolerance ?? 0.3)}" /></label>
        <label>Summer mode
          <select id="summerMode"><option value="false" ${!cfg.summer_mode ? "selected" : ""}>Off</option><option value="true" ${cfg.summer_mode ? "selected" : ""}>On</option></select>
        </label>
      </div>
      <div class="row">
        <label>Person (Away)<input id="personEntity" value="${this._escape(cfg.person_entity || "")}" placeholder="person.you" /></label>
        <label>Heater (read-only)<input value="${this._escape(cfg.heater || "")}" disabled /></label>
        <label>House sensor (read-only)<input value="${this._escape(cfg.temperature_sensor || "")}" disabled /></label>
      </div>
      <button class="primary" id="saveSettings">Save settings</button>
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

    const nav = NAV.map(
      (n) =>
        `<button type="button" class="${this._view === n.id ? "active" : ""}" data-view="${n.id}">${n.label}</button>`
    ).join("");

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <div class="wrap">
        <nav>
          <h1>Neat Thermostat</h1>
          ${nav}
        </nav>
        <main>
          ${this._error ? `<div class="err">${this._escape(this._error)}</div>` : ""}
          ${this._flash ? `<div class="okmsg">${this._escape(this._flash)}</div>` : ""}
          ${body}
        </main>
      </div>
    `;
    this._bind();
  }

  _bind() {
    this.shadowRoot.querySelectorAll("nav button[data-view]").forEach((btn) => {
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
                weather: this.shadowRoot.getElementById("wpWeather").value.trim() || "weather.home",
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

const version = "0_1_0";
const tag = `neat-thermostat-panel-${version}`;
if (!customElements.get(tag)) {
  customElements.define(tag, NeatThermostatPanel);
}
customElements.define("neat-thermostat-panel", NeatThermostatPanel);
