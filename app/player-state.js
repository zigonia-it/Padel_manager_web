window.PadelstarPlayerState = (() => {
  function create({ buildSchedule, createPlayer, createTeam, defaultAvatarId, findPlayerByName, getPlayerById, getState, recordEvent, render, saveState, showToast, t }) {
    function parsePlayerNames(value) {
      return String(value).split(/[\n,;]+/).map((name) => name.trim()).filter(Boolean);
    }
    function addPlayer(name, joinedFrom, avatarId, accent) {
      const state = getState();
      const player = { ...createPlayer(name, state.players.length, avatarId, accent), joinedFrom };
      state.players.push(player);
      state.schedule = buildSchedule(state.players, state.settings.format);
      return player;
    }
    function addPlayers(names, joinedFrom) {
      names.forEach((name) => { if (!findPlayerByName(name)) addPlayer(name, joinedFrom); });
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
    function blockedMessage(reason, name) {
      const key = {
        awaitingApproval: "messages.replaceBlockedApproval",
        ended: "messages.replaceBlockedEnded",
        duplicate: "messages.duplicatePlayer",
        inactive: "messages.replaceBlockedInactive",
        notFound: "messages.replaceBlockedInactive",
      }[reason] ?? "messages.replaceBlockedInactive";
      return t(key, { name });
    }

    // Returns { needsConfirmation, matches } when a running match would be restarted and it has not been confirmed.
    function replacePlayer(playerId, replacementName, { confirmed = false } = {}) {
      const state = getState();
      const outgoing = getPlayerById(playerId);
      const name = String(replacementName ?? "").trim();
      if (!outgoing || !name) return null;
      const replacement = createPlayer(name, state.players.length);
      const checked = window.PadelstarPlayerReplacement.plan(state, playerId);
      if (!checked.ok) {
        showToast(blockedMessage(checked.blocked, name), "status-message-error");
        return null;
      }
      if (findPlayerByName(name)) {
        showToast(t("messages.duplicatePlayer", { name }), "status-message-error");
        return null;
      }
      if (checked.restart.length > 0 && !confirmed) return { needsConfirmation: true, matches: checked.restart, name: outgoing.name };
      const result = window.PadelstarPlayerReplacement.replace(state, playerId, replacement, { createTeam, nameTaken: (candidate) => Boolean(findPlayerByName(candidate)) });
      if (!result.ok) {
        showToast(blockedMessage(result.blocked, name), "status-message-error");
        return null;
      }
      recordEvent?.("player_replaced", "player", playerId, { replacementPlayerId: replacement.id, replacementName: replacement.name, slotId: replacement.slotId, restartedMatches: result.restarted });
      result.restarted.forEach((matchId) => recordEvent?.("match_restarted", "match", matchId, { reason: "playerReplaced" }));
      state.schedule = buildSchedule(state.players, state.settings.format);
      saveState();
      render();
      showToast(t("messages.playerReplaced", { from: outgoing.name, to: replacement.name }), "status-message-success");
      return replacement;
    }

    // Puts the original player back in the slot (the replacement becomes inactive again).
    function restorePlayer(replacementId, { confirmed = false } = {}) {
      const state = getState();
      const replacement = getPlayerById(replacementId);
      const original = getPlayerById(replacement?.replacedPlayerId);
      if (!replacement || !original) return null;
      const checked = window.PadelstarPlayerReplacement.plan(state, replacementId);
      if (!checked.ok) {
        showToast(blockedMessage(checked.blocked, original.name), "status-message-error");
        return null;
      }
      if (checked.restart.length > 0 && !confirmed) return { needsConfirmation: true, matches: checked.restart, name: replacement.name };
      const result = window.PadelstarPlayerReplacement.restore(state, replacementId, { createTeam, nameTaken: (candidate, other) => other.name.localeCompare(candidate, "nb", { sensitivity: "accent" }) === 0 });
      if (!result.ok) {
        showToast(blockedMessage(result.blocked, original.name), "status-message-error");
        return null;
      }
      recordEvent?.("player_restored", "player", original.id, { replacementPlayerId: replacementId, slotId: original.slotId, restartedMatches: result.restarted });
      result.restarted.forEach((matchId) => recordEvent?.("match_restarted", "match", matchId, { reason: "playerRestored" }));
      state.schedule = buildSchedule(state.players, state.settings.format);
      saveState();
      render();
      showToast(t("messages.playerRestored", { name: original.name }), "status-message-success");
      return original;
    }
    return { addPlayer, addPlayers, parsePlayerNames, removePlayer, replacePlayer, restorePlayer, updatePlayer };
  }
  return { create };
})();
