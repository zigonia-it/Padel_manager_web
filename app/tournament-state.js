(function initializeTournamentState(global) {
  function create(deps) {
    const { accents, buildSchedule, defaultAvatarId, randomAvatarId = () => defaultAvatarId, randomUUID, now = () => new Date().toISOString() } = deps;

    function createPlayer(name, index, avatarId = null) {
      return {
        id: randomUUID(),
        name,
        avatarId: avatarId ?? randomAvatarId(),
        accent: accents[index % accents.length],
        active: true,
        availability: "active",
        participantType: "player",
        joinStatus: "joined",
        joinedFrom: "manual",
        createdAt: now(),
      };
    }

    function createTournament({ name, inviteCode, players, courtCount }) {
      const tournamentPlayers = players.map((playerName, index) => createPlayer(playerName, index));
      return {
        id: randomUUID(),
        adminToken: randomUUID(),
        name,
        inviteCode,
        status: "Klar",
        currentRound: 0,
        settings: {
          gamesToWinSet: 6,
          setsToWinMatch: 1,
          pointMode: "matches",
          format: "roundRobin",
          seasonId: null,
          cupTeamSetupMode: "auto",
          includesThirdPlaceMatch: false,
          language: "nb",
        },
        courts: Array.from({ length: courtCount }, (_, index) => ({
          id: randomUUID(),
          name: `Bane ${index + 1}`,
          courtNumber: index + 1,
          active: true,
        })),
        players: tournamentPlayers,
        schedule: buildSchedule(tournamentPlayers, "roundRobin"),
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
