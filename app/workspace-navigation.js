(function (global) {
  "use strict";

  function create(deps) {
    let transitionFrame = null;

    function showStart() {
      showModule("landing");
    }

    function showWorkspace(view = "admin") {
      showModule(deps.normalizeWorkspaceModule(view));
    }

    function showModule(moduleName) {
      const requestedModule = deps.normalizeModule(moduleName);
      deps.setActiveModule(requestedModule);
      const workspaceModule = deps.workspaceModuleFromActiveModule();
      const isWorkspaceActive = Boolean(workspaceModule);
      const elements = deps.getElements();
      const state = deps.getState();
      if (requestedModule === "setup-player" && deps.hasActiveTournament() && !elements.joinTournamentForm.elements.inviteCode.value) {
        deps.prefillJoinForm(state.inviteCode);
      }
      if (requestedModule === "setup-player") deps.syncJoinPreview();

      document.body.classList.toggle("workspace-active", isWorkspaceActive);
      document.body.classList.toggle("setup-active", requestedModule === "setup-admin" || requestedModule === "setup-player" || requestedModule === "account");
      const activeSections = [];
      document.querySelectorAll(".app-module").forEach((section) => {
        const isActive = section.dataset.module === requestedModule || (section.dataset.module === "workspace" && isWorkspaceActive);
        section.classList.toggle("hidden", !isActive);
        section.classList.remove("module-entering");
        if (isActive) activeSections.push(section);
      });

      if (!deps.isTestMode()) {
        global.cancelAnimationFrame?.(transitionFrame);
        activeSections.forEach((section) => section.classList.add("module-entering"));
        transitionFrame = deps.requestAnimationFrame(() => {
          transitionFrame = deps.requestAnimationFrame(() => {
            activeSections.forEach((section) => section.classList.remove("module-entering"));
          });
        });
      }

      document.querySelectorAll("[data-section]").forEach((section) => {
        section.classList.toggle("hidden", section.dataset.section !== workspaceModule);
      });
      document.querySelectorAll("#appMenu [data-module-link]").forEach((link) => {
        link.classList.toggle("active", link.dataset.moduleLink === requestedModule);
        if (link.dataset.moduleLink === requestedModule) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
      deps.requestAnimationFrame(() => global.scrollTo?.({ top: 0, behavior: "auto" }));
      if (!deps.isTestMode()) deps.requestAnimationFrame(() => deps.focusModuleHeading(activeSections[0]));
      renderRoleVisibility();
    }

    function activateTab(view) {
      showModule(deps.normalizeWorkspaceModule(view));
    }

    function renderRoleVisibility() {
      const elements = deps.getElements();
      const state = deps.getState();
      const activeModule = deps.getActiveModule();
      const isAdmin = deps.isCurrentUserAdmin() && !deps.getSpectatorMode();
      const tournamentIsActive = deps.hasActiveTournament();
      const canShowAdmin = tournamentIsActive && isAdmin;
      const canShowPlayer = tournamentIsActive && Boolean(state.selectedPlayerId);
      const onLanding = activeModule === "landing";
      const visibleModules = new Set([
        "landing",
        "account",
        ...(onLanding ? [] : ["setup-admin", "setup-player"]),
        ...(canShowAdmin ? ["admin"] : []),
        ...(canShowPlayer ? ["player"] : []),
      ]);
      const workspaceModule = deps.workspaceModuleFromActiveModule();

      elements.adminTab.classList.toggle("hidden", !canShowAdmin);
      elements.playerTab.classList.toggle("hidden", !canShowPlayer);
      // TV Mode is the public tournament view; keep the old tournament link out of the menu.
      elements.tournamentTab.classList.add("hidden");
      elements.tvModeMenuButton?.classList.toggle("hidden", !tournamentIsActive);
      const canLeaveSession = deps.getSpectatorMode() || canShowPlayer;
      elements.leaveSessionButton?.classList.toggle("hidden", !canLeaveSession);
      if (elements.leaveSessionButton) {
        elements.leaveSessionButton.dataset.i18n = deps.getSpectatorMode() ? "nav.leaveSpectator" : "actions.leaveTournament";
        elements.leaveSessionButton.textContent = deps.t(elements.leaveSessionButton.dataset.i18n);
      }
      elements.headerShareBox.classList.toggle("hidden", !isAdmin || activeModule !== "admin");
      if (elements.roleIndicator) {
        const role = isAdmin ? "admin" : state.selectedPlayerId && !deps.getSpectatorMode() ? "player" : "spectator";
        elements.roleIndicator.textContent = deps.t(`role.${role}`);
      }
      document.querySelectorAll("#appMenu [data-module-link]").forEach((link) => {
        const moduleName = deps.normalizeWorkspaceModule(link.dataset.moduleLink);
        link.classList.toggle("hidden", !visibleModules.has(moduleName));
        link.classList.toggle("active", moduleName === activeModule);
        if (moduleName === activeModule) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
      document.querySelectorAll("[data-section]").forEach((section) => {
        section.classList.toggle("hidden", section.dataset.section !== workspaceModule);
      });
    }

    function activateAdminPanel(panel) {
      document.querySelectorAll(".subtab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.adminPanel === panel);
        tab.setAttribute("aria-selected", String(tab.dataset.adminPanel === panel));
      });
      document.querySelectorAll("[data-admin-panel-section]").forEach((section) => {
        section.classList.toggle("hidden", section.dataset.adminPanelSection !== panel);
      });
    }

    return { showStart, showWorkspace, showModule, activateTab, renderRoleVisibility, activateAdminPanel };
  }

  global.PadelstarWorkspaceNavigation = { create };
})(window);
