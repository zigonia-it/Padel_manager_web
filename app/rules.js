window.PadelstarRules = (() => {
  function create({ elements, escapeHtml, getState, t }) {
    function renderRules() {
      if (!elements.rulesList) return;
      const state = getState();
      const pointModeText = {
        matches: t("rules.rankingMatches"),
        sets: t("rules.rankingSets"),
        games: t("rules.rankingGames"),
      }[state.settings.pointMode] ?? t("rules.rankingFallback");
      const rules = [
        { title: t("rules.tennisPointsTitle"), text: t("rules.tennisPointsText") },
        { title: t("rules.setsTitle"), text: t("rules.setsText", { sets: state.settings.setsToWinMatch, games: state.settings.gamesToWinSet }) },
        { title: t("rules.rankingTitle"), text: t("rules.rankingText", { pointModeText }) },
        { title: t("rules.restTitle"), text: t("rules.restText") },
      ];
      elements.rulesList.innerHTML = rules.map((rule) => `
        <div>
          <strong>${escapeHtml(rule.title)}</strong>
          <p>${escapeHtml(rule.text)}</p>
        </div>
      `).join("");
    }

    return { renderRules };
  }

  return { create };
})();
