(function (global) {
  "use strict";

  function create(deps) {
    let queueRunning = false;

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
    }

    return { queuePlayerScore, processPlayerScoreQueue };
  }

  global.PadelstarRemotePlayerScore = { create };
})(window);
