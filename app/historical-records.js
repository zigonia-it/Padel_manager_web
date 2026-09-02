window.PadelstarHistoricalRecords = (() => {
  function load(storage, key) {
    try {
      const value = JSON.parse(storage.getItem(key) ?? "[]");
      return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string") : [];
    } catch { return []; }
  }

  function create(state, retentionPolicy, now = new Date()) {
    const endedAt = new Date(now).toISOString();
    const retained = retentionPolicy?.sanitizeEndedTournamentState ? retentionPolicy.sanitizeEndedTournamentState({ ...structuredClone(state), status: "Avsluttet" }) : structuredClone(state);
    delete retained.adminToken;
    delete retained.playerToken;
    delete retained.selectedPlayerId;
    const matches = (retained.rounds ?? []).flatMap((round) => round.matches ?? []);
    const ratings = window.PadelstarTournamentInsights?.calculateRatings(matches) ?? {};
    return { id: retained.id, tournamentName: retained.name, inviteCode: retained.inviteCode, format: retained.settings?.format ?? "roundRobin", seasonId: retained.settings?.seasonId ?? endedAt.slice(0, 4), endedAt, ratings, state: retained };
  }

  function record(storage, key, entry, limit = 100) {
    const next = load(storage, key).filter((item) => item.id !== entry.id);
    next.unshift(entry);
    storage.setItem(key, JSON.stringify(next.slice(0, limit)));
    return next;
  }

  function get(storage, key, id) { return load(storage, key).find((entry) => entry.id === id) ?? null; }

  return { create, get, load, record };
})();
