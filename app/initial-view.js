(function attachPadelstarInitialView(global) {
  "use strict";

  function restore({ windowRef, storage, keys, callbacks }) {
    const { isCurrentUserAdmin, showModule, showWorkspace } = callbacks;
    const hasSavedTournament = Boolean(storage.getItem(keys.storageKey));
    const params = new URLSearchParams(windowRef.location.search);
    const spectatorInviteCode = params.get(keys.spectatorQueryKey);
    if (spectatorInviteCode) {
      windowRef.location.href = `tv.html?${keys.spectatorQueryKey}=${encodeURIComponent(spectatorInviteCode)}`;
      return;
    }
    if (params.has("join") || params.has("code")) {
      showModule("setup-player");
      return;
    }
    const requestedView = params.get("view");
    if (requestedView && ["landing", "setup-player", "setup-admin", "account"].includes(requestedView)) {
      showModule(requestedView);
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
