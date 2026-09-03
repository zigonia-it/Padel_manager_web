(function attachPadelstarTournamentLibrary(global) {
  "use strict";

  function create({ storage, localStorage, storageKey, migrateState }) {
    const empty = () => ({ version: 1, tournaments: [] });

    function read() {
      const parsed = storage.readJson(localStorage, storageKey);
      if (!parsed || !Array.isArray(parsed.tournaments)) return empty();
      return {
        version: 1,
        tournaments: parsed.tournaments
          .filter((item) => item?.state && typeof item.state.id === "string")
          .map((item) => ({
            id: item.state.id,
            updatedAt: item.updatedAt ?? item.state.updatedAt ?? null,
            state: migrateState(item.state),
          })),
      };
    }

    function write(library) {
      storage.writeJson(localStorage, storageKey, library);
    }

    function list() {
      return read().tournaments.sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
    }

    function upsert(state) {
      if (!state?.id) return;
      const library = read();
      const entry = { id: state.id, updatedAt: new Date().toISOString(), state: structuredClone(state) };
      const index = library.tournaments.findIndex((item) => item.id === state.id);
      if (index >= 0) library.tournaments[index] = entry;
      else library.tournaments.push(entry);
      write(library);
    }

    function get(id) {
      return list().find((item) => item.id === id)?.state ?? null;
    }

    function remove(id) {
      const library = read();
      const tournaments = library.tournaments.filter((item) => item.id !== id);
      if (tournaments.length !== library.tournaments.length) write({ ...library, tournaments });
    }

    return { get, list, remove, upsert };
  }

  global.PadelstarTournamentLibrary = { create };
})(window);
