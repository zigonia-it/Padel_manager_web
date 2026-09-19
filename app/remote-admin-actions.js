(function (global) {
  "use strict";

  function create(deps) {
    function recordAdminEvent(eventType, entityType, entityId, payload) {
      deps.recordEvent?.(eventType, entityType, entityId, payload);
      deps.saveState?.();
    }

    function canWrite(offlineMessage) {
      const state = deps.getState();
      if (!deps.isSupabaseReady() || !deps.isCurrentUserAdmin() || !state.adminToken || !state.id) return false;
      if (!deps.isOnline()) {
        deps.setRemoteNotice(deps.t(offlineMessage));
        deps.syncConnectionStatus();
        return false;
      }
      deps.clearRemoteSaveTimer();
      return true;
    }

    function enqueue(rpcName, payload, errorMessage, notification) {
      deps.enqueueRemoteWrite(async () => {
        if (deps.getMutationSequence() > deps.getLastPersistedSequence()) {
          const saved = await deps.saveRemoteState();
          if (!saved) return;
        }

        const requestSequence = deps.getMutationSequence();
        const { data, error } = await deps.remoteRpc(deps.getSupabaseClient(), rpcName, payload());
        if (error) {
          console.warn(`Supabase ${rpcName} failed`, error);
          deps.handleRemoteError(error, deps.t(errorMessage));
          return;
        }
        if (!data) return;

        deps.setLastPersistedSequence(requestSequence);
        const state = deps.getState();
        if (requestSequence === deps.getMutationSequence()) {
          deps.setPendingAdminSync(false);
          deps.persistSyncMetadata();
          deps.applyRemoteState(data, { source: "rpc", clearConflict: true });
          if (notification) notification();
        } else if (state.id === data.id && Number.isInteger(data.revision)) {
          deps.saveLocalRevision(data.revision);
        }
      });
    }

    function queueRemoteMatchAction(match, action, teamIndex = null) {
      if (!canWrite("messages.offlineAdminChange")) return;
      recordAdminEvent(action === "undo" ? "match_undo_requested" : `match_${action}`, "match", match.id, { teamIndex });
      enqueue(action === "undo" ? "admin_undo_match" : "admin_match_action", () => {
        const state = deps.getState();
        if (action === "undo") return {
          p_tournament_id: state.id,
          p_admin_token: state.adminToken,
          p_match_id: match.id,
          p_expected_revision: state.revision,
        };
        return {
          p_tournament_id: state.id,
          p_admin_token: state.adminToken,
          p_match_id: match.id,
          p_action: action,
          p_team_index: teamIndex,
          p_expected_revision: state.revision,
        };
      }, "messages.matchUpdateFailed", action === "start" ? () => deps.sendPushNotification("match_started", match.id) : null);
    }

    // Admin override: assign (playerId) or clear (null) the scorer of a match.
    function queueRemoteScorerAssign(match, playerId) {
      if (!canWrite("messages.offlineAdminChange")) return;
      recordAdminEvent("match_scorer_assigned", "match", match.id, { playerId });
      enqueue("admin_set_match_scorer", () => {
        const state = deps.getState();
        return {
          p_tournament_id: state.id,
          p_admin_token: state.adminToken,
          p_match_id: match.id,
          p_player_id: playerId,
          p_expected_revision: state.revision,
        };
      }, "messages.matchUpdateFailed");
    }

    // Admin corrects a finished result (reason and consequence level are recorded by the server).
    function queueRemoteCorrection(match, { sets, reason, comment, level }) {
      if (!canWrite("messages.offlineAdminChange")) return false;
      recordAdminEvent("result_correction_requested", "match", match.id, { reason });
      enqueue("admin_correct_result", () => {
        const state = deps.getState();
        return {
          p_tournament_id: state.id,
          p_admin_token: state.adminToken,
          p_match_id: match.id,
          p_completed_sets: sets,
          p_reason: reason,
          p_comment: comment || null,
          p_displayed_level: level ?? null,
          p_expected_revision: state.revision,
        };
      }, "messages.matchUpdateFailed", () => {
        deps.showToast?.(deps.t("correction.applied"), "status-message-success");
        deps.sendPushNotification("result_corrected", match.id);
      });
      return true;
    }

    // Admin approves an awaiting result as it stands.
    function queueRemoteResolveResult(match) {
      if (!canWrite("messages.offlineAdminChange")) return;
      recordAdminEvent("result_approved_by_admin", "match", match.id, {});
      enqueue("admin_resolve_result", () => {
        const state = deps.getState();
        return {
          p_tournament_id: state.id,
          p_admin_token: state.adminToken,
          p_match_id: match.id,
          p_expected_revision: state.revision,
        };
      }, "messages.matchUpdateFailed");
    }

    function queueRemoteSetResult(match, teamOne, teamTwo) {
      if (!canWrite("messages.offlineSetResult")) return;
      recordAdminEvent("result_corrected", "match", match.id, { teamOne, teamTwo });
      enqueue("admin_set_result", () => {
        const state = deps.getState();
        return {
          p_tournament_id: state.id,
          p_admin_token: state.adminToken,
          p_match_id: match.id,
          p_team_one_score: teamOne,
          p_team_two_score: teamTwo,
          p_expected_revision: state.revision,
        };
      }, "messages.setResultFailed");
    }

    function queueRemoteRoundAdvance() {
      if (!canWrite("messages.offlineNextRound")) return;
      recordAdminEvent("round_advance_requested", "round", null, {});
      enqueue("admin_advance_round", () => {
        const state = deps.getState();
        return { p_tournament_id: state.id, p_admin_token: state.adminToken, p_expected_revision: state.revision };
      }, "messages.nextRoundFailed", () => deps.sendPushNotification("round_ready"));
    }

    function queueRemoteCupAdvance() {
      if (!canWrite("messages.offlineNextCupRound")) return;
      recordAdminEvent("cup_advance_requested", "round", null, {});
      enqueue("admin_advance_cup", () => {
        const state = deps.getState();
        return { p_tournament_id: state.id, p_admin_token: state.adminToken, p_expected_revision: state.revision };
      }, "messages.nextCupRoundFailed", () => deps.sendPushNotification("round_ready"));
    }

    return { queueRemoteMatchAction, queueRemoteScorerAssign, queueRemoteResolveResult, queueRemoteCorrection, queueRemoteSetResult, queueRemoteRoundAdvance, queueRemoteCupAdvance };
  }

  global.PadelstarRemoteAdminActions = { create };
})(window);
