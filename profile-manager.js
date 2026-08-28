window.PadelstarProfiles = (() => {
  const deletionWindowDays = 30;

  function nowIso(now = new Date()) {
    return new Date(now).toISOString();
  }

  function addDays(value, days) {
    const date = new Date(value);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
  }

  function createProfile(displayName = "", avatarId = "smash", now = new Date(), id = crypto.randomUUID(), accessToken = crypto.randomUUID()) {
    return normalizeProfile({
      id,
      displayName: String(displayName).trim(),
      avatarId,
      createdAt: nowIso(now),
      updatedAt: nowIso(now),
      deletionRequestedAt: null,
      deletionScheduledFor: null,
      accessToken,
    });
  }

  function normalizeProfile(profile) {
    if (!profile || typeof profile !== "object" || typeof profile.id !== "string") return null;
    return {
      id: profile.id,
      displayName: String(profile.displayName ?? "").trim().slice(0, 64),
      avatarId: ["smash", "serve", "wall", "lob"].includes(profile.avatarId) ? profile.avatarId : "smash",
      createdAt: profile.createdAt ?? nowIso(),
      updatedAt: profile.updatedAt ?? profile.createdAt ?? nowIso(),
      deletionRequestedAt: profile.deletionRequestedAt ?? null,
      deletionScheduledFor: profile.deletionScheduledFor ?? null,
      accessToken: typeof profile.accessToken === "string" ? profile.accessToken : null,
    };
  }

  function loadProfile(storage, key) {
    try {
      return normalizeProfile(JSON.parse(storage.getItem(key) ?? "null"));
    } catch {
      return null;
    }
  }

  function saveProfile(storage, key, profile) {
    const normalized = normalizeProfile({ ...profile, updatedAt: nowIso() });
    storage.setItem(key, JSON.stringify(normalized));
    return normalized;
  }

  function requestDeletion(profile, now = new Date()) {
    const requestedAt = nowIso(now);
    return normalizeProfile({
      ...profile,
      deletionRequestedAt: requestedAt,
      deletionScheduledFor: addDays(requestedAt, deletionWindowDays),
      updatedAt: requestedAt,
    });
  }

  function cancelDeletion(profile) {
    return normalizeProfile({
      ...profile,
      deletionRequestedAt: null,
      deletionScheduledFor: null,
      updatedAt: nowIso(),
    });
  }

  function shouldDelete(profile, now = new Date()) {
    return Boolean(profile?.deletionScheduledFor && new Date(profile.deletionScheduledFor).getTime() <= new Date(now).getTime());
  }

  function recordHistory(storage, key, entry) {
    const existing = loadHistory(storage, key);
    const next = existing.filter((item) => item.id !== entry.id);
    next.push({ ...entry, recordedAt: entry.recordedAt ?? nowIso() });
    next.sort((left, right) => String(right.endedAt ?? right.recordedAt).localeCompare(String(left.endedAt ?? left.recordedAt)));
    storage.setItem(key, JSON.stringify(next.slice(0, 500)));
    return next;
  }

  function loadHistory(storage, key) {
    try {
      const parsed = JSON.parse(storage.getItem(key) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string") : [];
    } catch {
      return [];
    }
  }

  function historyForProfile(history, profileId) {
    return history.filter((entry) => entry.profileId === profileId);
  }

  function summarizeHistory(history) {
    return history.reduce((summary, entry) => ({
      tournaments: summary.tournaments + 1,
      wins: summary.wins + Number(entry.wins ?? 0),
      matches: summary.matches + Number(entry.matches ?? 0),
      points: summary.points + Number(entry.points ?? 0),
      sets: summary.sets + Number(entry.sets ?? 0),
      games: summary.games + Number(entry.games ?? 0),
    }), { tournaments: 0, wins: 0, matches: 0, points: 0, sets: 0, games: 0 });
  }

  return {
    addDays,
    cancelDeletion,
    createProfile,
    deletionWindowDays,
    historyForProfile,
    loadHistory,
    loadProfile,
    normalizeProfile,
    recordHistory,
    requestDeletion,
    shouldDelete,
    summarizeHistory,
  };
})();
