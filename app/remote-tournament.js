(() => {
  function create({
    isReady,
    getState,
    call,
    getTournamentByInvite,
    sanitizeSharedState,
    applyRemoteState,
    createPlayer,
    linkProfileToPlayer,
    saveState,
    showToast,
    errorMessage,
    translate,
  }) {
    async function createTournament() {
      if (!isReady()) return false;
      const state = getState();
      const { data, error } = await call("create_tournament", {
        p_state: sanitizeSharedState(state),
        p_admin_token: state.adminToken,
      });
      if (error) {
        showToast(errorMessage(error, translate("messages.remoteSaveFailed")), "status-message-error");
        return false;
      }
      applyRemoteState({
        ...data,
        adminToken: state.adminToken,
        selectedPlayerId: state.selectedPlayerId,
      }, { source: "rpc", clearConflict: true });
      return true;
    }

    async function loadByInvite(inviteCode) {
      if (!isReady() || !inviteCode) return false;
      const { data, error } = await getTournamentByInvite(inviteCode);
      if (error || !data) return false;
      applyRemoteState(data, { source: "refresh" });
      return true;
    }

    async function join(playerName, avatarId) {
      if (!isReady()) return false;
      const state = getState();
      const player = linkProfileToPlayer(createPlayer(playerName, state.players.length, avatarId));
      player.joinedFrom = "self";
      player.guest = true;
      player.participantType = "guest";
      const { data, error } = await call("join_tournament", {
        p_invite_code: state.inviteCode,
        p_player: player,
      });
      if (error) {
        showToast(errorMessage(error, translate("messages.joinFailed")), "status-message-error");
        return false;
      }
      if (!data?.state || !data.playerToken || !data.playerId) {
        showToast(translate("messages.securePlayerFailed"), "status-message-error");
        return false;
      }
      applyRemoteState(data.state);
      state.playerToken = data.playerToken;
      state.selectedPlayerId = data.playerId;
      saveState({ remote: false });
      return true;
    }

    return { createTournament, loadByInvite, join };
  }

  window.PadelstarRemoteTournament = { create };
})();
