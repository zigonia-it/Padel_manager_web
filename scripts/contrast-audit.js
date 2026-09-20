// Developer tool (Phase 27): measures text contrast on the current page in the current theme.
// Load in the browser console of the local preview:  eval(await (await fetch('/scripts/contrast-audit.js')).text());  __contrast()
// For every visible element with its own text it composites the text color and the nearest backgrounds (gradients use the
// average of their color stops) and reports elements below WCAG AA: 4.5:1, or 3:1 for large text (>= 24px, or >= 18.66px bold).
(() => {
  const parse = (value) => {
    const m = String(value).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  };
  const over = (top, bottom) => {
    const a = top.a + bottom.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    const mix = (t, b2) => (t * top.a + b2 * bottom.a * (1 - top.a)) / a;
    return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const gradientAverage = (image) => {
    const colors = [...String(image).matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter((c) => c && c.a > 0.02);
    if (!colors.length) return null;
    const weight = colors.reduce((sum, c) => sum + c.a, 0);
    const mean = (key) => colors.reduce((sum, c) => sum + c[key] * c.a, 0) / weight; // transparent stops must not pull the color to black
    return { r: mean("r"), g: mean("g"), b: mean("b"), a: colors.reduce((sum, c) => sum + c.a, 0) / colors.length };
  };
  const backgroundOf = (el) => {
    const layers = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const cs = getComputedStyle(node);
      const image = gradientAverage(cs.backgroundImage);
      const color = parse(cs.backgroundColor);
      if (image && image.a > 0) layers.push(image);
      if (color && color.a > 0) layers.push(color);
      if ((color && color.a >= 0.999) || (image && image.a >= 0.999)) break;
    }
    let result = { r: 255, g: 255, b: 255, a: 1 }; // the page canvas
    const page = parse(getComputedStyle(document.body).backgroundColor);
    if (page && page.a > 0) result = over(page, result);
    else { const html = parse(getComputedStyle(document.documentElement).backgroundColor); if (html && html.a > 0) result = over(html, result); }
    for (const layer of layers.reverse()) result = over(layer, result);
    return result;
  };
  window.__contrast = (limit = 25) => {
    const bad = []; let checked = 0;
    for (const el of document.querySelectorAll("body *")) {
      if (!el.offsetParent && getComputedStyle(el).position !== "fixed") continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || Number(cs.opacity) === 0 || el.closest(".sr-only, [hidden], .hidden") || el.disabled || el.closest("button:disabled, [aria-disabled=true]")) continue; // disabled controls are exempt
      const fg0 = parse(cs.color); if (!fg0) continue;
      const bg = backgroundOf(el);
      const fg = over({ ...fg0, a: fg0.a * Number(cs.opacity) }, bg);
      const size = Number.parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const need = large ? 3 : 4.5;
      const r = ratio(fg, bg); checked += 1;
      if (r < need) bad.push({ ratio: Math.round(r * 100) / 100, need, text: el.textContent.trim().slice(0, 28), el: (el.id ? "#" + el.id : "") + "." + String(el.className).split(" ").filter(Boolean).slice(0, 2).join("."), fg: cs.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` });
    }
    bad.sort((a, b) => a.ratio - b.ratio);
    return { mode: document.documentElement.dataset.theme, checked, failing: bad.length, worst: bad.slice(0, limit) };
  };

  // Visits every main view on a LOCAL tournament (detaches the Supabase client) and returns the distinct failures per view.
  window.__contrastViews = async () => {
    supabaseClient = null;
    for (const r of await navigator.serviceWorker?.getRegistrations?.() ?? []) await r.unregister();
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const seen = new Set(); const rows = [];
    const at = async (label, fn) => {
      await fn(); await wait(700);
      const result = window.__contrast(200);
      const fresh = result.worst.filter((w) => { const key = `${w.el}|${w.text}`; if (seen.has(key)) return false; seen.add(key); return true; });
      rows.push({ view: label, checked: result.checked, failing: result.failing, new: fresh.slice(0, 12).map((w) => `${w.ratio}/${w.need} ${w.el} "${w.text}" fg=${w.fg} bg=${w.bg}`) });
    };
    await at("landing", () => showModule("landing"));
    await at("join", () => showModule("setup-player"));
    await at("create", () => showModule("setup-admin"));
    await at("account", () => showModule("account"));
    state.name = "Audit cup";
    playerState.addPlayers(["Anna Andersen", "Bjørn Berg", "Cecilie Christiansen", "Dag Dahl", "Eva Eriksen", "Frank Fjeld"], "admin");
    saveState({ remote: false });
    await at("lobby", () => { showModule("lobby"); render(); });
    generateFullTournamentSchedule(); saveState({ remote: false });
    await at("admin-control", () => { showWorkspace("admin"); render(); activateAdminPanel("control"); });
    await at("admin-matches", () => activateAdminPanel("matches"));
    await at("admin-standings", () => activateAdminPanel("standings"));
    state.selectedPlayerId = state.players[0].id; setLocalRole("player");
    await at("player", () => { showWorkspace("player"); render(); });
    podiumSnapshot = buildPodiumSnapshot(); await at("podium", () => { showModule("podium"); render(); });
    Object.keys(localStorage).filter((k) => /padelstar/i.test(k) && !/language|theme/.test(k)).forEach((k) => localStorage.removeItem(k));
    return { mode: document.documentElement.dataset.theme, width: innerWidth, rows };
  };
})();
