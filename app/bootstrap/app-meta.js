(function attachAppMeta(global) {
  const APP_VERSION = "0.8.0";

  function create({ navigator = global.navigator, window = global, elements = {}, startYear = 2026 } = {}) {
    function syncAppVersion() {
      if (!elements.appVersionText) return;
      elements.appVersionText.textContent = `v. ${APP_VERSION}`;
    }

    function registerServiceWorker() {
      if (!("serviceWorker" in navigator)) return;
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch((error) => {
          console.warn("Service worker registration failed", error);
        });
      });
    }

    function syncCopyrightYear() {
      if (!elements.copyrightYearRange) return;
      const currentYear = new Date().getFullYear();
      elements.copyrightYearRange.textContent = currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`;
    }

    return Object.freeze({ registerServiceWorker, syncCopyrightYear, syncAppVersion });
  }

  global.PadelstarAppMeta = Object.freeze({ create, APP_VERSION });
}(window));
