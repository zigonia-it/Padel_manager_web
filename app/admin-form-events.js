(function attachPadelstarAdminFormEvents(global) {
  "use strict";

  function create(deps) {
    const {
      canCompleteRound,
      endTournament,
      exportBackup,
      generateFullTournamentSchedule,
      generateRoundBlockReason,
      getActiveRound,
      getState,
      isSupabaseReady,
      queueRemoteCupAdvance,
      queueRemoteRoundAdvance,
      requestConfirmation,
      saveManualCupTeams,
      saveState,
      showToast,
      startNextScheduledRound,
      t,
      updateCourtsFromInput,
      updateTournamentRules,
    } = deps;

    function bind(elements) {
      elements.addPlayerForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const state = getState();
        if (state.rounds.length > 0) {
          showToast(t("messages.playersLocked"), "status-message-error");
          return;
        }
        const formData = new FormData(event.currentTarget);
        const names = deps.parsePlayerNames(formData.get("playerName"));
        if (names.length === 0) return;
        deps.addPlayers(names, "admin");
        event.currentTarget.reset();
        saveState();
        deps.render();
      });

      elements.courtSettingsForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const state = getState();
        if (getActiveRound()?.status === "active" || state.status === "Avsluttet") {
          showToast(t("messages.courtsLocked"), "status-message-error");
          return;
        }
        updateCourtsFromInput(new FormData(event.currentTarget).get("courtList"));
        saveState();
        deps.render();
      });

      elements.tournamentSettingsForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        updateTournamentRules({
          format: formData.get("format"),
          cupTeamSetupMode: formData.get("cupTeamSetupMode"),
          includesThirdPlaceMatch: formData.get("includesThirdPlaceMatch") === "on",
          pointMode: formData.get("pointMode"),
          gamesToWinSet: Number(formData.get("gamesToWinSet")),
          setsToWinMatch: Number(formData.get("setsToWinMatch")),
        });
        saveState();
        deps.render();
      });

      elements.cupTeamForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        saveManualCupTeams(new FormData(event.currentTarget).get("teamLines"));
      });

      elements.generateRoundButton?.addEventListener("click", () => {
        const activeRound = getActiveRound();
        const completingActiveRound = activeRound?.status === "active" && canCompleteRound(activeRound);
        if (!completingActiveRound) {
          const blockReason = generateRoundBlockReason();
          if (blockReason) {
            showToast(blockReason, "status-message-error");
            return;
          }
        }
        const state = getState();
        if (state.rounds.length === 0) {
          generateFullTournamentSchedule();
        } else if (isSupabaseReady() && completingActiveRound) {
          if (state.settings.format === "roundRobin") queueRemoteRoundAdvance();
          if (state.settings.format === "cup") queueRemoteCupAdvance();
          return;
        } else {
          if (completingActiveRound) {
            activeRound.status = "finished";
            state.status = "Runde fullført";
          }
          startNextScheduledRound();
        }
        saveState();
        deps.render();
      });

      elements.completeRoundButton?.addEventListener("click", async () => {
        if (!await requestConfirmation(t("messages.finishTournamentConfirm"))) return;
        endTournament();
        saveState();
        deps.render();
      });

      elements.exportBackupButton?.addEventListener("click", exportBackup);
      elements.importBackupButton?.addEventListener("click", () => elements.backupFileInput?.click());
      elements.backupFileInput?.addEventListener("change", deps.importBackup);
    }

    return { bind };
  }

  global.PadelstarAdminFormEvents = { create };
})(window);
