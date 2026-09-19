// The language of the standalone pages (guide, privacy): the choice saved by the app, else the device language.
// The app stores "device" when the user picked "device language", so anything other than a supported code means "follow the device".
(function (global) {
  const STORAGE_KEY = "padelstar-language";

  function fromDevice(supported, fallback, navigatorRef) {
    const codes = [...(navigatorRef?.languages ?? []), navigatorRef?.language].filter(Boolean).map((code) => String(code).toLowerCase());
    for (const code of codes) {
      const direct = supported.find((language) => code === language || code.startsWith(`${language}-`));
      if (direct) return direct;
      if ((code.startsWith("no") || code.startsWith("nb") || code.startsWith("nn")) && supported.includes("nb")) return "nb";
    }
    return fallback;
  }

  function resolve({ supported = ["nb", "en"], fallback = "nb", storage = global.localStorage, navigatorRef = global.navigator } = {}) {
    let stored = null;
    try { stored = storage?.getItem(STORAGE_KEY); } catch { /* storage unavailable */ }
    if (supported.includes(stored)) return stored;
    return fromDevice(supported, fallback, navigatorRef);
  }

  global.PadelstarPageLanguage = { resolve, STORAGE_KEY };
})(window);
