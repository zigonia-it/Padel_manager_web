(() => {
  function create({
    getState,
    setState,
    getPendingPlayerScores,
    setPendingPlayerScores,
    getPendingAdminSync,
    setPendingAdminSync,
    setRemoteConflict,
    getRemoteMutationSequence,
    getLastRemotePersistedSequence,
    setLastRemotePersistedSequence,
    setIsApplyingRemoteState,
    clearRemoteSaveTimer,
    migrateState,
    loadUserLanguage,
    saveState,
    persistSyncMetadata,
    setRemoteNotice,
    connectRealtimeForCurrentState,
    hasRealtimeChannel,
    render,
    saveProfileHistory,
    translate,
  }) {
    function markRemoteConflict() {
      setRemoteConflict(true);
      setPendingAdminSync(false);
      clearRemoteSaveTimer();
      setLastRemotePersistedSequence(Math.max(getLastRemotePersistedSequence(), getRemoteMutationSequence()));
      persistSyncMetadata();
      setRemoteNotice(translate("messages.remoteConflict"));
      render();
    }

    function applyRemoteState(remoteState, options = {}) {
      if (!remoteState) return false;
      const state = getState();
      const wasEnded = state.status === "Avsluttet";
      const source = options.source ?? "remote";
      const sameTournament = state.id === remoteState.id;
      const remoteRevision = Number.isInteger(remoteState.revision) ? remoteState.revision : 0;
      const currentRevision = Number.isInteger(state.revision) ? state.revision : 0;
      const pendingPlayerScores = getPendingPlayerScores();
      const pendingAdminSync = getPendingAdminSync();

      if (sameTournament) {
        if (remoteRevision < currentRevision) return false;
        if (pendingPlayerScores.length > 0 && ["realtime", "refresh"].includes(source)) return false;
        if (pendingAdminSync && source !== "rpc" && remoteRevision === currentRevision) return false;
        if (pendingAdminSync && source !== "rpc" && remoteRevision > currentRevision) markRemoteConflict();
        if (source === "realtime" && remoteRevision === currentRevision) return false;
      } else {
        setPendingAdminSync(false);
        setPendingPlayerScores([]);
        persistSyncMetadata();
      }

      const selectedPlayerId = state.selectedPlayerId ?? null;
      const adminToken = state.id === remoteState.id ? state.adminToken ?? null : null;
      const playerToken = state.id === remoteState.id ? state.playerToken ?? null : null;
      const ownerUserId = state.id === remoteState.id ? state.ownerUserId ?? null : null;
      const previousTournamentId = state.id;
      setIsApplyingRemoteState(true);
      const nextState = migrateState({ ...remoteState, selectedPlayerId });
      nextState.adminToken = adminToken;
      nextState.playerToken = playerToken;
      nextState.ownerUserId = remoteState.ownerUserId ?? ownerUserId;
      setState(nextState);
      const currentState = getState();
      currentState.ownerProfileId = remoteState.ownerProfileId ?? currentState.ownerProfileId ?? null;
      currentState.settings.language = loadUserLanguage(currentState.settings?.language ?? "nb");
      saveState({ remote: false });
      if (options.clearConflict) {
        setRemoteConflict(false);
        setRemoteNotice(translate("messages.remoteStateUpdated"));
      }
      if (previousTournamentId !== currentState.id || !hasRealtimeChannel()) connectRealtimeForCurrentState();
      render();
      if (!wasEnded && currentState.status === "Avsluttet") saveProfileHistory();
      setIsApplyingRemoteState(false);
      return true;
    }

    return { markRemoteConflict, applyRemoteState };
  }

  window.PadelstarRemoteStateController = { create };
})();
