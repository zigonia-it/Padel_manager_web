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
      scorerAction,
      adminSetScorer,
      resultAction,
      adminResolveResult,
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
      return expandState.has(match.id) ? expandState.get(match.id) : ["playing", "awaitingApproval"].includes(match.state);
    }


    function selectedPlayerId() {
      return getState().selectedPlayerId ?? null;
    }

    // Players may score only when they are the active scorer (or nobody is: the first point claims the role).
    function playerMayScore(match) {
      if (currentLocalRole() !== "player") return true;
      const scorerId = match.scorer?.playerId;
      return !scorerId || scorerId === selectedPlayerId();
    }

    // Undo needs an established scorer role for players; admins are unaffected.
    function playerIsScorerOrNotPlayer(match) {
      if (currentLocalRole() !== "player") return true;
      return match.scorer?.playerId === selectedPlayerId();
    }

    function matchPlayers(match) {
      return [...(match.teamOne?.players ?? []), ...(match.teamTwo?.players ?? [])];
    }

    function playerNameById(match, playerId) {
      return matchPlayers(match).find((player) => player.id === playerId)?.name ?? "";
    }

    function scorerPanelMarkup(match, editable, scoreOnly) {
      if (match.state !== "playing") return "";
      const role = currentLocalRole();
      const me = selectedPlayerId();
      const scorerId = match.scorer?.playerId ?? null;
      const requestId = match.scorerRequest?.playerId ?? null;
      const participant = role === "player" && Boolean(me) && matchIncludesPlayer(match, me);
      const iAmScorer = participant && scorerId === me;
      const status = !scorerId
        ? translate(role === "player" ? "scorer.none" : "scorer.unassigned")
        : iAmScorer
          ? translate("scorer.you")
          : translate("scorer.current", { name: escapeHtml(playerNameById(match, scorerId)) });
      const button = (action, label, extra = "") => `<button class="secondary scorer-button" type="button" data-scorer-action="${action}" ${extra}>${label}</button>`;
      const options = (ids, blank) => `${blank ? `<option value="">${blank}</option>` : ""}${ids.map((id) => `<option value="${escapeAttribute(id)}" ${id === scorerId ? "selected" : ""}>${escapeHtml(playerNameById(match, id))}</option>`).join("")}`;
      const others = matchPlayers(match).map((player) => player.id).filter((id) => id !== me);
      let controls = "";
      if (participant && !scorerId) {
        controls = button("claim", translate("scorer.claim"));
      } else if (iAmScorer) {
        controls = [
          button("redo", translate("scorer.redo"), match.redoStack?.length ? "" : "disabled"),
          `<select class="scorer-transfer-select" aria-label="${translate("scorer.transferTo")}">${options(others)}</select>`,
          button("transfer", translate("scorer.transfer")),
          button("release", translate("scorer.release")),
          requestId ? `<p class="scorer-request">${translate("scorer.requestedBy", { name: escapeHtml(playerNameById(match, requestId)) })}</p>${button("accept", translate("scorer.accept", { name: escapeHtml(playerNameById(match, requestId)) }))}${button("decline", translate("scorer.decline"))}` : "",
        ].join("");
      } else if (participant) {
        controls = [
          requestId === me ? `<span class="scorer-request">${translate("scorer.requestSent")}</span>` : button("request", translate("scorer.request")),
          button("claim", translate("scorer.takeOver")),
        ].join("");
      } else if (role !== "player" && editable && !scoreOnly) {
        controls = `<select class="scorer-admin-select" aria-label="${translate("scorer.assign")}">${options(matchPlayers(match).map((player) => player.id), translate("scorer.assignNone"))}</select>${button("admin-assign", translate("scorer.assign"))}`;
      }
      return `<div class="scorer-panel"><p class="scorer-status"><strong>${translate("scorer.title")}</strong> ${status}</p>${controls ? `<div class="scorer-controls">${controls}</div>` : ""}</div>`;
    }

    function bindScorerPanel(root, match) {
      root.querySelectorAll("[data-scorer-action]").forEach((control) => {
        control.addEventListener("click", () => {
          const action = control.dataset.scorerAction;
          if (action === "admin-assign") {
            adminSetScorer(match, root.querySelector(".scorer-admin-select")?.value || null);
          } else if (action === "transfer") {
            void scorerAction(match, "transfer", root.querySelector(".scorer-transfer-select")?.value || null);
          } else if (action === "accept") {
            void scorerAction(match, "transfer", null);
          } else {
            void scorerAction(match, action);
          }
        });
      });
    }


    // ---- Result approval (Phase 11) ------------------------------------------------------------
    function approvalSetsText(approval) {
      return (approval?.completedSets ?? []).map((set) => `${set.teamOne}–${set.teamTwo}`).join(", ");
    }

    function approvalTimeText(iso) {
      const date = new Date(iso);
      return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    }

    function approvalPanelMarkup(match, editable, scoreOnly) {
      if (match.state !== "awaitingApproval" || !match.approval) return "";
      const approval = match.approval;
      const role = currentLocalRole();
      const me = selectedPlayerId();
      const participant = role === "player" && Boolean(me) && matchIncludesPlayer(match, me);
      const myTeam = participant ? (match.teamOne.players.some((player) => player.id === me) ? 0 : 1) : null;
      const winnerTeam = approval.winnerTeamIndex === 0 ? match.teamOne : match.teamTwo;
      const summary = translate("result.summary", { winner: escapeHtml(winnerTeam.displayName), score: approvalSetsText(approval) });
      const approvals = approval.approvals ?? [];
      const myTeamApproved = myTeam !== null && approvals.some((entry) => entry.teamIndex === myTeam);
      const iAmScorer = participant && match.scorer?.playerId === me;
      const button = (action, label, extra = "") => `<button class="secondary approval-button" type="button" data-approval-action="${action}" ${extra}>${label}</button>`;
      let status;
      if (approval.status === "flagged") status = translate("result.flaggedStatus");
      else if (approval.status === "draft") status = translate("result.draftStatus");
      else status = translate("result.pendingStatus", { time: approvalTimeText(approval.autoApproveAt) });
      const badges = [
        approval.status === "flagged" ? `<span class="approval-badge approval-badge-flagged">${translate("result.flaggedBadge")}</span>` : "",
        approval.escalatedAt && approval.status !== "flagged" ? `<span class="approval-badge approval-badge-escalated">${translate("result.escalatedBadge")}</span>` : "",
      ].join("");
      let controls = "";
      if (participant && approval.status === "draft") {
        controls = iAmScorer
          ? button("submit", translate("result.submit"))
          : `<span class="approval-note">${translate("result.waitingForScorer")}</span>`;
      } else if (participant && approval.status === "pending") {
        controls = myTeamApproved
          ? `<span class="approval-note">${translate("result.yourTeamApproved")}</span>`
          : [
            button("approve", translate("result.approve")),
            button("dispute", translate("result.dispute")),
            Number(getState().settings?.setsToWinMatch ?? 1) === 1
              ? `<span class="approval-correct"><input class="approval-correct-one" type="number" min="0" max="9" inputmode="numeric" aria-label="${escapeAttribute(match.teamOne.displayName)}"><span>–</span><input class="approval-correct-two" type="number" min="0" max="9" inputmode="numeric" aria-label="${escapeAttribute(match.teamTwo.displayName)}">${button("correct", translate("result.correct"))}</span>`
              : "",
          ].join("");
      } else if (participant && approval.status === "flagged") {
        controls = `<span class="approval-note">${translate("result.waitingForAdmin")}</span>`;
      } else if (role !== "player" && editable && !scoreOnly) {
        controls = button("admin-approve", translate("result.adminApprove"));
      }
      return `<div class="approval-panel approval-${approval.status}"><p class="approval-summary"><strong>${summary}</strong></p><p class="approval-status">${status} ${badges}</p>${controls ? `<div class="approval-controls">${controls}</div>` : ""}</div>`;
    }

    function bindApprovalPanel(root, match) {
      root.querySelectorAll("[data-approval-action]").forEach((control) => {
        control.addEventListener("click", () => {
          const action = control.dataset.approvalAction;
          if (action === "admin-approve") {
            adminResolveResult(match);
          } else if (action === "correct") {
            const one = Number(root.querySelector(".approval-correct-one")?.value);
            const two = Number(root.querySelector(".approval-correct-two")?.value);
            if (!Number.isInteger(one) || !Number.isInteger(two)) return;
            void resultAction(match, "dispute", { completedSets: [{ teamOne: one, teamTwo: two }] });
          } else {
            void resultAction(match, action);
          }
        });
      });
    }

    function scoreboardRow(match, teamIndex, teamName, pointControlsEnabled) {
      const team = teamIndex === 0 ? match.teamOne : match.teamTwo;
      const key = teamIndex === 0 ? "teamOne" : "teamTwo";
      const awaiting = match.state === "awaitingApproval";
      // While a result waits for approval only an unsubmitted draft (scorer) or the admin can still undo.
      const undoOpen = !awaiting || currentLocalRole() !== "player" || match.approval?.status === "draft";
      const canUndo = pointControlsEnabled && match.state !== "finished" && undoOpen && Boolean(match.undoStack?.length) && playerIsScorerOrNotPlayer(match);
      const canAward = pointControlsEnabled && match.state !== "finished" && !awaiting;
      return `
    <tr class="scoreboard-row" style="${teamAccentStyle(team)}">
      <td class="scoreboard-team-name">${teamName}</td>
      <td class="scoreboard-cell scoreboard-sets">${setsWonByTeam(match, teamIndex)}</td>
      <td class="scoreboard-cell scoreboard-games">${match.currentSet?.[key] ?? 0}</td>
      <td class="scoreboard-cell scoreboard-points">
        <button class="scoreboard-point-minus" type="button" data-undo-team="${teamIndex}" aria-label="${translate("score.undoLastAria")}" ${canUndo ? "" : "disabled"}>−</button>
        <strong class="scoreboard-point-value">${match.inTiebreak ? (match.currentGame?.[key] ?? 0) : tennisPointLabel(match.currentGame?.[key] ?? 0)}</strong>
        <button class="scoreboard-point-plus" type="button" data-point-team="${teamIndex}" aria-label="${translate("score.pointsLabel", { team: teamName })}" ${canAward ? "" : "disabled"}>+</button>
      </td>
    </tr>`;
    }

    function scoreboardTableMarkup(match, editable) {
      const pointControlsEnabled = editable && match.state !== "cancelled" && playerMayScore(match);
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
            if (match.undoStack?.length) void scorerAction(match, "undo");
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
      ${scorerPanelMarkup(match, editable, scoreOnly)}
      ${approvalPanelMarkup(match, editable, scoreOnly)}
      ${matchNote ? `<div class="match-note">${matchNote}</div>` : ""}
    </div>
  `;

      bindScoreboardTable(card, match, editable && match.state !== "cancelled");
      bindScorerPanel(card, match);
      bindApprovalPanel(card, match);

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
        <button class="secondary set-score-button" type="button" ${["finished", "cancelled", "awaitingApproval"].includes(match.state) ? "disabled" : ""}>${translate("actions.setResult")}</button>
        <button class="secondary start-match-button" type="button" ${match.state !== "waiting" ? "disabled" : ""}>${translate("actions.startMatch")}</button>
        <button class="secondary large-score-button" type="button" ${match.state !== "playing" ? "disabled" : ""}>${translate("actions.largeScore")}</button>
        <button class="secondary reopen-match-button" type="button" ${["cancelled"].includes(match.state) || !match.undoStack?.length ? "disabled" : ""}>${["finished", "awaitingApproval"].includes(match.state) ? translate("actions.undoResult") : translate("actions.undoLast")}</button>
        <button class="ghost cancel-match-button" type="button" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>${translate("actions.cancelMatch")}</button>
        <div class="walkover-row">
          <span>${translate("score.walkover")}</span>
          <button class="ghost walkover-button" type="button" data-walkover-team="0" aria-label="${translate("score.walkoverForAria", { team: teamOneName })}" ${["finished", "cancelled", "awaitingApproval"].includes(match.state) ? "disabled" : ""}>${teamOneName}</button>
          <button class="ghost walkover-button" type="button" data-walkover-team="1" aria-label="${translate("score.walkoverForAria", { team: teamTwoName })}" ${["finished", "cancelled", "awaitingApproval"].includes(match.state) ? "disabled" : ""}>${teamTwoName}</button>
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

    return { createMatchCard, scoreboardTableMarkup, bindScoreboardTable, scorerPanelMarkup, approvalPanelMarkup, bindApprovalPanel };
  }

  global.PadelstarMatchCard = { create };
})(window);
