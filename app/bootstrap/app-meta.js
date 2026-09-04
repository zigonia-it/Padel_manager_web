(function attachAppMeta(global) {
  function create({ navigator = global.navigator, window = global, elements = {}, startYear = 2026 } = {}) {
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

    return Object.freeze({ registerServiceWorker, syncCopyrightYear });
  }

  global.PadelstarAppMeta = Object.freeze({ create });
}(window));
