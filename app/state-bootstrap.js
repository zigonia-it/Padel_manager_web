(function initializeStateBootstrap(global) {
  function create({ defaultState, localStorage, migrateState, parseJson, recoveryStorageKey, setRecoveredFromLastGood, storageKey }) {
    function loadSavedState(serializedState) {
      if (!serializedState) return null;
      const parsed = parseJson(serializedState);
      return parsed ? migrateState(parsed) : null;
    }

    function loadState() {
      const stored = localStorage.getItem(storageKey);
      const recovered = loadSavedState(stored);
      if (recovered) return recovered;
      const recoveryState = loadSavedState(localStorage.getItem(recoveryStorageKey));
      if (recoveryState) {
        setRecoveredFromLastGood(true);
        return recoveryState;
      }
      return structuredClone(defaultState);
    }

    return { loadSavedState, loadState };
  }

  global.PadelstarStateBootstrap = { create };
})(window);
