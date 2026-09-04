(() => {
  function create({
    getState,
    getElements,
    storage,
    storageKey,
    navigatorRef,
    i18n,
    i18nUi,
    localizeGeneratedCourtNames,
    applyTheme,
    getProfile,
    syncProfile,
    syncJoinPreview,
    render,
  }) {
    function translate(key, values = {}) {
      const language = getState()?.settings?.language ?? "nb";
      return i18n?.translate(language, key, values) ?? key;
    }

    function loadUserLanguage(fallbackLanguage = "nb") {
      return i18nUi.loadUserLanguage({
        storage,
        storageKey,
        fallbackLanguage,
        i18n,
        navigatorRef,
        onMode: (mode) => { getState().settings.languageMode = mode; },
      });
    }

    function applyLanguage() {
      localizeGeneratedCourtNames?.();
      i18nUi.applyLanguage({
        state: getState(),
        elements: getElements(),
        i18n,
        translate,
        applyTheme,
      });
    }

    function syncLanguageOptions() {
      const state = getState();
      const elements = getElements();
      i18nUi.syncLanguageOptions({
        select: elements.languageSelect,
        i18n,
        currentLanguage: state.settings?.language ?? "nb",
        languageMode: state.settings?.languageMode ?? "device",
      });
    }

    function handleChange() {
      const state = getState();
      const select = getElements().languageSelect;
      if (select.value === "device") {
        state.settings.languageMode = "device";
        storage.setItem(storageKey, "device");
        state.settings.language = loadUserLanguage(state.settings.language);
      } else {
        state.settings.languageMode = "manual";
        state.settings.language = i18n?.normalizeLanguage(select.value) ?? select.value;
        storage.setItem(storageKey, state.settings.language);
      }
      const profile = getProfile?.();
      if (profile) void syncProfile?.(profile, state.settings.language);
      applyLanguage();
      syncJoinPreview?.();
      render?.();
      syncLanguageOptions();
    }

    return { loadUserLanguage, applyLanguage, syncLanguageOptions, translate, handleChange };
  }

  window.PadelstarLanguageController = { create };
})();
