(() => {
  function create({
    windowRef,
    isSupabaseReady,
    isOnline,
    hasPendingRemoteWrites,
    isApplyingRemoteState,
    hasAdminTokenAndTournament,
    isCurrentUserAdmin,
    getRemoteMutationSequence,
    getLastRemotePersistedSequence,
    setRemoteMutationSequence,
    getRemoteSaveTimer,
    setRemoteSaveTimer,
    getRemoteRetryTimer,
    setRemoteRetryTimer,
    getRemoteRetryAttempt,
    setRemoteRetryAttempt,
    getRemoteWriteChain,
    setRemoteWriteChain,
    saveRemoteState,
    processPlayerScoreQueue,
    scheduleRealtimeReconnect,
  }) {
    function scheduleRemoteRetry() {
      if (!isSupabaseReady() || !isOnline() || !hasPendingRemoteWrites() || getRemoteRetryTimer()) return;
      const delays = [2000, 5000, 15000, 30000];
      const delay = delays[Math.min(getRemoteRetryAttempt(), delays.length - 1)];
      setRemoteRetryAttempt(getRemoteRetryAttempt() + 1);
      setRemoteRetryTimer(windowRef.setTimeout(() => {
        setRemoteRetryTimer(null);
        flushPendingRemoteWrites();
      }, delay));
    }

    function queueRemoteSave() {
      if (!isSupabaseReady() || isApplyingRemoteState() || !hasAdminTokenAndTournament()) return;
      const timer = getRemoteSaveTimer();
      if (timer) windowRef.clearTimeout(timer);
      setRemoteSaveTimer(windowRef.setTimeout(() => {
        setRemoteSaveTimer(null);
        setRemoteWriteChain(getRemoteWriteChain().catch(() => {}).then(saveRemoteState));
      }, 350));
    }

    function flushPendingRemoteWrites() {
      if (!isSupabaseReady() || !isOnline()) return;
      if (hasPendingRemoteWrites() && isCurrentUserAdmin()) {
        let sequence = getRemoteMutationSequence();
        if (sequence <= getLastRemotePersistedSequence()) {
          sequence = getLastRemotePersistedSequence() + 1;
          setRemoteMutationSequence(sequence);
        }
        setRemoteWriteChain(getRemoteWriteChain().catch(() => {}).then(saveRemoteState));
      }
      processPlayerScoreQueue();
    }

    return { scheduleRemoteRetry, queueRemoteSave, flushPendingRemoteWrites, scheduleRealtimeReconnect };
  }

  window.PadelstarRemoteSyncController = { create };
})();
