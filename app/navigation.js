(() => {
  const menuToggle = () => document.querySelector("#appMenuToggle");

  function closeMenu() {
    const toggle = menuToggle();
    document.body.classList.remove("app-menu-open");
    toggle?.setAttribute("aria-expanded", "false");
  }

  function initialize({ showModule, translate }) {
    const toggle = menuToggle();
    if (!toggle || typeof showModule !== "function") return;

    toggle.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("app-menu-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", translate?.(isOpen ? "nav.closeMenu" : "nav.openMenu") || "Meny");
    });

    document.querySelectorAll("[data-module-link]").forEach((link) => {
      link.addEventListener("click", () => {
        showModule(link.dataset.moduleLink);
        closeMenu();
        if (link.dataset.focusTarget) {
          window.requestAnimationFrame(() => document.getElementById(link.dataset.focusTarget)?.focus());
        }
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  window.PadelstarNavigation = { initialize, closeMenu };
})();
