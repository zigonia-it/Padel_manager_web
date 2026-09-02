(function initPadelstarRemoteFeedback(global) {
  function create({ getClient, getElements, getNavigator, getSpectatorMode, isConflictError, isTransientRemoteError, markSyncAttempt, remoteRpc, renderSyncControls, sanitizeSharedState, showToast, stateManager, translate }) {
    function isSupabaseReady() {
      return Boolean(getClient());
    }

    function getTournamentByInviteRpc(inviteCode) {
      const rpcName = getSpectatorMode() ? "get_spectator_tournament_by_code" : "get_tournament_by_code";
      return remoteRpc(getClient(), rpcName, { p_invite_code: inviteCode });
    }

    function remoteErrorMessage(error, fallback) {
      return stateManager.remoteErrorMessage(error, fallback);
    }

    function sanitizeSharedStateForRemote(nextState) {
      return stateManager.sanitizeSharedState(nextState);
    }

    function conflictError(error) {
      return stateManager.isConflictError(error);
    }

    function transientRemoteError(error) {
      return stateManager.isTransientRemoteError(error, getNavigator().onLine);
    }

    function setRemoteNotice(message) {
      const elements = getElements();
      if (elements.copyStatus) {
        elements.copyStatus.textContent = message;
        elements.copyStatus.classList.remove("status-message-success", "status-message-warning", "status-message-error");
        const messageText = String(message ?? "").toLowerCase();
        const statusClass = /feil|error|konflikt|failed|ikke/.test(messageText)
          ? "status-message-error"
          : /venter|sender|pending|reconnecting|kobler/.test(messageText)
            ? "status-message-warning"
            : "status-message-success";
        elements.copyStatus.classList.add(statusClass);
        showToast(message, statusClass);
      }
      renderSyncControls();
    }

    return {
      conflictError,
      getTournamentByInviteRpc,
      isSupabaseReady,
      markSyncAttempt,
      remoteErrorMessage,
      sanitizeSharedState: sanitizeSharedStateForRemote,
      setRemoteNotice,
      transientRemoteError,
    };
  }

  global.PadelstarRemoteFeedback = { create };
})(window);
