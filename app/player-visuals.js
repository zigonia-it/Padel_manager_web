window.PadelstarPlayerVisuals = (() => {
  function create({ avatarUrl, accentStyle, escapeHtml }) {
    function avatarMarkup(player, className = "avatar", size = 34) {
      return `<span class="${className} avatar-frame" style="${accentStyle(player.accent)}" aria-hidden="true">
    <img src="${avatarUrl(player)}" alt="" width="${size}" height="${size}">
  </span>`;
    }

    function teamDisplay(team, variant = "default") {
      const avatarClass = variant === "scorecard" ? "avatar scorecard-avatar" : "avatar small-avatar";
      const avatarSize = variant === "scorecard" ? 56 : 28;
      return team.players
        .map((player) => `
      <span class="team-player" style="${accentStyle(player.accent)}">
        ${avatarMarkup(player, avatarClass, avatarSize)}
        <span class="team-player-badge">${escapeHtml(player.name)}</span>
      </span>
    `)
        .join("");
    }

    function teamAccentStyle(team) {
      return accentStyle(team.accent ?? team.players[0]?.accent);
    }

    return { avatarMarkup, avatarUrl, teamAccentStyle, teamDisplay };
  }

  return { create };
})();
