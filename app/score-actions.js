(function (global) {
  "use strict";

  function create(deps) {
    function saveMatchResult(match, teamOne, teamTwo) {
      saveSetResult(match, teamOne, teamTwo);
    }

    function saveSetResult(match, teamOne, teamTwo) {
      const validationError = validateSetScore(teamOne, teamTwo);
      if (validationError) {
        deps.showToast(deps.translateScoreValidationError(validationError, teamOne, teamTwo), "status-message-error");
        return;
      }
      if (deps.isSupabaseReady()) {
        deps.queueRemoteSetResult(match, teamOne, teamTwo);
        return;
      }
      match.lastScoredMatchState = deps.captureMatchUndoState(match);
      match.currentSet = { teamOne, teamTwo };
      match.currentGame = { teamOne: 0, teamTwo: 0 };
      match.completedSets.push({ teamOne, teamTwo });
      if (hasMatchWinner(match)) {
        deps.finishMatch(match);
      } else {
        match.currentSet = { teamOne: 0, teamTwo: 0 };
        match.state = "playing";
      }
      deps.saveState();
      deps.render();
      deps.renderLargeScore();
    }

    function validateSetScore(teamOne, teamTwo) {
      return deps.scoring.validateSetScore(teamOne, teamTwo, deps.getState().settings);
    }

    function translateScoreValidationError(message, teamOne, teamTwo) {
      if (!message) return "";
      const t = deps.t;
      if (message.includes("hele tall")) return t("messages.invalidScoreInteger");
      if (message.includes("negativt")) return t("messages.invalidScoreNegative");
      if (message.includes("uavgjort")) return t("messages.invalidScoreDraw");
      if (message.includes("Sett må vinnes")) {
        const gamesToWinSet = deps.getState().settings.gamesToWinSet ?? 6;
        return t("messages.invalidScoreShape", {
          gamesToWinSet,
          tieBreakOne: gamesToWinSet + 1,
          tieBreakTwo: gamesToWinSet - 1,
          teamOne,
          teamTwo,
        });
      }
      return message;
    }

    function awardTennisPoint(match, teamIndex) {
      if (["finished", "cancelled"].includes(match.state)) return;
      match.lastScoredMatchState = deps.captureMatchUndoState(match);
      if (match.state === "waiting") match.state = "playing";
      const scoringTeam = teamIndex === 0 ? "teamOne" : "teamTwo";
      const otherTeam = teamIndex === 0 ? "teamTwo" : "teamOne";
      const scoringPoints = match.currentGame[scoringTeam] ?? 0;
      const otherPoints = match.currentGame[otherTeam] ?? 0;
      if (scoringPoints === 4 || (scoringPoints === 3 && otherPoints < 3)) awardGame(match, scoringTeam);
      else if (scoringPoints === 3 && otherPoints === 3) match.currentGame[scoringTeam] = 4;
      else if (otherPoints === 4) match.currentGame[otherTeam] = 3;
      else match.currentGame[scoringTeam] = scoringPoints + 1;
      deps.saveState();
      if (deps.currentLocalRole() === "player" && deps.matchIncludesPlayer(match, deps.getState().selectedPlayerId)) {
        deps.queuePlayerScore(match.id, teamIndex);
      }
      deps.render();
      deps.renderLargeScore();
      deps.flashMatchCards(match.id);
    }

    function awardGame(match, scoringTeam) {
      match.currentSet[scoringTeam] += 1;
      match.currentGame = { teamOne: 0, teamTwo: 0 };
      if (isSetComplete(match.currentSet.teamOne, match.currentSet.teamTwo)) {
        match.completedSets.push({ ...match.currentSet });
        if (hasMatchWinner(match)) deps.finishMatch(match);
        else match.currentSet = { teamOne: 0, teamTwo: 0 };
      }
    }

    function isSetComplete(teamOne, teamTwo) {
      return deps.scoring.isSetComplete(teamOne, teamTwo, deps.getState().settings);
    }

    function hasMatchWinner(match) {
      return deps.scoring.hasMatchWinner(match, deps.getState().settings);
    }

    function setsWonByTeam(match, teamIndex) {
      return deps.scoring.setsWonByTeam(match, teamIndex);
    }

    return { saveMatchResult, saveSetResult, validateSetScore, translateScoreValidationError, awardTennisPoint, isSetComplete, hasMatchWinner, setsWonByTeam };
  }

  global.PadelstarScoreActions = { create };
})(window);
