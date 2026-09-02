window.PadelstarStandings = (() => {
  function create({ accentStyle, appendEmptyText, avatarMarkup, document, elements, escapeHtml, leaderboardEntries, t }) {
    function renderStandings(matches) {
      renderStandingsList(elements.standingsList, matches);
      renderStandingsList(elements.playerStandingsList, matches);
    }

    function renderStandingsList(container, matches) {
      container.innerHTML = "";
      const entries = leaderboardEntries(matches);
      if (entries.length === 0) {
        appendEmptyText(container, t("tournament.standingsEmpty"));
        return;
      }
      entries.forEach((entry, index) => {
        const item = document.createElement("li");
        item.setAttribute("style", accentStyle(entry.player.accent));
        item.innerHTML = `
      <span class="player-list-name">
        <span class="placement-badge">${index + 1}</span>
        ${avatarMarkup(entry.player, "avatar", 34)}
        <span class="player-name-badge">${escapeHtml(entry.player.name)}</span>
      </span>
      <span class="standing-stats">
        <strong>${t("standings.pointsShort", { points: entry.points })}</strong>
        <small>${t("standings.detail", { played: entry.matchesPlayed, wins: entry.matchWins, sets: entry.setsWon, games: entry.gamesWon })}</small>
      </span>`;
        container.append(item);
      });
    }

    return { renderStandings, renderStandingsList };
  }

  return { create };
})();
