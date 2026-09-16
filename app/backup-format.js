(function initializeBackupFormat(global) {
  function create({ isValidState, migrateState }) {
    function serialize(state) {
      // Unlike the remote/shared-state payload, a backup is for the same
      // admin to restore their own session later, so it must keep
      // adminToken/selectedPlayerId/ownerUserId intact — stripping them
      // (as the shared-state sanitizer does) left restore unable to
      // re-establish admin identity, falling back to the read-only
      // spectator view instead. Whoever holds this file can act as the
      // tournament's admin, same as whoever holds the admin link today.
      return JSON.stringify({
        exportedAt: new Date().toISOString(),
        app: "Padelstar",
        version: 1,
        tournament: state,
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
