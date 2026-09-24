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
      scoreSummary,
      scorerAction,
      adminSetScorer,
      resultAction,
      adminResolveResult,
      openCorrection,
      withdrawalDecision,
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
      return expandState.has(match.id) ? expandState.get(match.id) : ["playing", "awaitingApproval", "awaitingWithdrawalDecision"].includes(match.state);
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




    // ---- Result corrections (Phase 12): the old results are never overwritten -------------------------
    function correctionSetsText(sets) {
      return (sets ?? []).map((set) => `${set.teamOne}–${set.teamTwo}`).join(", ");
    }

    function correctionHistoryMarkup(match, canRestore) {
      const history = match.correctionHistory ?? [];
      if (!history.length) return "";
      const running = getState().status !== "Avsluttet" || getState().lifecycleStatus !== "cancelled";
      const items = history.map((entry, index) => {
        const time = new Date(entry.at);
        const when = Number.isNaN(time.getTime()) ? "" : time.toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
        const comment = entry.comment ? ` – ${escapeHtml(entry.comment)}` : "";
        const restore = canRestore && running && match.state === "finished"
          ? ` <button class="ghost correction-restore" type="button" data-correction-restore="${index}">${translate("correction.restore")}</button>` : "";
        return `<li><span class="correction-level-dot correction-level-${escapeAttribute(entry.level ?? "green")}" aria-hidden="true"></span>${escapeHtml(when)}: ${escapeHtml(correctionSetsText(entry.before?.completedSets))} → ${escapeHtml(correctionSetsText(entry.after?.completedSets))} (${escapeHtml(translate(`correction.reason.${entry.reason}`))})${comment}${restore}</li>`;
      });
      return `<div class="correction-history"><strong>${translate("correction.historyTitle")}</strong><ul>${items.join("")}</ul></div>`;
    }

    function bindCorrectionHistory(root, match) {
      root.querySelectorAll("[data-correction-restore]").forEach((button) => {
        button.addEventListener("click", () => {
          const entry = (match.correctionHistory ?? [])[Number(button.dataset.correctionRestore)];
          if (entry) openCorrection(match, { prefill: entry.before?.completedSets, reason: "restore" });
        });
      });
    }

    // ---- Timed matches (Phase 14) --------------------------------------------------------------
    function timerSeconds(startedAt, minutes, now = Date.now()) {
      const start = Date.parse(startedAt);
      if (!minutes || Number.isNaN(start)) return null;
      return Math.max(0, Math.ceil((start + minutes * 60000 - now) / 1000));
    }

    function timerLabel(seconds) {
      return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    }

    function timerMarkup(match) {
      if (match.endReason === "timeExpired") return `<span class="match-timer match-timer-ended">${translate("match.timeExpired")}</span>`;
      const minutes = match.rules?.timedMinutes ?? getState().settings?.timedMinutes ?? 0;
      if (!minutes || match.state !== "playing") return "";
      const seconds = match.startedAt ? timerSeconds(match.startedAt, minutes) : minutes * 60;
      const deciding = Boolean(match.decidingGame);
      return `<span class="match-timer ${deciding ? "match-timer-expired" : ""}" role="timer" data-timer-start="${escapeAttribute(match.startedAt ?? "")}" data-timer-minutes="${minutes}" ${deciding ? "data-deciding=\"true\"" : ""} aria-label="${translate("match.timeLeft")}">${deciding ? translate("match.decidingGame") : timerLabel(seconds)}</span>`;
    }

    // Called every second: updates every visible countdown (the last minute is highlighted, never negative).
    function updateTimers(root = global.document, now = Date.now()) {
      root.querySelectorAll(".match-timer[data-timer-minutes]").forEach((element) => {
        if (element.dataset.deciding === "true") return;
        const minutes = Number(element.dataset.timerMinutes);
        const seconds = element.dataset.timerStart ? timerSeconds(element.dataset.timerStart, minutes, now) : minutes * 60;
        const expired = seconds === 0;
        element.textContent = expired ? `00:00 · ${translate("match.timeExpiredNote")}` : timerLabel(seconds);
        element.classList.toggle("match-timer-warning", seconds !== null && seconds > 0 && seconds <= 60);
        element.classList.toggle("match-timer-expired", expired);
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
              ? `<span class="approval-correct"><input class="approval-correct-one" type="number" min="0" max="999" inputmode="numeric" aria-label="${escapeAttribute(match.teamOne.displayName)}"><span>–</span><input class="approval-correct-two" type="number" min="0" max="999" inputmode="numeric" aria-label="${escapeAttribute(match.teamTwo.displayName)}">${button("correct", translate("result.correct"))}</span>`
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

    // A player withdrew without a replacement: the remaining teammate decides (or the admin for them).
    function withdrawalTeammate(match) {
      const record = match.withdrawal;
      const team = record?.teamIndex === 0 ? match.teamOne : match.teamTwo;
      return team?.players?.find((player) => player.id === record?.teammateId) ?? null;
    }

    function withdrawalPanelMarkup(match, editable, scoreOnly) {
      const record = match.withdrawal;
      if (match.state !== "awaitingWithdrawalDecision" || !record || record.status !== "pending") return "";
      const teammate = withdrawalTeammate(match);
      const teammateName = escapeHtml(teammate?.name ?? "");
      const absentName = escapeHtml(record.absent?.name ?? "");
      const isTeammate = currentLocalRole() === "player" && Boolean(teammate) && selectedPlayerId() === teammate.id;
      const isAdmin = currentLocalRole() !== "player" && editable && !scoreOnly;
      const button = (decision, label) => `<button class="secondary withdrawal-button" type="button" data-withdrawal-decision="${decision}">${label}</button>`;
      const controls = isTeammate || isAdmin
        ? `<div class="withdrawal-controls">${button("playAlone", translate("withdrawal.playAlone"))}${button("walkover", translate("withdrawal.walkover"))}</div>${isAdmin && !isTeammate ? `<p class="withdrawal-hint">${translate("withdrawal.adminHint", { teammate: teammateName })}</p>` : ""}`
        : `<p class="withdrawal-hint">${translate("withdrawal.waitingFor", { teammate: teammateName })}</p>`;
      return `<div class="withdrawal-panel"><p class="withdrawal-summary"><strong>${translate("withdrawal.notice", { absent: absentName, teammate: teammateName })}</strong></p>${controls}</div>`;
    }

    function bindWithdrawalPanel(root, match) {
      root.querySelectorAll("[data-withdrawal-decision]").forEach((control) => {
        control.addEventListener("click", () => {
          control.disabled = true;
          void Promise.resolve(withdrawalDecision(match, control.dataset.withdrawalDecision)).finally(() => { control.disabled = false; });
        });
      });
    }

    // Cup: a team that took the place of a match in which both sides withdrew (the best-placed losing team).
    function luckyLoserNoteMarkup(match) {
      return [match.teamOne, match.teamTwo]
        .filter((team) => team?.luckyLoserRound && team.luckyLoserRound === match.rotationNumber)
        .map((team) => `<p class="withdrawal-note">${translate("withdrawal.luckyLoserNote", { team: escapeHtml(team.displayName) })}</p>`)
        .join("");
    }

    // Short note on a match that was decided after a withdrawal.
    function withdrawalNoteMarkup(match) {
      return luckyLoserNoteMarkup(match) + withdrawalOutcomeMarkup(match);
    }

    function withdrawalOutcomeMarkup(match) {
      const record = match.withdrawal;
      if (!record || match.state === "awaitingWithdrawalDecision") return "";
      const absent = escapeHtml(record.absent?.name ?? "");
      if (record.bothSides) return `<p class="withdrawal-note">${translate("withdrawal.cancelledNote")}</p>`;
      if (record.status === "playAlone") return `<p class="withdrawal-note">${translate("withdrawal.playedAlone", { teammate: escapeHtml(withdrawalTeammate(match)?.name ?? ""), absent })}</p>`;
      if (record.status === "walkover") return `<p class="withdrawal-note">${translate("withdrawal.walkoverNote", { absent })}</p>`;
      return "";
    }

    function scoreboardRow(match, teamIndex, teamName, pointControlsEnabled, pointsMode) {
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
      ${pointsMode ? "" : `<td class="scoreboard-cell scoreboard-games">${match.currentSet?.[key] ?? 0}</td>`}
      <td class="scoreboard-cell scoreboard-points">
        <button class="scoreboard-point-minus" type="button" data-undo-team="${teamIndex}" aria-label="${translate("score.undoLastAria")}" ${canUndo ? "" : "disabled"}>−</button>
        <strong class="scoreboard-point-value">${pointsMode ? (match.currentSet?.[key] ?? 0) : window.PadelstarScoring.pointLabel(match, match.currentGame?.[key] ?? 0)}</strong>
        <button class="scoreboard-point-plus" type="button" data-point-team="${teamIndex}" aria-label="${translate("score.pointsLabel", { team: teamName })}" ${canAward ? "" : "disabled"}>+</button>
      </td>
    </tr>`;
    }

    function scoreboardTableMarkup(match, editable) {
      const pointControlsEnabled = editable && match.state !== "cancelled" && match.state !== "awaitingWithdrawalDecision" && playerMayScore(match);
      // Points scoring has no set/game/point split: the games won and the running points
      const pointsMode = window.PadelstarScoring.isPointsMatch(match, getState().settings);
      const headers = pointsMode
        ? `<th scope="col">${translate("common.games")}</th><th scope="col">${translate("common.points")}</th>`
        : `<th scope="col">${translate("common.sets")}</th><th scope="col">${translate("common.games")}</th><th scope="col">${translate("common.points")}</th>`;
      return `
    <table class="scoreboard-table${pointsMode ? " scoreboard-table-points" : ""}" aria-label="${translate("score.scoreboardAria")}">
      <thead>
        <tr><th scope="col"></th>${headers}</tr>
      </thead>
      <tbody>
        ${scoreboardRow(match, 0, escapeHtml(match.teamOne.displayName), pointControlsEnabled, pointsMode)}
        ${scoreboardRow(match, 1, escapeHtml(match.teamTwo.displayName), pointControlsEnabled, pointsMode)}
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
      // After the tournament is finished the admin can only correct a finished result: no scoring, no reopening, no walkover.
      const closedTournament = getState().status === "Avsluttet";
      const correctionOnly = Boolean(editable && !scoreOnly && closedTournament && match.state === "finished" && getState().lifecycleStatus !== "cancelled");
      if (closedTournament) editable = false;
      const card = global.document.createElement("article");
      const expanded = isExpanded(match);
      card.className = `match-card match-${match.state} ${expanded ? "match-card-expanded" : "match-card-collapsed"} ${highlightedPlayerId && matchIncludesPlayer(match, highlightedPlayerId) ? "highlight-match" : ""}`;
      card.dataset.matchId = match.id;
      card.setAttribute("style", teamAccentStyle(match.teamOne));
      const teamOneName = escapeHtml(match.teamOne.displayName);
      const teamTwoName = escapeHtml(match.teamTwo.displayName);
      const winner = match.winnerTeamIndex === 0 ? match.teamOne : match.winnerTeamIndex === 1 ? match.teamTwo : null;
      const sittingOut = sittingOutSummary(match);
      const matchNote = [sittingOut, withdrawalNoteMarkup(match), winner ? `<p class="winner-note">${translate("score.winnerNote", { winner: escapeHtml(winner.displayName) })}</p>` : ""]
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
          ${timerMarkup(match)}
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
      ${withdrawalPanelMarkup(match, editable, scoreOnly)}
      ${correctionHistoryMarkup(match, (editable || correctionOnly) && !scoreOnly)}
      ${matchNote ? `<div class="match-note">${matchNote}</div>` : ""}
    </div>
  `;

      bindScoreboardTable(card, match, editable && match.state !== "cancelled");
      bindScorerPanel(card, match);
      bindApprovalPanel(card, match);
      bindWithdrawalPanel(card, match);
      bindCorrectionHistory(card, match);

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
        <button class="secondary set-score-button" type="button" ${["finished", "cancelled", "awaitingApproval", "awaitingWithdrawalDecision"].includes(match.state) ? "disabled" : ""}>${translate("actions.setResult")}</button>
        <button class="secondary start-match-button" type="button" ${match.state !== "waiting" ? "disabled" : ""}>${translate("actions.startMatch")}</button>
        <button class="secondary large-score-button" type="button" ${match.state !== "playing" ? "disabled" : ""}>${translate("actions.largeScore")}</button>
        <button class="secondary reopen-match-button" type="button" ${["cancelled"].includes(match.state) || !match.undoStack?.length ? "disabled" : ""}>${["finished", "awaitingApproval"].includes(match.state) ? translate("actions.undoResult") : translate("actions.undoLast")}</button>
        <button class="ghost cancel-match-button" type="button" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>${translate("actions.cancelMatch")}</button>
        <div class="walkover-row">
          <span>${translate("score.walkover")}</span>
          <button class="ghost walkover-button" type="button" data-walkover-team="0" aria-label="${translate("score.walkoverForAria", { team: teamOneName })}" ${["finished", "cancelled", "awaitingApproval", "awaitingWithdrawalDecision"].includes(match.state) ? "disabled" : ""}>${teamOneName}</button>
          <button class="ghost walkover-button" type="button" data-walkover-team="1" aria-label="${translate("score.walkoverForAria", { team: teamTwoName })}" ${["finished", "cancelled", "awaitingApproval", "awaitingWithdrawalDecision"].includes(match.state) ? "disabled" : ""}>${teamTwoName}</button>
        </div>
      </div>
      ${match.state === "finished" && getState().status !== "Avsluttet" ? `<div class="correction-row"><button class="secondary correct-result-button" type="button">${translate("correction.button")}</button></div>` : ""}`}
    `;

        if (!scoreOnly) {
          const courtInput = controls.querySelector(".court-name-input");
          controls.querySelector(".save-court-button").addEventListener("click", () => updateMatchCourt(match, courtInput.value));
          controls.querySelector(".set-score-button").addEventListener("click", () => openSetScoreDialog(match.id));
          controls.querySelector(".start-match-button").addEventListener("click", () => startMatch(match));
          controls.querySelector(".large-score-button").addEventListener("click", () => openLargeScore(match.id));
          controls.querySelector(".reopen-match-button").addEventListener("click", () => reopenMatch(match));
          controls.querySelector(".correct-result-button")?.addEventListener("click", () => openCorrection(match));
          controls.querySelector(".cancel-match-button").addEventListener("click", () => void cancelMatch(match));
          controls.querySelectorAll(".walkover-button").forEach((button) => {
            button.addEventListener("click", () => void setWalkover(match, Number(button.dataset.walkoverTeam)));
          });
        }
        body.append(controls);
      } else if (correctionOnly) {
        const controls = global.document.createElement("div");
        controls.className = "match-controls";
        controls.innerHTML = `<div class="correction-row"><button class="secondary correct-result-button" type="button">${translate("correction.button")}</button></div>`;
        controls.querySelector(".correct-result-button").addEventListener("click", () => openCorrection(match));
        body.append(controls);
      }
      return card;
    }

    return { createMatchCard, withdrawalPanelMarkup, bindWithdrawalPanel, scoreboardTableMarkup, bindScoreboardTable, scorerPanelMarkup, approvalPanelMarkup, bindApprovalPanel, timerMarkup, updateTimers, correctionHistoryMarkup };
  }

  global.PadelstarMatchCard = { create };
})(window);
