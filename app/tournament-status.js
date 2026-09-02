window.PadelstarTournamentStatus = (() => {
  function create({ cupCanAdvance, cupCanFinalize, getActiveRound, getNextScheduledRound, getState, t }) {
    function canCompleteRound(round) {
      return Boolean(round && round.status !== "finished" && round.matches.length > 0
        && round.matches.every((match) => ["finished", "cancelled"].includes(match.state)));
    }
    function roundProgress(round) {
      if (!round) return null;
      return { total: round.matches.length, finished: round.matches.filter((match) => ["finished", "cancelled"].includes(match.state)).length };
    }
    function generateRoundBlockReason() {
      const state = getState();
      const activeRound = getActiveRound();
      if (state.status === "Avsluttet") return t("tournament.finished");
      if (state.players.length < 2) return t("messages.needTwoPlayersStart");
      if (state.settings.format === "cup") {
        if (state.settings.cupTeamSetupMode === "manual" && state.cupTeams.length < 2) return t("messages.defineManualCupTeams");
        if (state.settings.cupTeamSetupMode === "auto" && state.players.filter((player) => player.active && player.availability !== "away").length < 4) return t("messages.autoCupNeedsActivePlayers");
      }
      if (state.courts.length < 1) return t("messages.needCourt");
      if (activeRound?.status === "active" && !canCompleteRound(activeRound)) return t("messages.finishMatchesBeforeNext");
      if (state.rounds.length > 0 && !getNextScheduledRound() && !cupCanAdvance() && !cupCanFinalize()) {
        return state.settings.format === "cup" && state.status === "Cup ferdig" ? t("tournament.cupFinishedReason") : t("tournament.allGenerated");
      }
      return "";
    }
    function canGenerateRound() { return !generateRoundBlockReason(); }
    function tournamentActionText() {
      const state = getState();
      if (state.rounds.length === 0) return t("startTournament");
      const activeRound = getActiveRound();
      if (activeRound?.status === "active" && !canCompleteRound(activeRound)) return t("score.playAllMatchesFirst");
      if (getNextScheduledRound() || cupCanAdvance() || cupCanFinalize()) return t("startNextRound");
      if (state.settings.format === "cup" && state.status === "Cup ferdig") return t("tournament.cupFinished");
      return t("tournament.allGenerated");
    }
    return { canCompleteRound, canGenerateRound, generateRoundBlockReason, roundProgress, tournamentActionText };
  }
  return { create };
})();
