window.PadelstarPlayerVisuals = (() => {
  function initials(name) {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function create({ avatarUrl, accentStyle, escapeHtml }) {
    function avatarMarkup(player, className = "avatar", size = 34) {
      const fontSize = Math.round(size * 0.32);
      return `<span class="${className} ds-avatar-gem" style="${accentStyle(player.accent)} width:${size}px; height:${size}px;" aria-hidden="true">
    <span class="ds-avatar-gem-outer"></span>
    <span class="ds-avatar-gem-inner" style="font-size:${fontSize}px;">${escapeHtml(initials(player.name))}</span>
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
