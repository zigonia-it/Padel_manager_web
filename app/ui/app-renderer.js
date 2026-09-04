(() => {
  function create({ isTestMode, getElements, getState, getAllMatches, translate, callbacks }) {
    function render() {
      if (isTestMode?.()) return;

      const elements = getElements();
      const state = getState();
      const matches = getAllMatches();
      callbacks.applyLanguage();
      callbacks.renderAccountAuth();
      callbacks.renderProfile();
      callbacks.renderStartResume();
      callbacks.renderRoleVisibility();
      elements.tournamentTitle.textContent = state.name;
      elements.roundLabel.textContent = translate("tournament.roundLabel", { round: Math.max(state.currentRound, 1) });
      elements.adminInviteCode.textContent = state.inviteCode;
      elements.joinLink.value = callbacks.createJoinLink();
      if (elements.spectatorLink) elements.spectatorLink.value = callbacks.createSpectatorLink();
      elements.joinQrCode.src = callbacks.createQrCodeUrl(callbacks.createJoinLink());
      callbacks.renderNotificationControl();
      callbacks.renderAdminIdentity();
      elements.tournamentStatus.textContent = callbacks.tournamentStatusText(state.status);
      elements.playerCount.textContent = translate("players.count", { count: state.players.length });
      elements.matchCount.textContent = translate("matches.count", { count: matches.length });
      elements.courtSettingsForm.elements.courtList.value = callbacks.courtsInputValue();
      if (elements.courtNamesForm?.elements.courtCount) {
        elements.courtNamesForm.elements.courtCount.value = state.courts.length;
      }
      callbacks.renderCourtNames();
      elements.tournamentSettingsForm.elements.format.value = state.settings.format;
      elements.tournamentSettingsForm.elements.cupTeamSetupMode.value = state.settings.cupTeamSetupMode;
      elements.tournamentSettingsForm.elements.includesThirdPlaceMatch.checked = state.settings.includesThirdPlaceMatch;
      elements.tournamentSettingsForm.elements.pointMode.value = state.settings.pointMode;
      elements.tournamentSettingsForm.elements.gamesToWinSet.value = state.settings.gamesToWinSet;
      elements.tournamentSettingsForm.elements.setsToWinMatch.value = state.settings.setsToWinMatch;
      elements.generateRoundButton.disabled = Boolean(callbacks.generateRoundBlockReason());
      elements.generateRoundButton.textContent = callbacks.tournamentActionText();
      elements.completeRoundButton.textContent = translate("finishTournament");
      elements.completeRoundButton.disabled = state.status === "Avsluttet" || getAllMatches().length === 0;
      elements.endTournamentButton.closest(".button-row").classList.add("hidden");
      elements.courtSettingsForm.elements.courtList.disabled = callbacks.getActiveRound()?.status === "active" || state.status === "Avsluttet";
      elements.courtSettingsForm.querySelector("button").disabled = callbacks.getActiveRound()?.status === "active" || state.status === "Avsluttet";
      elements.addPlayerForm.elements.playerName.disabled = state.rounds.length > 0;
      elements.addPlayerForm.querySelector("button").disabled = state.rounds.length > 0;
      elements.cupTeamSetupModeField.classList.toggle("hidden", state.settings.format !== "cup");
      elements.cupTeamSetupModeField.querySelector("select").disabled = state.rounds.length > 0;
      elements.cupThirdPlaceField.classList.toggle("hidden", state.settings.format !== "cup");
      elements.cupThirdPlaceField.querySelector("input").disabled = state.rounds.length > 0;

      callbacks.renderLobbyStatus();
      callbacks.renderPlayers();
      callbacks.renderRoundSummary();
      callbacks.renderCupBracket();
      callbacks.renderMatches(matches);
      callbacks.renderResultSubmissions(matches);
      callbacks.renderStandings(matches);
      callbacks.renderPlayerIdentity();
      callbacks.renderLeaveTournamentControl();
      callbacks.renderAvailabilityControl();
      callbacks.renderPlayerNextMatch(matches);
      callbacks.renderPlayerResultForm(matches);
      callbacks.renderPlayerStatus(matches);
      callbacks.renderAdminLiveOverview(matches);
      callbacks.renderAssistant();
      callbacks.renderCourtQueue(matches);
      callbacks.renderRules();
      callbacks.renderExistingPlayerList();
      callbacks.renderCupTeamBuilder();
      callbacks.renderSyncControls();
    }

    return { render };
  }

  window.PadelstarAppRenderer = { create };
})();
