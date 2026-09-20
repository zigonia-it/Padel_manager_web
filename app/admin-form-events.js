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
      luckyLoserProposal = () => ({ teams: [] }),
      queueRemoteCupAdvance,
      queueRemoteRoundAdvance,
      requestConfirmation,
      roundProgress,
      saveManualCupTeams,
      saveState,
      showToast,
      startNextScheduledRound,
      t,
      updateCourtsFromInput,
      updateCourtNames,
      updateTournamentRules,
    } = deps;

    function bind(elements) {
      // The Styring tab and the lobby offer the same two forms, so both use the same handlers.
      const submitAddPlayers = (event) => {
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
      };
      elements.addPlayerForm?.addEventListener("submit", submitAddPlayers);
      elements.lobbyAddPlayerForm?.addEventListener("submit", submitAddPlayers);

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

      const submitCourtNames = (event) => {
        event.preventDefault();
        const state = getState();
        if (state.rounds.length > 0 || state.status === "Avsluttet") {
          showToast(t("messages.courtsLocked"), "status-message-error");
          return;
        }
        const formData = new FormData(event.currentTarget);
        const requestedCount = Number(formData.get("courtCount"));
        const courtCount = Number.isInteger(requestedCount)
          ? Math.max(1, Math.min(12, requestedCount))
          : getState().courts.length;
        updateCourtsFromInput(Array.from({ length: courtCount }, (_, index) => index + 1).join(","));
        updateCourtNames(formData.getAll("courtName"));
        saveState();
        deps.render();
      };
      elements.courtNamesForm?.addEventListener("submit", submitCourtNames);
      elements.lobbyCourtNamesForm?.addEventListener("submit", submitCourtNames);

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
          gameMode: formData.get("gameMode"),
          setTiebreak: formData.get("setTiebreak") === "on",
          timedMinutes: Number(formData.get("timedMinutes")) || 0,
        });
        saveState();
        deps.render();
      });

      elements.cupTeamForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        saveManualCupTeams(new FormData(event.currentTarget).get("teamLines"));
      });

      elements.generateRoundButton?.addEventListener("click", async () => {
        const activeRound = getActiveRound();
        const completingActiveRound = activeRound?.status === "active" && canCompleteRound(activeRound);
        if (!completingActiveRound) {
          const blockReason = generateRoundBlockReason();
          if (blockReason) {
            showToast(blockReason, "status-message-error");
            return;
          }
        }
        if (completingActiveRound) {
          const progress = roundProgress(activeRound);
          const summary = t("round.endSummaryConfirm", { round: activeRound.roundNumber, finished: progress.finished, total: progress.total });
          if (!await requestConfirmation(summary, t("round.endSummaryTitle", { round: activeRound.roundNumber }))) return;
        }
        const state = getState();
        // Cup: both sides of a match withdrew, so the best-placed losing team takes the place. The admin confirms first.
        let luckyLoserConfirmed = false;
        if (state.rounds.length > 0 && state.settings.format === "cup") {
          const proposal = luckyLoserProposal();
          if (proposal.teams.length) {
            const teams = proposal.teams.map((team) => team.displayName).join(", ");
            if (!await requestConfirmation(t("withdrawal.luckyLoserConfirm", { teams, count: proposal.teams.length }), t("withdrawal.luckyLoserTitle"))) return;
            luckyLoserConfirmed = true;
          }
        }
        if (state.rounds.length === 0) {
          generateFullTournamentSchedule();
        } else if (isSupabaseReady() && completingActiveRound) {
          if (state.settings.format !== "cup") queueRemoteRoundAdvance();
          if (state.settings.format === "cup") queueRemoteCupAdvance({ confirmLuckyLoser: luckyLoserConfirmed });
          return;
        } else {
          if (completingActiveRound) {
            activeRound.status = "completed";
            state.status = "Runde fullført";
          }
          startNextScheduledRound({ luckyLoserConfirmed });
        }
        saveState();
        deps.render();
      });

      elements.completeRoundButton?.addEventListener("click", async () => {
        if (!await requestConfirmation(t("messages.finishTournamentConfirm"))) return;
        await endTournament();
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
