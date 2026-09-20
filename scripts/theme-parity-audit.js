// Developer tool, not part of the app (Phase 31): finds places where the light theme draws a panel the dark theme does not
// (the "square background" bug: a later dark rule resets a background, the light twin of an earlier rule wins).
// Load AFTER scripts/ui-audit.js on the local preview:
//   eval(await (await fetch('/scripts/ui-audit.js')).text()); eval(await (await fetch('/scripts/theme-parity-audit.js')).text()); await __runViews()
// ui-audit calls window.__parity(label) for every view it visits; the result lines appear as "parity <view>: ...".
(() => {
  const setMode = (mode) => { document.documentElement.dataset.themeMode = mode; };
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 24 && r.height > 24 && cs.visibility !== "hidden" && cs.display !== "none"; };
  const hasFill = (cs) => (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && !/, 0\)$/.test(cs.backgroundColor)) || (cs.backgroundImage && cs.backgroundImage !== "none");
  const shape = (el) => { const cs = getComputedStyle(el); return { fill: hasFill(cs), border: parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none", shadow: cs.boxShadow !== "none", radius: parseFloat(cs.borderTopLeftRadius) || 0 }; };
  const name = (el) => (el.id ? `#${el.id}` : "") + "." + String(el.className || "").split(" ").filter(Boolean).slice(0, 2).join(".") + `<${el.tagName.toLowerCase()}>`;

  window.__parity = (label) => {
    const original = document.documentElement.dataset.themeMode;
    const all = [...document.querySelectorAll("body *")].filter((el) => !el.closest("svg, .sr-only, dialog:not([open]), script, style"));
    setMode("dark"); const dark = all.map((el) => (visible(el) ? shape(el) : null));
    setMode("light"); const light = all.map((el) => (visible(el) ? shape(el) : null));
    if (original) setMode(original);
    const issues = [];
    all.forEach((el, i) => {
      const d = dark[i], l = light[i];
      if (!d || !l) return;
      if (!d.fill && l.fill) issues.push(`light fill the dark theme does not have: ${name(el)} radius=${l.radius}`);
      if (!d.border && l.border) issues.push(`light border the dark theme does not have: ${name(el)}`);
      if (!d.shadow && l.shadow) issues.push(`light shadow the dark theme does not have: ${name(el)}`);
    });
    return { view: `parity ${label}`, issues: issues.slice(0, 8) };
  };
})();
