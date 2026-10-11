export class DisplayPower {
  constructor({ client, config, onInteraction, onVisualSleep }) {
    this.client = client;
    this.config = config.display ?? {};
    this.onInteraction = onInteraction;
    this.onVisualSleep = onVisualSleep;
    this.idleMs = this.config.idleMs ?? 30000;
    this.timer = null;
    this.asleep = false;
    this.bindEvents();
    this.resetTimer();
  }

  bindEvents() {
    const reset = () => this.resetTimer();
    for (const eventName of ["pointerdown", "touchstart", "keydown", "click"]) {
      document.addEventListener(eventName, reset, { passive: true });
    }
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.resetTimer();
      }
    });
  }

  resetTimer() {
    this.onInteraction?.();
    clearTimeout(this.timer);

    if (this.asleep) {
      this.asleep = false;
    }

    this.timer = setTimeout(() => this.sleep(), this.idleMs);
  }

  async sleep() {
    this.asleep = true;
    const panelEntity = this.config.panelEntity;

    if (panelEntity && this.client) {
      try {
        const state = this.client.getState(panelEntity);
        if (state?.entity_id?.startsWith("select.")) {
          await this.client.callService("select", "select_option", {
            entity_id: panelEntity,
            option: "sleep",
          });
          return;
        }

        if (state?.entity_id?.startsWith("button.")) {
          await this.client.callService("button", "press", {
            entity_id: panelEntity,
          });
          return;
        }
      } catch {
        // Fall back to the on-screen overlay if the panel command fails.
      }
    }

    this.onVisualSleep?.();
  }

  destroy() {
    clearTimeout(this.timer);
  }
}
