window.PadelstarPlayerNextMatch = (() => {
  function create({
    accentStyle,
    approvalPanelMarkup,
    bindApprovalPanel,
    timerMarkup,
    bindScoreboardTable,
    elements,
    escapeHtml,
    getActiveRound,
    getPlayerById,
    getState,
    matchContextText,
    notifyPlayerMatch,
    playerPlacement,
    playerTournamentState,
    scoreSummary,
    scoreboardTableMarkup,
    t,
  }) {
    // A finished match that still waits for approval is no longer "my match", so it is shown above it.
    function renderApprovalNotices(matches) {
      const state = getState();
      const playerId = state.selectedPlayerId;
      elements.playerNextMatch.querySelectorAll(".player-approval-notice").forEach((node) => node.remove());
      if (!playerId || state.status === "Avsluttet") return;
      const awaiting = matches.filter((match) => match.state === "awaitingApproval"
        && [...match.teamOne.players, ...match.teamTwo.players].some((player) => player.id === playerId));
      awaiting.reverse().forEach((match) => {
        const notice = document.createElement("section");
        notice.className = "player-approval-notice";
        notice.innerHTML = `<p class="eyebrow">${t("result.needsAttention")}</p><h3>${escapeHtml(match.courtName ?? "")}</h3>${approvalPanelMarkup(match, true, true)}`;
        elements.playerNextMatch.prepend(notice);
        bindApprovalPanel(notice, match);
      });
    }

    function renderPlayerNextMatch(matches) {
      renderPlayerNextMatchCore(matches);
      renderApprovalNotices(matches);
    }

    function renderPlayerNextMatchCore(matches) {
      const state = getState();
      const player = getPlayerById(state.selectedPlayerId);
      if (!player) {
        elements.playerNextMatch.removeAttribute("style");
        elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">${t("player.nextMatch")}</p>
      <h3>${t("player.chooseProfile")}</h3>
      <p>${t("player.chooseProfileHint")}</p>
      <div class="button-row player-empty-actions">
        <button class="secondary" type="button" data-player-action="spectate">${t("actions.viewAsSpectator")}</button>
        <button class="secondary" type="button" data-player-action="choose">${t("actions.choosePlayer")}</button>
        <button class="ghost" type="button" data-player-action="rejoin">${t("actions.joinAgain")}</button>
      </div>`;
        return;
      }

      if (state.status === "Avsluttet") {
        const placement = playerPlacement(player, matches);
        elements.playerNextMatch.setAttribute("style", accentStyle(player.accent));
        elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">${t("player.tournamentFinished")}</p>
      <h3>${placement ? t("player.finishedWithPlacement", { name: escapeHtml(player.name), placement }) : t("player.finishedWithoutPlacement", { name: escapeHtml(player.name) })}</h3>
      <p>${t("player.checkFinalStandings")}</p>`;
        return;
      }

      const playerState = playerTournamentState(player, matches);
      elements.playerNextMatch.setAttribute("style", accentStyle(player.accent));

      if (playerState.kind === "resting") {
        const activeRound = getActiveRound();
        elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">${t("player.restingThisRound")}</p>
      <h3>${t("player.restingTitle", { name: escapeHtml(player.name) })}</h3>
      <div class="player-now-grid">
        <div><span>${t("common.round")}</span><strong>${activeRound?.roundNumber ?? "-"}</strong></div>
        <div><span>${t("common.status")}</span><strong>${t("common.resting")}</strong></div>
      </div>
      <p>${t("player.restingHint")}</p>`;
        return;
      }

      if (!playerState.match) {
        elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">${t("common.waiting")}</p>
      <h3>${t("player.waitingTitle", { name: escapeHtml(player.name) })}</h3>
      <div class="player-now-grid">
        <div><span>${t("common.status")}</span><strong>${t("common.waiting")}</strong></div>
        <div><span>${t("common.round")}</span><strong>${Math.max(state.currentRound, 1)}</strong></div>
      </div>
      <p>${t("player.waitingHint")}</p>`;
        return;
      }

      const match = playerState.match;
      notifyPlayerMatch(match, playerState.kind);
      const isTeamOne = match.teamOne.players.some((item) => item.id === player.id);
      const ownTeam = isTeamOne ? match.teamOne : match.teamTwo;
      const opponents = isTeamOne ? match.teamTwo : match.teamOne;
      const teammate = ownTeam.players.find((item) => item.id !== player.id);
      const opponentNames = opponents.players.map((opponent) => escapeHtml(opponent.name)).join(" & ");
      const statusLabel = playerState.kind === "playing" ? t("player.playingNow") : t("player.nextMatch");
      const matchesAhead = playerState.kind === "waiting" && !match.courtName
        ? matches.filter((otherMatch) => otherMatch.state === "waiting" && (otherMatch.queuePosition ?? 0) < (match.queuePosition ?? 0)).length
        : 0;
      const isPlaying = playerState.kind === "playing";

      elements.playerNextMatch.innerHTML = `
    <p class="eyebrow">${statusLabel}</p>
    <h3>${escapeHtml(match.courtName ?? t("tournament.courtComing"))}</h3>
    ${matchesAhead > 0 ? `<p class="hint">${t("player.matchesAhead", { count: matchesAhead })}</p>` : ""}
    <div class="player-now-grid">
      <div><span>${t("player.teammate")}</span><strong>${teammate ? escapeHtml(teammate.name) : t("common.single")}</strong></div>
      <div><span>${t("player.opponents")}</span><strong>${opponentNames}</strong></div>
    </div>
    ${isPlaying ? `<p class="hint">${timerMarkup(match)}</p>` : ""}
    ${isPlaying ? scoreboardTableMarkup(match, true) : ""}
    <div class="next-match-summary">
      <span>${escapeHtml(matchContextText(match))}</span>
      <span>${scoreSummary(match)}</span>
    </div>`;

      if (isPlaying) bindScoreboardTable(elements.playerNextMatch, match, true);
    }

    return { renderPlayerNextMatch };
  }

  return { create };
})();
