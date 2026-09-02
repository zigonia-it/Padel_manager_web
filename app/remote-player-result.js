(function initializePadelstarRemotePlayerResult(global) {
  "use strict";

  function create(deps) {
    async function submit(matchId, teamOne, teamTwo) {
      const state = deps.getState();
      if (!deps.isSupabaseReady() || !state.id || !state.inviteCode || !state.selectedPlayerId || !state.playerToken) return null;
      const { data, error } = await deps.remoteRpc(deps.getSupabaseClient(), "submit_match_result", {
        p_tournament_id: state.id,
        p_invite_code: state.inviteCode,
        p_player_id: state.selectedPlayerId,
        p_match_id: matchId,
        p_team_one: teamOne,
        p_team_two: teamTwo,
        p_player_token: state.playerToken,
      });
      if (error) {
        deps.showToast(deps.translate("messages.syncFailed"), "status-message-error");
        return null;
      }
      if (data) deps.applyRemoteState(data, { source: "rpc", clearConflict: true });
      return data;
    }
    return { submit };
  }

  global.PadelstarRemotePlayerResult = { create };
})(window);
