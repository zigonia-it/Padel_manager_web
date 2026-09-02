window.PadelstarMatchList = (() => {
  function create({
    appendEmptyText,
    document,
    elements,
    escapeHtml,
    matchContextText,
    setScoreText,
    t,
    teamAccentStyle,
    teamDisplay,
  }) {
    function filterMatches(matches, filter) {
      if (filter === "active") return matches.filter((match) => match.state === "playing");
      if (filter === "next") return matches.filter((match) => match.state === "waiting");
      if (filter === "finished") return matches.filter((match) => ["finished", "cancelled"].includes(match.state));
      return matches;
    }

    function renderGroupedMatches(container, matches, emptyText, cardFactory) {
      container.innerHTML = "";
      if (matches.length === 0) {
        appendEmptyText(container, emptyText);
        return;
      }

      const groups = [
        { title: t("common.playing"), matches: matches.filter((match) => match.state === "playing") },
        { title: t("common.waiting"), matches: matches.filter((match) => match.state === "waiting") },
        { title: t("common.finished"), matches: matches.filter((match) => ["finished", "cancelled"].includes(match.state)) },
      ].filter((group) => group.matches.length > 0);

      groups.forEach((group) => {
        const section = document.createElement("section");
        section.className = "match-group";
        section.innerHTML = `<h4>${group.title}</h4>`;
        section.append(...group.matches.map(cardFactory));
        container.append(section);
      });
    }

    function renderSpectatorMatches(matches) {
      elements.spectatorMatches.innerHTML = "";
      const playingMatches = matches.filter((match) => match.state === "playing");
      if (playingMatches.length === 0) {
        const waitingMatches = matches.filter((match) => match.state === "waiting");
        if (waitingMatches.length === 0) {
          appendEmptyText(elements.spectatorMatches, t("tournament.noLiveMatches"));
          return;
        }
        appendEmptyText(elements.spectatorMatches, t("tournament.noMatchesPlaying"));
        return;
      }

      const section = document.createElement("section");
      section.className = "match-group spectator-live-group";
      section.innerHTML = `<h4>${t("common.playingMatches")}</h4>`;
      section.append(...playingMatches.map(createSpectatorMatchCard));
      elements.spectatorMatches.append(section);
    }

    function createSpectatorMatchCard(match) {
      const card = document.createElement("article");
      card.className = "spectator-score-card";
      card.setAttribute("style", teamAccentStyle(match.teamOne));
      card.innerHTML = `
    <div class="spectator-score-top">
      <span>${escapeHtml(matchContextText(match))}</span>
      <strong>${match.courtName ?? t("tournament.courtComing")}</strong>
    </div>
    <div class="spectator-score-teams">
      <div style="${teamAccentStyle(match.teamOne)}">
        <span>${teamDisplay(match.teamOne)}</span>
        <strong>${match.currentSet.teamOne}</strong>
      </div>
      <div style="${teamAccentStyle(match.teamTwo)}">
        <span>${teamDisplay(match.teamTwo)}</span>
        <strong>${match.currentSet.teamTwo}</strong>
      </div>
    </div>
    <div class="spectator-score-bottom">
      <span>${t("common.sets")} ${escapeHtml(setScoreText(match))}</span>
      <span>${t("common.games")} ${escapeHtml(setScoreText(match))}</span>
    </div>`;
      return card;
    }

    return { createSpectatorMatchCard, filterMatches, renderGroupedMatches, renderSpectatorMatches };
  }

  return { create };
})();
