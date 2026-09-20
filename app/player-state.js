window.PadelstarPlayerState = (() => {
  function create({ activateNextWaitingMatch, buildSchedule, createPlayer, createTeam, defaultAvatarId, findPlayerByName, getPlayerById, getState, markCupCompleteIfDone = () => {}, notifyWithdrawalDecision = () => {}, recordEvent, render, saveState, showToast, t }) {
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

    // ---- Withdrawal without a replacement (Phase 13) ----
    function withdrawBlockedMessage(reason, name) {
      const key = {
        awaitingApproval: "messages.withdrawBlockedApproval",
        ended: "messages.withdrawBlockedEnded",
      }[reason] ?? "messages.withdrawBlockedInactive";
      return t(key, { name });
    }

    // The admin always confirms first: returns { needsConfirmation, plan, name } until called with { confirmed: true }.
    function withdrawPlayer(playerId, { confirmed = false } = {}) {
      const state = getState();
      const player = getPlayerById(playerId);
      if (!player) return null;
      const checked = window.PadelstarPlayerWithdrawal.plan(state, playerId);
      if (!checked.ok) {
        showToast(withdrawBlockedMessage(checked.blocked, player.name), "status-message-error");
        return null;
      }
      if (!confirmed) return { needsConfirmation: true, plan: checked, name: player.name };
      const result = window.PadelstarPlayerWithdrawal.withdraw(state, playerId, { createTeam, restartMatch: window.PadelstarPlayerReplacement.restartMatch });
      if (!result.ok) {
        showToast(withdrawBlockedMessage(result.blocked, player.name), "status-message-error");
        return null;
      }
      // a court freed by an annulled match goes to the next waiting match
      result.freed.forEach((court) => activateNextWaitingMatch?.(court));
      markCupCompleteIfDone();
      // the teammate of each affected match must choose: tell them (the push-send function respects their choices)
      result.decide.forEach((matchId) => { const record = getState().rounds.flatMap((round) => round.matches).find((item) => item.id === matchId)?.withdrawal; notifyWithdrawalDecision(matchId, record?.teammateId); });
      recordEvent?.("player_withdrawn", "player", playerId, { slotId: player.slotId, awaitingDecision: result.decide, walkover: result.walkover, cancelled: result.cancel, restartedMatches: result.restarted });
      result.restarted.forEach((matchId) => recordEvent?.("match_restarted", "match", matchId, { reason: "playerWithdrawn" }));
      saveState();
      render();
      showToast(t("messages.playerWithdrawn", { name: player.name }), "status-message-success");
      return result;
    }

    function reinstateBlockedMessage(reason, name) {
      const key = { matchInProgress: "messages.reinstateBlockedRunning", replaced: "messages.reinstateBlockedReplaced", ended: "messages.withdrawBlockedEnded" }[reason] ?? "messages.withdrawBlockedInactive";
      return t(key, { name });
    }

    function reinstatePlayer(playerId) {
      const state = getState();
      const player = getPlayerById(playerId);
      if (!player) return null;
      const result = window.PadelstarPlayerWithdrawal.reinstate(state, playerId, { createTeam });
      if (!result.ok) {
        showToast(reinstateBlockedMessage(result.blocked, player.name), "status-message-error");
        return null;
      }
      recordEvent?.("player_reinstated", "player", playerId, { restoredMatches: result.restored });
      saveState();
      render();
      showToast(t("messages.playerReinstated", { name: player.name }), "status-message-success");
      return result;
    }

    // The admin decides for the remaining teammate (the teammate's own decision goes through match_withdrawal_decision).
    function decideWithdrawal(matchId, decision, { by = "admin" } = {}) {
      const state = getState();
      const result = window.PadelstarPlayerWithdrawal.decide(state, matchId, decision, { createTeam, by });
      if (!result.ok) {
        showToast(t("withdrawal.error.outOfDate"), "status-message-error");
        return null;
      }
      recordEvent?.("withdrawal_decided", "match", matchId, { decision, by, started: result.started });
      markCupCompleteIfDone();
      saveState();
      render();
      return result;
    }

    return { addPlayer, addPlayers, parsePlayerNames, removePlayer, replacePlayer, restorePlayer, updatePlayer, withdrawPlayer, reinstatePlayer, decideWithdrawal };
  }
  return { create };
})();
