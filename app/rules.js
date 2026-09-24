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
      const scoring = window.PadelstarScoring.normalizeRules(state.settings);
      const isPoints = scoring.scoringMode === "points";
      const gameText = scoring.gameToWin === 4 && scoring.gameWinBy === 2
        ? { title: t("rules.tennisPointsTitle"), text: t("rules.tennisPointsText") }
        : scoring.gameToWin === 4 && scoring.gameWinBy === 1
          ? { title: t("rules.tennisPointsTitle"), text: t("rules.goldenPointText") }
          : { title: t("rules.gameGenericTitle"), text: t("rules.gameGenericText", { points: scoring.gameToWin, margin: scoring.gameWinBy }) };
      const scoringRules = isPoints
        ? [
          { title: t("rules.pointsTitle"), text: t("rules.pointsText", { points: scoring.gamesToWinSet, margin: scoring.setWinBy }) },
          ...(scoring.setsToWinMatch > 1 ? [{ title: t("rules.setsTitle"), text: t("rules.pointsGamesText", { games: scoring.setsToWinMatch }) }] : []),
        ]
        : [
          gameText,
          // "first to N sets" is a best of 2N-1
          { title: t("rules.setsTitle"), text: t("rules.setsText", { sets: 2 * scoring.setsToWinMatch - 1, games: scoring.gamesToWinSet }) },
          ...(scoring.setWinBy !== 2 || scoring.matchWinBy !== 1 ? [{ title: t("rules.setsTitle"), text: t("rules.marginsText", { setMargin: scoring.setWinBy, matchMargin: scoring.matchWinBy }) }] : []),
          ...(scoring.setDecider === "tiebreak" ? [{ title: t("rules.tiebreakTitle"), text: t("rules.tiebreakText", { games: scoring.gamesToWinSet }) }] : []),
        ];
      const rules = [
        ...scoringRules,
        ...(scoring.timedMinutes > 0 ? [{ title: t("rules.timedTitle"), text: t("rules.timedText", { minutes: scoring.timedMinutes }) }] : []),
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
