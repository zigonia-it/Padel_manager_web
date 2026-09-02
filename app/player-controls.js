window.PadelstarPlayerControls = (() => {
  function create({ accentStyle, avatarMarkup, elements, escapeHtml, getPlayerById, getState, getSpectatorMode, t }) {
    function renderPlayerIdentity() {
      const state = getState();
      const player = getPlayerById(state.selectedPlayerId);
      if (!player) {
        elements.playerIdentityCard.removeAttribute("style");
        elements.playerIdentityCard.innerHTML = `<div class="empty-list-item">${t("player.identityEmpty")}</div>`;
        return;
      }
      const joinSourceLabel = player.joinedFrom === "admin-self"
        ? t("player.adminPlays")
        : player.joinedFrom === "self" ? t("player.registeredSelf") : t("player.addedByAdmin");
      elements.playerIdentityCard.setAttribute("style", accentStyle(player.accent));
      elements.playerIdentityCard.innerHTML = `
        <div class="player-identity-main">
          ${avatarMarkup(player, "avatar", 44)}
          <div><span>${t("player.currentPlayer")}</span><strong>${escapeHtml(player.name)}</strong></div>
        </div>
        <span class="join-source-chip">${joinSourceLabel}</span>`;
    }

    function renderLeaveTournamentControl() {
      if (!elements.leaveSessionButton) return;
      const spectatorMode = getSpectatorMode();
      const canLeaveSession = spectatorMode || Boolean(getPlayerById(getState().selectedPlayerId));
      elements.leaveSessionButton.classList.toggle("hidden", !canLeaveSession);
      elements.leaveSessionButton.disabled = !canLeaveSession;
      elements.leaveSessionButton.dataset.i18n = spectatorMode ? "nav.leaveSpectator" : "actions.leaveTournament";
      elements.leaveSessionButton.textContent = t(elements.leaveSessionButton.dataset.i18n);
    }

    function renderAvailabilityControl() {
      if (!elements.toggleAvailabilityButton) return;
      const player = getPlayerById(getState().selectedPlayerId);
      const isAway = player?.availability === "away";
      elements.toggleAvailabilityButton.classList.toggle("hidden", !player);
      elements.toggleAvailabilityButton.disabled = !player;
      elements.toggleAvailabilityButton.textContent = isAway ? t("actions.returnToTournament") : t("actions.markAway");
    }

    return { renderAvailabilityControl, renderLeaveTournamentControl, renderPlayerIdentity };
  }

  return { create };
})();
