(() => {
  function create({ getState, translate, showToast, buildSchedule, createTeam, findPlayerByName, saveState, render, parseCourtNumbers, randomUUID }) {
    function updateTournamentRules({ format, cupTeamSetupMode, includesThirdPlaceMatch, pointMode, gamesToWinSet, setsToWinMatch }) {
      const state = getState();
      if (state.rounds.length > 0) {
        showToast(translate("messages.rulesLocked"), "status-message-error");
        return;
      }
      if (!(window.PadelstarTournamentModes?.supportedFormats ?? ["roundRobin", "cup"]).includes(format)) return;
      if (!["auto", "manual"].includes(cupTeamSetupMode)) return;
      if (!["matches", "sets", "games"].includes(pointMode)) return;
      state.settings.format = format;
      state.settings.cupTeamSetupMode = cupTeamSetupMode;
      state.settings.includesThirdPlaceMatch = includesThirdPlaceMatch;
      state.settings.pointMode = pointMode;
      state.settings.gamesToWinSet = Math.max(1, Math.min(12, gamesToWinSet || 6));
      state.settings.setsToWinMatch = Math.max(1, Math.min(5, setsToWinMatch || 1));
      state.cup = null;
      state.schedule = buildSchedule(state.players, state.settings.format);
    }

    function saveManualCupTeams(value) {
      const state = getState();
      if (state.rounds.length > 0 || state.status === "Avsluttet") {
        showToast(translate("messages.cupTeamsLocked"), "status-message-error");
        return;
      }
      const lines = String(value ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (lines.length < 2) {
        showToast(translate("messages.minimumCupTeams"), "status-message-error");
        return;
      }
      const usedPlayerIds = new Set();
      const teams = [];
      for (const [index, line] of lines.entries()) {
        const playerNames = line.split("+").map((name) => name.trim()).filter(Boolean);
        if (playerNames.length < 1 || playerNames.length > 2) {
          showToast(translate("messages.invalidCupTeamSize", { team: index + 1 }), "status-message-error");
          return;
        }
        const teamPlayers = [];
        for (const playerName of playerNames) {
          const player = findPlayerByName(playerName);
          if (!player || !player.active || player.availability === "away") {
            showToast(translate("messages.cupPlayerNotFound", { name: playerName }), "status-message-error");
            return;
          }
          if (usedPlayerIds.has(player.id)) {
            showToast(translate("messages.cupPlayerDuplicate", { name: player.name }), "status-message-error");
            return;
          }
          usedPlayerIds.add(player.id);
          teamPlayers.push(player);
        }
        teams.push(createTeam(teamPlayers));
      }
      state.cupTeams = teams;
      saveState();
      render();
    }

    function updateCourtsFromInput(value) {
      const state = getState();
      const courtNumbers = parseCourtNumbers(value);
      const existingByNumber = new Map(state.courts.map((court) => [court.courtNumber, court]));
      state.courts = courtNumbers.map((courtNumber) => existingByNumber.get(courtNumber) ?? {
        id: randomUUID(),
        name: `Bane ${courtNumber}`,
        courtNumber,
        active: true,
      });
    }

    return { updateTournamentRules, saveManualCupTeams, updateCourtsFromInput };
  }

  window.PadelstarAdminActions = { create };
})();
