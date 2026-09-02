(function attachPadelstarMatchActions(global) {
  "use strict";

  function create(deps) {
    const {
      activateNextWaitingMatch,
      getActiveRound,
      getMatchById,
      getRoundForMatch,
      getState,
      isSupabaseReady,
      markCupCompleteIfDone,
      queueRemoteMatchAction,
      render,
      renderLargeScore,
      requestConfirmation,
      saveState,
      showToast,
      t,
    } = deps;

    function captureMatchUndoState(match) {
      const state = getState();
      const activeRound = getRoundForMatch(match);
      const matchSnapshot = structuredClone(match);
      delete matchSnapshot.lastScoredMatchState;
      const nextWaitingMatch = activeRound?.matches.find((item) => item.id !== match.id && item.state === "waiting");
      return {
        match: matchSnapshot,
        nextWaitingMatch: nextWaitingMatch ? structuredClone(nextWaitingMatch) : null,
        roundId: activeRound?.id ?? null,
        roundStatus: activeRound?.status ?? null,
        tournamentStatus: state.status,
        revision: state.revision,
        cupWinnerTeam: state.cup?.winnerTeam ? structuredClone(state.cup.winnerTeam) : null,
      };
    }

    function undoMatch(match) {
      const state = getState();
      const undoState = match.lastScoredMatchState;
      if (!undoState?.match) {
        showToast(t("messages.noUndo"), "status-message-error");
        return;
      }
      const restoredMatch = structuredClone(undoState.match);
      deps.recordEvent?.("match_undone", "match", match.id, { restoredState: restoredMatch.state });
      delete match.lastScoredMatchState;
      Object.assign(match, restoredMatch);
      if (undoState.nextWaitingMatch) {
        const nextMatch = getMatchById(undoState.nextWaitingMatch.id);
        if (nextMatch) Object.assign(nextMatch, structuredClone(undoState.nextWaitingMatch));
      }
      const round = state.rounds.find((item) => item.id === undoState.roundId);
      if (round && undoState.roundStatus) round.status = undoState.roundStatus;
      if (undoState.tournamentStatus) state.status = undoState.tournamentStatus;
      if (state.cup) state.cup.winnerTeam = undoState.cupWinnerTeam ? structuredClone(undoState.cupWinnerTeam) : null;
      saveState();
      render();
      renderLargeScore();
    }

    function startMatch(match) {
      const activeRound = getActiveRound();
      if (!activeRound || activeRound.status !== "active") return;
      if (isSupabaseReady()) {
        queueRemoteMatchAction(match, "start");
        return;
      }
      match.state = "playing";
      deps.recordEvent?.("match_started", "match", match.id, { courtId: match.courtId, courtName: match.courtName });
      match.status = "active";
      saveState();
      render();
      renderLargeScore();
    }

    function reopenMatch(match) {
      if (isSupabaseReady()) {
        queueRemoteMatchAction(match, "undo");
        return;
      }
      if (match.lastScoredMatchState) {
        undoMatch(match);
        return;
      }
      match.state = "playing";
      match.status = "active";
      match.completedSets = [];
      match.currentSet = { teamOne: 0, teamTwo: 0 };
      match.currentGame = { teamOne: 0, teamTwo: 0 };
      match.winnerTeamIndex = null;
      match.isWalkover = false;
      match.lastScoredMatchState = null;
      match.completedAt = null;
      saveState();
      render();
      renderLargeScore();
    }

    async function cancelMatch(match) {
      if (!await requestConfirmation(t("messages.cancelMatchConfirm"))) return;
      if (isSupabaseReady()) {
        queueRemoteMatchAction(match, "cancel");
        return;
      }
      match.state = "cancelled";
      match.status = "cancelled";
      deps.recordEvent?.("match_cancelled", "match", match.id, {});
      match.completedSets = [];
      match.winnerTeamIndex = null;
      match.isWalkover = false;
      match.completedAt = new Date().toISOString();
      activateNextWaitingMatch(match);
      saveState();
      render();
      renderLargeScore();
    }

    async function setWalkover(match, teamIndex) {
      if (![0, 1].includes(teamIndex) || ["finished", "cancelled"].includes(match.state)) return;
      const winningTeam = teamIndex === 0 ? match.teamOne : match.teamTwo;
      if (!await requestConfirmation(t("messages.walkoverConfirm", { team: winningTeam.displayName }))) return;
      if (isSupabaseReady()) {
        queueRemoteMatchAction(match, "walkover", teamIndex);
        return;
      }
      match.lastScoredMatchState = captureMatchUndoState(match);
      match.state = "finished";
      match.status = "completed";
      deps.recordEvent?.("match_walkover", "match", match.id, { winnerTeamIndex: teamIndex });
      match.completedSets = [];
      match.currentSet = { teamOne: 0, teamTwo: 0 };
      match.currentGame = { teamOne: 0, teamTwo: 0 };
      match.winnerTeamIndex = teamIndex;
      match.isWalkover = true;
      match.completedAt = new Date().toISOString();
      activateNextWaitingMatch(match);
      markCupCompleteIfDone();
      saveState();
      render();
      renderLargeScore();
    }

    function updateMatchCourt(match, courtName) {
      const state = getState();
      const nextCourtName = courtName.trim();
      match.courtName = nextCourtName || null;
      const matchingCourt = state.courts.find((court) => court.name.localeCompare(nextCourtName, "nb", { sensitivity: "accent" }) === 0);
      match.courtId = matchingCourt?.id ?? match.courtId ?? null;
      saveState();
      render();
      renderLargeScore();
    }

    return { cancelMatch, captureMatchUndoState, reopenMatch, setWalkover, startMatch, undoMatch, updateMatchCourt };
  }

  global.PadelstarMatchActions = { create };
})(window);
