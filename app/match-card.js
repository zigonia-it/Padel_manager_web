(function initPadelstarMatchCard(global) {
  function create(dependencies = {}) {
    const {
      awardTennisPoint,
      cancelMatch,
      escapeAttribute,
      escapeHtml,
      gameScoreText,
      matchContextText,
      matchIncludesPlayer,
      matchStateText,
      openLargeScore,
      openSetScoreDialog,
      primaryMatchHeadline,
      reopenMatch,
      setScoreText,
      setWalkover,
      scoreConflict,
      sittingOutSummary,
      startMatch,
      teamAccentStyle,
      teamDisplay,
      tennisPointLabel,
      translate,
      updateMatchCourt,
    } = dependencies;

    function createMatchCard(match, editable, highlightedPlayerId = null, scoreOnly = false) {
      const card = global.document.createElement("article");
      card.className = `match-card match-${match.state} ${highlightedPlayerId && matchIncludesPlayer(match, highlightedPlayerId) ? "highlight-match" : ""}`;
      card.dataset.matchId = match.id;
      card.setAttribute("style", teamAccentStyle(match.teamOne));
      const teamOneName = escapeHtml(match.teamOne.displayName);
      const teamTwoName = escapeHtml(match.teamTwo.displayName);
      const winner = match.winnerTeamIndex === 0 ? match.teamOne : match.winnerTeamIndex === 1 ? match.teamTwo : null;
      const pointControlsEnabled = editable && match.state !== "cancelled";
      const sittingOut = sittingOutSummary(match);
      const matchNote = [sittingOut, winner ? `<p class="winner-note">${translate("score.winnerNote", { winner: escapeHtml(winner.displayName) })}</p>` : "", scoreConflict?.(match) ? `<p class="match-conflict">${translate("score.conflictAdminHint")}</p>` : ""]
        .filter(Boolean)
        .join("");
      const pointControl = (teamIndex, teamName) => pointControlsEnabled
        ? `<button class="scorecard-point-button" type="button" data-point-team="${teamIndex}" aria-label="${translate("score.pointsLabel", { team: teamName })}" ${match.state === "finished" ? "disabled" : ""}>${tennisPointLabel(match.currentGame?.[teamIndex === 0 ? "teamOne" : "teamTwo"] ?? 0)}</button>`
        : `<strong class="scorecard-point-value">${tennisPointLabel(match.currentGame?.[teamIndex === 0 ? "teamOne" : "teamTwo"] ?? 0)}</strong>`;
      card.innerHTML = `
    <div class="match-top">
      <div class="match-meta">
        <span>${escapeHtml(matchContextText(match))}</span>
      </div>
      <div class="match-top-actions">
        <span class="match-court">${match.courtName ?? translate("tournament.noCourtAssigned")}</span>
        <span class="match-status ${match.state}">${matchStateText(match.state)}</span>
      </div>
    </div>
    <div class="match-headline">
      <span>${escapeHtml(primaryMatchHeadline(match))}</span>
    </div>
    <div class="scorecard-matchup">
      <section class="scorecard-team scorecard-team-one" style="${teamAccentStyle(match.teamOne)}">
        <h3>${translate("common.teamOne")}</h3>
        <div class="scorecard-players">${teamDisplay(match.teamOne, "scorecard")}</div>
      </section>
      <section class="scorecard-center" aria-label="${translate("score.scoreboardAria")}">
        <div class="scorecard-emblem" aria-hidden="true"><img src="assets/icons/padelstar-icon.png" alt="" width="54" height="54"></div>
        <div class="scorecard-score-pair">
          ${pointControl(0, teamOneName)}
          <img class="scorecard-vs-icon" src="assets/icons/vs_icon" alt="VS" width="88" height="58">
          ${pointControl(1, teamTwoName)}
        </div>
      </section>
      <section class="scorecard-team scorecard-team-two" style="${teamAccentStyle(match.teamTwo)}">
        <h3>${translate("common.teamTwo")}</h3>
        <div class="scorecard-players">${teamDisplay(match.teamTwo, "scorecard")}</div>
      </section>
    </div>
    <div class="scorecard-stats" aria-label="${translate("score.scoreboardAria")}">
      <div><span class="scorecard-stat-icon" aria-hidden="true">◆</span><span>${translate("common.games")}</span><strong>${setScoreText(match)}</strong></div>
      <div><span class="scorecard-stat-icon" aria-hidden="true">✦</span><span>${translate("common.points")}</span><strong>${gameScoreText(match)}</strong></div>
      <div><span class="scorecard-stat-icon" aria-hidden="true">◎</span><span>${translate("common.sets")}</span><strong>${setScoreText(match)}</strong></div>
    </div>
    ${matchNote ? `<div class="match-note">${matchNote}</div>` : ""}
  `;

      if (editable && match.state !== "cancelled") {
        const controls = global.document.createElement("div");
        controls.className = "match-controls";
        controls.innerHTML = `
      ${scoreOnly ? "" : `<div class="court-edit-row">
        <label>${translate("common.court")} <input class="court-name-input" type="text" value="${escapeAttribute(match.courtName ?? "")}" placeholder="${translate("common.court")}" aria-label="${translate("score.courtForMatch", { teamOne: teamOneName, teamTwo: teamTwoName })}"></label>
        <button class="secondary save-court-button" type="button">${translate("actions.saveCourt")}</button>
      </div>
      <div class="button-row">
        <button class="secondary set-score-button" type="button">${translate("actions.setResult")}</button>
        <button class="secondary start-match-button" type="button" ${match.state !== "waiting" ? "disabled" : ""}>${translate("actions.startMatch")}</button>
        <button class="secondary large-score-button" type="button" ${match.state !== "playing" ? "disabled" : ""}>${translate("actions.largeScore")}</button>
        <button class="secondary reopen-match-button" type="button" ${["cancelled"].includes(match.state) || !match.lastScoredMatchState ? "disabled" : ""}>${match.state === "finished" ? translate("actions.undoResult") : translate("actions.undoLast")}</button>
        <button class="ghost cancel-match-button" type="button" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>${translate("actions.cancelMatch")}</button>
        <div class="walkover-row">
          <span>${translate("score.walkover")}</span>
          <button class="ghost walkover-button" type="button" data-walkover-team="0" aria-label="${translate("score.walkoverForAria", { team: teamOneName })}" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>${teamOneName}</button>
          <button class="ghost walkover-button" type="button" data-walkover-team="1" aria-label="${translate("score.walkoverForAria", { team: teamTwoName })}" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>${teamTwoName}</button>
        </div>
      </div>`}
    `;

        if (!scoreOnly) {
          const courtInput = controls.querySelector(".court-name-input");
          controls.querySelector(".save-court-button").addEventListener("click", () => updateMatchCourt(match, courtInput.value));
        }
        card.querySelectorAll("[data-point-team]").forEach((button) => {
          button.addEventListener("click", () => awardTennisPoint(match, Number(button.dataset.pointTeam)));
        });
        if (!scoreOnly) {
          controls.querySelector(".set-score-button").addEventListener("click", () => openSetScoreDialog(match.id));
          controls.querySelector(".start-match-button").addEventListener("click", () => startMatch(match));
          controls.querySelector(".large-score-button").addEventListener("click", () => openLargeScore(match.id));
          controls.querySelector(".reopen-match-button").addEventListener("click", () => reopenMatch(match));
          controls.querySelector(".cancel-match-button").addEventListener("click", () => void cancelMatch(match));
          controls.querySelectorAll(".walkover-button").forEach((button) => {
            button.addEventListener("click", () => void setWalkover(match, Number(button.dataset.walkoverTeam)));
          });
        }
        card.append(controls);
      }
      return card;
    }

    return { createMatchCard };
  }

  global.PadelstarMatchCard = { create };
})(window);
