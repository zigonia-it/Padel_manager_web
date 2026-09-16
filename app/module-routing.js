(function initializeModuleRouting(global) {
  function create({ hasActiveTournament, isCurrentUserAdmin, hasSelectedPlayer, getActiveModule }) {
    function normalizeWorkspaceModule(view) {
      return view;
    }

    function fallbackTournamentModule() {
      if (isCurrentUserAdmin()) return "admin";
      if (hasSelectedPlayer()) return "player";
      return "landing";
    }

    function normalizeModule(moduleName) {
      const requestedModule = normalizeWorkspaceModule(moduleName);
      // Podium renders from a captured snapshot, not live tournament state, so
      // it must stay reachable even after finishing wipes a guest tournament.
      if (requestedModule === "podium") return "podium";
      if (!hasActiveTournament()) {
        return ["setup-admin", "setup-player", "account"].includes(requestedModule) ? requestedModule : "landing";
      }
      if (requestedModule === "admin") return isCurrentUserAdmin() ? "admin" : fallbackTournamentModule();
      if (requestedModule === "player") return hasSelectedPlayer() ? "player" : fallbackTournamentModule();
      if (["landing", "setup-admin", "setup-player", "account"].includes(requestedModule)) return requestedModule;
      return fallbackTournamentModule();
    }

    function workspaceModuleFromActiveModule() {
      const activeModule = getActiveModule();
      return ["admin", "player"].includes(activeModule) ? activeModule : null;
    }

    return { fallbackTournamentModule, normalizeModule, normalizeWorkspaceModule, workspaceModuleFromActiveModule };
  }

  global.PadelstarModuleRouting = { create };
})(window);
