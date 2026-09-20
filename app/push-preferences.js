// Which push messages this device wants (Phase 18, 0.15). The choices are kept here and copied to the device's push
// subscription in the database, where the push-send function enforces them before it sends (supabase/functions/push-send).
(function (global) {
  const STORAGE_KEY = "padelstar-push-preferences";
  const DEFAULTS = { match: true, result: true, withdrawal: true, onlyMine: false };
  const KINDS = { match_started: "match", round_ready: "match", result_corrected: "result", withdrawal_decision: "withdrawal" };

  // Only the known switches, only booleans; anything missing is the default.
  function normalize(value) {
    const source = value && typeof value === "object" ? value : {};
    return Object.fromEntries(Object.entries(DEFAULTS).map(([key, fallback]) => [key, typeof source[key] === "boolean" ? source[key] : fallback]));
  }

  function load(storage) {
    try { return normalize(JSON.parse(storage.getItem(STORAGE_KEY))); } catch { return normalize(null); }
  }

  function save(storage, prefs) {
    const clean = normalize(prefs);
    try { storage.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch { /* blocked storage: the defaults apply */ }
    return clean;
  }

  // The category of a push message kind (what the tournament's admin sends).
  function categoryFor(kind) {
    return KINDS[kind] ?? "match";
  }

  const SWITCHES = { match: "#pushPrefMatch", result: "#pushPrefResult", withdrawal: "#pushPrefWithdrawal", onlyMine: "#pushPrefOnlyMine" };

  // Connects the switches on the profile page. `onChange(prefs)` runs after a change has been saved.
  function bind({ document, storage, onChange = () => {} }) {
    const prefs = load(storage);
    const inputs = Object.fromEntries(Object.entries(SWITCHES).map(([key, selector]) => [key, document.querySelector(selector)]));
    for (const [key, input] of Object.entries(inputs)) {
      if (!input) continue;
      input.checked = prefs[key];
      input.addEventListener("change", () => {
        const next = save(storage, { ...load(storage), [key]: input.checked });
        onChange(next);
      });
    }
    return { prefs: () => load(storage) };
  }

  global.PadelstarPushPreferences = { DEFAULTS, STORAGE_KEY, normalize, load, save, categoryFor, bind };
})(window);
