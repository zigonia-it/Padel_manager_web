window.PadelstarCreateWizard = (() => {
  const totalSteps = 4;
  const stepTitleKeys = {
    1: "wizard.stepName",
    2: "wizard.stepRules",
    3: "wizard.stepPlayers",
    4: "wizard.stepConfirm",
  };

  function create({ document, elements, handleCreate, t }) {
    let currentStep = 1;

    function stepEl(step) {
      return document.querySelector(`[data-wizard-step="${step}"]`);
    }

    function showStep(step) {
      currentStep = step;
      document.querySelectorAll("[data-wizard-step]").forEach((panel) => {
        panel.classList.toggle("hidden", Number(panel.dataset.wizardStep) !== step);
      });
      document.querySelectorAll("[data-wizard-step-bar]").forEach((bar) => {
        bar.classList.toggle("is-active", Number(bar.dataset.wizardStepBar) <= step);
      });
      elements.createWizardStepLabel.textContent = t("wizard.stepOf", { step, total: totalSteps, title: t(stepTitleKeys[step]) });
      elements.createWizardBackButton.classList.toggle("hidden", step === 1);
      elements.createWizardNextButton.classList.toggle("hidden", step === totalSteps);
      if (step === totalSteps) renderSummary();
      const firstField = stepEl(step)?.querySelector("input, textarea, select, button");
      firstField?.focus({ preventScroll: true });
    }

    function goNext() {
      const invalidField = stepEl(currentStep)?.querySelector(":invalid");
      if (invalidField) {
        invalidField.reportValidity();
        return;
      }
      if (currentStep < totalSteps) showStep(currentStep + 1);
    }

    function goBack() {
      if (currentStep > 1) showStep(currentStep - 1);
    }

    function syncCupFieldsVisibility() {
      const isCup = elements.createTournamentForm.elements.format?.value === "cup";
      elements.createCupTeamSetupModeField?.classList.toggle("hidden", !isCup);
      elements.createCupThirdPlaceField?.classList.toggle("hidden", !isCup);
    }

    function renderSummary() {
      const form = elements.createTournamentForm;
      const formatValue = form.elements.format?.value === "cup" ? t("admin.cupFormat") : t("admin.roundRobinFormat");
      const playerCount = form.elements.players.value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean).length;
      const rows = [
        [t("setup.tournamentName"), form.elements.tournamentName.value.trim() || t("setup.defaultTournamentName")],
        [t("admin.tournamentFormat"), formatValue],
        [t("setup.courtCount"), form.elements.courts.value],
        [t("wizard.stepPlayers"), String(playerCount)],
        [t("wizard.stepRules"), t("wizard.confirmRulesValue", {
          games: form.elements.gamesToWinSet.value,
          sets: form.elements.setsToWinMatch.value,
        })],
      ];
      elements.createWizardSummary.innerHTML = rows
        .map(([label, value]) => `<li><span>${label}</span><strong>${value}</strong></li>`)
        .join("");
    }

    function resetToFirstStep() {
      syncCupFieldsVisibility();
      showStep(1);
    }

    function initialize() {
      elements.createWizardNextButton.addEventListener("click", goNext);
      elements.createWizardBackButton.addEventListener("click", goBack);
      elements.createWizardSubmitButton.addEventListener("click", () => {
        handleCreate({ preventDefault() {}, currentTarget: elements.createTournamentForm });
      });
      elements.createTournamentForm.querySelectorAll('input[name="format"]').forEach((input) => {
        input.addEventListener("change", syncCupFieldsVisibility);
      });
    }

    return { initialize, resetToFirstStep };
  }

  return { create };
})();
