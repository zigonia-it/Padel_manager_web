window.PadelstarLobby = (() => {
  function create({ createJoinLink, createQrCodeUrl, elements, escapeHtml, generateFullTournamentSchedule, generateRoundBlockReason, getState, removePlayer, render, saveState, showToast, showWorkspace, t }) {
    function sourceLabel(player) {
      return player.joinedFrom === "admin-self"
        ? t("player.adminPlays")
        : player.joinedFrom === "self" ? t("player.registeredSelf") : t("player.addedByAdmin");
    }

    // Removing works exactly as in Styring (same function, same rule: not after the schedule has started).
    function playerRowMarkup(player, locked) {
      return `
    <li>
      <span class="player-list-name">${escapeHtml(player.name)}</span>
      <span class="join-source-chip">${sourceLabel(player)}</span>
      <button class="icon-button danger-button" type="button" data-remove-player="${escapeHtml(player.id)}" aria-label="${escapeHtml(t("actions.removePlayerAria", { name: player.name }))}"${locked ? " disabled" : ""}>${escapeHtml(t("actions.remove"))}</button>
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
        ? state.players.map((player) => playerRowMarkup(player, state.rounds.length > 0)).join("")
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

    elements.lobbyPlayersList?.addEventListener?.("click", (event) => {
      const button = event.target.closest?.("[data-remove-player]");
      if (button && !button.disabled) removePlayer(button.dataset.removePlayer);
    });

    return { renderLobby, startFromLobby, skipToWorkspace };
  }

  return { create };
})();
