window.PadelstarSetScoreDialog = (() => {
  function create({ closeDialog, elements, escapeHtml, getMatchById, getState, saveSetResult, t }) {
    let pendingMatchId = null;

    function quickScoreButton(teamOne, teamTwo, winnerName) {
      return `<button class="quick-score-button" type="button" data-score="${teamOne}-${teamTwo}">${teamOne}-${teamTwo} ${escapeHtml(winnerName)}</button>`;
    }

    const QUICK_LIMIT = 14;

    function quickScoreButtons(teamOneName, teamTwoName) {
      const scores = window.PadelstarScoring.finishedSetScores(getState().settings);
      if (scores.length > QUICK_LIMIT) return "";
      return [
        ...scores.map(([one, two]) => quickScoreButton(one, two, teamOneName)),
        ...scores.map(([one, two]) => quickScoreButton(two, one, teamTwoName)),
      ].join("");
    }

    // A long list of finished scores (first to 21, ...) is entered as two numbers instead of a wall of buttons.
    function manualScoreForm(teamOneName, teamTwoName) {
      return `<form class="manual-score-form" data-manual-score>
        <label>${escapeHtml(teamOneName)}<input name="teamOne" type="number" min="0" max="9999" inputmode="numeric" required></label>
        <span aria-hidden="true">–</span>
        <label>${escapeHtml(teamTwoName)}<input name="teamTwo" type="number" min="0" max="9999" inputmode="numeric" required></label>
        <button class="primary" type="submit">${t("actions.save")}</button>
      </form>`;
    }

    function openSetScoreDialog(matchId) {
      const match = getMatchById(matchId);
      if (!match || ["finished", "cancelled"].includes(match.state)) return;
      pendingMatchId = matchId;
      elements.setScoreTitle.textContent = t("score.setResultTitle");
      elements.setScoreContext.textContent = t("score.matchup", { teamOne: match.teamOne.displayName, teamTwo: match.teamTwo.displayName });
      const quick = quickScoreButtons(match.teamOne.displayName, match.teamTwo.displayName);
      elements.setScoreOptions.innerHTML = quick || manualScoreForm(match.teamOne.displayName, match.teamTwo.displayName);
      elements.setScoreOptions.querySelector("[data-manual-score]")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const selectedMatch = getMatchById(pendingMatchId);
        if (!selectedMatch) return;
        const form = new FormData(event.currentTarget);
        saveSetResult(selectedMatch, Number(form.get("teamOne")), Number(form.get("teamTwo")));
        closeSetScoreDialog();
      });
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
