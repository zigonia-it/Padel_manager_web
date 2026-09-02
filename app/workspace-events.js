(function attachPadelstarWorkspaceEvents(global) {
  "use strict";

  function bind({ elements, callbacks }) {
    elements.adminIdentityForm?.addEventListener("submit", callbacks.sendAdminSignInLink);
    elements.claimTournamentButton?.addEventListener("click", callbacks.claimTournament);
    elements.leaveSessionButton?.addEventListener("click", callbacks.leaveSession);
    elements.toggleAvailabilityButton?.addEventListener("click", callbacks.toggleAvailability);
    elements.resumeTournamentButton?.addEventListener("click", callbacks.resumeTournament);
    elements.copyInviteCodeButton?.addEventListener("click", callbacks.copyInviteCode);
    elements.copyJoinLinkButton?.addEventListener("click", callbacks.copyJoinLink);
    elements.copySpectatorLinkButton?.addEventListener("click", callbacks.copySpectatorLink);
    elements.shareTournamentButton?.addEventListener("click", callbacks.shareTournament);
    elements.toggleNotificationsButton?.addEventListener("click", callbacks.toggleNotifications);
    elements.showExistingPlayersButton?.addEventListener("click", callbacks.showExistingPlayers);
  }

  global.PadelstarWorkspaceEvents = { bind };
})(window);
