window.PadelstarPlayerList = (() => {
  function create({
    accentStyle,
    appendEmptyText,
    avatarMarkup,
    avatarOptions,
    document,
    elements,
    escapeAttribute,
    escapeHtml,
    getState,
    getAllMatches,
    leaderboardEntries,
    joinRemoteTournament,
    playerStatusLabel,
    render,
    removePlayer,
    saveState,
    setLocalRole,
    showWorkspace,
    getSupabaseClient,
    t,
    updatePlayer,
  }) {
    function renderPlayers() {
      const state = getState();
      const standings = leaderboardEntries(getAllMatches());
      const lobbyLocked = state.rounds.length > 0;
      elements.playersList.innerHTML = "";
      if (state.players.length === 0) {
        const item = document.createElement("li");
        item.className = "empty-list-item";
        item.innerHTML = `<span>${t("tournament.noPlayers", { code: state.inviteCode })}</span>`;
        elements.playersList.append(item);
        return;
      }
      state.players.forEach((player) => {
        const entry = standings.find((item) => item.player.id === player.id);
        const item = document.createElement("li");
        item.className = lobbyLocked ? "" : "editable-player";
        item.setAttribute("style", accentStyle(player.accent));
        item.innerHTML = `
      <span class="player-list-name">
        ${avatarMarkup(player, "avatar", 34)}
        <span class="player-name-badge">${escapeHtml(player.name)}</span>
        <small class="join-source-chip">${playerStatusLabel(player)}</small>
      </span>
      <span class="player-actions">
        <strong>${t("standings.pointsShort", { points: entry?.points ?? 0 })}</strong>
        <button class="icon-button danger-button" type="button" aria-label="${t("actions.removePlayerAria", { name: escapeHtml(player.name) })}" ${lobbyLocked ? "disabled" : ""}>${t("actions.remove")}</button>
      </span>`;
        if (!lobbyLocked) {
          const editor = document.createElement("form");
          editor.className = "player-edit-grid";
          editor.innerHTML = `
        <input name="playerName" type="text" value="${escapeAttribute(player.name)}" aria-label="${t("actions.editPlayerNameAria", { name: escapeAttribute(player.name) })}" required>
        <select name="avatarId" aria-label="${t("actions.playerAvatarAria", { name: escapeAttribute(player.name) })}">
          ${avatarOptions.map((avatar) => `<option value="${avatar.id}" ${player.avatarId === avatar.id ? "selected" : ""}>${avatar.name}</option>`).join("")}
        </select>
        <button class="secondary icon-button" type="submit">${t("actions.save")}</button>`;
          editor.addEventListener("submit", (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            updatePlayer(player.id, { name: formData.get("playerName").trim(), avatarId: formData.get("avatarId") });
          });
          item.append(editor);
        }
        item.querySelector(".danger-button").addEventListener("click", () => removePlayer(player.id));
        elements.playersList.append(item);
      });
    }

    function renderExistingPlayerList() {
      const state = getState();
      if (!elements.existingPlayerList || elements.existingPlayerList.classList.contains("hidden")) return;
      elements.existingPlayerList.innerHTML = "";
      if (state.players.length === 0) {
        appendEmptyText(elements.existingPlayerList, t("players.noneAddedYet"));
        return;
      }
      state.players.forEach((player) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "existing-player-button";
        button.setAttribute("style", accentStyle(player.accent));
        button.innerHTML = `${avatarMarkup(player, "avatar", 30)}<span>${escapeHtml(player.name)}</span>`;
        button.addEventListener("click", async () => {
          if (getSupabaseClient()) {
            const joined = await joinRemoteTournament(player.name, player.avatarId);
            if (!joined) return;
          } else {
            state.selectedPlayerId = player.id;
          }
          setLocalRole("player");
          saveState({ remote: false });
          showWorkspace("player");
          render();
        });
        elements.existingPlayerList.append(button);
      });
    }

    return { renderExistingPlayerList, renderPlayers };
  }

  return { create };
})();
