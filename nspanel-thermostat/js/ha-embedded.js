export class EmbeddedHomeAssistantClient {
  constructor({ onStateChange, onConnectionChange }) {
    this.onStateChange = onStateChange;
    this.onConnectionChange = onConnectionChange;
    this.hass = null;
    this.unsubscribe = null;
    this.connected = false;
  }

  async connect() {
    this.hass = await this.waitForParentHass();
    if (!this.hass) {
      throw new Error("Could not connect to Home Assistant dashboard session");
    }

    this.unsubscribe = this.hass.connection.subscribeEntities((entities) => {
      for (const [entityId, state] of Object.entries(entities)) {
        this.onStateChange?.(entityId, state);
      }
    });

    this.setConnected(true);
    for (const [entityId, state] of Object.entries(this.hass.states)) {
      this.onStateChange?.(entityId, state);
    }
  }

  async waitForParentHass(timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const homeAssistant = window.parent?.document?.querySelector("home-assistant");
        if (homeAssistant?.hass?.states) {
          return homeAssistant.hass;
        }
      } catch {
        // Ignore cross-origin access errors while the parent frame loads.
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return null;
  }

  setConnected(value) {
    if (this.connected === value) return;
    this.connected = value;
    this.onConnectionChange?.(value);
  }

  getState(entityId) {
    return this.hass?.states?.[entityId] ?? null;
  }

  listEntityIds() {
    return Object.keys(this.hass?.states ?? {});
  }

  async getUserData(key) {
    const result = await this.hass.connection.sendMessagePromise({
      type: "frontend/get_user_data",
      key,
    });
    return result?.value ?? null;
  }

  async setUserData(key, value) {
    await this.hass.connection.sendMessagePromise({
      type: "frontend/set_user_data",
      key,
      value,
    });
  }

  async callService(domain, service, serviceData = {}) {
    await this.hass.callService(domain, service, serviceData, undefined, true, true);
  }

  async setTemperature(entityId, temperature) {
    return this.callService("climate", "set_temperature", {
      entity_id: entityId,
      temperature,
    });
  }

  async setHvacMode(entityId, hvacMode) {
    return this.callService("climate", "set_hvac_mode", {
      entity_id: entityId,
      hvac_mode: hvacMode,
    });
  }

  async setPresetMode(entityId, presetMode) {
    return this.callService("climate", "set_preset_mode", {
      entity_id: entityId,
      preset_mode: presetMode,
    });
  }

  async request(type, payload = {}) {
    return this.hass.connection.sendMessagePromise({ type, ...payload });
  }

  disconnect() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.hass = null;
    this.setConnected(false);
  }
}
