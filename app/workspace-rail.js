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
    window.addEventListener("resize", scheduleFit);
    window.addEventListener("scroll", scheduleFit, { passive: true });
  }

  // Desktop only: make the sticky rail exactly as tall as the visible part of the window, so its bottom item (TV Mode)
  // is always in view without scrolling, on any window height and at any scroll position.
  const RAIL_BOTTOM_GAP = 16;
  let fitFrame = 0;
  function scheduleFit() {
    if (fitFrame) return;
    fitFrame = window.requestAnimationFrame(() => { fitFrame = 0; fitRailToViewport(); });
  }

  function fitRailToViewport() {
    const rail = document.querySelector("#workspaceRail");
    if (!rail) return;
    const desktop = window.matchMedia?.("(min-width: 860px)").matches ?? true;
    if (!desktop || rail.classList.contains("hidden")) {
      rail.style.removeProperty("height");
      return;
    }
    const stickyTop = Number.parseFloat(window.getComputedStyle(rail).top) || 0;
    const top = Math.max(rail.getBoundingClientRect().top, stickyTop);
    const available = Math.floor(window.innerHeight - top - RAIL_BOTTOM_GAP);
    if (available > 0) rail.style.height = `${available}px`;
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
    scheduleFit();
  }

  window.PadelstarWorkspaceRail = { initialize, syncActiveState, fitRailToViewport };
})();
