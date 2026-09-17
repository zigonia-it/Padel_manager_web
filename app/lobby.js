window.PadelstarLobby = (() => {
  function create({ createJoinLink, createQrCodeUrl, elements, escapeHtml, generateFullTournamentSchedule, generateRoundBlockReason, getState, render, saveState, showToast, showWorkspace, t }) {
    function sourceLabel(player) {
      return player.joinedFrom === "admin-self"
        ? t("player.adminPlays")
        : player.joinedFrom === "self" ? t("player.registeredSelf") : t("player.addedByAdmin");
    }

    function playerRowMarkup(player) {
      return `
    <li>
      <span class="player-list-name">${escapeHtml(player.name)}</span>
      <span class="join-source-chip">${sourceLabel(player)}</span>
    </li>`;
    }

    function renderLobby() {
      if (!elements.lobbyView) return;
      const state = getState();
      elements.lobbyHeading.textContent = state.name;
      elements.lobbyReadiness.textContent = t("tournament.playersReady", { players: state.players.length, courts: state.courts.length });
      elements.lobbyInviteCode.textContent = state.inviteCode;
      const joinLink = createJoinLink();
      elements.lobbyJoinLink.value = joinLink;
      elements.lobbyQrCode.src = createQrCodeUrl(joinLink);
      elements.lobbyPlayersList.innerHTML = state.players.length
        ? state.players.map(playerRowMarkup).join("")
        : `<li class="empty-list-item">${t("tournament.noPlayers", { code: state.inviteCode })}</li>`;
      elements.lobbyStartButton.disabled = Boolean(generateRoundBlockReason());
    }

    function startFromLobby() {
      const blockReason = generateRoundBlockReason();
      if (blockReason) {
        showToast(blockReason, "status-message-error");
        return;
      }
      generateFullTournamentSchedule();
      saveState();
      showWorkspace();
      render();
    }

    function skipToWorkspace() {
      showWorkspace();
    }

    return { renderLobby, startFromLobby, skipToWorkspace };
  }

  return { create };
})();
