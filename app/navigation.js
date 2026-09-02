(() => {
  const menuToggle = () => document.querySelector("#appMenuToggle");

  function closeMenu() {
    const toggle = menuToggle();
    document.body.classList.remove("app-menu-open");
    toggle?.setAttribute("aria-expanded", "false");
  }

  function initialize({ showModule, translate }) {
    const toggle = menuToggle();
    if (typeof showModule !== "function") return;

    // Bind navigation independently of the responsive drawer. The desktop
    // menu must remain functional even if the hamburger control is hidden or
    // unavailable in a partial/static render.
    document.querySelectorAll("[data-module-link]").forEach((link) => {
      link.addEventListener("click", () => {
        showModule(link.dataset.moduleLink);
        closeMenu();
        if (link.dataset.focusTarget) {
          window.requestAnimationFrame(() => document.getElementById(link.dataset.focusTarget)?.focus());
        }
      });
    });

    if (!toggle) return;

    toggle.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("app-menu-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", translate?.(isOpen ? "nav.closeMenu" : "nav.openMenu") || "Meny");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  window.PadelstarNavigation = { initialize, closeMenu };
})();
