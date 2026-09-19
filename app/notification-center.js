// In-app notifications for a player (Phase 18): what changed for this player between two tournament states, a small
// store with read/unread and cleanup, and the two Padelstar sounds (notification1 = your next match is ready,
// notification2 = any other live update for you). The OS/push notifications live in notification-system.js.
(function (global) {
  const STORAGE_KEY = "padelstar-notification-center";
  const SOUND_KEY = "padelstar-sounds";
  const VIBRATION_KEY = "padelstar-vibration";
  const MAX_ITEMS = 50;
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  function matchesOf(state) {
    return (state?.rounds ?? []).flatMap((round) => round.matches ?? []);
  }

  function teamIndexOf(match, playerId) {
    if (match?.teamOne?.players?.some((player) => player.id === playerId)) return 0;
    if (match?.teamTwo?.players?.some((player) => player.id === playerId)) return 1;
    return null;
  }

  // What is new for `playerId` in `next` compared with `previous`. Returns [{ key, kind, sound, matchId, values }].
  // Nothing is reported when there is no previous state of the same tournament (opening or switching tournament is not news).
  function detect(previous, next, playerId) {
    if (!playerId || !previous || !next || previous.id !== next.id) return [];
    const updates = [];
    const before = new Map(matchesOf(previous).map((match) => [match.id, match]));
    for (const match of matchesOf(next)) {
      const teamIndex = teamIndexOf(match, playerId);
      if (teamIndex === null) continue;
      const old = before.get(match.id);
      const values = { court: match.courtName ?? "", teams: `${match.teamOne?.displayName ?? ""} – ${match.teamTwo?.displayName ?? ""}` };

      if (match.state === "playing" && old?.state !== "playing") {
        updates.push({ key: `ready:${match.id}`, kind: "matchReady", sound: 1, matchId: match.id, values });
      }
      if (match.state === "awaitingApproval" && match.approval?.status === "pending") {
        const approvals = match.approval.approvals ?? [];
        const mine = approvals.some((entry) => entry.teamIndex === teamIndex);
        const wasPending = old?.state === "awaitingApproval" && old.approval?.status === "pending" && old.approval?.submittedAt === match.approval.submittedAt;
        if (!mine && !wasPending) {
          updates.push({ key: `approval:${match.id}:${match.approval.submittedAt ?? ""}`, kind: "approvalNeeded", sound: 2, matchId: match.id, values });
        }
      }
      if (match.state === "awaitingWithdrawalDecision" && match.withdrawal?.status === "pending" && match.withdrawal.teammateId === playerId
        && old?.state !== "awaitingWithdrawalDecision") {
        updates.push({ key: `withdrawal:${match.id}`, kind: "withdrawalDecision", sound: 2, matchId: match.id, values: { ...values, absent: match.withdrawal.absent?.name ?? "" } });
      }
      const corrections = match.correctionHistory?.length ?? 0;
      if (corrections > (old?.correctionHistory?.length ?? 0)) {
        updates.push({ key: `corrected:${match.id}:${corrections}`, kind: "resultCorrected", sound: 2, matchId: match.id, values });
      }
    }
    if (next.status === "Avsluttet" && previous.status !== "Avsluttet") {
      updates.push({ key: `finished:${next.id}`, kind: "tournamentFinished", sound: 2, matchId: null, values: {} });
    }
    return updates;
  }

  // The sound to play for a batch of updates: notification1 wins over notification2, nothing when there is nothing.
  function soundFor(updates) {
    if (!updates.length) return null;
    return updates.some((update) => update.sound === 1) ? 1 : 2;
  }

  function createStore({ storage, now = () => Date.now() } = {}) {
    function read() {
      try {
        const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "null");
        return parsed && typeof parsed === "object" && Array.isArray(parsed.items) ? parsed : { items: [] };
      } catch { return { items: [] }; }
    }
    function write(data) {
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ }
    }

    // Drops entries older than a week and entries that belong to another tournament or player (lifecycle cleanup).
    function prune(tournamentId, playerId) {
      const data = read();
      const cutoff = now() - MAX_AGE_MS;
      data.items = data.items.filter((item) => item.at >= cutoff && item.tournamentId === tournamentId && item.playerId === playerId).slice(-MAX_ITEMS);
      write(data);
      return data.items.length;
    }

    // Adds updates that are not already stored; returns the ones that were new.
    function add(tournamentId, playerId, updates) {
      const data = read();
      const known = new Set(data.items.filter((item) => item.tournamentId === tournamentId && item.playerId === playerId).map((item) => item.key));
      const fresh = [];
      for (const update of updates) {
        if (known.has(update.key)) continue;
        known.add(update.key);
        const item = { id: `${now()}-${Math.random().toString(36).slice(2, 8)}`, tournamentId, playerId, at: now(), read: false, ...update };
        data.items.push(item);
        fresh.push(item);
      }
      data.items = data.items.slice(-MAX_ITEMS);
      write(data);
      return fresh;
    }

    function list(tournamentId, playerId) {
      // newest first; items stored in the same millisecond keep the later one first (the sort is stable)
      return read().items.filter((item) => item.tournamentId === tournamentId && item.playerId === playerId).reverse().sort((a, b) => b.at - a.at);
    }

    function unreadCount(tournamentId, playerId) {
      return list(tournamentId, playerId).filter((item) => !item.read).length;
    }

    function markRead(id) {
      const data = read();
      const item = data.items.find((entry) => entry.id === id);
      if (!item || item.read) return false;
      item.read = true;
      write(data);
      return true;
    }

    function markAllRead(tournamentId, playerId) {
      const data = read();
      let changed = 0;
      data.items.forEach((item) => {
        if (item.tournamentId === tournamentId && item.playerId === playerId && !item.read) { item.read = true; changed += 1; }
      });
      if (changed) write(data);
      return changed;
    }

    return { add, list, unreadCount, markRead, markAllRead, prune };
  }

  function soundsEnabled(storage) {
    try { return storage?.getItem(SOUND_KEY) !== "off"; } catch { return true; }
  }

  function setSoundsEnabled(storage, enabled) {
    try { storage?.setItem(SOUND_KEY, enabled ? "on" : "off"); } catch { /* ignore */ }
  }

  function vibrationEnabled(storage) {
    try { return storage?.getItem(VIBRATION_KEY) !== "off"; } catch { return true; }
  }

  function setVibrationEnabled(storage, enabled) {
    try { storage?.setItem(VIBRATION_KEY, enabled ? "on" : "off"); } catch { /* ignore */ }
  }

  // Vibration is not available everywhere (not on iPhone, not on most desktops): then this simply does nothing.
  function vibrationSupported(navigatorRef = global.navigator) {
    return typeof navigatorRef?.vibrate === "function";
  }

  // notification1 (your match is ready) is a double pulse, notification2 a single short one.
  function vibrate(number, navigatorRef = global.navigator) {
    if (!vibrationSupported(navigatorRef) || ![1, 2].includes(number)) return false;
    try { return Boolean(navigatorRef.vibrate(number === 1 ? [200, 100, 200] : [120])); } catch { return false; }
  }

  // Plays one of the two sounds. Browsers may refuse until the person has interacted with the page: that is not an error.
  function playSound(number, { AudioClass = global.Audio, baseUrl = "assets/sounds/" } = {}) {
    if (!AudioClass || ![1, 2].includes(number)) return false;
    try {
      const probe = new AudioClass();
      const extension = probe.canPlayType?.("audio/mpeg") ? "mp3" : "m4a";
      const audio = new AudioClass(`${baseUrl}notification${number}.${extension}`);
      audio.volume = 0.8;
      const played = audio.play?.();
      played?.catch?.(() => {});
      return true;
    } catch { return false; }
  }

  global.PadelstarNotificationCenter = { detect, soundFor, createStore, soundsEnabled, setSoundsEnabled, vibrationEnabled, setVibrationEnabled, vibrationSupported, vibrate, playSound, STORAGE_KEY, SOUND_KEY, VIBRATION_KEY, MAX_ITEMS, MAX_AGE_MS };
})(window);
