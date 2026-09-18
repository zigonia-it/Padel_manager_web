window.PadelstarCourtQueue = (() => {
  function create({ document, elements, escapeHtml, getState, matchContextText, t, teamAccentStyle }) {
    function renderContainer(container, matches) {
      if (!container) return;
      const state = getState();
      const activeMatches = (matches ?? []).filter((match) => ["playing", "waiting"].includes(match.state));
      const queuedMatches = activeMatches
        .filter((match) => match.state === "waiting")
        .sort((first, second) => (first.queuePosition ?? Number.MAX_SAFE_INTEGER) - (second.queuePosition ?? Number.MAX_SAFE_INTEGER));
      container.innerHTML = `<div class="panel-heading"><h3>${t("queue.title")}</h3><span>${t("queue.courts", { count: state.courts.length })}</span></div>`;
      const courtCards = state.courts.map((court) => {
        const current = activeMatches.find((match) => match.state === "playing" && match.courtId === court.id);
        const next = queuedMatches
          .filter((match) => match.courtId === court.id || (!match.courtId && match.plannedCourtIndex === state.courts.indexOf(court)))
          .slice(0, 2);
        const teamName = (team) => `<strong class="court-queue-team" style="${teamAccentStyle(team)}">${escapeHtml(team.players.map((player) => player.name).join(" & "))}</strong>`;
        const matchup = (match) => `<div class="court-queue-match">${teamName(match.teamOne)}<span>${escapeHtml(matchContextText(match))}</span>${teamName(match.teamTwo)}</div>`;
        return `<article class="court-queue-court"><h4>${escapeHtml(court.name)}</h4>${current ? `<span class="status-chip playing">${t("queue.inProgress")}</span>${matchup(current)}` : `<span class="status-chip waiting">${t("queue.free")}</span>`}${next.map((match, index) => `<div class="court-queue-next"><small>${index === 0 ? t("queue.next") : t("queue.later")}</small>${matchup(match)}</div>`).join("")}</article>`;
      }).join("");
      container.insertAdjacentHTML("beforeend", courtCards || `<p class="hint">${t("queue.empty")}</p>`);
    }

    function render(matches) {
      renderContainer(elements.courtQueue, matches);
    }

    return { render };
  }

  return { create };
})();
