(function attachPadelstarTournamentQueries(global) {
  "use strict";

  function create({ getState, leaderboardEntries }) {
    function getActiveRound() {
      const state = getState();
      return state.rounds.find((round) => round.status === "active") ?? state.rounds.at(-1);
    }

    function getRoundForMatch(match) {
      return getState().rounds.find((round) => round.matches.some((roundMatch) => roundMatch.id === match.id));
    }

    function getAllMatches() {
      return getState().rounds.flatMap((round) => round.matches);
    }

    function getMatchById(matchId) {
      return getAllMatches().find((match) => match.id === matchId);
    }

    function getPlayerById(id) {
      return getState().players.find((player) => player.id === id);
    }

    function findPlayerByName(name) {
      return getState().players.find((player) => player.name.localeCompare(name, "nb", { sensitivity: "accent" }) === 0);
    }

    function playerPlacement(player, matches) {
      const index = leaderboardEntries(matches).findIndex((entry) => entry.player.id === player.id);
      return index >= 0 ? index + 1 : null;
    }

    return { findPlayerByName, getActiveRound, getAllMatches, getMatchById, getPlayerById, getRoundForMatch, playerPlacement };
  }

  global.PadelstarTournamentQueries = { create };
})(window);
