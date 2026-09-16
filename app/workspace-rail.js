(() => {
  function initialize({ showModule, activateAdminPanel }) {
    if (typeof showModule !== "function" || typeof activateAdminPanel !== "function") return;

    document.querySelectorAll("[data-rail-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.railTarget;
        if (target === "player") {
          showModule("player");
        } else {
          showModule("admin");
          activateAdminPanel(target);
        }
      });
    });

    syncActiveState();
  }

  // Purely presentational: no separate navigation state. Every call re-reads
  // showModule()/activateAdminPanel()'s own DOM output (which [data-section]
  // is visible, which .subtab carries .active, whether the hamburger's admin/
  // player links are hidden) so the rail can never drift out of sync with it.
  function syncActiveState() {
    const adminHidden = document.querySelector("#adminModuleLink")?.classList.contains("hidden") ?? true;
    const playerHidden = document.querySelector("#playerModuleLink")?.classList.contains("hidden") ?? true;
    const showRail = !adminHidden;
    const showPlayerItem = showRail && !playerHidden;

    document.querySelectorAll(".workspace-rail, .workspace-bottom-tabs").forEach((nav) => {
      nav.classList.toggle("hidden", !showRail);
    });
    document.querySelectorAll('[data-rail-target="player"]').forEach((button) => {
      button.classList.toggle("hidden", !showPlayerItem);
    });

    const playerSection = document.querySelector('[data-section="player"]');
    const isPlayerActive = Boolean(playerSection) && !playerSection.classList.contains("hidden");
    const activeSubtab = document.querySelector(".subtab.active")?.dataset.adminPanel ?? "control";
    const activeTarget = isPlayerActive ? "player" : activeSubtab;

    document.querySelectorAll("[data-rail-target]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.railTarget === activeTarget);
    });
  }

  window.PadelstarWorkspaceRail = { initialize, syncActiveState };
})();
