(() => {
  function readJson(storage, key, fallback = null) {
    const serialized = storage.getItem(key);
    return parseJson(serialized, fallback);
  }

  function parseJson(serialized, fallback = null) {
    if (!serialized) return fallback;
    try {
      return JSON.parse(serialized);
    } catch {
      return fallback;
    }
  }

  function writeJson(storage, key, value) {
    storage.setItem(key, JSON.stringify(value));
  }

  function remove(storage, key) {
    storage.removeItem(key);
  }

  window.PadelstarStorage = { readJson, parseJson, writeJson, remove };
})();
