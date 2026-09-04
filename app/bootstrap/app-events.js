(function attachBootstrapEvents(global) {
  function bind({ elements, callbacks }) {
    elements.profileForm?.addEventListener("submit", callbacks.saveProfile);
    elements.createAccountAuthButton?.addEventListener("click", callbacks.openAccountAuth);
    elements.adminAccountAuthButton?.addEventListener("click", callbacks.openAccountAuth);
    elements.playerResultForm?.addEventListener("submit", callbacks.submitPlayerResult);
    elements.tvModeButton?.addEventListener("click", callbacks.toggleTvMode);
    elements.tvModeMenuButton?.addEventListener("click", callbacks.toggleTvModeFromMenu);
    elements.deleteProfileButton?.addEventListener("click", callbacks.requestProfileDeletion);
    elements.cancelProfileDeletionButton?.addEventListener("click", callbacks.cancelProfileDeletion);
    elements.profileHistoryFilter?.addEventListener("change", callbacks.renderProfile);
    elements.adminMatchFilter?.addEventListener("change", callbacks.adminMatchFilterChanged);
    elements.playerMatchFilter?.addEventListener("change", callbacks.playerMatchFilterChanged);
    elements.adminParticipatesInput?.addEventListener("change", callbacks.syncAdminPlayerChoice);
    elements.createAdminSignInLinkButton?.addEventListener("click", callbacks.createAdminSignInLink);
    elements.languageSelect?.addEventListener("change", callbacks.languageChanged);
    elements.refreshRemoteButton?.addEventListener("click", callbacks.refreshRemote);
    elements.keepLocalBackupButton?.addEventListener("click", callbacks.keepLocalBackup);
    elements.endTournamentButton?.addEventListener("click", callbacks.endTournament);
    elements.resetTournamentButton?.addEventListener("click", callbacks.resetTournament);
  }

  global.PadelstarBootstrapEvents = Object.freeze({ bind });
}(window));
