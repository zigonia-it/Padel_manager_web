(function initPadelstarProfileHistory(global) {
  function create(dependencies = {}) {
    const {
      getAllMatches,
      getPlayerById,
      getProfile,
      getState,
      isRetainedParticipant,
      leaderboardEntries,
      matchIncludesPlayer,
    } = dependencies;

    function createEntry() {
      const profile = getProfile();
      const state = getState();
      if (!profile || state.status !== "Avsluttet") return null;
      const player = state.players.find((item) => item.profileId === profile.id) ?? getPlayerById(state.selectedPlayerId);
      if (!player || !isRetainedParticipant(player)) return null;
      const matches = getAllMatches().filter((match) => match.state === "finished" && matchIncludesPlayer(match, player.id));
      const entries = leaderboardEntries(getAllMatches());
      const entry = entries.find((item) => item.player.id === player.id);
      const wins = matches.filter((match) => {
        const teamIndex = match.teamOne.players.some((item) => item.id === player.id) ? 0 : 1;
        return match.winnerTeamIndex === teamIndex;
      }).length;
      const sets = matches.reduce((total, match) => total + (match.completedSets ?? []).filter((set) => {
        const teamOne = match.teamOne.players.some((item) => item.id === player.id);
        return teamOne ? set.teamOne > set.teamTwo : set.teamTwo > set.teamOne;
      }).length, 0);
      const games = matches.reduce((total, match) => total + (match.completedSets ?? []).reduce((setsTotal, set) => {
        const teamOne = match.teamOne.players.some((item) => item.id === player.id);
        return setsTotal + (teamOne ? set.teamOne : set.teamTwo);
      }, 0), 0);
      const matchRecords = matches.map((match) => ({
        id: match.id,
        winnerTeamIndex: match.winnerTeamIndex,
        completedSets: (match.completedSets ?? []).map((set) => ({ teamOne: set.teamOne, teamTwo: set.teamTwo })),
        teamOne: { players: (match.teamOne?.players ?? []).filter((item) => item.profileId).map((item) => ({ profileId: item.profileId, name: item.name })) },
        teamTwo: { players: (match.teamTwo?.players ?? []).filter((item) => item.profileId).map((item) => ({ profileId: item.profileId, name: item.name })) },
      }));
      return {
        id: state.id,
        profileId: profile.id,
        tournamentName: state.name,
        inviteCode: state.inviteCode,
        endedAt: new Date().toISOString(),
        placement: entry ? entries.findIndex((item) => item.player.id === player.id) + 1 : null,
        points: entry?.points ?? 0,
        matches: matches.length,
        wins,
        sets,
        games,
        format: state.settings.format,
        matchRecords,
      };
    }

    return { createEntry };
  }

  global.PadelstarProfileHistory = { create };
})(window);
