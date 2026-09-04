window.PadelstarPlayerNextMatch = (() => {
  function create({
    accentStyle,
    elements,
    escapeHtml,
    gameScoreText,
    getActiveRound,
    getPlayerById,
    getState,
    matchContextText,
    notifyPlayerMatch,
    playerPlacement,
    playerTournamentState,
    scoreSummary,
    t,
  }) {
    function renderPlayerNextMatch(matches) {
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
      const ownScore = isTeamOne ? match.currentSet.teamOne : match.currentSet.teamTwo;
      const opponentScore = isTeamOne ? match.currentSet.teamTwo : match.currentSet.teamOne;

      elements.playerNextMatch.innerHTML = `
    <p class="eyebrow">${statusLabel}</p>
    <h3>${escapeHtml(match.courtName ?? t("tournament.courtComing"))}</h3>
    <div class="player-now-grid">
      <div><span>${t("player.teammate")}</span><strong>${teammate ? escapeHtml(teammate.name) : t("common.single")}</strong></div>
      <div><span>${t("player.opponents")}</span><strong>${opponentNames}</strong></div>
      <div><span>${t("common.games")}</span><strong>${ownScore}-${opponentScore}</strong></div>
      <div><span>${t("common.points")}</span><strong>${gameScoreText(match)}</strong></div>
    </div>
    <div class="next-match-summary">
      <span>${escapeHtml(matchContextText(match))}</span>
      <span>${scoreSummary(match)}</span>
    </div>`;
    }

    return { renderPlayerNextMatch };
  }

  return { create };
})();
