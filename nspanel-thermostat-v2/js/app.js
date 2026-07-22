import { HomeAssistantClient } from "./ha-client.js";
import { EmbeddedHomeAssistantClient } from "./ha-embedded.js";
import { ScreenSaver } from "./screensaver.js";
import { DisplayPower } from "./display-power.js";
import {
  loadConfig,
  loadRegistry,
  isConfiguredForStandalone,
  isEmbeddedInHomeAssistant,
  setStoredDeviceId,
  getStoredDeviceId,
} from "./config.js";
import { listDevices, slugifyDeviceId } from "./device-registry.js";
import { readWeatherSnapshot } from "./weather.js";

const ui = {
  app: document.getElementById("app"),
  errorOverlay: document.getElementById("errorOverlay"),
  errorMessage: document.getElementById("errorMessage"),
  retrySetup: document.getElementById("retrySetup"),
  deviceOverlay: document.getElementById("deviceOverlay"),
  devicePickList: document.getElementById("devicePickList"),
  customDeviceId: document.getElementById("customDeviceId"),
  saveDeviceId: document.getElementById("saveDeviceId"),
  openSetupFromPicker: document.getElementById("openSetupFromPicker"),
  connectionDot: document.getElementById("connectionDot"),
  connectionLabel: document.getElementById("connectionLabel"),
  actionPill: document.getElementById("actionPill"),
  weatherBlock: document.getElementById("weatherBlock"),
  weatherIcon: document.getElementById("weatherIcon"),
  weatherTemp: document.getElementById("weatherTemp"),
  weatherLabel: document.getElementById("weatherLabel"),
  sunriseTime: document.getElementById("sunriseTime"),
  sunsetTime: document.getElementById("sunsetTime"),
  heroLabel: document.getElementById("heroLabel"),
  currentTempInt: document.getElementById("currentTempInt"),
  currentTempDec: document.getElementById("currentTempDec"),
  heroSubtitle: document.getElementById("heroSubtitle"),
  targetTemp: document.getElementById("targetTemp"),
  tempDown: document.getElementById("tempDown"),
  tempUp: document.getElementById("tempUp"),
  insideTemp: document.getElementById("insideTemp"),
  outsideTemp: document.getElementById("outsideTemp"),
  insideHumidity: document.getElementById("insideHumidity"),
  roomStrip: document.getElementById("roomStrip"),
  backToHome: document.getElementById("backToHome"),
  modeButtons: [...document.querySelectorAll(".mode-btn")],
  modeDrawer: document.getElementById("modeDrawer"),
  modeFace: document.getElementById("modeFace"),
  modeIcon: document.getElementById("modeIcon"),
  ringLeaf: document.getElementById("ringLeaf"),
  thermoRing: document.getElementById("thermoRing"),
  ringTicks: document.getElementById("ringTicks"),
  ringCallouts: document.getElementById("ringCallouts"),
  currentTemp: document.getElementById("currentTemp"),
  zonePill: document.getElementById("zonePill"),
  windowBanner: document.getElementById("windowBanner"),
  statusRow: document.getElementById("statusRow"),
  summerPill: document.getElementById("summerPill"),
  screensaver: document.getElementById("screensaver"),
  pinOverlay: document.getElementById("pinOverlay"),
  pinDisplay: document.getElementById("pinDisplay"),
  pinPad: document.getElementById("pinPad"),
  pinError: document.getElementById("pinError"),
};

let config = await loadConfig();
let client = null;
let screenSaver = null;
let displayPower = null;
let activeEntity = config.primary.entity;
let activeLabel = config.primary.name;
let activeStep = config.primary.step ?? 0.5;
let embeddedMode = false;
let panelUnlocked = false;
let pinBuffer = "";
let pendingUnlockAction = null;
let configPollTimer = null;
/** Optimistic setpoint while HA catches up (instant +/- feedback). */
let optimisticTarget = null;
let tempSendTimer = null;
let tempSendSeq = 0;
/** Wait for a pause in +/- taps before writing to Home Assistant. */
const TEMP_SEND_IDLE_MS = 2500;
/** Optimistic HVAC mode / preset while HA catches up. */
let optimisticMode = null;

function getDisplayLabel() {
  return activeLabel;
}

function formatTemp(value, suffix = "°") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return `${Number(value).toFixed(1).replace(/\.0$/, "")}${suffix}`;
}

function setCurrentTempDisplay(value) {
  const empty = value === null || value === undefined || Number.isNaN(Number(value));
  ui.currentTemp?.classList.toggle("is-empty", empty);
  ui.currentTemp?.classList.remove("is-off");
  if (empty) {
    if (ui.currentTempInt) ui.currentTempInt.textContent = "–";
    if (ui.currentTempDec) ui.currentTempDec.textContent = "";
    return;
  }
  const n = Number(value);
  const fixed = n.toFixed(1);
  const [intPart, decPart] = fixed.split(".");
  if (ui.currentTempInt) ui.currentTempInt.textContent = intPart;
  if (ui.currentTempDec) {
    ui.currentTempDec.textContent = decPart === "0" ? "" : `.${decPart}`;
  }
}

function updateCentreControls(state, target = getEffectiveTarget(state)) {
  const off = state?.state === "off";
  ui.tempDown?.classList.toggle("hidden", off);
  ui.tempUp?.classList.toggle("hidden", off);
  ui.currentTemp?.classList.toggle("is-off", off);
  if (off) {
    ui.currentTemp?.classList.remove("is-empty");
    if (ui.currentTempInt) ui.currentTempInt.textContent = "OFF";
    if (ui.currentTempDec) ui.currentTempDec.textContent = "";
    return;
  }
  setCurrentTempDisplay(target);
}

function modeGlyph(state) {
  const preset = state?.attributes?.preset_mode;
  const mode = state?.state;
  if (preset === "eco" || preset === "away") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><text x="3" y="17" fill="currentColor" font-size="11" font-weight="700" font-family="Segoe UI,sans-serif">zZz</text></svg>`;
  }
  if (preset === "boost") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 2 4 14h7l-1 8 10-14h-7l0-6z"/></svg>`;
  }
  // Cache-bust: Android WebView keeps sticky PNG caches
  const iconV = "20260722b";
  if (mode === "off") {
    return `<img class="mode-icon-img" src="assets/mode/off.png?v=${iconV}" alt="Off" draggable="false" />`;
  }
  return `<img class="mode-icon-img" src="assets/mode/heat.png?v=${iconV}" alt="Heat" draggable="false" />`;
}

function formatSensor(value, suffix = "") {
  if (value === null || value === undefined || value === "unavailable" || value === "unknown") {
    return "--";
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return `${numeric.toFixed(1).replace(/\.0$/, "")}${suffix}`;
  }
  return `${value}${suffix}`;
}

function getOutsideTempDisplay() {
  const sensorId = config.sensors?.outsideTemp?.trim();
  if (sensorId) {
    const formatted = formatSensor(client?.getState(sensorId)?.state, "°");
    if (formatted !== "--") return formatted;
  }

  // Fall back to weather entity outdoor temp when panel sensor is missing/unavailable
  const weatherId = resolveWeatherEntityId();
  if (weatherId) {
    const weather = client?.getState(weatherId);
    const temp = weather?.attributes?.temperature;
    const formatted = formatSensor(temp, "°");
    if (formatted !== "--") return formatted;
  }

  return "--";
}

function formatHumidity(value) {
  const formatted = formatSensor(value, "%");
  if (formatted === "--") return "--";
  return formatted.includes("%") ? formatted : `${formatted}%`;
}

function getHumidityDisplay() {
  const sensorId = config.sensors?.insideHumidity?.trim();
  if (sensorId) {
    const formatted = formatHumidity(client?.getState(sensorId)?.state);
    if (formatted !== "--") return formatted;
  }

  // Climate entities often expose current_humidity
  const climate = getActiveState() || getPrimaryState();
  const fromClimate = climate?.attributes?.current_humidity;
  if (fromClimate != null && fromClimate !== "") {
    const formatted = formatHumidity(fromClimate);
    if (formatted !== "--") return formatted;
  }

  // Weather entity humidity
  const weatherId = resolveWeatherEntityId();
  if (weatherId) {
    const formatted = formatHumidity(client?.getState(weatherId)?.attributes?.humidity);
    if (formatted !== "--") return formatted;
  }

  // Auto-discover a humidity sensor (prefer common home ids)
  const ids = client?.listEntityIds?.() ?? [];
  const preferred = [
    "sensor.home_humidity",
    "sensor.indoor_humidity",
    "sensor.humidity",
    ...ids.filter((id) => id.includes("humidity")),
  ];
  const seen = new Set();
  for (const id of preferred) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const state = client?.getState(id);
    if (!state) continue;
    if (
      state.attributes?.device_class === "humidity" ||
      id.includes("humidity") ||
      state.attributes?.unit_of_measurement === "%"
    ) {
      const formatted = formatHumidity(state.state);
      if (formatted !== "--") return formatted;
    }
  }

  for (const id of ids) {
    if (seen.has(id) || !id.startsWith("sensor.")) continue;
    const state = client.getState(id);
    if (state?.attributes?.device_class !== "humidity") continue;
    const formatted = formatHumidity(state.state);
    if (formatted !== "--") return formatted;
  }

  return "--";
}

function getClimateState(entityId) {
  return client?.getState(entityId);
}

function getPrimaryState() {
  return getClimateState(config.primary.entity);
}

function getActiveState() {
  return getClimateState(activeEntity);
}

function getTargetTemperature(state) {
  if (!state) return null;
  const value = state.attributes.target_temp_high ?? state.attributes.temperature ?? null;
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Number(value);
}

function getEffectiveTarget(state = getActiveState()) {
  if (optimisticTarget != null) return optimisticTarget;
  return getTargetTemperature(state);
}

function clearOptimisticTarget() {
  optimisticTarget = null;
  clearTimeout(tempSendTimer);
  tempSendTimer = null;
  tempSendSeq += 1;
}

function clearOptimisticMode() {
  optimisticMode = null;
}

function getEffectiveClimateState(state = getActiveState()) {
  if (!state || !optimisticMode) return state;
  return {
    ...state,
    state: optimisticMode.mode ?? state.state,
    attributes: {
      ...state.attributes,
      preset_mode: optimisticMode.preset ?? state.attributes?.preset_mode,
    },
  };
}

function syncOptimisticFromHa(state) {
  const ha = getTargetTemperature(state);
  if (optimisticTarget != null && ha != null && Math.abs(ha - optimisticTarget) < 0.05) {
    optimisticTarget = null;
  }
}

function syncOptimisticModeFromHa(state) {
  if (!optimisticMode || !state) return;
  const haMode = state.state;
  const haPreset = state.attributes?.preset_mode || "none";
  const wantMode = optimisticMode.mode;
  const wantPreset = optimisticMode.preset || "none";
  const modeOk = wantMode == null || haMode === wantMode;
  const presetOk = haPreset === wantPreset || (wantPreset === "none" && (!haPreset || haPreset === "none"));
  if (modeOk && presetOk) optimisticMode = null;
}

function applyOptimisticMode(next) {
  optimisticMode = next;
  const view = getEffectiveClimateState(getActiveState());
  applyTheme(view);
  updateModeButtons(view);
  updateCentreControls(view, getEffectiveTarget());
}

function getCurrentTemperature(state) {
  const fromClimate = state?.attributes?.current_temperature;
  if (fromClimate != null && !Number.isNaN(Number(fromClimate))) {
    return Number(fromClimate);
  }

  // Fall back to house inside sensor so the dial isn't blank when climate is offline
  const sensorId = config.sensors?.insideTemp?.trim();
  if (sensorId) {
    const raw = client?.getState(sensorId)?.state;
    if (raw != null && raw !== "unavailable" && raw !== "unknown" && !Number.isNaN(Number(raw))) {
      return Number(raw);
    }
  }
  return null;
}

function getHvacAction(state) {
  if (!state) return "unknown";
  return state.attributes.hvac_action || state.state || "unknown";
}

/* —— Heating gauge (Lovelace-style tick ring) —— */
const GAUGE = {
  cx: 100,
  cy: 100,
  // Keep ticks tight against the face (face inset ~7.5% → ~r85)
  rOuter: 96,
  rInner: 88,
  // Outside the ticks; viewBox padding keeps these from clipping
  rLabel: 116,
  // Sweep leaves a gap at the bottom for the face content rhythm
  startDeg: -140,
  sweepDeg: 280,
  ticks: 70,
  defaultMin: 5,
  defaultMax: 30,
};

let ringTicksBuilt = false;

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function polar(cx, cy, r, deg) {
  // 0° at 12 o'clock, clockwise
  const rad = degToRad(deg - 90);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function getGaugeRange(state) {
  const min = Number(state?.attributes?.min_temp);
  const max = Number(state?.attributes?.max_temp);
  return {
    min: Number.isFinite(min) ? min : GAUGE.defaultMin,
    max: Number.isFinite(max) && max > min ? max : GAUGE.defaultMax,
  };
}

function tempToDeg(temp, min, max) {
  const clamped = Math.min(max, Math.max(min, temp));
  const ratio = (clamped - min) / (max - min || 1);
  return GAUGE.startDeg + ratio * GAUGE.sweepDeg;
}

function ensureRingTicks() {
  if (ringTicksBuilt || !ui.ringTicks) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < GAUGE.ticks; i++) {
    const t = i / (GAUGE.ticks - 1);
    const deg = GAUGE.startDeg + t * GAUGE.sweepDeg;
    const outer = polar(GAUGE.cx, GAUGE.cy, GAUGE.rOuter, deg);
    const inner = polar(GAUGE.cx, GAUGE.cy, GAUGE.rInner, deg);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", outer.x.toFixed(2));
    line.setAttribute("y1", outer.y.toFixed(2));
    line.setAttribute("x2", inner.x.toFixed(2));
    line.setAttribute("y2", inner.y.toFixed(2));
    line.setAttribute("class", i % 5 === 0 ? "tick major" : "tick");
    line.dataset.index = String(i);
    frag.appendChild(line);
  }
  ui.ringTicks.appendChild(frag);
  ringTicksBuilt = true;
}

function formatGaugeLabel(value) {
  if (value == null || Number.isNaN(Number(value))) return "";
  return Number(value).toFixed(1).replace(/\.0$/, "");
}

function addRingCallout(temp, deg) {
  if (!ui.ringCallouts) return;
  const label = formatGaugeLabel(temp);
  if (!label) return;

  const textPos = polar(GAUGE.cx, GAUGE.cy, GAUGE.rLabel, deg);

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("class", "ring-callout");
  text.setAttribute("x", textPos.x.toFixed(2));
  text.setAttribute("y", textPos.y.toFixed(2));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.textContent = label;
  ui.ringCallouts.appendChild(text);
}

function updateRingGauge(state, current, target) {
  ensureRingTicks();
  if (!ui.ringTicks) return;

  const { min, max } = getGaugeRange(state);
  const mode = state?.state;
  const hasCurrent = current != null && Number.isFinite(current);
  const hasTarget = target != null && Number.isFinite(target);

  let low = null;
  let high = null;
  if (hasCurrent && hasTarget) {
    low = Math.min(current, target);
    high = Math.max(current, target);
  } else if (hasTarget) {
    low = high = target;
  } else if (hasCurrent) {
    low = high = current;
  }

  const showBand = low != null && high != null && mode !== "off";

  // Light up ticks between current and target
  const ticks = ui.ringTicks.querySelectorAll(".tick");
  ticks.forEach((tick, i) => {
    const t = i / (GAUGE.ticks - 1);
    const deg = GAUGE.startDeg + t * GAUGE.sweepDeg;
    let active = false;
    if (showBand) {
      const lowDeg = tempToDeg(low, min, max);
      const highDeg = tempToDeg(high, min, max);
      if (Math.abs(highDeg - lowDeg) < 2) {
        active = Math.abs(deg - lowDeg) <= 2.5;
      } else {
        active = deg >= lowDeg - 0.01 && deg <= highDeg + 0.01;
      }
    }
    tick.classList.toggle("active", active);
  });

  if (ui.ringCallouts) {
    ui.ringCallouts.innerHTML = "";
    if (showBand && hasCurrent && hasTarget) {
      if (Math.abs(current - target) < 0.05) {
        addRingCallout(current, tempToDeg(current, min, max));
      } else {
        addRingCallout(current, tempToDeg(current, min, max));
        addRingCallout(target, tempToDeg(target, min, max));
      }
    } else if (showBand && hasTarget) {
      addRingCallout(target, tempToDeg(target, min, max));
    }
  }
}

function applyTheme(state) {
  const action = getHvacAction(state);
  const preset = state?.attributes?.preset_mode;
  const mode = state?.state;
  const current = getCurrentTemperature(state);
  const target = getEffectiveTarget(state);
  const needsHeat =
    current != null &&
    target != null &&
    target > current + 0.05 &&
    mode !== "off";

  let ringState = "idle";
  if (mode === "off") ringState = "off";
  else if (preset === "eco") ringState = "eco";
  else if (preset === "boost") ringState = needsHeat ? "boost" : "idle";
  else if (needsHeat) ringState = "heating";
  else ringState = "idle";

  ui.thermoRing?.setAttribute("data-state", ringState);
  document.body.style.background = "";

  const labels = [];
  if (preset === "eco") labels.push("Eco");
  if (preset === "boost") labels.push("Boost");
  if (mode === "off") labels.push("Off");
  else if (!state || action === "unknown") labels.push("Idle overview");
  else labels.push(action === "idle" || action === "off" ? "Idle overview" : action.replace("_", " "));
  if (ui.actionPill) ui.actionPill.textContent = labels.filter(Boolean).join(" · ");

  if (ui.modeIcon) {
    ui.modeIcon.innerHTML = modeGlyph(state);
    ui.modeIcon.dataset.mode = preset === "eco" || preset === "boost" ? preset : mode || "heat";
  }
  ui.ringLeaf?.classList.toggle(
    "is-active",
    mode === "off" || preset === "eco" || preset === "away"
  );
}

function updateModeButtons(state) {
  const mode = state?.state;
  const preset = state?.attributes?.preset_mode;

  for (const button of ui.modeButtons) {
    const buttonMode = button.dataset.mode;
    const buttonPreset = button.dataset.preset;

    let active = false;
    if (buttonPreset) {
      active = preset === buttonPreset;
    } else if (buttonMode) {
      active = mode === buttonMode && preset !== "eco" && preset !== "boost";
    }

    button.classList.toggle("active", active);
  }
}

function renderBetterThermostatStatus() {
  const primaryState = getPrimaryState();
  const windowOpen = Boolean(primaryState?.attributes?.window_open);
  const summerMode = Boolean(primaryState?.attributes?.summer_mode_state);
  ui.windowBanner?.classList.toggle("hidden", !windowOpen);
  ui.summerPill?.classList.toggle("hidden", !summerMode);
}

function renderActiveClimate() {
  const state = getActiveState();
  syncOptimisticFromHa(state);
  syncOptimisticModeFromHa(state);
  const viewState = getEffectiveClimateState(state);
  const current = getCurrentTemperature(state);
  const target = getEffectiveTarget(state);
  const etaMins =
    state?.attributes?.time_to_temp_minutes ?? config.time_to_temp_minutes ?? null;
  let etaText = "";
  if (etaMins != null && Number.isFinite(Number(etaMins))) {
    const m = Math.round(Number(etaMins));
    etaText =
      m < 60
        ? `~${m} min to target`
        : `~${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""} to target`;
  }

  if (ui.heroLabel) ui.heroLabel.textContent = getDisplayLabel();
  // Centre dial = setpoint (or OFF); bottom-left = live room temp
  updateCentreControls(viewState, target);
  if (ui.targetTemp) ui.targetTemp.textContent = formatTemp(current, "°");
  if (ui.heroSubtitle) ui.heroSubtitle.textContent = etaText;

  applyTheme(viewState);
  updateRingGauge(state, current, target);
  updateModeButtons(viewState);
  renderBetterThermostatStatus();
}

function lockRequired() {
  return Boolean(config.temperatureLock) && Boolean(config.pinConfigured !== false);
}

function updatePinDisplay() {
  if (!ui.pinDisplay) return;
  const shown = pinBuffer.padEnd(4, "•").slice(0, 4).split("").join(" ");
  ui.pinDisplay.textContent = shown || "• • • •";
}

function showPinOverlay(action) {
  pendingUnlockAction = action;
  pinBuffer = "";
  ui.pinError?.classList.add("hidden");
  updatePinDisplay();
  ui.pinOverlay?.classList.remove("hidden");
}

function hidePinOverlay() {
  ui.pinOverlay?.classList.add("hidden");
  pendingUnlockAction = null;
  pinBuffer = "";
}

async function ensureUnlocked(action) {
  if (!lockRequired() || panelUnlocked) {
    await action();
    return;
  }
  showPinOverlay(action);
}

async function submitPin() {
  if (!client?.request || pinBuffer.length !== 4) return;
  try {
    const result = await client.request("neat_thermostat/verify_wall_pin", {
      pin: pinBuffer,
      panel_id: config.deviceId,
    });
    if (result?.ok) {
      panelUnlocked = true;
      const action = pendingUnlockAction;
      hidePinOverlay();
      if (action) await action();
      return;
    }
  } catch {
    // fall through
  }
  ui.pinError?.classList.remove("hidden");
  pinBuffer = "";
  updatePinDisplay();
}

function renderSensors() {
  const inside = client?.getState(config.sensors.insideTemp);

  if (ui.insideTemp) ui.insideTemp.textContent = formatSensor(inside?.state, "°");
  if (ui.outsideTemp) ui.outsideTemp.textContent = getOutsideTempDisplay();
  if (ui.insideHumidity) ui.insideHumidity.textContent = getHumidityDisplay();
  renderWeather();
}

function resolveWeatherEntityId() {
  const preferred = config.sensors.weather?.trim();
  if (preferred) {
    const state = client?.getState(preferred);
    if (state && state.state !== "unavailable" && state.state !== "unknown") {
      return preferred;
    }
  }

  const ids = client?.listEntityIds?.() ?? [];
  const match = ids.find((id) => {
    if (!id.startsWith("weather.")) return false;
    const state = client.getState(id);
    return state && state.state !== "unavailable" && state.state !== "unknown";
  });
  return match || preferred || "";
}

function renderWeather() {
  if (!ui.weatherBlock || !client) return;

  if (!isPrimaryView()) {
    ui.weatherBlock.hidden = true;
    return;
  }

  const sunId = config.sensors.sun || "sun.sun";
  const snapshot = readWeatherSnapshot(
    (entityId) => client.getState(entityId),
    () => client.listEntityIds?.() ?? [],
    config.sensors.weather,
    sunId
  );

  if (!snapshot.available && !snapshot.hasSun) {
    ui.weatherBlock.hidden = true;
    return;
  }

  ui.weatherBlock.hidden = false;

  if (snapshot.available) {
    if (ui.weatherIcon.getAttribute("src") !== snapshot.iconUrl) {
      ui.weatherIcon.src = snapshot.iconUrl;
    }
    ui.weatherTemp.textContent = snapshot.temperature;
    ui.weatherLabel.textContent = snapshot.label;
    ui.weatherIcon.hidden = false;
    ui.weatherTemp.hidden = false;
    ui.weatherLabel.hidden = false;
  } else {
    ui.weatherIcon.hidden = true;
    ui.weatherTemp.hidden = true;
    ui.weatherLabel.hidden = true;
  }

  ui.sunriseTime.textContent = snapshot.sunrise;
  ui.sunsetTime.textContent = snapshot.sunset;
}

function isPrimaryView() {
  return activeEntity === config.primary.entity;
}

function updateRoomNavigation() {
  const inRoom = !isPrimaryView();
  ui.backToHome.classList.toggle("hidden", !inRoom);
  if (ui.backToHome) {
    const homeName = config.primary?.name || "Heating";
    ui.backToHome.textContent = `← ${homeName}`;
    ui.backToHome.setAttribute("aria-label", `Back to ${homeName}`);
  }
  ui.app.classList.toggle("room-view", inRoom);
  renderWeather();
}

function goToPrimaryView() {
  clearOptimisticTarget();
  clearOptimisticMode();
  activeEntity = config.primary.entity;
  activeLabel = config.primary.name;
  activeStep = config.primary.step ?? 0.5;
  updateRoomNavigation();
  renderActiveClimate();
  renderRooms();
}

function renderRooms() {
  ui.roomStrip.innerHTML = "";

  const rooms = config.rooms || [];
  if (!rooms.length) {
    ui.roomStrip.classList.add("hidden");
    return;
  }
  ui.roomStrip.classList.remove("hidden");
  ui.roomStrip.classList.toggle("room-strip--few", rooms.length < 4);

  for (const room of rooms) {
    const state = getClimateState(room.entity);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "room-chip";
    if (room.entity === activeEntity) chip.classList.add("active");

    const current = getCurrentTemperature(state);
    const target = getTargetTemperature(state);
    const shown = target ?? current;

    chip.innerHTML = `
      <div class="name">${room.name}</div>
      <div class="temp">${formatTemp(shown)}</div>
    `;

    chip.addEventListener("click", () => {
      if (room.entity === activeEntity) {
        goToPrimaryView();
        return;
      }

      activeEntity = room.entity;
      activeLabel = room.name;
      activeStep = 0.5;
      clearOptimisticTarget();
      clearOptimisticMode();
      updateRoomNavigation();
      renderActiveClimate();
      renderRooms();
    });

    ui.roomStrip.appendChild(chip);
  }
}

function setConnectionState(connected) {
  ui.connectionDot?.classList.toggle("online", connected);
  ui.connectionDot?.classList.toggle("offline", !connected);
  if (ui.connectionLabel) {
    ui.connectionLabel.textContent = connected
      ? embeddedMode
        ? "HA Companion"
        : "Connected"
      : "Offline";
  }
}

function showApp() {
  ui.errorOverlay.classList.add("hidden");
  ui.deviceOverlay?.classList.add("hidden");
  ui.app.hidden = false;
}

function showError(message) {
  ui.errorMessage.textContent = message;
  ui.errorOverlay.classList.remove("hidden");
  ui.deviceOverlay?.classList.add("hidden");
  ui.app.hidden = true;
}

function openSetupPage() {
  window.location.href = "setup.html";
}

function applyConfig(nextConfig, { keepRoom = false } = {}) {
  config = nextConfig;
  if (!keepRoom || !config.rooms.some((room) => room.entity === activeEntity)) {
    activeEntity = config.primary.entity;
    activeLabel = config.primary.name;
    activeStep = config.primary.step ?? 0.5;
  }
  updateRoomNavigation();
  renderActiveClimate();
  renderSensors();
  renderRooms();

  const idleMs = config.display?.idleMs ?? config.screensaverIdleMs ?? 30000;
  if (screenSaver) screenSaver.idleMs = idleMs;
  if (displayPower) displayPower.config = config;
}

async function refreshConfigFromCentral() {
  if (!getStoredDeviceId()) return;
  try {
    const next = await loadConfig(client);
    const before = JSON.stringify({
      primary: config.primary,
      rooms: config.rooms,
      sensors: config.sensors,
      display: config.display,
    });
    const after = JSON.stringify({
      primary: next.primary,
      rooms: next.rooms,
      sensors: next.sensors,
      display: next.display,
    });
    if (before !== after) {
      applyConfig(next, { keepRoom: true });
    } else {
      config = next;
    }
  } catch {
    // Keep current config if refresh fails.
  }
}

async function showDevicePicker() {
  ui.app.hidden = true;
  ui.errorOverlay.classList.add("hidden");
  ui.deviceOverlay.classList.remove("hidden");

  let devices = [];
  try {
    const result = await client?.request?.("neat_thermostat/list_wall_panels");
    devices = (result?.wall_panels || []).map((p) => ({
      id: p.id,
      label: p.label || p.id,
    }));
  } catch {
    const registry = await loadRegistry(client);
    devices = listDevices(registry);
  }

  ui.devicePickList.innerHTML = "";

  for (const device of devices) {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<strong>${device.label}</strong><span class="id">${device.id}</span>`;
    button.addEventListener("click", async () => {
      setStoredDeviceId(device.id);
      config = await loadConfig(client);
      applyConfig(config);
      showApp();
      connect();
    });
    ui.devicePickList.appendChild(button);
  }

  if (!devices.length) {
    ui.devicePickList.innerHTML =
      `<p style="margin:0;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.4">No wall panels in Neat yet. Add them in Home Assistant → Neat Thermostat → Wall panels, or open setup.html.</p>`;
  }
}

function getWatchedEntities() {
  const weatherId = resolveWeatherEntityId();
  return new Set([
    activeEntity,
    config.primary.entity,
    ...config.rooms.map((room) => room.entity),
    config.sensors.insideTemp,
    config.sensors.outsideTemp,
    config.sensors.insideHumidity,
    config.sensors.weather,
    config.sensors.sun || "sun.sun",
    weatherId,
  ].filter(Boolean));
}

function handleStateChange(entityId) {
  const weatherRelated =
    entityId.startsWith("weather.") ||
    entityId.endsWith("_weather_condition") ||
    entityId === (config.sensors.sun || "sun.sun") ||
    entityId === config.sensors.weather;
  if (!weatherRelated && !getWatchedEntities().has(entityId)) return;
  renderActiveClimate();
  renderSensors();
  renderRooms();
}

async function adjustTemperature(delta) {
  await ensureUnlocked(() => {
    const state = getEffectiveClimateState(getActiveState());
    if (state?.state === "off") return;

    const base = getEffectiveTarget(state);
    if (base === null) return;

    const min = Number(state?.attributes?.min_temp);
    const max = Number(state?.attributes?.max_temp);
    const lo = Number.isFinite(min) ? min : 5;
    const hi = Number.isFinite(max) ? max : 30;
    const next = Math.min(hi, Math.max(lo, Number((base + delta).toFixed(1))));

    optimisticTarget = next;
    updateCentreControls(state, next);
    const current = getCurrentTemperature(state);
    if (ui.targetTemp) ui.targetTemp.textContent = formatTemp(current, "°");
    updateRingGauge(state, current, next);
    applyTheme(getEffectiveClimateState(state));

    // Debounce HA write so rapid taps stay instant and only the final value is sent
    clearTimeout(tempSendTimer);
    const entity = activeEntity;
    const value = next;
    const seq = ++tempSendSeq;
    tempSendTimer = setTimeout(() => {
      tempSendTimer = null;
      if (!client || seq !== tempSendSeq) return;
      client.setTemperature(entity, value).catch(() => {
        if (seq === tempSendSeq) {
          clearOptimisticTarget();
          renderActiveClimate();
        }
      });
    }, 280);
  });
}

async function connect() {
  client?.disconnect();
  clearInterval(configPollTimer);
  embeddedMode = isEmbeddedInHomeAssistant();

  if (!getStoredDeviceId()) {
    await showDevicePicker();
    return;
  }

  if (!embeddedMode && !isConfiguredForStandalone(config)) {
    openSetupPage();
    return;
  }

  const callbacks = {
    onConnectionChange: setConnectionState,
    onStateChange: handleStateChange,
  };

  try {
    if (embeddedMode) {
      client = new EmbeddedHomeAssistantClient(callbacks);
      await client.connect();
    } else {
      client = new HomeAssistantClient({
        url: config.haUrl,
        token: config.accessToken,
        ...callbacks,
      });
      client.connect();
    }

    setTimeout(() => refreshConfigFromCentral(), 800);
    configPollTimer = setInterval(() => refreshConfigFromCentral(), 60000);

    showApp();
    updateRoomNavigation();
    goToPrimaryView();
    renderSensors();

    screenSaver?.destroy();
    displayPower?.destroy();

    const idleMs = config.display?.idleMs ?? config.screensaverIdleMs ?? 30000;

    screenSaver = new ScreenSaver({
      overlay: ui.screensaver,
      idleMs,
      useHardwareSleep: Boolean(config.display?.panelEntity),
      onShow: () => {
        panelUnlocked = false;
      },
    });

    displayPower = new DisplayPower({
      client,
      config,
      onInteraction: () => screenSaver.wake(),
      onVisualSleep: () => screenSaver.showOverlay(),
    });
  } catch (error) {
    showError(error.message);
  }
}

ui.retrySetup.addEventListener("click", openSetupPage);
ui.openSetupFromPicker?.addEventListener("click", openSetupPage);
ui.saveDeviceId?.addEventListener("click", async () => {
  const id = slugifyDeviceId(ui.customDeviceId.value);
  if (!id) return;
  setStoredDeviceId(id);
  config = await loadConfig(client);
  applyConfig(config);
  showApp();
  connect();
});
ui.tempDown.addEventListener("click", () => adjustTemperature(-activeStep));
ui.tempUp.addEventListener("click", () => adjustTemperature(activeStep));
ui.backToHome.addEventListener("click", goToPrimaryView);
ui.zonePill?.addEventListener("click", () => {
  if (!isPrimaryView()) goToPrimaryView();
});

ui.pinPad?.addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button[data-digit]");
  if (!btn) return;
  const digit = btn.dataset.digit;
  ui.pinError?.classList.add("hidden");
  if (digit === "clear") {
    pinBuffer = "";
    updatePinDisplay();
    return;
  }
  if (digit === "ok") {
    await submitPin();
    return;
  }
  if (pinBuffer.length >= 4) return;
  pinBuffer += digit;
  updatePinDisplay();
  if (pinBuffer.length === 4) await submitPin();
});

function closeModeDrawer() {
  ui.modeDrawer?.classList.add("hidden");
  ui.modeFace?.setAttribute("aria-expanded", "false");
}

function toggleModeDrawer() {
  if (!ui.modeDrawer) return;
  const open = ui.modeDrawer.classList.toggle("hidden") === false;
  ui.modeFace?.setAttribute("aria-expanded", open ? "true" : "false");
}

ui.modeFace?.addEventListener("click", () => {
  toggleModeDrawer();
});

for (const button of ui.modeButtons) {
  button.addEventListener("click", async () => {
    await ensureUnlocked(async () => {
      const entity = activeEntity;

      if (button.dataset.preset === "eco") {
        applyOptimisticMode({ mode: "heat", preset: "eco" });
        closeModeDrawer();
        try {
          await client.setPresetMode(entity, "eco");
        } catch {
          clearOptimisticMode();
          renderActiveClimate();
        }
        return;
      }

      if (button.dataset.preset === "boost") {
        const state = getActiveState();
        const nextPreset = state?.attributes?.preset_mode === "boost" || optimisticMode?.preset === "boost"
          ? "none"
          : "boost";
        applyOptimisticMode({
          mode: nextPreset === "boost" ? (state?.state === "off" ? "heat" : state?.state || "heat") : state?.state || "heat",
          preset: nextPreset,
        });
        closeModeDrawer();
        try {
          await client.setPresetMode(entity, nextPreset);
        } catch {
          clearOptimisticMode();
          renderActiveClimate();
        }
        return;
      }

      if (button.dataset.mode) {
        const nextMode = button.dataset.mode;
        applyOptimisticMode({ mode: nextMode, preset: "none" });
        closeModeDrawer();
        try {
          const preset = getActiveState()?.attributes?.preset_mode;
          if (preset && preset !== "none") {
            await client.setPresetMode(entity, "none");
          }
          await client.setHvacMode(entity, nextMode);
        } catch {
          clearOptimisticMode();
          renderActiveClimate();
        }
      }
    });
  });
}

connect();
