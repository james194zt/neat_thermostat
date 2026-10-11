/**
 * Neat Thermostat — dashboard card (type: custom:neat-thermostat-card).
 * Loaded automatically by the integration; pick "Neat Thermostat" in the card list.
 * Everything comes from the Neat climate entities, so it updates live with no polling.
 */
const NEAT_CARD_VERSION = "0.5.0";

const NC_STYLES = `
:host { display: block; }
ha-card { overflow: hidden; }
.nc {
  --nc-heat: #F57C00; --nc-heat-soft: #FF9800; --nc-teal: #08979C; --nc-teal-hi: #19D4DE;
  --nc-green: #52C41A; --nc-amber: #FA8C16; --nc-red: #e53935;
  --nc-tint: var(--nc-teal-hi);
  position: relative; padding: 16px;
  background: radial-gradient(80% 120% at 0% 0%, color-mix(in srgb, var(--nc-tint) 12%, transparent), transparent 65%);
  color: var(--primary-text-color); font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, sans-serif));
}
.nc.heating { --nc-tint: var(--nc-heat-soft); }
.nc.off { --nc-tint: #9aa0a6; }
.nc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.nc-name { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; margin: 0; cursor: pointer; }
.nc-status { font-size: 13px; color: var(--secondary-text-color); margin-top: 2px; }
.nc.heating .nc-status { color: var(--nc-heat-soft); }
.nc-pills { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.nc-pill {
  display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 600; white-space: nowrap;
  background: color-mix(in srgb, var(--primary-text-color) 7%, transparent); color: var(--secondary-text-color);
}
.nc-pill svg { width: 13px; height: 13px; }
.nc-pill.heat { background: color-mix(in srgb, var(--nc-heat) 16%, transparent); color: var(--nc-heat-soft); }
.nc-pill.leaf { background: color-mix(in srgb, var(--nc-green) 16%, transparent); color: var(--nc-green); }
.nc-pill.warn { background: color-mix(in srgb, var(--nc-amber) 16%, transparent); color: var(--nc-amber); }
.nc-pill.bad { background: color-mix(in srgb, var(--nc-red) 16%, transparent); color: var(--nc-red); }

.nc-main { display: flex; flex-direction: column; align-items: center; gap: 14px; margin-top: 8px; }
.nc-dial { position: relative; width: 100%; max-width: 260px; aspect-ratio: 1; touch-action: none; user-select: none; -webkit-user-select: none; }
.nc-dial > svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.nc-dial .track { stroke: color-mix(in srgb, var(--primary-text-color) 10%, transparent); }
.nc-dial .ring { cursor: grab; }
.nc-dial.dragging .ring { cursor: grabbing; }
.nc-dial .knob { fill: #fff; stroke: color-mix(in srgb, #000 20%, transparent); stroke-width: 1; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35)); }
.nc-dial .now-dot { fill: var(--card-background-color, var(--ha-card-background, #fff)); stroke: var(--primary-text-color); stroke-width: 3; }
.nc-core { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center; }
.nc-caption { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--secondary-text-color); }
.nc.heating .nc-caption { color: var(--nc-heat-soft); }
.nc-target { font-size: 60px; font-weight: 300; line-height: 1; letter-spacing: -0.04em; margin: 4px 0; font-variant-numeric: tabular-nums; }
.nc-target sup { font-size: 0.36em; font-weight: 400; vertical-align: top; position: relative; top: 0.35em; margin-left: 2px; }
.nc-target.pending { color: var(--nc-teal-hi); }
.nc-sub { font-size: 13px; color: var(--secondary-text-color); }
.nc-eta { font-size: 12px; font-weight: 600; color: var(--nc-heat-soft); margin-top: 2px; }
.nc-steps { position: absolute; left: 50%; bottom: 2%; transform: translateX(-50%); display: flex; gap: 44px; }
.nc-step {
  width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; padding: 0;
  border: 1px solid color-mix(in srgb, var(--primary-text-color) 14%, transparent);
  background: color-mix(in srgb, var(--primary-text-color) 6%, var(--card-background-color, var(--ha-card-background, #fff)));
  color: var(--primary-text-color); transition: transform 0.1s ease, background 0.15s ease;
}
.nc-step svg { width: 22px; height: 22px; }
.nc-step:hover { background: color-mix(in srgb, var(--primary-text-color) 12%, var(--card-background-color, #fff)); }
.nc-step:active { transform: scale(0.92); }
.nc-step:disabled { opacity: 0.35; cursor: default; }
.nc-step:focus-visible, .nc-mode:focus-visible, .nc-room:focus-visible { outline: 2px solid var(--nc-teal-hi); outline-offset: 2px; }

.nc-modes { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; width: 100%; }
.nc-seg { display: inline-flex; padding: 3px; border-radius: 999px; background: color-mix(in srgb, var(--primary-text-color) 7%, transparent); }
.nc-mode {
  border: 0; background: transparent; color: var(--secondary-text-color); cursor: pointer;
  padding: 7px 14px; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 6px;
}
.nc-mode svg { width: 15px; height: 15px; }
.nc-mode.active { background: var(--card-background-color, var(--ha-card-background, #fff)); color: var(--primary-text-color); box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.nc-mode.active.heat { color: var(--nc-heat-soft); }
.nc-mode.active.eco { color: var(--nc-green); }
.nc-mode.active.boost { color: var(--nc-heat-soft); }
.nc-mode.active.away { color: var(--nc-teal-hi); }

.nc-rooms { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; margin-top: 16px; }
.nc-room {
  display: flex; flex-direction: column; gap: 1px; padding: 10px 12px; border-radius: 12px; cursor: pointer; text-align: left;
  font: inherit; color: inherit;
  background: color-mix(in srgb, var(--primary-text-color) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary-text-color) 8%, transparent);
}
.nc-room:hover { background: color-mix(in srgb, var(--primary-text-color) 9%, transparent); }
.nc-room.heat { background: color-mix(in srgb, var(--nc-heat) 10%, transparent); border-color: color-mix(in srgb, var(--nc-heat) 35%, transparent); }
.nc-room-top { display: flex; justify-content: space-between; align-items: center; gap: 4px; }
.nc-room-name { font-size: 12px; font-weight: 600; color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nc-room-top svg { width: 13px; height: 13px; color: var(--nc-heat-soft); flex-shrink: 0; }
.nc-room-temp { font-size: 22px; font-weight: 400; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.nc-room-temp.unknown { color: var(--secondary-text-color); }
.nc-room-set { font-size: 11px; color: var(--secondary-text-color); }
.nc-room.heat .nc-room-set { color: var(--nc-heat-soft); }
.nc-empty { padding: 24px 16px; color: var(--secondary-text-color); font-size: 14px; }

/* Compact: dial left, controls right. */
.nc.compact .nc-main { flex-direction: row; align-items: center; gap: 16px; margin-top: 4px; }
.nc.compact .nc-dial { max-width: 150px; flex-shrink: 0; }
.nc.compact .nc-target { font-size: 40px; }
.nc.compact .nc-caption { font-size: 9px; }
.nc.compact .nc-sub, .nc.compact .nc-eta { font-size: 11px; }
.nc.compact .nc-steps { gap: 30px; bottom: 0; }
.nc.compact .nc-step { width: 32px; height: 32px; }
.nc.compact .nc-step svg { width: 18px; height: 18px; }
.nc.compact .nc-modes { justify-content: flex-start; }
.nc.compact .nc-mode { padding: 6px 10px; font-size: 12px; }
.nc-side { display: flex; flex-direction: column; gap: 10px; min-width: 0; flex: 1; }
`;

const NC_ICONS = {
  flame: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c.5 3.2-1.6 5-3.2 6.9C7.4 10.6 6 12.4 6 15a6 6 0 0 0 12 0c0-2.6-1.3-4.6-2.6-6.1-.3 1.6-1.1 2.7-2.3 3.2.6-3.7-.3-7.6-1.1-10.1z"/></svg>`,
  leaf: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.5 3.5c-3.2.2-6.2 1.7-8.2 4.1C7 10.1 6 13 6.2 16c2.8-.1 5.5-1.3 7.4-3.4 2.1-2.3 3.3-5.3 3.9-9.1z"/></svg>`,
  power: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 3v8M6.4 6.6a8 8 0 1 0 11.2 0"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 13H5v-2h14z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
};

const NC_ARC = "M40.6 159.4 A84 84 0 1 1 159.4 159.4";

function ncFmt(v) {
  if (v == null || Number.isNaN(Number(v))) return null;
  const n = Math.round(Number(v) * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function ncEsc(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Neat's house climate: a Neat climate that reports boiler_demand. */
function ncFindHome(hass) {
  const ids = Object.keys(hass?.entities || {}).filter(
    (id) => id.startsWith("climate.") && hass.entities[id]?.platform === "neat_thermostat"
  );
  return ids.find((id) => hass.states[id]?.attributes?.boiler_demand !== undefined) || ids[0] || "";
}

class NeatThermostatCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("neat-thermostat-card-editor");
  }

  static getStubConfig(hass) {
    return { entity: ncFindHome(hass) };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._pending = null;
    this._pendingAt = 0;
    this._sendTimer = null;
    this._dragging = false;
    this._lastKey = "";
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = { layout: "full", show_status: true, show_modes: true, show_rooms: true, ...config };
    this._lastKey = "";
    this._build();
    this._update(true);
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  getCardSize() {
    if (this._config?.layout === "compact") return this._config.show_rooms ? 5 : 3;
    return this._config?.show_rooms ? 9 : 7;
  }

  getGridOptions() {
    return this._config?.layout === "compact"
      ? { columns: 12, min_columns: 6, rows: "auto" }
      : { columns: 6, min_columns: 4, rows: "auto" };
  }

  get _entityId() {
    return this._config?.entity || ncFindHome(this._hass);
  }

  _build() {
    const compact = this._config.layout === "compact";
    const dial = `
      <div class="nc-dial">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <linearGradient id="ncGrad" x1="0" y1="1" x2="1" y2="0">
              <stop class="g0" offset="0"/><stop class="g1" offset="1"/>
            </linearGradient>
          </defs>
          <path class="track" d="${NC_ARC}" fill="none" stroke-width="12" stroke-linecap="round"/>
          <path class="fill" d="${NC_ARC}" pathLength="100" fill="none" stroke="url(#ncGrad)" stroke-width="12" stroke-linecap="round"/>
          <path class="ring" d="${NC_ARC}" fill="none" stroke="transparent" stroke-width="40"/>
          <circle class="now-dot" r="6"/>
          <circle class="knob" r="9"/>
        </svg>
        <div class="nc-core">
          <div class="nc-caption"></div>
          <div class="nc-target"></div>
          <div class="nc-sub"></div>
          <div class="nc-eta"></div>
        </div>
        <div class="nc-steps">
          <button class="nc-step" data-step="-1" aria-label="Lower the temperature">${NC_ICONS.minus}</button>
          <button class="nc-step" data-step="1" aria-label="Raise the temperature">${NC_ICONS.plus}</button>
        </div>
      </div>`;
    const modes = this._config.show_modes
      ? `<div class="nc-modes">
          <div class="nc-seg">
            <button class="nc-mode heat" data-hvac="heat">${NC_ICONS.flame}Heat</button>
            <button class="nc-mode" data-hvac="off">${NC_ICONS.power}Off</button>
          </div>
          <div class="nc-seg">
            <button class="nc-mode eco" data-preset="eco">Eco</button>
            <button class="nc-mode boost" data-preset="boost">Boost</button>
            <button class="nc-mode away" data-preset="away">Away</button>
          </div>
        </div>`
      : "";
    this.shadowRoot.innerHTML = `
      <style>${NC_STYLES}</style>
      <ha-card>
        <div class="nc${compact ? " compact" : ""}">
          <div class="nc-head">
            <div><p class="nc-name"></p><div class="nc-status"></div></div>
            ${this._config.show_status ? `<div class="nc-pills"></div>` : ""}
          </div>
          <div class="nc-main">
            ${dial}
            ${compact ? `<div class="nc-side">${modes}</div>` : modes}
          </div>
          ${this._config.show_rooms ? `<div class="nc-rooms"></div>` : ""}
        </div>
      </ha-card>`;
    this._bind();
  }

  _bind() {
    const root = this.shadowRoot;
    root.querySelectorAll(".nc-step").forEach((b) => b.addEventListener("click", () => this._step(Number(b.dataset.step))));
    root.querySelectorAll("[data-hvac]").forEach((b) =>
      b.addEventListener("click", () => this._call("set_hvac_mode", { hvac_mode: b.dataset.hvac }).catch(() => {}))
    );
    root.querySelectorAll("[data-preset]").forEach((b) =>
      b.addEventListener("click", () => {
        const current = this._hass?.states[this._entityId]?.attributes?.preset_mode;
        // Tapping the active preset turns it off again.
        this._call("set_preset_mode", { preset_mode: current === b.dataset.preset ? "none" : b.dataset.preset }).catch(() => {});
      })
    );
    root.querySelector(".nc-name")?.addEventListener("click", () => this._moreInfo(this._entityId));
    const rooms = root.querySelector(".nc-rooms");
    rooms?.addEventListener("click", (ev) => {
      const tile = ev.target.closest("[data-entity]");
      if (tile) this._moreInfo(tile.dataset.entity);
    });

    // Drag along the arc to set the temperature.
    const dial = root.querySelector(".nc-dial");
    const ring = root.querySelector(".ring");
    const knob = root.querySelector(".knob");
    const fromPointer = (ev) => {
      const r = dial.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * 200 - 100;
      const y = ((ev.clientY - r.top) / r.height) * 200 - 100;
      let rel = ((Math.atan2(y, x) * 180) / Math.PI - 135 + 720) % 360;
      if (rel > 270) rel = rel > 315 ? 0 : 270; // in the open gap: snap to the nearer end
      const { lo, hi, step } = this._limits();
      return Math.min(hi, Math.max(lo, Math.round((lo + (rel / 270) * (hi - lo)) / step) * step));
    };
    const start = (ev) => {
      if (ev.button !== undefined && ev.button !== 0) return;
      ev.preventDefault();
      this._dragging = true;
      dial.classList.add("dragging");
      try {
        dial.setPointerCapture(ev.pointerId);
      } catch {
        // pointer already gone
      }
      this._setPending(fromPointer(ev), false);
    };
    ring.addEventListener("pointerdown", start);
    knob.addEventListener("pointerdown", start);
    dial.addEventListener("pointermove", (ev) => {
      if (this._dragging) this._setPending(fromPointer(ev), false);
    });
    const end = () => {
      if (!this._dragging) return;
      this._dragging = false;
      dial.classList.remove("dragging");
      this._queueSend(0);
    };
    dial.addEventListener("pointerup", end);
    dial.addEventListener("pointercancel", end);
  }

  _limits() {
    const a = this._hass?.states[this._entityId]?.attributes || {};
    return { lo: Number(a.min_temp ?? 7), hi: Number(a.max_temp ?? 30), step: Number(a.target_temp_step) || 0.5 };
  }

  _shownTarget() {
    const reported = this._hass?.states[this._entityId]?.attributes?.temperature;
    if (this._pending != null) {
      const settled = reported != null && Number(reported) === this._pending && !this._sendTimer && !this._dragging;
      if (settled || (!this._dragging && Date.now() - this._pendingAt > 15000)) this._pending = null;
      else return this._pending;
    }
    return reported;
  }

  _step(direction) {
    const { lo, hi, step } = this._limits();
    const base = Number(this._shownTarget() ?? 20);
    this._setPending(Math.min(hi, Math.max(lo, Math.round((base + direction * step) / step) * step)), true);
  }

  _setPending(value, send) {
    this._pending = value;
    this._pendingAt = Date.now();
    this._update(true);
    if (send) this._queueSend(700);
  }

  _queueSend(delay) {
    clearTimeout(this._sendTimer);
    this._sendTimer = setTimeout(async () => {
      this._sendTimer = null;
      if (this._pending == null) return;
      try {
        await this._call("set_temperature", { temperature: this._pending }, false);
        this._pendingAt = Date.now();
      } catch {
        this._pending = null;
        this._update(true);
      }
    }, delay);
  }

  async _call(service, data, toastOnError = true) {
    if (!this._hass || !this._entityId) return;
    try {
      await this._hass.callService("climate", service, { entity_id: this._entityId, ...data });
    } catch (e) {
      if (toastOnError) {
        this.dispatchEvent(new CustomEvent("hass-notification", { detail: { message: `Neat: ${e?.message || e}` }, bubbles: true, composed: true }));
      }
      throw e;
    }
  }

  _moreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }

  _roomIds(home) {
    const listed = home?.attributes?.room_entities;
    if (Array.isArray(listed)) return listed;
    return Object.keys(this._hass?.entities || {}).filter(
      (id) => id !== this._entityId && id.startsWith("climate.") && this._hass.entities[id]?.platform === "neat_thermostat"
    );
  }

  _update(force = false) {
    if (!this._config || !this._hass || !this.shadowRoot.querySelector(".nc")) return;
    const id = this._entityId;
    const home = this._hass.states[id];
    const roomIds = this._config.show_rooms ? this._roomIds(home) : [];
    // Only redraw when something we show changed (hass updates arrive constantly).
    const key = [home?.last_updated, ...roomIds.map((r) => this._hass.states[r]?.last_updated)].join("|");
    if (!force && key === this._lastKey) return;
    this._lastKey = key;

    const root = this.shadowRoot;
    const card = root.querySelector(".nc");
    if (!home) {
      root.querySelector(".nc-name").textContent = this._config.name || "Neat Thermostat";
      root.querySelector(".nc-status").textContent = id ? `${id} isn't available` : "No Neat thermostat found — pick one in the card settings.";
      return;
    }
    const a = home.attributes;
    const off = home.state === "off";
    const heating = !off && a.hvac_action === "heating";
    const target = this._shownTarget();
    const { lo, hi } = this._limits();
    const pos = (t) => (t == null || !Number.isFinite(Number(t)) ? null : Math.min(1, Math.max(0, (Number(t) - lo) / (hi - lo))));

    card.classList.toggle("heating", heating);
    card.classList.toggle("off", off);
    root.querySelector(".nc-name").textContent = this._config.name || "Home";

    let status = "Holding temperature";
    if (off) status = "Heating is off";
    else if (a.summer_mode) status = "Summer mode — heating paused";
    else if (a.window_open) status = "Window open — heating paused";
    else if (a.preheating) status = `Preheating for ${a.preheat_for || "the schedule"}`;
    else if (heating) status = "Warming the house";
    else if (a.current_temperature != null && target != null && Number(a.current_temperature) >= Number(target)) status = "Up to temperature";
    root.querySelector(".nc-status").textContent = status;

    // Dial
    const fill = off ? 0 : (pos(target) ?? 0) * 100;
    const fillEl = root.querySelector(".fill");
    fillEl.setAttribute("stroke-dasharray", `${fill.toFixed(1)} 100`);
    fillEl.style.display = fill > 0 ? "" : "none";
    const [c0, c1] = off ? ["#6b7177", "#9aa0a6"] : heating ? ["#FFB74D", "#F4511E"] : ["#19D4DE", "#08979C"];
    root.querySelector(".g0").setAttribute("stop-color", c0);
    root.querySelector(".g1").setAttribute("stop-color", c1);
    const place = (el, p) => {
      if (p == null) {
        el.style.display = "none";
        return;
      }
      const ang = ((135 + 270 * p) * Math.PI) / 180;
      el.style.display = "";
      el.setAttribute("cx", (100 + 84 * Math.cos(ang)).toFixed(1));
      el.setAttribute("cy", (100 + 84 * Math.sin(ang)).toFixed(1));
    };
    place(root.querySelector(".now-dot"), pos(a.current_temperature));
    place(root.querySelector(".knob"), off ? null : pos(target));

    root.querySelector(".nc-caption").textContent = off ? "Off" : a.preheating ? "Preheating to" : heating ? "Heating to" : "Set to";
    const t = root.querySelector(".nc-target");
    const shown = ncFmt(target);
    t.innerHTML = shown == null ? "—" : `${ncEsc(shown)}<sup>°C</sup>`;
    t.classList.toggle("pending", this._pending != null);
    const now = ncFmt(a.current_temperature);
    root.querySelector(".nc-sub").textContent = now == null ? "" : `Indoor ${now}°`;
    const eta = heating && a.time_to_temp_minutes != null ? Math.round(Number(a.time_to_temp_minutes)) : null;
    root.querySelector(".nc-eta").textContent =
      eta == null ? "" : eta < 60 ? `~${eta} min to go` : `~${Math.floor(eta / 60)}h ${eta % 60 ? `${eta % 60}m ` : ""}to go`;
    const [minus, plus] = root.querySelectorAll(".nc-step");
    minus.disabled = target != null && Number(target) <= lo;
    plus.disabled = target != null && Number(target) >= hi;

    // Modes
    root.querySelectorAll("[data-hvac]").forEach((b) => b.classList.toggle("active", b.dataset.hvac === home.state));
    root.querySelectorAll("[data-preset]").forEach((b) => b.classList.toggle("active", b.dataset.preset === a.preset_mode));

    // Status pills
    const pills = root.querySelector(".nc-pills");
    if (pills) {
      const out = [];
      const pill = (cls, text, icon = "") => out.push(`<span class="nc-pill ${cls}">${icon}${ncEsc(text)}</span>`);
      if (a.heater_available === false) pill("bad", "Boiler relay offline");
      if (a.safety_active) pill("heat", "Safety heat", NC_ICONS.flame);
      else if (a.boiler_on) pill("heat", "Boiler on", NC_ICONS.flame);
      if (a.leaf) pill("leaf", "Leaf", NC_ICONS.leaf);
      if (a.away_mode) pill("warn", "Away");
      if (a.window_open) pill("warn", "Window open");
      if (a.summer_mode) pill("warn", "Summer");
      pills.innerHTML = out.join("");
    }

    // Rooms
    const rooms = root.querySelector(".nc-rooms");
    if (rooms) {
      rooms.innerHTML = roomIds
        .map((rid) => {
          const st = this._hass.states[rid];
          if (!st) return "";
          const ra = st.attributes;
          const name = ra.room_name || String(ra.friendly_name || rid).replace(/^Neat /, "");
          const cur = ncFmt(ra.current_temperature);
          const set = ncFmt(ra.temperature);
          const heat = ra.hvac_action === "heating";
          return `
            <button class="nc-room${heat ? " heat" : ""}" data-entity="${ncEsc(rid)}" title="${ncEsc(name)}">
              <span class="nc-room-top"><span class="nc-room-name">${ncEsc(name)}</span>${heat ? NC_ICONS.flame : ""}</span>
              <span class="nc-room-temp${cur == null ? " unknown" : ""}">${cur == null ? "—" : `${ncEsc(cur)}°`}</span>
              <span class="nc-room-set">${st.state === "off" ? "Off" : `${heat ? "Heating to" : "Set"} ${ncEsc(set ?? "—")}°`}</span>
            </button>`;
        })
        .join("");
      rooms.style.display = roomIds.length ? "" : "none";
    }
  }
}

class NeatThermostatCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    else this._render();
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) =>
        ({
          entity: "Neat thermostat",
          name: "Name",
          layout: "Layout",
          show_status: "Show status pills",
          show_modes: "Show mode buttons",
          show_rooms: "Show rooms",
        })[s.name] || s.name;
      this._form.addEventListener("value-changed", (ev) => {
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: ev.detail.value }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = [
      { name: "entity", selector: { entity: { domain: "climate", integration: "neat_thermostat" } } },
      { name: "name", selector: { text: {} } },
      {
        name: "layout",
        selector: { select: { mode: "dropdown", options: [{ value: "full", label: "Full" }, { value: "compact", label: "Compact" }] } },
      },
      { name: "show_status", selector: { boolean: {} } },
      { name: "show_modes", selector: { boolean: {} } },
      { name: "show_rooms", selector: { boolean: {} } },
    ];
    this._form.data = { layout: "full", show_status: true, show_modes: true, show_rooms: true, ...this._config };
  }
}

if (!customElements.get("neat-thermostat-card")) customElements.define("neat-thermostat-card", NeatThermostatCard);
if (!customElements.get("neat-thermostat-card-editor")) customElements.define("neat-thermostat-card-editor", NeatThermostatCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "neat-thermostat-card")) {
  window.customCards.push({
    type: "neat-thermostat-card",
    name: "Neat Thermostat",
    description: "Dial with setpoint control, modes, status and rooms for Neat Thermostat.",
    preview: true,
    documentationURL: "https://github.com/james194zt/neat_thermostat",
  });
}
console.info(`%c NEAT-THERMOSTAT-CARD %c ${NEAT_CARD_VERSION} `, "color:#fff;background:#08979C;border-radius:3px 0 0 3px", "color:#08979C;background:#e6f7f7;border-radius:0 3px 3px 0");
