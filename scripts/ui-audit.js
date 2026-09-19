// Developer tool, not part of the app: a layout audit for the Browser pane / any browser console (Phase 25).
// Load it on the local preview:  eval(await (await fetch('/scripts/ui-audit.js')).text())  then  await __runViews()
// It seeds a LOCAL tournament (detaches the Supabase client, nothing is sent), visits every main view and reports:
//   sideways scrolling, elements beyond the right edge, tap targets under 32px, overlapping controls, clipped text.
// Sticky bars (the mobile bottom tabs) are intentional overlays and are ignored. Clean up with __cleanup().
(() => {
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && el.offsetParent !== null; };
  const describe = (el) => (el.id ? `#${el.id}` : "") + "." + String(el.className || "").split(" ").filter(Boolean).slice(0, 2).join(".") + `<${el.tagName.toLowerCase()}>` + (el.textContent || "").trim().slice(0, 24);

  window.__audit = (label) => {
    const vw = innerWidth; const issues = [];
    if (document.documentElement.scrollWidth > vw + 1) issues.push(`page scrolls sideways: ${document.documentElement.scrollWidth} > ${vw}`);
    const overflowing = [...document.querySelectorAll("body *")].filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 2 && !el.closest(".sr-only, dialog:not([open]), [hidden], .hidden, .app-toast") && getComputedStyle(el).position !== "fixed");
    overflowing.filter((el) => !overflowing.some((o) => o !== el && o.contains(el))).slice(0, 4).forEach((el) => issues.push(`beyond right edge: ${describe(el)} right=${Math.round(el.getBoundingClientRect().right)}`));
    const interactive = [...document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab]")].filter((el) => visible(el) && !el.closest(".sr-only") && !["radio", "checkbox"].includes(el.type));
    interactive.filter((el) => { const r = el.getBoundingClientRect(); return Math.min(r.width, r.height) < 32 && !el.closest(".footer-credit") && !(el.tagName === "A" && getComputedStyle(el).display === "inline") && !el.matches(".invite-code-cell, .invite-code-hidden-field, #languageSelect"); })
      .slice(0, 4).forEach((el) => { const r = el.getBoundingClientRect(); issues.push(`small target ${Math.round(r.width)}x${Math.round(r.height)}: ${describe(el)}`); });
    const sticky = (el) => Boolean(el.closest(".workspace-bottom-tabs, .workspace-rail, .language-menu, #languageSelect"));
    const found = [];
    for (let i = 0; i < interactive.length && found.length < 4; i++) for (let j = i + 1; j < interactive.length && found.length < 4; j++) {
      const a = interactive[i], b = interactive[j];
      if (a.contains(b) || b.contains(a) || sticky(a) || sticky(b) || a.closest(".match-summary") || b.closest(".match-summary")) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w > 4 && h > 4) found.push(`overlap: ${describe(a)} x ${describe(b)} ${Math.round(w)}x${Math.round(h)}`);
    }
    issues.push(...found);
    [...document.querySelectorAll("body *")].filter((el) => visible(el) && ["hidden", "clip"].includes(getComputedStyle(el).overflowX) && el.scrollWidth > el.clientWidth + 6 && el.clientWidth > 8 && !el.closest(".sr-only, .language-options, .match-card-body, .intro-copy, .settings-group, .info-dialog") && !["INPUT", "TEXTAREA", "SELECT", "SVG"].includes(el.tagName))
      .slice(0, 3).forEach((el) => issues.push(`text clipped: ${describe(el)} ${el.scrollWidth}>${el.clientWidth}`));
    return { view: label, issues };
  };

  window.__runViews = async () => {
    supabaseClient = null;
    for (const r of await navigator.serviceWorker?.getRegistrations?.() ?? []) await r.unregister();
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const results = [];
    const at = async (label, fn) => { await fn(); await wait(350); results.push(window.__audit(label)); };
    await at("landing", () => showModule("landing"));
    await at("join", () => showModule("setup-player"));
    await at("create", () => showModule("setup-admin"));
    await at("account", () => showModule("account"));
    state.name = "Audit cup";
    playerState.addPlayers(["Anna Andersen", "Bjørn Berg", "Cecilie Christiansen", "Dag Dahl", "Eva Eriksen", "Frank Fjeld"], "admin");
    state.courts.push({ id: "c2", name: "Bane 2", courtNumber: 2, active: true });
    saveState({ remote: false });
    await at("lobby", () => { showModule("lobby"); render(); });
    generateFullTournamentSchedule(); saveState({ remote: false });
    await at("admin-control", () => { showWorkspace("admin"); render(); activateAdminPanel("control"); });
    await at("admin-matches", () => activateAdminPanel("matches"));
    await at("admin-standings", () => activateAdminPanel("standings"));
    state.selectedPlayerId = state.players[0].id; setLocalRole("player");
    await at("player", () => { showWorkspace("player"); render(); });
    return { width: innerWidth, height: innerHeight, lang: localStorage.getItem("padelstar-language") ?? "device", results: results.map((r) => `${r.view}: ${r.issues.length ? r.issues.join(" || ") : "OK"}`) };
  };

  window.__cleanup = () => { Object.keys(localStorage).filter((k) => /padelstar/i.test(k) && !/language/.test(k)).forEach((k) => localStorage.removeItem(k)); return true; };
})();
