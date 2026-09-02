window.PadelstarAdminStatus = (() => {
  function create({ canGenerateRound, elements, generateRoundBlockReason, getActiveRound, getLocalStorage, getState, hasActiveTournament, hasPendingRemoteWrites, isSupabaseReady, isCurrentUserAdmin, pendingRemoteWriteCount, realtimeConnectionState, roundProgress, storageKey, syncLastAttemptAt, syncLastError, remoteConflict, t }) {
    function renderSyncControls() {
      if (!elements.refreshRemoteButton) return;
      const canRefresh = remoteConflict() && isCurrentUserAdmin();
      elements.refreshRemoteButton.classList.toggle("hidden", !canRefresh);
      elements.refreshRemoteButton.textContent = t("refreshRemoteState");
      elements.conflictActions?.classList.toggle("hidden", !canRefresh);
      if (!elements.syncStatusDetail) return;
      const pending = pendingRemoteWriteCount();
      if (remoteConflict()) {
        elements.syncStatusDetail.textContent = t("messages.remoteConflict");
      } else if (pending > 0) {
        const attempted = syncLastAttemptAt() ? new Date(syncLastAttemptAt()).toLocaleTimeString(document.documentElement.lang || "nb-NO", { hour: "2-digit", minute: "2-digit" }) : t("common.none");
        elements.syncStatusDetail.textContent = `${t("syncPending")} (${pending}) · ${attempted}`;
      } else {
        elements.syncStatusDetail.textContent = syncLastError() || "";
      }
    }

    function renderLobbyStatus() {
      const state = getState();
      const minimumPlayersReady = state.players.length >= 2;
      const hasCourts = state.courts.length >= 1;
      const hasStarted = state.rounds.length > 0;
      const activeRound = getActiveRound();
      const isFinished = state.status === "Avsluttet";
      const blockReason = generateRoundBlockReason();
      const nextRoundLabel = blockReason || (state.currentRound > 0 ? t("tournament.nextRoundLabel", { round: state.currentRound + 1 }) : t("tournament.firstRoundReady"));
      const playerMode = state.settings.format === "cup" ? "Cup" : state.players.length >= 4 ? t("common.double") : state.players.length >= 2 ? t("common.single") : t("common.waiting");
      const progress = activeRound?.status === "active" ? roundProgress(activeRound) : null;
      const statusText = isFinished ? t("common.finished") : activeRound?.status === "active" ? t("common.playing") : hasStarted ? t("common.betweenRounds") : t("common.lobby");
      elements.lobbyStatus.innerHTML = `
        <div class="${minimumPlayersReady ? "ready" : "waiting"}"><span>${t("admin.players")}</span><strong>${state.players.length}</strong><small>${minimumPlayersReady ? playerMode : t("common.minimumTwo")}</small></div>
        <div class="${hasCourts ? "ready" : "waiting"}"><span>${t("admin.courtsInUse")}</span><strong>${state.courts.length}</strong><small>${hasCourts ? t("common.ready") : t("common.missing")}</small></div>
        <div class="${canGenerateRound() ? "ready" : "waiting"}"><span>${t("common.status")}</span><strong>${statusText}</strong><small>${progress ? t("tournament.matchesFinished", progress) : nextRoundLabel}</small></div>`;
    }

    function renderStartResume() {
      const state = getState();
      const hasSavedTournament = Boolean(getLocalStorage().getItem(storageKey));
      elements.resumePanel.classList.toggle("hidden", !hasSavedTournament);
      if (!hasSavedTournament) return;
      const isAdmin = isCurrentUserAdmin();
      elements.resumeTitle.textContent = t("resume.title", { name: state.name });
      elements.resumeSummary.textContent = isAdmin
        ? t("resume.adminSummary", { players: state.players.length, courts: state.courts.length, code: state.inviteCode })
        : t("resume.summary", { players: state.players.length, courts: state.courts.length });
      elements.resumeTournamentButton.textContent = isAdmin ? t("resume.continueAdmin") : t("resume.continueTournament");
    }

    function syncConnectionStatus() {
      const state = getState();
      const connectionState = state.id && hasActiveTournament() ? realtimeConnectionState() : "connected";
      const isOnline = navigator.onLine && isSupabaseReady() && connectionState === "connected";
      const statusKey = isOnline ? "realtimeConnected" : "offline";
      const statusClass = isOnline ? "connected" : "offline";
      elements.connectionStatus.textContent = t(statusKey);
      if (navigator.onLine && isSupabaseReady() && hasPendingRemoteWrites()) {
        elements.connectionStatus.textContent += ` · ${t("syncPending")} (${pendingRemoteWriteCount()})`;
      }
      elements.connectionStatus.dataset.status = statusClass;
      elements.connectionStatus.setAttribute("aria-label", t("status.connectionAria", { status: elements.connectionStatus.textContent }));
      elements.connectionStatus.classList.toggle("offline", statusClass === "offline");
    }

    return { renderLobbyStatus, renderStartResume, renderSyncControls, syncConnectionStatus };
  }
  return { create };
})();
