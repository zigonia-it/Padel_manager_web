(function initializeBackupFormat(global) {
  function create({ isValidState, migrateState, sanitizeState }) {
    function serialize(state) {
      return JSON.stringify({
        exportedAt: new Date().toISOString(),
        app: "Padelstar",
        version: 1,
        tournament: sanitizeState(state),
      }, null, 2);
    }

    function parse(serializedState) {
      const parsed = JSON.parse(serializedState);
      const importedState = parsed.tournament ?? parsed;
      if (!isValidState(importedState)) throw new Error("Invalid backup");
      return migrateState(importedState);
    }

    return { parse, serialize };
  }

  global.PadelstarBackupFormat = { create };
})(window);
