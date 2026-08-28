window.PadelstarState = (() => {
  function migrateState(nextState, defaults, helpers) {
    nextState.settings = {
      ...defaults.settings,
      ...(nextState.settings ?? {}),
    };
    if (!["roundRobin", "cup"].includes(nextState.settings.format)) nextState.settings.format = "roundRobin";
    if (!["auto", "manual"].includes(nextState.settings.cupTeamSetupMode)) nextState.settings.cupTeamSetupMode = "auto";
    nextState.settings.includesThirdPlaceMatch = Boolean(nextState.settings.includesThirdPlaceMatch);
    nextState.adminToken ??= null;
    nextState.playerToken ??= null;
    nextState.revision = Number.isInteger(nextState.revision) && nextState.revision >= 0 ? nextState.revision : 0;
    nextState.selectedPlayerId ??= null;
    nextState.players ??= [];
    nextState.courts ??= structuredClone(defaults.courts);
    nextState.schedule ??= helpers.buildSchedule(nextState.players, nextState.settings.format);
    nextState.rounds ??= [];
    nextState.cup ??= null;
    nextState.cupTeams = Array.isArray(nextState.cupTeams) ? nextState.cupTeams : [];
    nextState.players = nextState.players.map((player, index) => ({
      active: true,
      availability: "active",
      participantType: "player",
      accent: helpers.accents[index % helpers.accents.length],
      avatarId: helpers.defaultAvatarId,
      joinStatus: "joined",
      joinedFrom: "manual",
      createdAt: new Date().toISOString(),
      ...player,
    })).map((player, index) => ({
      ...player,
      accent: helpers.normalizeAccent(player.accent, index),
      availability: player.availability === "away" ? "away" : "active",
    }));
    nextState.rounds = nextState.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => migrateMatch(match, nextState.id, helpers)),
    }));
    return nextState;
  }

  function migrateMatch(match, tournamentId, helpers) {
    if (match.teamOne && match.teamTwo) {
      return {
        currentGame: { teamOne: 0, teamTwo: 0 },
        completedSets: [],
        sittingOut: [],
        isThirdPlaceMatch: false,
        lastScoredMatchState: null,
        ...match,
      };
    }
    return {
      id: match.id,
      tournamentId,
      rotationNumber: match.roundNumber ?? 1,
      courtId: match.courtId,
      courtName: match.courtName,
      teamOne: helpers.createTeam(match.team1.map(helpers.getPlayerById).filter(Boolean)),
      teamTwo: helpers.createTeam(match.team2.map(helpers.getPlayerById).filter(Boolean)),
      sittingOut: [],
      state: match.status === "Completed" ? "finished" : match.status === "Active" ? "playing" : "waiting",
      completedSets: [],
      currentSet: {
        teamOne: match.scoreTeam1 ?? 0,
        teamTwo: match.scoreTeam2 ?? 0,
      },
      currentGame: { teamOne: 0, teamTwo: 0 },
      startingTeamIndex: 0,
      winnerTeamIndex: match.scoreTeam1 > match.scoreTeam2 ? 0 : match.scoreTeam2 > match.scoreTeam1 ? 1 : null,
      isWalkover: false,
      isThirdPlaceMatch: false,
      lastScoredMatchState: null,
      completedAt: match.completedAt,
    };
  }

  function readSyncMetadata(storage, syncStorageKey) {
    try {
      const parsed = JSON.parse(storage.getItem(syncStorageKey) ?? "null");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function loadPendingAdminSync(storage, syncStorageKey) {
    return Boolean(readSyncMetadata(storage, syncStorageKey).admin);
  }

  function loadPendingPlayerScores(storage, syncStorageKey) {
    const metadata = readSyncMetadata(storage, syncStorageKey);
    if (!Array.isArray(metadata.playerScores)) return [];
    return metadata.playerScores
      .filter((item) => item && typeof item.matchId === "string" && [0, 1].includes(item.teamIndex))
      .map((item) => ({ matchId: item.matchId, teamIndex: item.teamIndex }));
  }

  function persistSyncMetadata(storage, syncStorageKey, pendingAdminSync, pendingPlayerScores) {
    if (!pendingAdminSync && pendingPlayerScores.length === 0) {
      storage.removeItem(syncStorageKey);
      return;
    }
    storage.setItem(syncStorageKey, JSON.stringify({
      admin: pendingAdminSync,
      playerScores: pendingPlayerScores,
    }));
  }

  function hasPendingRemoteWrites(pendingAdminSync, pendingPlayerScores) {
    return pendingAdminSync || pendingPlayerScores.length > 0;
  }

  function remoteErrorMessage(error, fallback) {
    const message = String(error?.message ?? "");
    if (/rate limit exceeded/i.test(message)) {
      return "For mange forespørsler akkurat nå. Vent litt og prøv igjen.";
    }
    if (/invalid (?:invite code|player|tournament|.*payload)/i.test(message)) {
      return "Kontroller opplysningene og prøv igjen.";
    }
    return fallback;
  }

  function sanitizeSharedState(nextState) {
    const sharedState = structuredClone(nextState);
    delete sharedState.adminToken;
    delete sharedState.playerToken;
    delete sharedState.selectedPlayerId;
    delete sharedState.ownerUserId;
    delete sharedState.claimedAt;
    return sharedState;
  }

  function isConflictError(error) {
    return /tournament state changed|revision|conflict/i.test(String(error?.message ?? ""));
  }

  function isTransientRemoteError(error, isOnline) {
    return !isOnline || /network|fetch|timeout|timed out|closed|aborted|connection/i.test(String(error?.message ?? ""));
  }

  function isValidTournamentState(candidate) {
    return Boolean(
      candidate &&
        typeof candidate.name === "string" &&
        typeof candidate.inviteCode === "string" &&
        Array.isArray(candidate.players) &&
        Array.isArray(candidate.rounds),
    );
  }

  return {
    migrateState,
    migrateMatch,
    readSyncMetadata,
    loadPendingAdminSync,
    loadPendingPlayerScores,
    persistSyncMetadata,
    hasPendingRemoteWrites,
    remoteErrorMessage,
    sanitizeSharedState,
    isConflictError,
    isTransientRemoteError,
    isValidTournamentState,
  };
})();
