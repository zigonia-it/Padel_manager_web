#!/usr/bin/env node
// One-time codemod (colour system 2026-09-20): rewrites colour literals in the component stylesheets to role tokens
// (styles/tokens.css). It keeps comments and formatting, changes only colour values, and is idempotent.
//   node scripts/migrate-colors.js            rewrite in place
//   node scripts/migrate-colors.js --report   list what would change per file, write nothing
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const stylesDir = path.join(__dirname, "..", "styles");
const SKIP = new Set(["tokens.css", "theme-light.css", "theme-light-manual.css", "tv-light.css", "tv-light-manual.css"]);
const COLOR = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\([^()]*\)|\b(?:white|black)\b/g;

function parse(text) {
  const value = text.trim().toLowerCase();
  if (value === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (value === "black") return { r: 0, g: 0, b: 0, a: 1 };
  if (value.startsWith("#")) {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map((c) => c + c).join("");
    const n = (i) => parseInt(hex.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? n(6) / 255 : 1 };
  }
  const m = value.match(/^rgba?\(([^)]*)\)$/);
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.some((p) => p.includes("var("))) return null;
  const nums = parts.map((p) => (p.endsWith("%") ? Number.parseFloat(p) / 100 : Number.parseFloat(p)));
  if (nums.length < 3 || nums.slice(0, 3).some(Number.isNaN)) return null;
  return { r: nums[0], g: nums[1], b: nums[2], a: nums[3] === undefined ? 1 : nums[3] };
}

function hsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

// the accent role of a coloured (saturated) value
function hueRole(h) {
  if (h >= 330 || h < 20) return "negative";
  if (h < 70) return "warning";
  if (h < 166) return "positive";
  if (h < 206) return "accent-cyan";
  return "accent-blue-bright";
}

const pct = (a) => Math.max(1, Math.min(100, Math.round(a * 100)));
const mix = (token, percent) => (percent >= 100 ? `var(--${token})` : `color-mix(in srgb, var(--${token}) ${percent}%, transparent)`);

function textRole(c) {
  const { h, s, l } = hsl(c);
  if (l < 0.28) return "btn-primary-ink"; // dark text sits on a filled accent
  if (s > 0.35 && l > 0.3) { const role = hueRole(h); return role === "accent-blue-bright" || role === "accent-cyan" ? "accent-text" : role; }
  if (l >= 0.9) return "ink-heading";
  if (l >= 0.8) return "ink-body";
  if (l >= 0.66) return "ink-muted";
  return "ink-faint";
}

function borderValue(c) {
  const { h, s, l } = hsl(c);
  if (c.a === 0) return null;
  if (s > 0.5 && l > 0.3 && c.a >= 0.35) { const role = hueRole(h); return mix(role === "accent-blue-bright" ? "accent-blue-bright" : role, pct(c.a)); }
  if (l < 0.3) return c.a >= 0.7 ? "var(--border-default)" : "var(--border-subtle)";
  if (c.a < 0.16) return "var(--border-subtle)";
  if (c.a < 0.3) return "var(--border-default)";
  return "var(--border-strong)";
}

function shadowValue(c) {
  const { l, s } = hsl(c);
  const strength = l < 0.3 ? "shadow-strength" : "glow-strength";
  const token = l < 0.3 ? "shadow-ink" : s > 0.25 ? "accent-blue-bright" : "ink-heading";
  return `color-mix(in srgb, var(--${token}) calc(${pct(c.a)}% * var(--${strength})), transparent)`;
}

function backgroundValue(c, selector) {
  const { h, s, l } = hsl(c);
  if (c.a === 0) return null;
  if (l < 0.3) {
    const token = /(^|[\s,>])(input|textarea|select)\b|::placeholder|\.court-name-input|code\b|pre\b/.test(selector) || l < 0.075 ? "surface-sunken" : "surface-card";
    return mix(token, c.a >= 0.95 ? 100 : pct(c.a));
  }
  if (c.a < 0.55) { // a wash: hover, active, tint
    if (s < 0.2) return mix("ink-heading", Math.max(1, Math.round(c.a * 60)));
    const role = hueRole(h);
    return mix(role, pct(c.a));
  }
  if (l > 0.9 && s < 0.2) return "var(--surface-card)"; // a white pill
  if (s < 0.2) return mix("ink-faint", pct(c.a));
  return mix(hueRole(h), pct(c.a));
}

const PRIMARY = /(^|[\s,>])(?:button)?\.?(?:primary|button-primary|ds-btn-primary)\b|\.landing-cta:first-child|\.subtab\.active|\.workspace-rail-item\.is-active/;
const SECONDARY = /\.(?:secondary|ghost|ds-btn-secondary|ds-btn-ghost|button-secondary)\b/;

function rewriteValue(prop, value, selector) {
  if (/^--/.test(prop)) return value;
  const lower = prop.toLowerCase();
  const isShadow = /shadow/.test(lower) || (lower === "filter" && /drop-shadow/.test(value)) || lower === "-webkit-filter";
  const isText = /^(color|caret-color|-webkit-text-fill-color|text-decoration-color|fill|stroke)$/.test(lower);
  const isBorder = /^(border|border-(top|right|bottom|left)|outline|border-color|border-(top|right|bottom|left)-color|outline-color|column-rule)$/.test(lower);
  const isBackground = /^background(-color|-image)?$/.test(lower) || lower === "background";
  if (!(isShadow || isText || isBorder || isBackground)) return value;
  if (!COLOR.test(value)) { COLOR.lastIndex = 0; return value; }
  COLOR.lastIndex = 0;

  // whole-value roles first
  const gradientOnly = /gradient/.test(value);
  if (isBackground && PRIMARY.test(selector) && gradientOnly) return "linear-gradient(180deg, var(--btn-primary-from), var(--btn-primary-to))";
  if (isBackground && SECONDARY.test(selector) && gradientOnly && !PRIMARY.test(selector)) return "var(--btn-secondary-bg)";
  if (isBackground && /^(body|html)(\.[a-z-]+|\[[^\]]+\])*$/.test(selector.trim()) && gradientOnly) return "var(--surface-page)";

  return value.replace(COLOR, (match) => {
    const c = parse(match);
    if (!c) return match;
    if (isShadow) return shadowValue(c);
    if (isText) {
      const role = textRole(c);
      return c.a < 0.999 ? mix(role, pct(c.a)) : `var(--${role})`;
    }
    if (isBorder) {
      if (SECONDARY.test(selector) && !PRIMARY.test(selector) && hsl(c).s > 0.4) return "var(--btn-secondary-border)";
      return borderValue(c) ?? match;
    }
    return backgroundValue(c, selector) ?? match;
  });
}

function splitDeclarations(body) {
  const parts = [];
  let depth = 0, quote = null, start = 0;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quote) { if (ch === "\\") i += 1; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === ";" && depth === 0) { parts.push(body.slice(start, i + 1)); start = i + 1; }
  }
  if (start < body.length) parts.push(body.slice(start));
  return parts;
}

function rewriteBody(body, selector) {
  const primary = PRIMARY.test(selector) && !/:disabled|\[disabled\]/.test(selector);
  return splitDeclarations(body).map((declaration) => {
    const colon = declaration.indexOf(":");
    if (colon === -1) return declaration;
    const prop = declaration.slice(0, colon).trim();
    if (!/^[a-zA-Z-]+$/.test(prop)) return declaration;
    const rest = declaration.slice(colon + 1);
    // keep the leading space, the "!important" and the closing ";" exactly as they were
    const tail = (rest.match(/(\s*!important)?\s*;?\s*$/i) ?? [""])[0];
    const core = rest.slice(0, rest.length - tail.length);
    const lead = core.match(/^\s*/)[0];
    // text on the primary action is always the theme's primary ink (dark on the pale dark-theme gradient, white on the deep light-theme one)
    if (primary && prop.toLowerCase() === "color") return declaration.slice(0, colon + 1) + lead + "var(--btn-primary-ink)" + tail;
    return declaration.slice(0, colon + 1) + lead + rewriteValue(prop, core.slice(lead.length), selector) + tail;
  }).join("");
}

function matching(css, open) {
  let depth = 0, quote = null;
  for (let i = open; i < css.length; i += 1) {
    const c = css[i];
    if (quote) { if (c === "\\") i += 1; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === "/" && css[i + 1] === "*") { const end = css.indexOf("*/", i + 2); i = end === -1 ? css.length : end + 1; continue; }
    if (c === "{") depth += 1;
    if (c === "}") { depth -= 1; if (depth === 0) return i; }
  }
  return css.length - 1;
}

function rewriteRules(css) {
  let out = "", i = 0;
  while (i < css.length) {
    const open = (() => { let j = i; while (j < css.length) { if (css[j] === "/" && css[j + 1] === "*") { const end = css.indexOf("*/", j + 2); j = end === -1 ? css.length : end + 2; continue; } if (css[j] === "{") return j; if (css[j] === ";" && false) return -1; j += 1; } return -1; })();
    if (open === -1) { out += css.slice(i); break; }
    const head = css.slice(i, open);
    const close = matching(css, open);
    const body = css.slice(open + 1, close);
    const selector = head.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    let newBody;
    if (/^@(media|supports|layer|container)\b/.test(selector)) newBody = rewriteRules(body);
    else if (/^@(font-face|page)\b/.test(selector)) newBody = body;
    else if (/^@(-webkit-)?keyframes\b/.test(selector)) newBody = rewriteRules(body);
    else newBody = rewriteBody(body, selector);
    out += head + "{" + newBody + "}";
    i = close + 1;
  }
  return out;
}

// rgba(var(--gold-rgb), .3) style triplets become mixes of the role tokens
const TRIPLET = { "gold-rgb": "accent-blue", "gold-light-rgb": "ink-heading", "gold-bright-rgb": "accent-blue-bright", "gold-dark-rgb": "accent-blue" };
function rewriteTriplets(css) {
  return css.replace(/rgba\(\s*var\(--(gold-rgb|gold-light-rgb|gold-bright-rgb|gold-dark-rgb)\)\s*,\s*([0-9.]+)\s*\)/g, (_all, name, alpha) => mix(TRIPLET[name], pct(Number(alpha))));
}

function migrate(css) { return rewriteTriplets(rewriteRules(css)); }

module.exports = { migrate, parse, hsl, textRole, backgroundValue, borderValue, shadowValue, SKIP };

if (require.main === module) {
  const report = process.argv.includes("--report");
  let changedFiles = 0;
  for (const file of fs.readdirSync(stylesDir).filter((f) => f.endsWith(".css") && !SKIP.has(f)).sort()) {
    const full = path.join(stylesDir, file);
    const before = fs.readFileSync(full, "utf8");
    const after = migrate(before);
    if (after !== before) { changedFiles += 1; if (!report) fs.writeFileSync(full, after); console.log(`${report ? "would change" : "changed"} ${file}`); }
  }
  console.log(`${changedFiles} files`);
}
