window.PadelstarSetScoreDialog = (() => {
  function create({ closeDialog, elements, escapeHtml, getMatchById, getState, saveSetResult, t }) {
    let pendingMatchId = null;

    function quickScoreButton(teamOne, teamTwo, winnerName) {
      return `<button class="quick-score-button" type="button" data-score="${teamOne}-${teamTwo}">${teamOne}-${teamTwo} ${escapeHtml(winnerName)}</button>`;
    }

    function quickScoreButtons(teamOneName, teamTwoName) {
      const gamesToWinSet = getState().settings.gamesToWinSet ?? 6;
      const scores = [
        ...Array.from({ length: Math.max(1, gamesToWinSet - 1) }, (_, index) => [gamesToWinSet, index]),
        [gamesToWinSet + 1, gamesToWinSet - 1],
        [gamesToWinSet + 1, gamesToWinSet],
      ];
      return [
        ...scores.map(([one, two]) => quickScoreButton(one, two, teamOneName)),
        ...scores.map(([one, two]) => quickScoreButton(two, one, teamTwoName)),
      ].join("");
    }

    function openSetScoreDialog(matchId) {
      const match = getMatchById(matchId);
      if (!match || ["finished", "cancelled"].includes(match.state)) return;
      pendingMatchId = matchId;
      elements.setScoreTitle.textContent = t("score.setResultTitle");
      elements.setScoreContext.textContent = t("score.matchup", { teamOne: match.teamOne.displayName, teamTwo: match.teamTwo.displayName });
      elements.setScoreOptions.innerHTML = quickScoreButtons(match.teamOne.displayName, match.teamTwo.displayName);
      elements.setScoreOptions.querySelectorAll("[data-score]").forEach((button) => {
        button.addEventListener("click", () => {
          const selectedMatch = getMatchById(pendingMatchId);
          if (!selectedMatch) return;
          const [teamOne, teamTwo] = button.dataset.score.split("-").map(Number);
          saveSetResult(selectedMatch, teamOne, teamTwo);
          closeSetScoreDialog();
        });
      });
      elements.setScoreDialog.showModal();
    }

    function closeSetScoreDialog() {
      pendingMatchId = null;
      elements.setScoreDialog.close();
      closeDialog?.();
    }

    return { closeSetScoreDialog, openSetScoreDialog };
  }

  return { create };
})();
