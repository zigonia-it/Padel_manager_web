(function initializeTournamentState(global) {
  function create(deps) {
    const { accents, buildSchedule, defaultAvatarId, randomAvatarId = () => defaultAvatarId, randomUUID, now = () => new Date().toISOString() } = deps;

    function createPlayer(name, index, avatarId = null, accent = null) {
      return {
        id: randomUUID(),
        name,
        avatarId: avatarId ?? randomAvatarId(),
        accent: accent && accents.includes(accent) ? accent : accents[index % accents.length],
        active: true,
        availability: "active",
        participantType: "player",
        joinStatus: "joined",
        joinedFrom: "manual",
        createdAt: now(),
      };
    }

    function createTournament({
      name,
      inviteCode,
      players,
      courtCount,
      format = "roundRobin",
      gamesToWinSet = 6,
      setsToWinMatch = 1,
      gameMode = "advantage",
      setTiebreak = false,
      timedMinutes = 0,
      pointMode = "matches",
      cupTeamSetupMode = "auto",
      includesThirdPlaceMatch = false,
    }) {
      const tournamentPlayers = players.map((playerName, index) => createPlayer(playerName, index));
      const validatedFormat = ["roundRobin", "cup"].includes(format) ? format : "roundRobin";
      return {
        id: randomUUID(),
        adminToken: randomUUID(),
        name,
        inviteCode,
        status: "Klar",
        currentRound: 0,
        settings: {
          gamesToWinSet: Math.max(1, Math.min(12, gamesToWinSet || 6)),
          setsToWinMatch: Math.max(1, Math.min(5, setsToWinMatch || 1)),
          gameMode: ["advantage", "goldenPoint"].includes(gameMode) ? gameMode : "advantage",
          setTiebreak: Boolean(setTiebreak),
          timedMinutes: Math.max(0, Math.min(180, Math.floor(Number(timedMinutes)) || 0)),
          pointMode: ["matches", "sets", "games"].includes(pointMode) ? pointMode : "matches",
          format: validatedFormat,
          seasonId: null,
          cupTeamSetupMode: ["auto", "manual"].includes(cupTeamSetupMode) ? cupTeamSetupMode : "auto",
          includesThirdPlaceMatch: Boolean(includesThirdPlaceMatch),
          language: "nb",
        },
        courts: Array.from({ length: courtCount }, (_, index) => ({
          id: randomUUID(),
          name: `Bane ${index + 1}`,
          courtNumber: index + 1,
          active: true,
        })),
        players: tournamentPlayers,
        schedule: buildSchedule(tournamentPlayers, validatedFormat),
        schedulerHistory: { partners: {}, opponents: {}, matches: [], byes: [] },
        events: [],
        scoreSubmissions: [],
        rounds: [],
        cup: null,
        cupTeams: [],
        revision: 0,
        selectedPlayerId: null,
        playerToken: null,
        ownerProfileId: null,
        retentionExpiresAt: null,
      };
    }

    return { createPlayer, createTournament };
  }

  global.PadelstarTournamentState = { create };
})(window);
