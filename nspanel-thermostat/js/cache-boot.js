/**
 * Cache-busting boot for Fully Kiosk / Android WebView.
 * Always loaded with ?t=Date.now() so this file itself is not sticky-cached.
 */
(function () {
  const VERSION_KEY = "nspanel-app-version";
  const page = document.documentElement.dataset.page || "app";

  const ASSETS = {
    app: {
      css: ["css/app.css"],
      modules: ["js/native-shell.js", "js/app.js"],
    },
    setup: {
      css: ["css/setup.css"],
      modules: ["js/setup.js"],
    },
  };

  function fullyClearCache() {
    try {
      if (typeof fully !== "undefined") {
        if (typeof fully.clearCache === "function") fully.clearCache();
        if (typeof fully.clearFormData === "function") fully.clearFormData();
        if (typeof fully.clearHistory === "function") fully.clearHistory();
        return true;
      }
    } catch {
      // Not running inside Fully Kiosk.
    }
    return false;
  }

  function hardReload(version) {
    const url = new URL(window.location.href);
    url.searchParams.set("_v", version);
    // Drop stale one-off cache busters except device id.
    url.searchParams.delete("t");
    fullyClearCache();
    window.location.replace(url.toString());
  }

  function injectStylesheet(href) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function injectModule(src) {
    const script = document.createElement("script");
    script.type = "module";
    script.src = src;
    document.body.appendChild(script);
  }

  function loadAssets(version) {
    const assets = ASSETS[page] || ASSETS.app;
    for (const href of assets.css) {
      injectStylesheet(`${href}?v=${encodeURIComponent(version)}`);
    }
    for (const src of assets.modules) {
      injectModule(`${src}?v=${encodeURIComponent(version)}`);
    }
  }

  async function readVersion() {
    const response = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("version.json missing");
    const data = await response.json();
    return String(data.version || data.build || Date.now());
  }

  async function boot() {
    let version = String(Date.now());
    try {
      version = await readVersion();
    } catch {
      // Fall back to timestamp so assets still load.
    }

    const previous = localStorage.getItem(VERSION_KEY);
    const urlVersion = new URLSearchParams(window.location.search).get("_v");

    if (previous && previous !== version && urlVersion !== version) {
      localStorage.setItem(VERSION_KEY, version);
      hardReload(version);
      return;
    }

    localStorage.setItem(VERSION_KEY, version);
    loadAssets(version);

    // Pick up deploys without manually clearing Android cache.
    window.setInterval(async () => {
      try {
        const latest = await readVersion();
        if (latest !== localStorage.getItem(VERSION_KEY)) {
          localStorage.setItem(VERSION_KEY, latest);
          hardReload(latest);
        }
      } catch {
        // Ignore transient fetch errors.
      }
    }, 60_000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
