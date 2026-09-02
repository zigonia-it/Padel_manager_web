(function attachPadelstarInitialView(global) {
  "use strict";

  function restore({ windowRef, storage, keys, callbacks }) {
    const { currentLocalRole, hasTournamentForInvite, isCurrentUserAdmin, loadRemoteTournamentByInvite, render, setLocalRole, showModule, showWorkspace } = callbacks;
    const hasSavedTournament = Boolean(storage.getItem(keys.storageKey));
    const params = new URLSearchParams(windowRef.location.search);
    const spectatorInviteCode = params.get(keys.spectatorQueryKey);
    if (spectatorInviteCode) {
      callbacks.setSpectatorPreviousRole(currentLocalRole());
      callbacks.setSpectatorMode(true);
      setLocalRole("spectator");
      if (hasTournamentForInvite(spectatorInviteCode.toUpperCase())) {
        showWorkspace("tournament");
        return;
      }
      if (callbacks.hasSupabaseClient()) {
        loadRemoteTournamentByInvite(spectatorInviteCode.toUpperCase()).then((loaded) => {
          if (loaded) showWorkspace("tournament");
          else showModule("setup-player");
          render();
        });
        showWorkspace("tournament");
        return;
      }
      showModule("setup-player");
      return;
    }
    if (params.has("join") || params.has("code")) {
      showModule("setup-player");
      return;
    }
    if (!hasSavedTournament) return;
    if (isCurrentUserAdmin()) {
      showWorkspace("admin");
      return;
    }
    showWorkspace(callbacks.hasSelectedPlayer() ? "player" : "spectator");
  }

  global.PadelstarInitialView = { restore };
})(window);
