window.PadelstarPodium = (() => {
  function create({ accentStyle, avatarMarkup, document, elements, escapeHtml, showModule, t }) {
    const placeOrder = [1, 0, 2]; // visual left-to-right: 2nd, 1st, 3rd
    const plinthHeight = { 0: 84, 1: 60, 2: 44 };
    const gemSize = { 0: 84, 1: 64, 2: 64 };

    function podiumPlaceMarkup(entry, rank) {
      return `
    <div class="podium-place podium-place-${rank + 1}" style="animation-delay:${rank * 0.12}s">
      <div class="podium-avatar" style="${accentStyle(entry.player.accent)}">
        ${avatarMarkup(entry.player, "avatar", gemSize[rank])}
      </div>
      <div class="podium-name">${escapeHtml(entry.player.name)}</div>
      <div class="podium-points">${t("standings.pointsShort", { points: entry.points })}</div>
      <div class="podium-plinth" style="height:${plinthHeight[rank]}px">${rank + 1}</div>
    </div>`;
    }

    function fullStandingsRowMarkup(entry, index) {
      return `
    <li style="${accentStyle(entry.player.accent)}">
      <span class="player-list-name">
        <span class="placement-badge">${index + 1}</span>
        ${avatarMarkup(entry.player, "avatar", 34)}
        <span class="player-name-badge">${escapeHtml(entry.player.name)}</span>
      </span>
      <span class="standing-stats">
        <strong>${t("standings.pointsShort", { points: entry.points })}</strong>
        <small>${t("standings.detail", { played: entry.matchesPlayed, wins: entry.matchWins, sets: entry.setsWon, games: entry.gamesWon })}</small>
      </span>
    </li>`;
    }

    function renderPodium(snapshot) {
      if (!snapshot || !elements.podiumPlaces) return;
      elements.podiumHeading.textContent = snapshot.tournamentName;
      elements.podiumStats.textContent = t("podium.stats", {
        rounds: snapshot.roundsCount,
        matches: snapshot.matchesCount,
        players: snapshot.playersCount,
      });
      elements.podiumPlaces.innerHTML = placeOrder
        .filter((rank) => snapshot.entries[rank])
        .map((rank) => podiumPlaceMarkup(snapshot.entries[rank], rank))
        .join("");
      elements.podiumFullStandings.innerHTML = snapshot.entries.map(fullStandingsRowMarkup).join("");
      elements.podiumFullStandings.classList.add("hidden");
      elements.podiumViewStandingsButton.textContent = t("actions.viewFullStandings");
    }

    function toggleFullStandings() {
      elements.podiumFullStandings?.classList.toggle("hidden");
    }

    function goToNewTournament() {
      showModule("setup-admin");
    }

    return { renderPodium, toggleFullStandings, goToNewTournament };
  }

  return { create };
})();
