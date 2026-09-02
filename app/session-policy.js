(function initializeSessionPolicy(global) {
  function create({ localStorage, mirrorStorageKeys, roleStorageKey, state, storageKey }) {
    function hasActiveTournament() {
      return Boolean(localStorage.getItem(storageKey));
    }

    function currentLocalRole() {
      const storedRole = localStorage.getItem(roleStorageKey);
      if (storedRole) return storedRole;
      if (state().adminToken) return "admin";
      if (state().selectedPlayerId) return "player";
      return "spectator";
    }

    function isCurrentUserAdmin() {
      return Boolean(state().adminToken && hasActiveTournament() && currentLocalRole() === "admin");
    }

    function hasTournamentForInvite(inviteCode, loadedRemote = false) {
      return Boolean(inviteCode && inviteCode === state().inviteCode && (loadedRemote || hasActiveTournament()));
    }

    function setLocalRole(role) {
      localStorage.setItem(roleStorageKey, role);
      mirrorStorageKeys([roleStorageKey]);
    }

    return { currentLocalRole, hasActiveTournament, hasTournamentForInvite, isCurrentUserAdmin, setLocalRole };
  }

  global.PadelstarSessionPolicy = { create };
})(window);
