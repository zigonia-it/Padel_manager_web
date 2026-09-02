window.PadelstarPlayerStatus = (() => {
  function create({ elements, getPlayerById, getState, matchIncludesPlayer, playerTournamentState, pointsByPlayer, statsForPlayer, t }) {
    function renderPlayerStatus(matches) {
      const state = getState();
      const player = getPlayerById(state.selectedPlayerId);
      if (!player) {
        elements.playerStatusGrid.innerHTML = `
      <div class="waiting">
        <span>${t("common.status")}</span>
        <strong>${t("common.select")}</strong>
        <small>${t("common.player")}</small>
      </div>`;
        return;
      }

      const playerMatches = matches.filter((match) => matchIncludesPlayer(match, player.id));
      const stats = statsForPlayer(player, matches);
      const nextState = playerTournamentState(player, matches);
      const statusText = {
        playing: t("common.playing"),
        waiting: t("common.next"),
        resting: t("common.resting"),
        idle: t("common.waiting"),
      }[nextState.kind] ?? t("common.waiting");

      elements.playerStatusGrid.innerHTML = `
    <div class="${nextState.kind === "playing" ? "ready" : "waiting"}">
      <span>${t("common.status")}</span>
      <strong>${state.status === "Avsluttet" ? t("common.finished") : statusText}</strong>
      <small>${nextState.match?.courtName ?? (nextState.kind === "resting" ? t("tournament.thisRound") : t("tournament.noCourt"))}</small>
    </div>
    <div class="ready">
      <span>${t("common.points")}</span>
      <strong>${pointsByPlayer(matches, state.settings.pointMode)[player.id] ?? 0}</strong>
      <small>${t("standings.wins", { wins: stats.matchWins })}</small>
    </div>
    <div class="ready">
      <span>${t("common.matches")}</span>
      <strong>${playerMatches.length}</strong>
      <small>${t("standings.played", { played: stats.matchesPlayed })}</small>
    </div>`;
    }

    return { renderPlayerStatus };
  }

  return { create };
})();
