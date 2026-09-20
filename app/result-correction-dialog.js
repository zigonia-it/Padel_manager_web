(function (global) {
  "use strict";

  // Dialog for correcting a finished result: enter the new sets, choose a reason (mandatory), simulate the
  // consequences, and only then confirm. Nothing changes until the admin confirms the simulated result.
  function create({ document, t, escapeHtml, getState, scoring, correction, applyCorrection }) {
    let dialog = null;
    let current = null;
    let simulation = null;

    function ensureDialog() {
      if (dialog) return dialog;
      dialog = document.createElement("dialog");
      dialog.className = "app-confirm-dialog correction-dialog";
      dialog.setAttribute("aria-labelledby", "correctionTitle");
      document.body.append(dialog);
      dialog.addEventListener("cancel", () => { current = null; });
      return dialog;
    }

    function reasonLabel(reason) {
      return t(`correction.reason.${reason}`);
    }

    function setRows(match, prefill) {
      const rules = correction.rulesFor(match, getState().settings);
      const rows = 2 * rules.setsToWinMatch - 1;
      const values = prefill ?? match.completedSets ?? [];
      return Array.from({ length: rows }, (_, index) => {
        const set = values[index];
        return `<div class="correction-set">
          <span>${t("correction.setLabel", { n: index + 1 })}</span>
          <input class="correction-one" type="number" min="0" max="20" inputmode="numeric" value="${set ? set.teamOne : ""}" aria-label="${escapeHtml(match.teamOne.displayName)} – ${t("correction.setLabel", { n: index + 1 })}">
          <span aria-hidden="true">–</span>
          <input class="correction-two" type="number" min="0" max="20" inputmode="numeric" value="${set ? set.teamTwo : ""}" aria-label="${escapeHtml(match.teamTwo.displayName)} – ${t("correction.setLabel", { n: index + 1 })}">
        </div>`;
      }).join("");
    }

    function open(match, options = {}) {
      const state = getState();
      if (state.status === "Avsluttet" && state.lifecycleStatus === "cancelled") return;
      current = match;
      simulation = null;
      const reasons = correction.REASONS;
      const chosenReason = options.reason ?? "entryError";
      ensureDialog().innerHTML = `
        <form method="dialog" class="app-confirm-card correction-card">
          <h2 id="correctionTitle">${t("correction.title")}</h2>
          <p class="correction-teams"><strong>${escapeHtml(match.teamOne.displayName)}</strong> ${t("common.versus") === "common.versus" ? "–" : t("common.versus")} <strong>${escapeHtml(match.teamTwo.displayName)}</strong> · ${escapeHtml(correction.setsText(match.completedSets))}</p>
          <p class="hint">${t("correction.intro")}</p>
          <fieldset class="correction-sets"><legend>${t("correction.newResult")}</legend>${setRows(match, options.prefill)}</fieldset>
          <label>${t("correction.reasonLabel")}
            <select name="reason">${reasons.map((reason) => `<option value="${reason}" ${reason === chosenReason ? "selected" : ""}>${reasonLabel(reason)}</option>`).join("")}</select>
          </label>
          <label>${t("correction.commentLabel")}
            <textarea name="comment" maxlength="500" rows="2"></textarea>
          </label>
          <div class="correction-result" role="status" aria-live="polite"></div>
          <div class="dialog-actions">
            <button class="ghost" type="button" data-correction="cancel">${t("correction.cancel")}</button>
            <button class="secondary" type="button" data-correction="simulate">${t("correction.simulate")}</button>
            <button class="primary" type="button" data-correction="confirm" disabled>${t("correction.confirm")}</button>
          </div>
        </form>`;
      const root = dialog;
      root.querySelectorAll("input, select, textarea").forEach((field) => field.addEventListener("input", resetSimulation));
      root.querySelector('[data-correction="cancel"]').addEventListener("click", close);
      root.querySelector('[data-correction="simulate"]').addEventListener("click", runSimulation);
      root.querySelector('[data-correction="confirm"]').addEventListener("click", confirm);
      dialog.showModal?.();
    }

    function close() {
      current = null;
      simulation = null;
      dialog?.close?.();
    }

    function resetSimulation() {
      simulation = null;
      dialog.querySelector(".correction-result").innerHTML = "";
      dialog.querySelector('[data-correction="confirm"]').disabled = true;
    }

    function readForm() {
      const sets = [...dialog.querySelectorAll(".correction-set")]
        .map((row) => [row.querySelector(".correction-one").value, row.querySelector(".correction-two").value])
        .filter(([one, two]) => one !== "" || two !== "")
        .map(([one, two]) => ({ teamOne: Number(one), teamTwo: Number(two) }));
      return {
        sets,
        reason: dialog.querySelector('[name="reason"]').value,
        comment: dialog.querySelector('[name="comment"]').value.trim(),
      };
    }

    function levelMarkup(result) {
      const label = t(`correction.level.${result.level}`);
      const lines = [];
      if (result.winnerChanged) {
        lines.push(t("correction.winnerChanged", { from: escapeHtml(result.oldWinnerTeam.displayName), to: escapeHtml(result.newWinnerTeam.displayName) }));
      }
      result.changes.forEach((change) => {
        const parts = [];
        if (change.rankBefore !== change.rankAfter) parts.push(t("correction.rankChange", { from: change.rankBefore, to: change.rankAfter }));
        if (change.pointsBefore !== change.pointsAfter) parts.push(t("correction.pointsChange", { from: change.pointsBefore, to: change.pointsAfter }));
        lines.push(`${escapeHtml(change.name)}: ${parts.join(" · ")}`);
      });
      if (!lines.length) lines.push(t("correction.noChanges"));
      lines.push(t("correction.ongoingNote"));
      return `<p class="correction-level correction-level-${result.level}"><span class="correction-level-dot" aria-hidden="true"></span><strong>${label}</strong></p>
        <ul class="correction-consequences">${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`;
    }

    function runSimulation() {
      const { sets, reason, comment } = readForm();
      const output = dialog.querySelector(".correction-result");
      const confirmButton = dialog.querySelector('[data-correction="confirm"]');
      simulation = null;
      confirmButton.disabled = true;
      if (reason === "other" && !comment) {
        output.innerHTML = `<p class="correction-error">${t("correction.commentRequired")}</p>`;
        return;
      }
      const result = correction.simulate(getState(), current.id, sets, scoring);
      if (!result.ok) {
        output.innerHTML = `<p class="correction-error">${t(`correction.error.${result.error}`)}</p>`;
        return;
      }
      simulation = { ...result, reason, comment };
      output.innerHTML = levelMarkup(result);
      confirmButton.disabled = result.blocked;
    }

    async function confirm() {
      if (!simulation || simulation.blocked || !current) return;
      const match = current;
      const payload = { sets: simulation.sets, reason: simulation.reason, comment: simulation.comment, level: simulation.level };
      close();
      await applyCorrection(match, payload);
    }

    return { open, close };
  }

  global.PadelstarResultCorrectionDialog = { create };
})(window);
