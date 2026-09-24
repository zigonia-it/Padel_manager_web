// The scoring-rules fields of the create wizard and the Styring rules form: a "Tennis and padel" panel and a "Points"
// panel, shown one at a time. The panel that is hidden is disabled so its fields are neither validated nor submitted.
window.PadelstarScoringRulesForm = (() => {
  function modeOf(root) {
    return root.querySelector('[name="scoringMode"]')?.value === "points" ? "points" : "tennis";
  }

  function sync(root) {
    if (!root) return;
    const mode = modeOf(root);
    root.querySelectorAll("[data-scoring-panel]").forEach((panel) => {
      const active = panel.dataset.scoringPanel === mode;
      panel.classList.toggle("hidden", !active);
      panel.querySelectorAll("input").forEach((input) => { input.disabled = !active; });
    });
  }

  function bind(root) {
    if (!root || root.dataset.scoringBound) return;
    root.dataset.scoringBound = "true";
    root.querySelector('[name="scoringMode"]')?.addEventListener("change", () => sync(root));
    sync(root);
  }

  // Fills the fields from a tournament's settings (older tournaments map onto the tennis fields).
  function apply(root, settings) {
    if (!root) return;
    const values = window.PadelstarScoring.formValuesFromRules(settings);
    Object.entries(values).forEach(([name, value]) => {
      const field = root.querySelector(`[name="${name}"]`);
      if (!field) return;
      if (field.type === "checkbox") field.checked = Boolean(value);
      else field.value = value;
    });
    sync(root);
  }

  if (typeof document !== "undefined") {
    document.querySelectorAll("[data-scoring-rules]").forEach(bind);
  }

  return { bind, sync, apply };
})();
