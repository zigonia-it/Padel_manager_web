(function initPadelstarMatchCard(global) {
  function create(dependencies = {}) {
    const {
      awardTennisPoint,
      cancelMatch,
      currentLocalRole,
      escapeAttribute,
      escapeHtml,
      getState,
      matchContextText,
      matchIncludesPlayer,
      matchStateText,
      openLargeScore,
      openSetScoreDialog,
      primaryMatchHeadline,
      reopenMatch,
      setWalkover,
      setsWonByTeam,
      scoreConflict,
      scoreSummary,
      sittingOutSummary,
      startMatch,
      teamAccentStyle,
      teamDisplay,
      tennisPointLabel,
      translate,
      undoMatch,
      updateMatchCourt,
    } = dependencies;

    const expandState = new Map();

    function isExpanded(match) {
      return expandState.has(match.id) ? expandState.get(match.id) : match.state === "playing";
    }

    function scoreboardRow(match, teamIndex, teamName, pointControlsEnabled) {
      const team = teamIndex === 0 ? match.teamOne : match.teamTwo;
      const key = teamIndex === 0 ? "teamOne" : "teamTwo";
      const canUndo = pointControlsEnabled && match.state !== "finished" && Boolean(match.undoStack?.length);
      const canAward = pointControlsEnabled && match.state !== "finished";
      return `
    <tr class="scoreboard-row" style="${teamAccentStyle(team)}">
      <td class="scoreboard-team-name">${teamName}</td>
      <td class="scoreboard-cell scoreboard-sets">${setsWonByTeam(match, teamIndex)}</td>
      <td class="scoreboard-cell scoreboard-games">${match.currentSet?.[key] ?? 0}</td>
      <td class="scoreboard-cell scoreboard-points">
        <button class="scoreboard-point-minus" type="button" data-undo-team="${teamIndex}" aria-label="${translate("score.undoLastAria")}" ${canUndo ? "" : "disabled"}>−</button>
        <strong class="scoreboard-point-value">${tennisPointLabel(match.currentGame?.[key] ?? 0)}</strong>
        <button class="scoreboard-point-plus" type="button" data-point-team="${teamIndex}" aria-label="${translate("score.pointsLabel", { team: teamName })}" ${canAward ? "" : "disabled"}>+</button>
      </td>
    </tr>`;
    }

    function scoreboardTableMarkup(match, editable) {
      const pointControlsEnabled = editable && match.state !== "cancelled";
      return `
    <table class="scoreboard-table" aria-label="${translate("score.scoreboardAria")}">
      <thead>
        <tr><th scope="col"></th><th scope="col">${translate("common.sets")}</th><th scope="col">${translate("common.games")}</th><th scope="col">${translate("common.points")}</th></tr>
      </thead>
      <tbody>
        ${scoreboardRow(match, 0, escapeHtml(match.teamOne.displayName), pointControlsEnabled)}
        ${scoreboardRow(match, 1, escapeHtml(match.teamTwo.displayName), pointControlsEnabled)}
      </tbody>
    </table>`;
    }

    function bindScoreboardTable(root, match, pointControlsEnabled) {
      if (!pointControlsEnabled) return;
      root.querySelectorAll("[data-point-team]").forEach((button) => {
        button.addEventListener("click", () => awardTennisPoint(match, Number(button.dataset.pointTeam)));
      });
      root.querySelectorAll("[data-undo-team]").forEach((button) => {
        button.addEventListener("click", () => {
          if (currentLocalRole() === "player" && matchIncludesPlayer(match, getState().selectedPlayerId)) {
            if (match.undoStack?.length) undoMatch(match);
            return;
          }
          reopenMatch(match);
        });
      });
    }

    function createMatchCard(match, editable, highlightedPlayerId = null, scoreOnly = false) {
      const card = global.document.createElement("article");
      const expanded = isExpanded(match);
      card.className = `match-card match-${match.state} ${expanded ? "match-card-expanded" : "match-card-collapsed"} ${highlightedPlayerId && matchIncludesPlayer(match, highlightedPlayerId) ? "highlight-match" : ""}`;
      card.dataset.matchId = match.id;
      card.setAttribute("style", teamAccentStyle(match.teamOne));
      const teamOneName = escapeHtml(match.teamOne.displayName);
      const teamTwoName = escapeHtml(match.teamTwo.displayName);
      const winner = match.winnerTeamIndex === 0 ? match.teamOne : match.winnerTeamIndex === 1 ? match.teamTwo : null;
      const sittingOut = sittingOutSummary(match);
      const matchNote = [sittingOut, winner ? `<p class="winner-note">${translate("score.winnerNote", { winner: escapeHtml(winner.displayName) })}</p>` : "", scoreConflict?.(match) ? `<p class="match-conflict">${translate("score.conflictAdminHint")}</p>` : ""]
        .filter(Boolean)
        .join("");
      card.innerHTML = `
    <div class="match-summary" role="button" tabindex="0" aria-expanded="${expanded}">
      <div class="match-top">
        <div class="match-meta">
          <span>${escapeHtml(matchContextText(match))}</span>
        </div>
        <div class="match-top-actions">
          <span class="match-court">${escapeHtml(match.courtName ?? translate("tournament.noCourtAssigned"))}</span>
          <span class="match-status ${match.state}">${matchStateText(match.state)}</span>
        </div>
      </div>
      <div class="match-headline">
        <span>${escapeHtml(primaryMatchHeadline(match))}</span>
        <span class="match-summary-score">${escapeHtml(scoreSummary(match))}</span>
      </div>
      <span class="match-summary-chevron" aria-hidden="true"></span>
    </div>
    <div class="match-card-body ${expanded ? "" : "hidden"}">
      <div class="scorecard-matchup">
        <section class="scorecard-team scorecard-team-one" style="${teamAccentStyle(match.teamOne)}">
          <h3>${translate("common.teamOne")}</h3>
          <div class="scorecard-players">${teamDisplay(match.teamOne, "scorecard")}</div>
        </section>
        <section class="scorecard-team scorecard-team-two" style="${teamAccentStyle(match.teamTwo)}">
          <h3>${translate("common.teamTwo")}</h3>
          <div class="scorecard-players">${teamDisplay(match.teamTwo, "scorecard")}</div>
        </section>
      </div>
      ${scoreboardTableMarkup(match, editable)}
      ${matchNote ? `<div class="match-note">${matchNote}</div>` : ""}
    </div>
  `;

      bindScoreboardTable(card, match, editable && match.state !== "cancelled");

      const summaryToggle = card.querySelector(".match-summary");
      const body = card.querySelector(".match-card-body");
      function toggleExpanded() {
        const next = !isExpanded(match);
        expandState.set(match.id, next);
        body.classList.toggle("hidden", !next);
        summaryToggle.setAttribute("aria-expanded", String(next));
        card.classList.toggle("match-card-expanded", next);
        card.classList.toggle("match-card-collapsed", !next);
      }
      summaryToggle.addEventListener("click", toggleExpanded);
      summaryToggle.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleExpanded();
      });

      if (editable && match.state !== "cancelled") {
        const controls = global.document.createElement("div");
        controls.className = "match-controls";
        controls.innerHTML = `
      ${scoreOnly ? "" : `<div class="court-edit-row">
        <label>${translate("common.court")} <input class="court-name-input" type="text" value="${escapeAttribute(match.courtName ?? "")}" placeholder="${translate("common.court")}" aria-label="${translate("score.courtForMatch", { teamOne: teamOneName, teamTwo: teamTwoName })}"></label>
        <button class="secondary save-court-button" type="button">${translate("actions.saveCourt")}</button>
      </div>
      <div class="button-row">
        <button class="secondary set-score-button" type="button" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>${translate("actions.setResult")}</button>
        <button class="secondary start-match-button" type="button" ${match.state !== "waiting" ? "disabled" : ""}>${translate("actions.startMatch")}</button>
        <button class="secondary large-score-button" type="button" ${match.state !== "playing" ? "disabled" : ""}>${translate("actions.largeScore")}</button>
        <button class="secondary reopen-match-button" type="button" ${["cancelled"].includes(match.state) || !match.undoStack?.length ? "disabled" : ""}>${match.state === "finished" ? translate("actions.undoResult") : translate("actions.undoLast")}</button>
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
          controls.querySelector(".set-score-button").addEventListener("click", () => openSetScoreDialog(match.id));
          controls.querySelector(".start-match-button").addEventListener("click", () => startMatch(match));
          controls.querySelector(".large-score-button").addEventListener("click", () => openLargeScore(match.id));
          controls.querySelector(".reopen-match-button").addEventListener("click", () => reopenMatch(match));
          controls.querySelector(".cancel-match-button").addEventListener("click", () => void cancelMatch(match));
          controls.querySelectorAll(".walkover-button").forEach((button) => {
            button.addEventListener("click", () => void setWalkover(match, Number(button.dataset.walkoverTeam)));
          });
        }
        body.append(controls);
      }
      return card;
    }

    return { createMatchCard, scoreboardTableMarkup, bindScoreboardTable };
  }

  global.PadelstarMatchCard = { create };
})(window);
