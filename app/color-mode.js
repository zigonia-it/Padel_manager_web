// Color mode: light and dark share one markup and one set of components; only the token values differ (styles/tokens.css).
// The theme is set on <html data-theme="dark|light">. Resolution order: (1) the saved choice, (2) the device's prefers-color-scheme
// (read once when the page loads: the first visit), (3) dark. A choice is saved on this device and applied at once, without reloading.
(function (global) {
  const STORAGE_KEY = "padelstar-theme";
  const THEME_COLOR = { dark: "#1b2438", light: "#eef3fa" };

  // "light" | "dark" when the person chose one, otherwise null (follow the device).
  function readPreference(storage) {
    try {
      const value = storage?.getItem(STORAGE_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch { return null; }
  }

  // The one place that decides which theme is shown.
  function resolveMode({ preference = null, systemScheme = null } = {}) {
    if (preference === "light" || preference === "dark") return preference;
    if (systemScheme === "light") return "light";
    return "dark";
  }

  function systemScheme(matchMedia) {
    try {
      if (matchMedia?.("(prefers-color-scheme: light)")?.matches) return "light";
      if (matchMedia?.("(prefers-color-scheme: dark)")?.matches) return "dark";
    } catch { /* no media query support */ }
    return null;
  }

  function create({ document, storage, matchMedia = global.matchMedia?.bind(global) } = {}) {
    const root = document?.documentElement;
    let mode = "dark";

    function preference() { return readPreference(storage); }

    function apply() {
      mode = resolveMode({ preference: preference(), systemScheme: systemScheme(matchMedia) });
      root?.setAttribute?.("data-theme", mode);
      if (root?.style) root.style.colorScheme = mode;
      document?.querySelector?.('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[mode]);
      syncControls();
      return mode;
    }

    // "light" | "dark" | "system" (system = remove the manual choice and follow the device again)
    function setPreference(value) {
      try {
        if (value === "light" || value === "dark") storage?.setItem(STORAGE_KEY, value);
        else storage?.removeItem(STORAGE_KEY);
      } catch { /* the choice still applies until the page is closed */ }
      return apply();
    }

    // Buttons carry data-theme-option="light|dark|system"; all copies of the control stay in step.
    function syncControls() {
      const chosen = preference() ?? "system";
      document?.querySelectorAll?.("[data-theme-option]")?.forEach((button) => {
        const option = button.dataset.themeOption;
        const active = option === chosen || (chosen === "system" && option === mode && button.dataset.themeFollows === "resolved");
        button.setAttribute("aria-pressed", String(active));
        button.classList.toggle("is-active", active);
      });
    }

    function bind() {
      document?.addEventListener?.("click", (event) => {
        const button = event.target.closest?.("[data-theme-option]");
        if (button) setPreference(button.dataset.themeOption);
      });
      // The device's preference decides only when there is no saved choice, and only when the page loads (first visit).
      apply();
    }

    return { bind, apply, setPreference, preference, mode: () => mode };
  }

  global.PadelstarColorMode = { create, resolveMode, readPreference, systemScheme, STORAGE_KEY, THEME_COLOR };
})(window);
