(() => {
  function create({
    getState,
    setState,
    getElements,
    getPendingPlayerScores,
    setPendingPlayerScores,
    setPendingAdminSync,
    setRemoteConflict,
    getSpectatorMode,
    setSpectatorMode,
    getSpectatorPreviousRole,
    setSpectatorPreviousRole,
    setLocalLeftPlayerId,
    getPlayerById,
    isCurrentUserAdmin,
    findPlayerByName,
    addPlayer,
    linkProfileToPlayer,
    loadRemoteTournamentByInvite,
    hasTournamentForInvite,
    getSupabaseClient,
    getProfile,
    syncProfile,
    requestConfirmation,
    showToast,
    translate,
    confirmRef,
    storage,
    keys,
    persistence,
    tournamentLibrary,
    defaultTournament,
    setLocalRole,
    saveState,
    persistSyncMetadata,
    removeRealtimeChannel,
    syncCreateFormDefaults,
    syncJoinPreview,
    renderExistingPlayerList,
    showWorkspace,
    showStart,
    render,
    windowRef,
    testMode,
  }) {
    const isTestMode = () => Boolean(testMode?.());

    function joinTournament(name, avatarId) {
      const existingPlayer = findPlayerByName(name);
      if (existingPlayer) return existingPlayer;
      const player = linkProfileToPlayer(addPlayer(name, "self", avatarId));
      player.guest = !player.profileId;
      player.participantType = player.profileId ? "player" : "guest";
      return player;
    }

    function leaveCurrentTournament(options = {}) {
      const state = getState();
      const selectedPlayer = getPlayerById(state.selectedPlayerId);
      if (!selectedPlayer) return false;
      const wasAdmin = Boolean(options.wasAdmin ?? isCurrentUserAdmin?.());
      const shouldConfirm = options.confirm !== false;
      const pendingScoreText = getPendingPlayerScores().length > 0 ? translate("player.leavePendingScores") : "";
      if (shouldConfirm && !confirmRef(translate("player.leaveConfirm", { name: selectedPlayer.name, pendingScoreText }))) return false;

      state.selectedPlayerId = null;
      setLocalLeftPlayerId(selectedPlayer.id);
      state.playerToken = null;
    setPendingPlayerScores([]);
      if (wasAdmin) {
        persistSyncMetadata();
        setLocalRole("admin");
        saveState({ remote: false });
      } else {
        removeRealtimeChannel();
        tournamentLibrary.remove(state.id);
        const language = state.settings?.language ?? "nb";
        setState(structuredClone(defaultTournament));
        getState().settings.language = language;
        getState().adminToken = null;
        getState().playerToken = null;
        setPendingAdminSync(false);
        setRemoteConflict(false);
        storage.removeItem(keys.storageKey);
        storage.removeItem(keys.recoveryStorageKey);
        storage.removeItem(keys.roleStorageKey);
        storage.removeItem(keys.syncStorageKey);
        persistence.removeKeys([keys.storageKey, keys.recoveryStorageKey, keys.roleStorageKey, keys.syncStorageKey]);
        if (!isTestMode()) {
          getElements().joinTournamentForm.reset();
          syncCreateFormDefaults();
          syncJoinPreview();
        }
        setSpectatorMode(false);
      }
      if (!isTestMode()) {
        if (wasAdmin) showWorkspace("admin");
        else showStart();
        render();
      }
      return true;
    }

    function leaveSpectatorView() {
      const previousRole = getSpectatorPreviousRole();
      const shouldClearLocalView = previousRole === "spectator";
      setSpectatorMode(false);
      const url = new URL(windowRef.location.href ?? windowRef.location.origin);
      url.searchParams.delete(keys.spectatorQueryKey);
      windowRef.history?.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      if (shouldClearLocalView) {
        const state = getState();
        removeRealtimeChannel();
        tournamentLibrary.remove(state.id);
        const language = state.settings?.language ?? "nb";
        setState(structuredClone(defaultTournament));
        getState().settings.language = language;
        getState().adminToken = null;
        getState().playerToken = null;
        setPendingAdminSync(false);
        setRemoteConflict(false);
        storage.removeItem(keys.storageKey);
        storage.removeItem(keys.recoveryStorageKey);
        storage.removeItem(keys.roleStorageKey);
        storage.removeItem(keys.syncStorageKey);
        persistence.removeKeys([keys.storageKey, keys.recoveryStorageKey, keys.roleStorageKey, keys.syncStorageKey]);
        if (!isTestMode()) {
          getElements().joinTournamentForm.reset();
          syncCreateFormDefaults();
          syncJoinPreview();
        }
      } else setLocalRole(previousRole);
      setSpectatorPreviousRole("spectator");
      if (!isTestMode()) { showStart(); render(); }
    }

    async function leaveCurrentTournamentWithDialog() {
      const selectedPlayer = getPlayerById(getState().selectedPlayerId);
      if (!selectedPlayer) return false;
      const pendingScoreText = getPendingPlayerScores().length > 0 ? translate("player.leavePendingScores") : "";
      const accepted = await requestConfirmation(translate("player.leaveConfirm", { name: selectedPlayer.name, pendingScoreText }));
      return accepted ? leaveCurrentTournament({ confirm: false }) : false;
    }

    async function showExistingPlayers() {
      const elements = getElements();
      const inviteCode = elements.joinTournamentForm.elements.inviteCode.value.trim().toUpperCase();
      if (!inviteCode) {
        showToast(translate("messages.inviteCodeRequired"), "status-message-error");
        elements.joinTournamentForm.elements.inviteCode.focus();
        return;
      }
      const loadedRemote = getSupabaseClient() ? await loadRemoteTournamentByInvite(inviteCode) : false;
      if (!hasTournamentForInvite(inviteCode, loadedRemote)) {
        showToast(translate("messages.tournamentNotFound", { code: inviteCode }), "status-message-error");
        return;
      }
      elements.existingPlayerList.classList.toggle("hidden");
      renderExistingPlayerList?.();
    }

    return { joinTournament, leaveCurrentTournament, leaveSpectatorView, leaveCurrentTournamentWithDialog, showExistingPlayers };
  }

  window.PadelstarSessionController = { create };
})();
