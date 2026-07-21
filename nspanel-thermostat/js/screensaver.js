export class ScreenSaver {
  constructor({ overlay, idleMs = 30000, useHardwareSleep = false }) {
    this.overlay = overlay;
    this.idleMs = idleMs;
    this.useHardwareSleep = useHardwareSleep;
    this.timer = null;
    this.clockTimer = null;
    this.active = false;
  }

  showOverlay() {
    this.active = true;
    this.overlay.classList.remove("hidden");
    this.updateClock();
    clearInterval(this.clockTimer);
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
  }

  hideOverlay() {
    this.active = false;
    this.overlay.classList.add("hidden");
    clearInterval(this.clockTimer);
  }

  wake() {
    this.hideOverlay();
  }

  updateClock() {
    const now = new Date();
    const clock = this.overlay.querySelector("[data-clock]");
    const date = this.overlay.querySelector("[data-date]");
    if (clock) {
      clock.textContent = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (date) {
      date.textContent = now.toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
  }

  destroy() {
    clearInterval(this.clockTimer);
  }
}
