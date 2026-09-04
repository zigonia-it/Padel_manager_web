(function attachPadelstarResultSubmissions(global) {
  "use strict";

  function create(deps) {
    const {
      elements, getState, getPlayerById, getMatchById, matchIncludesPlayer, matchContextText,
      validateSetScore, scoreSubmissions, eventLog, saveMatchResult, saveState, queueRemoteSetResult,
      render, showToast, isCurrentUserAdmin, isSupabaseReady, remotePlayerResult, translate,
      escapeHtml, escapeAttribute,
    } = deps;

    function renderPlayerResultForm(matches) {
      const state = getState();
      if (!elements.playerResultForm || !elements.playerResultPanel) return;
      const player = getPlayerById(state.selectedPlayerId);
      const ownMatches = player ? matches.filter((match) => matchIncludesPlayer(match, player.id) && !["cancelled"].includes(match.state)) : [];
      elements.playerResultPanel.classList.toggle("hidden", !player || ownMatches.length === 0 || state.status === "Avsluttet");
      if (!player || ownMatches.length === 0) return;
      const previousMatchId = elements.playerResultMatch.value;
      elements.playerResultMatch.replaceChildren(...ownMatches.map((match) => {
        const option = document.createElement("option");
        option.value = match.id;
        option.textContent = `${matchContextText(match)} · ${match.teamOne.displayName} vs ${match.teamTwo.displayName}`;
        return option;
      }));
      if (ownMatches.some((match) => match.id === previousMatchId)) elements.playerResultMatch.value = previousMatchId;
      const selectedMatch = getMatchById(elements.playerResultMatch.value) ?? ownMatches[0];
      elements.playerResultMatch.value = selectedMatch.id;
      elements.playerResultForm.elements.teamOne.value = selectedMatch.currentSet?.teamOne ?? "";
      elements.playerResultForm.elements.teamTwo.value = selectedMatch.currentSet?.teamTwo ?? "";
      const resultState = scoreSubmissions?.forMatch(state, selectedMatch.id);
      elements.playerResultStatus.textContent = resultState?.status === "conflict" ? translate("score.conflict") : resultState?.status === "confirmed" ? translate("score.confirmed") : "";
      elements.playerResultStatus.className = `status-chip ${resultState?.status === "conflict" ? "error" : ""}`;
    }

    function renderResultSubmissions(matches) {
      const state = getState();
      const container = elements.adminResultSubmissions;
      if (!container) return;
      const submissions = (state.scoreSubmissions ?? []).filter((submission) => submission.status !== "rejected");
      if (submissions.length === 0) { container.innerHTML = ""; return; }
      container.innerHTML = `<div class="panel-heading"><h3>${translate("score.submissionsTitle")}</h3><span>${submissions.length}</span></div>${submissions.map((submission) => {
        const match = matches.find((item) => item.id === submission.matchId);
        if (!match) return "";
        const player = getPlayerById(submission.submittedBy);
        return `<article class="result-submission ${submission.status === "conflict" ? "is-conflict" : ""}">
      <div><strong>${escapeHtml(matchContextText(match))}</strong><span>${escapeHtml(player?.name ?? translate("common.player"))} · ${escapeHtml(new Date(submission.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}</span></div>
      <strong>${submission.teamOne}-${submission.teamTwo}</strong>
      <button class="secondary review-result-button" type="button" data-submission-id="${escapeAttribute(submission.id)}">${translate("score.useSubmission")}</button>
    </article>`;
      }).join("")}`;
      container.querySelectorAll(".review-result-button").forEach((button) => {
        button.addEventListener("click", () => reviewPlayerSubmission(button.dataset.submissionId));
      });
    }

    function reviewPlayerSubmission(submissionId) {
      const state = getState();
      if (!isCurrentUserAdmin()) return;
      const submission = (state.scoreSubmissions ?? []).find((item) => item.id === submissionId);
      const match = getMatchById(submission?.matchId);
      if (!submission || !match) return;
      if (isSupabaseReady()) {
        scoreSubmissions?.resolve(state, match.id, submission.teamOne, submission.teamTwo, "admin");
        eventLog.record("result_resolved", "match", match.id, { teamOne: submission.teamOne, teamTwo: submission.teamTwo, sourceSubmissionId: submission.id });
        saveState();
        queueRemoteSetResult(match, submission.teamOne, submission.teamTwo);
        render();
        return;
      }
      saveMatchResult(match, submission.teamOne, submission.teamTwo);
      render();
    }

    function submitPlayerResult(matchId, teamOne, teamTwo) {
      const state = getState();
      const player = getPlayerById(state.selectedPlayerId);
      const match = getMatchById(matchId);
      if (!player || !match || !matchIncludesPlayer(match, player.id) || !scoreSubmissions) return;
      const validationError = validateSetScore(teamOne, teamTwo, state.settings);
      if (validationError) { showToast(validationError, "status-message-error"); return; }
      const result = scoreSubmissions.add(state, scoreSubmissions.createSubmission({ matchId, teamOne, teamTwo, submittedBy: player.id }));
      eventLog.record("score_submitted", "match", matchId, { teamOne, teamTwo, status: result.status });
      saveState();
      render();
      showToast(result.status === "conflict" ? translate("score.conflictHint") : translate("score.submitted"), result.status === "conflict" ? "status-message-error" : "status-message-success");
      if (remotePlayerResult) void remotePlayerResult.submit(matchId, teamOne, teamTwo);
    }

    return { renderPlayerResultForm, renderResultSubmissions, reviewPlayerSubmission, submitPlayerResult };
  }

  global.PadelstarResultSubmissions = { create };
})(window);
