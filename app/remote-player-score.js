(function (global) {
  "use strict";

  const HEARTBEAT_INTERVAL_MS = 30000;
  // Errors the server will always give for the same point; retrying them would block every later point.
  const NON_RETRYABLE_SCORE_ERRORS = /Not the active scorer|not part of this match|not currently playing|Match not found/i;

  function create(deps) {
    let queueRunning = false;
    let heartbeatTimer = null;

    function canScore() {
      const state = deps.getState();
      return deps.isSupabaseReady() && state.id && state.inviteCode && state.selectedPlayerId && state.playerToken;
    }

    function queuePlayerScore(matchId, teamIndex) {
      if (!canScore()) return;
      deps.addPendingScore({ matchId, teamIndex });
      deps.persistSyncMetadata();
      deps.syncConnectionStatus();
      processPlayerScoreQueue();
    }

    async function processPlayerScoreQueue() {
      if (queueRunning || !deps.isOnline() || !canScore()) return;
      queueRunning = true;
      let droppedRejectedPoint = false;
      try {
        while (deps.getPendingScores().length > 0 && deps.isOnline()) {
          const state = deps.getState();
          const pendingScore = deps.getPendingScores()[0];
          const { data, error } = await deps.remoteRpc(deps.getSupabaseClient(), "save_player_point", {
            p_tournament_id: state.id,
            p_invite_code: state.inviteCode,
            p_player_id: state.selectedPlayerId,
            p_match_id: pendingScore.matchId,
            p_team_index: pendingScore.teamIndex,
            p_player_token: state.playerToken,
          });
          if (error) {
            if (NON_RETRYABLE_SCORE_ERRORS.test(error.message ?? "")) {
              deps.removeFirstPendingScore();
              deps.persistSyncMetadata();
              droppedRejectedPoint = true;
              continue;
            }
            console.warn("Supabase player score sync failed", error);
            deps.handleRemoteError(error, deps.t("messages.pointSyncFailed"));
            break;
          }
          deps.removeFirstPendingScore();
          deps.persistSyncMetadata();
          if (data && deps.getPendingScores().length === 0) {
            deps.applyRemoteState(data, { source: "rpc", clearConflict: true });
          }
        }
      } finally {
        queueRunning = false;
        deps.syncConnectionStatus();
        deps.render();
      }
      if (droppedRejectedPoint) {
        deps.showToast(deps.t("scorer.pointRejected"), "status-message-error");
        deps.refreshRemoteState?.("scorer-rejected");
      }
    }

    function scorerErrorMessage(error) {
      const message = String(error?.message ?? "");
      if (/already has an active scorer/i.test(message)) return deps.t("scorer.alreadyActive");
      if (/Not the active scorer/i.test(message)) return deps.t("scorer.notActive");
      if (/request is pending/i.test(message)) return deps.t("scorer.requestPending");
      if (/No undo/i.test(message)) return deps.t("messages.noUndo");
      if (/No redo/i.test(message)) return deps.t("scorer.noRedo");
      return deps.t("scorer.failed");
    }

    // claim | request | decline | release | transfer | heartbeat | undo | redo
    async function scorerAction(matchId, action, targetPlayerId = null) {
      const quiet = action === "heartbeat";
      if (!canScore()) return false;
      if (!deps.isOnline()) {
        if (!quiet) deps.showToast(deps.t("scorer.offline"), "status-message-error");
        return false;
      }
      if (!quiet && deps.getPendingScores().length > 0) {
        await processPlayerScoreQueue();
        if (deps.getPendingScores().length > 0) {
          deps.showToast(deps.t("scorer.offline"), "status-message-error");
          return false;
        }
      }
      const state = deps.getState();
      const { data, error } = await deps.remoteRpc(deps.getSupabaseClient(), "match_scorer_action", {
        p_tournament_id: state.id,
        p_invite_code: state.inviteCode,
        p_player_id: state.selectedPlayerId,
        p_match_id: matchId,
        p_player_token: state.playerToken,
        p_action: action,
        p_target_player_id: targetPlayerId,
      });
      if (error) {
        if (!quiet) {
          console.warn(`Supabase scorer action ${action} failed`, error);
          deps.showToast(scorerErrorMessage(error), "status-message-error");
          deps.refreshRemoteState?.("scorer-action-failed");
        }
        return false;
      }
      if (!quiet && data) deps.applyRemoteState(data, { source: "rpc", clearConflict: true });
      return true;
    }

    function resultErrorMessage(error) {
      const message = String(error?.message ?? "");
      if (/active scorer can submit/i.test(message)) return deps.t("result.notScorer");
      if (/flagged/i.test(message)) return deps.t("result.flagged");
      if (/Invalid corrected result/i.test(message)) return deps.t("result.invalidCorrection");
      if (/already submitted|not awaiting|not been submitted|not open for dispute/i.test(message)) return deps.t("result.outOfDate");
      return deps.t("result.failed");
    }

    // submit | approve | dispute (payload: { completedSets } proposes a corrected result)
    async function resultAction(matchId, action, payload = null) {
      if (!canScore()) return false;
      if (!deps.isOnline()) {
        deps.showToast(deps.t("scorer.offline"), "status-message-error");
        return false;
      }
      if (deps.getPendingScores().length > 0) {
        await processPlayerScoreQueue();
        if (deps.getPendingScores().length > 0) {
          deps.showToast(deps.t("scorer.offline"), "status-message-error");
          return false;
        }
      }
      const state = deps.getState();
      const { data, error } = await deps.remoteRpc(deps.getSupabaseClient(), "match_result_action", {
        p_tournament_id: state.id,
        p_invite_code: state.inviteCode,
        p_player_id: state.selectedPlayerId,
        p_match_id: matchId,
        p_player_token: state.playerToken,
        p_action: action,
        p_payload: payload,
      });
      if (error) {
        console.warn(`Supabase result action ${action} failed`, error);
        deps.showToast(resultErrorMessage(error), "status-message-error");
        deps.refreshRemoteState?.("result-action-failed");
        return false;
      }
      if (data) deps.applyRemoteState(data, { source: "rpc", clearConflict: true });
      return true;
    }

    function ownScoringMatchIds() {
      const state = deps.getState();
      if (!state.selectedPlayerId) return [];
      return (state.rounds ?? [])
        .flatMap((round) => round.matches ?? [])
        .filter((match) => match.state === "playing" && match.scorer?.playerId === state.selectedPlayerId)
        .map((match) => match.id);
    }

    async function sendHeartbeats() {
      for (const matchId of ownScoringMatchIds()) await scorerAction(matchId, "heartbeat");
    }

    // Keeps the scorer's lease alive (a server-side keep-alive that never bumps the tournament revision).
    function syncHeartbeat() {
      const scoring = canScore() && ownScoringMatchIds().length > 0;
      if (scoring && !heartbeatTimer) heartbeatTimer = global.setInterval(sendHeartbeats, HEARTBEAT_INTERVAL_MS);
      else if (!scoring && heartbeatTimer) {
        global.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    }

    return { queuePlayerScore, processPlayerScoreQueue, scorerAction, resultAction, syncHeartbeat };
  }

  global.PadelstarRemotePlayerScore = { create };
})(window);
