(function initPadelstarPersistence(global) {
  function create({ storage, localStorage, offlineStorage }) {
    function mirrorKeys(keys) {
      if (!offlineStorage?.isSupported()) return;
      offlineStorage.mirrorFromLocalStorage(keys, localStorage).catch((error) => {
        console.warn("IndexedDB mirror failed", error);
      });
    }

    function removeKeys(keys) {
      if (!offlineStorage?.isSupported()) return;
      Promise.all(keys.map((key) => offlineStorage.removeRecord(key))).catch((error) => {
        console.warn("IndexedDB cleanup failed", error);
      });
    }

    function writeTournamentState({ state, stateKey, recoveryKey, isValidState }) {
      storage.writeJson(localStorage, stateKey, state);
      if (isValidState(state)) storage.writeJson(localStorage, recoveryKey, state);
      mirrorKeys([stateKey, recoveryKey]);
    }

    return { mirrorKeys, removeKeys, writeTournamentState };
  }

  global.PadelstarPersistence = { create };
})(window);
