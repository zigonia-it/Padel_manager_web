window.PadelstarUiEffects = (() => {
  function focusModuleHeading(section) {
    const heading = section?.querySelector("h1, h2");
    if (!heading || typeof heading.focus !== "function") return;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }

  function flashMatchCards(matchId) {
    if (typeof document === "undefined") return;
    const escapedMatchId = typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(matchId)
      : String(matchId).replace(/"/g, '\\"');
    document.querySelectorAll(`[data-match-id="${escapedMatchId}"]`).forEach((card) => {
      card.classList.remove("score-flash");
      void card.offsetWidth;
      card.classList.add("score-flash");
      window.setTimeout(() => card.classList.remove("score-flash"), 520);
    });
  }

  return { focusModuleHeading, flashMatchCards };
})();
