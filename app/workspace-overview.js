window.PadelstarWorkspaceOverview = (() => {
  function create({
    appendEmptyText,
    escapeHtml,
    getActiveRound,
    getState,
    elements,
    gameScoreText,
    matchContextText,
    matchStateText,
    primaryMatchHeadline,
    roundProgress,
    setScoreText,
    translate,
  }) {
    function renderAdminLiveOverview(matches) {
      if (!elements.adminLiveOverview) return;
      const state = getState();
      const activeRound = getActiveRound();
      const liveMatches = activeRound?.status === "active" ? activeRound.matches : matches;
      const playingMatches = liveMatches.filter((match) => match.state === "playing");
      const waitingMatches = liveMatches.filter((match) => match.state === "waiting");
      const finishedMatches = matches.filter((match) => match.state === "finished");
      const progress = activeRound ? roundProgress(activeRound) : { total: matches.length, finished: finishedMatches.length };
      const progressPercent = progress.total ? Math.round((progress.finished / progress.total) * 100) : 0;
      const spotlightMatch = playingMatches[0] ?? waitingMatches[0] ?? matches.at(-1);

      if (!spotlightMatch) {
        elements.adminLiveOverview.innerHTML = `
      <div class="overview-main">
        <span class="status-chip waiting">${translate("common.lobby")}</span>
        <strong>${translate("tournament.lobbyHeadline")}</strong>
        <small>${translate("tournament.playersReady", { players: state.players.length, courts: state.courts.length })}</small>
      </div>
      <div class="progress-track" aria-label="${translate("tournament.progressAria")}"><span style="width: 0%"></span></div>`;
        return;
      }

      elements.adminLiveOverview.innerHTML = `
    <div class="overview-main">
      <span class="status-chip ${spotlightMatch.state}">${matchStateText(spotlightMatch.state)}</span>
      <strong>${escapeHtml(primaryMatchHeadline(spotlightMatch))}</strong>
      <small>${escapeHtml(matchContextText(spotlightMatch))} · ${escapeHtml(setScoreText(spotlightMatch))} ${translate("common.games")} · ${escapeHtml(gameScoreText(spotlightMatch))}</small>
    </div>
    <div class="overview-stats">
      <div><span>${translate("common.active")}</span><strong>${playingMatches.length}</strong></div>
      <div><span>${translate("common.next")}</span><strong>${waitingMatches.length}</strong></div>
      <div><span>${translate("common.finished")}</span><strong>${finishedMatches.length}</strong></div>
    </div>
    <div class="progress-track" aria-label="${translate("tournament.progressAria")}"><span style="width: ${progressPercent}%"></span></div>`;
    }

    function renderCupTeamBuilder() {
      if (!elements.cupTeamBuilder) return;
      const state = getState();
      const isCup = state.settings.format === "cup";
      const isManual = state.settings.cupTeamSetupMode === "manual";
      const isLocked = state.rounds.length > 0 || state.status === "Avsluttet";
      elements.cupTeamBuilder.classList.toggle("hidden", !isCup || !isManual);
      elements.cupTeamSummary.textContent = translate("common.teamCount", { count: state.cupTeams.length });
      elements.cupTeamForm.elements.teamLines.value = state.cupTeams.map((team) => team.players.map((player) => player.name).join(" + ")).join("\n");
      elements.cupTeamForm.elements.teamLines.disabled = isLocked;
      elements.cupTeamForm.querySelector("button").disabled = isLocked;
    }

    function renderRoundSummary() {
      const state = getState();
      const activeRound = getActiveRound();
      elements.roundSummary.innerHTML = "";
      if (!activeRound || activeRound.matches.length === 0) {
        appendEmptyText(elements.roundSummary, translate("tournament.noRound"));
        return;
      }
      const progress = roundProgress(activeRound);
      const summaryItems = [
        { label: translate("common.round"), value: activeRound.roundNumber, detail: activeRound.status === "active" ? translate("common.playing") : translate("common.completed") },
        { label: translate("common.matches"), value: activeRound.matches.length, detail: translate("tournament.matchesFinishedShort", { finished: progress.finished, total: progress.total }) },
        { label: translate("common.resting"), value: activeRound.sittingOut?.length ?? 0, detail: activeRound.sittingOut?.length ? activeRound.sittingOut.map((player) => player.name).join(", ") : translate("common.none") },
      ];
      elements.roundSummary.innerHTML = summaryItems.map((item) => `
    <div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong><small>${escapeHtml(item.detail)}</small></div>`).join("");
    }

    return { renderAdminLiveOverview, renderCupTeamBuilder, renderRoundSummary };
  }

  return { create };
})();
