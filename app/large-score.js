window.PadelstarLargeScore = (() => {
  function create({ awardTennisPoint, closeLargeScore, elements, escapeHtml, getMatchById, getState, gameScoreText, matchContextText, setScoreText, startingTeamText, teamAccentStyle, teamDisplay, tennisPointLabel, t }) {
    function renderLargeScore(matchId) {
      if (!matchId || !elements.largeScoreDialog.open) return;
      const match = getMatchById(matchId);
      if (!match || match.state !== "playing") {
        closeLargeScore();
        return;
      }
      const state = getState();
      elements.largeScoreSurface.setAttribute("style", teamAccentStyle(match.teamOne));
      elements.largeScoreContext.textContent = `${matchContextText(match)} · ${match.courtName ?? t("tournament.noCourtAssigned")}`;
      elements.largeScoreTitle.textContent = t("score.matchup", { teamOne: match.teamOne.displayName, teamTwo: match.teamTwo.displayName });
      elements.largeScoreBoard.innerHTML = [match.teamOne, match.teamTwo].map((team, index) => {
        const teamKey = index === 0 ? "teamOne" : "teamTwo";
        return `
          <button class="large-score-team" type="button" data-large-score-team="${index}" style="${teamAccentStyle(team)}">
            <span>${teamDisplay(team)}</span>
            <strong>${match.currentSet[teamKey]}</strong>
            <small>${tennisPointLabel(match.currentGame[teamKey])}</small>
          </button>`;
      }).join("");
      elements.largeScoreActions.innerHTML = `
        <div><span>${t("common.games")}</span><strong>${setScoreText(match)}</strong></div>
        <div><span>${t("common.points")}</span><strong>${gameScoreText(match)}</strong></div>
        <div><span>${t("common.server")}</span><strong>${escapeHtml(startingTeamText(match))}</strong></div>`;
      elements.largeScoreBoard.querySelectorAll("[data-large-score-team]").forEach((button) => {
        button.addEventListener("click", () => awardTennisPoint(match, Number(button.dataset.largeScoreTeam)));
      });
    }

    return { renderLargeScore };
  }

  return { create };
})();
