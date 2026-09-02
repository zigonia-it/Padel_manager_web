window.PadelstarPlayerState = (() => {
  function create({ buildSchedule, createPlayer, createTeam, defaultAvatarId, findPlayerByName, getPlayerById, getState, render, saveState, showToast, t }) {
    function parsePlayerNames(value) {
      return String(value).split(/[\n,;]+/).map((name) => name.trim()).filter(Boolean);
    }
    function addPlayer(name, joinedFrom, avatarId) {
      const state = getState();
      const player = { ...createPlayer(name, state.players.length, avatarId), joinedFrom };
      state.players.push(player);
      state.schedule = buildSchedule(state.players, state.settings.format);
      return player;
    }
    function addPlayers(names, joinedFrom) {
      names.forEach((name) => { if (!findPlayerByName(name)) addPlayer(name, joinedFrom, defaultAvatarId); });
    }
    function updatePlayer(playerId, updates) {
      const state = getState();
      const player = getPlayerById(playerId);
      if (!player || state.rounds.length > 0) return;
      const nextName = updates.name?.trim();
      if (!nextName) return;
      const duplicate = state.players.find((item) => item.id !== playerId && item.name.localeCompare(nextName, "nb", { sensitivity: "accent" }) === 0);
      if (duplicate) { showToast(t("messages.duplicatePlayer", { name: nextName }), "status-message-error"); return; }
      player.name = nextName;
      player.avatarId = updates.avatarId || player.avatarId || defaultAvatarId;
      state.cupTeams = state.cupTeams.map((team) => createTeam(team.players.map((teamPlayer) => teamPlayer.id === playerId ? player : teamPlayer)));
      state.schedule = buildSchedule(state.players, state.settings.format);
      saveState();
      render();
    }
    function removePlayer(playerId) {
      const state = getState();
      if (state.rounds.length > 0) { showToast(t("messages.removePlayersLocked"), "status-message-error"); return; }
      state.players = state.players.filter((player) => player.id !== playerId);
      if (state.selectedPlayerId === playerId) state.selectedPlayerId = null;
      state.cupTeams = state.cupTeams.map((team) => createTeam(team.players.filter((teamPlayer) => teamPlayer.id !== playerId))).filter((team) => team.players.length > 0);
      state.schedule = buildSchedule(state.players, state.settings.format);
      saveState();
      render();
    }
    return { addPlayer, addPlayers, parsePlayerNames, removePlayer, updatePlayer };
  }
  return { create };
})();
