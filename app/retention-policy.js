(function initializePadelstarRetentionPolicy(global) {
  "use strict";

  function isRetainedParticipant(player) {
    if (player?.profileId || player?.userId) return true;
    return false;
  }

  function playerIdsInMatch(match) {
    const ids = [];
    for (const team of [match?.teamOne, match?.teamTwo]) {
      for (const player of team?.players ?? []) if (player?.id) ids.push(player.id);
    }
    for (const team of [match?.team1, match?.team2]) {
      for (const id of team ?? []) if (id) ids.push(id);
    }
    return ids;
  }

  function keepMatch(match, retainedIds) {
    const ids = playerIdsInMatch(match);
    return ids.length > 0 && ids.every((id) => retainedIds.has(id));
  }

  function sanitizeEndedTournamentState(input) {
    const nextState = structuredClone(input ?? {});
    if (nextState.status !== "Avsluttet") return nextState;

    const retainedPlayers = (nextState.players ?? []).filter(isRetainedParticipant);
    const retainedIds = new Set(retainedPlayers.map((player) => player.id));
    nextState.players = retainedPlayers;
    nextState.rounds = (nextState.rounds ?? []).map((round) => ({
      ...round,
      matches: (round.matches ?? []).filter((match) => keepMatch(match, retainedIds)),
    }));
    nextState.schedule = (nextState.schedule ?? []).filter((match) => keepMatch(match, retainedIds));
    nextState.cupTeams = (nextState.cupTeams ?? []).filter((team) =>
      (team.players ?? []).every((player) => retainedIds.has(player.id)),
    );
    // These are transient submission/audit structures and can contain guest IDs.
    // Registered-player statistics remain available through the retained matches.
    nextState.schedulerHistory = { partners: {}, opponents: {}, matches: [], byes: [] };
    nextState.scoreSubmissions = [];
    nextState.events = [];
    nextState.selectedPlayerId = null;
    delete nextState.playerToken;
    return nextState;
  }

  global.PadelstarRetentionPolicy = { isRetainedParticipant, sanitizeEndedTournamentState };
})(window);
