(() => {
  function create({ getState, getPlayerById, requestConfirmation, translate, isSupabaseReady, remoteRpc, getSupabaseClient, applyRemoteState, handleRemoteError, saveState, isCurrentUserAdmin, render }) {
    async function toggleSelectedPlayerAvailability() {
      const state = getState();
      const player = getPlayerById(state.selectedPlayerId);
      if (!player) return false;
      const isAway = player.availability === "away";
      const message = isAway
        ? translate("messages.returnToTournamentConfirm", { name: player.name })
        : translate("messages.markAwayConfirm", { name: player.name });
      if (!await requestConfirmation(message)) return false;
      const nextAvailability = isAway ? "active" : "away";
      if (isSupabaseReady() && state.playerToken && state.id) {
        const { data, error } = await remoteRpc(getSupabaseClient(), "set_player_availability", {
          p_tournament_id: state.id,
          p_invite_code: state.inviteCode,
          p_player_id: player.id,
          p_availability: nextAvailability,
          p_player_token: state.playerToken,
        });
        if (error || !data) {
          handleRemoteError(error, translate("messages.availabilityUpdateFailed"));
          return false;
        }
        applyRemoteState(data, { source: "rpc", clearConflict: true });
        return true;
      }
      player.availability = nextAvailability;
      saveState({ remote: isCurrentUserAdmin() });
      render();
      return true;
    }

    return { toggleSelectedPlayerAvailability };
  }

  window.PadelstarPlayerActions = { create };
})();
