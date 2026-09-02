(function initializeModuleRouting(global) {
  function create({ hasActiveTournament, isCurrentUserAdmin, hasSelectedPlayer, getActiveModule }) {
    function normalizeWorkspaceModule(view) {
      return view === "spectator" ? "tournament" : view;
    }

    function fallbackTournamentModule() {
      if (isCurrentUserAdmin()) return "admin";
      if (hasSelectedPlayer()) return "player";
      return "tournament";
    }

    function normalizeModule(moduleName) {
      const requestedModule = normalizeWorkspaceModule(moduleName);
      if (!hasActiveTournament()) {
        return ["setup-admin", "setup-player", "account"].includes(requestedModule) ? requestedModule : "landing";
      }
      if (requestedModule === "admin") return isCurrentUserAdmin() ? "admin" : fallbackTournamentModule();
      if (requestedModule === "player") return hasSelectedPlayer() ? "player" : fallbackTournamentModule();
      if (["landing", "setup-admin", "setup-player", "account", "tournament"].includes(requestedModule)) return requestedModule;
      return fallbackTournamentModule();
    }

    function workspaceModuleFromActiveModule() {
      const activeModule = getActiveModule();
      return ["admin", "player", "tournament"].includes(activeModule) ? activeModule : null;
    }

    return { fallbackTournamentModule, normalizeModule, normalizeWorkspaceModule, workspaceModuleFromActiveModule };
  }

  global.PadelstarModuleRouting = { create };
})(window);
