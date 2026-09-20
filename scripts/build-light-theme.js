#!/usr/bin/env node
// Generates styles/theme-light.css: the light color theme (Phase 27) derived from the dark theme.
//
//   node scripts/build-light-theme.js            writes styles/theme-light.css
//   node scripts/build-light-theme.js --check    exits 1 if the file is out of date
//
// How it works: every style rule in the app's stylesheets that uses a color gets a twin under
// `html[data-theme-mode="light"]` with the colors converted. Conversion is a lookup in scripts/light-theme-palette.json
// (the pairs taken from the Claude Design mockups) and, for colors not listed there, a rule-based fallback
// (dark surfaces become light, light text becomes dark, translucent light tints become translucent ink tints, accents darken).
// Hand-made corrections that the conversion cannot know live in styles/theme-light-manual.css (loaded after this file).
// No markup and no component logic changes between the themes: only color values.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.join(__dirname, "..");
const stylesDir = path.join(root, "styles");
const OUTPUT = path.join(stylesDir, "theme-light.css");
// TV Mode (tv.html) is its own page with its own stylesheet; its light theme is generated from tv.css the same way.
const TV_SOURCE = "tv.css";
const TV_OUTPUT = path.join(stylesDir, "tv-light.css");
const PALETTE = path.join(__dirname, "light-theme-palette.json");
// The stylesheets that make up the app. tv.css is a separate page with its own output (tv-light.css); the theme files themselves are outputs.
const EXCLUDED = new Set(["tv.css", "theme-light.css", "theme-light-manual.css", "tv-light.css", "tv-light-manual.css"]);
const SCOPE = 'html[data-theme-mode="light"]';

const COLOR = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;

// ---------------------------------------------------------------- colors

function parseColor(text) {
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
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map((p) => (p.endsWith("%") ? Number.parseFloat(p) / 100 : Number.parseFloat(p)));
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] };
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return { r: Math.round(f(h + 1 / 3) * 255), g: Math.round(f(h) * 255), b: Math.round(f(h - 1 / 3) * 255) };
}

const toHex = ({ r, g, b }) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
const trim = (n) => String(Number.parseFloat(n.toFixed(3)));

function format({ r, g, b, a }) {
  return a >= 0.999 ? toHex({ r, g, b }) : `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${trim(a)})`;
}

// Rule-based conversion of a dark-theme color that is not in the palette table.
function fallback(color, property = "") {
  const [h, s, l] = rgbToHsl(color);
  const clamp = (lo, hi, v) => Math.max(lo, Math.min(hi, v));
  if (color.a < 0.999) {
    if (/shadow|glow/.test(property) && l < 0.35) return { r: 15, g: 40, b: 70, a: color.a * 0.45 }; // a dark shadow stays a (softer) shadow
    if (l < 0.25 && color.a >= 0.4) return { r: 255, g: 255, b: 255, a: Math.min(0.95, color.a + 0.1) }; // dark translucent surface -> white glass
    if (l < 0.25) return { r: 15, g: 40, b: 70, a: color.a * 0.5 }; // veil -> softer
    if (l > 0.5 && s < 0.2) return { r: 13, g: 27, b: 42, a: Math.min(1, color.a * 0.7) }; // white tint -> ink tint
    // a light-blue tint used as a *fill* stays a light-blue tint (the design's rgba(91,173,255,.14)); as a line or shadow it becomes an ink tint
    if (l > 0.5 && /^background|glass|(^|-)bg$|surface/.test(property)) return { r: 91, g: 173, b: 255, a: Math.min(0.3, color.a * 0.6) };
    if (l > 0.5) return { r: 20, g: 60, b: 105, a: color.a }; // light blue tint -> ink tint
    return { ...hslToRgb(h, s, clamp(0.2, 0.6, l * 0.78)), a: color.a };
  }
  if (s > 0.45 && l > 0.3) return { ...hslToRgb(h, Math.min(1, s * 0.9), clamp(0.28, 0.55, l * 0.68)), a: 1 }; // saturated accent -> darker accent
  if (l < 0.3) return { ...hslToRgb(h, s * 0.5, 0.985 - l * 0.5), a: 1 }; // dark surface -> light surface
  if (l > 0.55) return { ...hslToRgb(h || 0.6, clamp(0.18, 0.4, s), clamp(0.1, 0.5, 0.12 + (0.98 - l) * 1.25)), a: 1 }; // light text -> dark text (muted stays muted)
  return { ...hslToRgb(h, s, clamp(0.22, 0.6, l * 0.78)), a: 1 }; // other mid tones -> a bit darker
}

// WCAG contrast of two {r,g,b} colors.
function luminance({ r, g, b }) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastRatio(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
// Text on the light theme must stay readable on the tinted light surfaces (the worst common one is about #e4edf8).
const TEXT_SURFACE = { r: 205, g: 215, b: 228 };
const MIN_TEXT_CONTRAST = 5.2;
function ensureTextContrast(cssColor) {
  const parsed = parseColor(cssColor);
  if (!parsed) return cssColor;
  const over = (c) => ({ r: c.r * c.a + TEXT_SURFACE.r * (1 - c.a), g: c.g * c.a + TEXT_SURFACE.g * (1 - c.a), b: c.b * c.a + TEXT_SURFACE.b * (1 - c.a) });
  let color = { ...parsed };
  // a translucent text color becomes more opaque first, then darker
  while (color.a < 0.999 && contrastRatio(over(color), TEXT_SURFACE) < MIN_TEXT_CONTRAST) color = { ...color, a: Math.min(1, color.a + 0.04) };
  let [h, s, l] = rgbToHsl(color);
  for (let i = 0; i < 60 && contrastRatio(over(color), TEXT_SURFACE) < MIN_TEXT_CONTRAST && l > 0.05; i += 1) {
    l -= 0.01;
    color = { ...hslToRgb(h, s, l), a: color.a };
  }
  return format(color);
}
const TEXT_PROPERTY = /^(color|fill|stroke|text-decoration-color|-webkit-text-fill-color|caret-color)$/;
const COLOR_PROPERTY = /^(color|background(-image|-color)?|border(-top|-right|-bottom|-left)?(-color)?|outline(-color)?|box-shadow|fill|stroke|caret-color|-webkit-text-fill-color|text-decoration(-color)?)$/;
const TEXT_TOKEN = /^--(?!soft$)(?!.*(?:bg|surface|page|line|border|glow|shadow|deep|dark|rgb|gradient|glass))(?:.*(?:text|muted|ink|gold|accent|blue|green|finished|success|danger|error|red|warn|silver|cream))/;
const isTextCapable = (property) => TEXT_PROPERTY.test(property) || TEXT_TOKEN.test(property);

const paletteFile = JSON.parse(fs.readFileSync(PALETTE, "utf8"));
const palette = paletteFile.pairs;
const keep = new Set(paletteFile.keep ?? []);
const normalize = (text) => text.trim().toLowerCase().replace(/\s+/g, "");

// The same color written another way (rgba(91,173,255,.32) against the design's #5badff51) finds its pair too:
// identical RGB and an alpha within 0.02.
let pairColors = null;
function nearestPair(color) {
  if (!pairColors) pairColors = Object.entries(palette).map(([key, value]) => [parseColor(key), value]).filter(([parsed]) => parsed);
  if (color.a >= 0.999) return null; // opaque colors keep the exact-match / fallback rules
  for (const [candidate, value] of pairColors) {
    if (candidate.a >= 0.999) continue;
    if (Math.round(candidate.r) === Math.round(color.r) && Math.round(candidate.g) === Math.round(color.g) && Math.round(candidate.b) === Math.round(color.b)
      && Math.abs(candidate.a - color.a) <= 0.02) return value;
  }
  return null;
}

function mapColor(text, property = "") {
  const mapped = mapColorRaw(text, property);
  return isTextCapable(property) && (/^#[0-9a-f]{6}$/i.test(mapped) || /^rgba\(/i.test(mapped)) ? ensureTextContrast(mapped) : mapped;
}

function mapColorRaw(text, property = "") {
  const key = normalize(text);
  if (/^background/.test(property)) {
    const tint = parseColor(text);
    // a dark translucent well (inset panels on the dark theme) would gray a light surface: it becomes the design's light-blue tint
    if (tint && tint.a > 0 && tint.a < 0.5 && rgbToHsl(tint)[2] < 0.35) return format({ r: 91, g: 173, b: 255, a: Math.max(0.06, Math.min(0.16, tint.a * 0.5)) });
  }
  if (palette[key]) return palette[key];
  if (keep.has(key)) return text;
  const parsed = parseColor(text);
  if (!parsed) return text;
  const near = nearestPair(parsed);
  if (near) return near;
  // white or near-white used as a *background* stays a light surface
  if (/^background|^--(?:ds-)?(?:page|soft|surface|panel)/.test(property) && parsed.a >= 0.999 && rgbToHsl(parsed)[2] > 0.85) return text;
  return format(fallback(parsed, property));
}

// ---------------------------------------------------------------- css parsing (comments stripped; no nesting in this code base)

function stripComments(css) {
  let out = "", i = 0, quote = null;
  while (i < css.length) {
    const c = css[i];
    if (quote) { out += c; if (c === "\\") { out += css[i + 1] ?? ""; i += 2; continue; } if (c === quote) quote = null; i += 1; continue; }
    if (c === '"' || c === "'") { quote = c; out += c; i += 1; continue; }
    if (c === "/" && css[i + 1] === "*") { const end = css.indexOf("*/", i + 2); i = end === -1 ? css.length : end + 2; continue; }
    out += c; i += 1;
  }
  return out;
}

function matchingBrace(css, open) {
  let depth = 0, quote = null;
  for (let i = open; i < css.length; i += 1) {
    const c = css[i];
    if (quote) { if (c === "\\") i += 1; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === "{") depth += 1;
    if (c === "}") { depth -= 1; if (depth === 0) return i; }
  }
  return css.length - 1;
}

function splitTopLevel(text, separator) {
  const parts = []; let depth = 0, quote = null, current = "";
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quote) { current += c; if (c === "\\") { current += text[i + 1] ?? ""; i += 1; } else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; current += c; continue; }
    if (c === "(") depth += 1;
    if (c === ")") depth -= 1;
    if (c === separator && depth === 0) { parts.push(current); current = ""; continue; }
    current += c;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function parseRules(css) {
  const nodes = [];
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i += 1;
    if (i >= css.length) break;
    const open = css.indexOf("{", i), semi = css.indexOf(";", i);
    if (css[i] === "@" && semi !== -1 && (open === -1 || semi < open)) { i = semi + 1; continue; } // @import / @charset
    if (open === -1) break;
    const head = css.slice(i, open).trim();
    const close = matchingBrace(css, open);
    const body = css.slice(open + 1, close);
    if (head.startsWith("@")) {
      if (/^@(media|supports|layer|container)\b/.test(head)) nodes.push({ type: "at", head, children: parseRules(body) });
      // @font-face, @keyframes, @page: no theme twin
    } else {
      nodes.push({ type: "rule", selector: head, declarations: splitTopLevel(body, ";").map((d) => d.trim()).filter(Boolean) });
    }
    i = close + 1;
  }
  return nodes;
}

// ---------------------------------------------------------------- emitting

function scopeSelector(selector) {
  return splitTopLevel(selector, ",").map((part) => part.trim()).filter(Boolean).map((part) => {
    if (part === ":root" || part === "html") return SCOPE;
    if (part.startsWith(":root ")) return `${SCOPE} ${part.slice(6)}`;
    if (part.startsWith("html ")) return `${SCOPE} ${part.slice(5)}`;
    return `${SCOPE} ${part}`;
  }).join(",\n");
}

function convertDeclaration(declaration, preserveFilled = false) {
  const colon = declaration.indexOf(":");
  if (colon === -1) return null;
  const property = declaration.slice(0, colon).trim().toLowerCase();
  const value = declaration.slice(colon + 1).trim();
  if (property === "text-shadow" && !/^\s*none/i.test(value)) return "text-shadow: none;"; // dark-theme glows have no place on a light surface
  if (preserveFilled === "textOnly" && /^(color|-webkit-text-fill-color)$/.test(property)) return null; // white text on an accent fill stays white
  if (preserveFilled === "inline" && /^(background|background-image|background-color|color|border|border-color|-webkit-text-fill-color)$/.test(property)) {
    const inlined = inlineDarkVars(value);
    return inlined === value ? null : `${property}: ${inlined};`;
  }
  // text in a player's own color: the accent was chosen for dark backgrounds, so it is mixed towards the ink color
  if (TEXT_PROPERTY.test(property) && PLAYER_ACCENT_TEXT.test(value.replace(/\s*!important\s*$/i, ""))) {
    return `${property}: color-mix(in srgb, var(--player-accent-light, #4fa8ff) 38%, #0d1b2a)${/!important/i.test(value) ? " !important" : ""};`;
  }
  if (!COLOR.test(value)) {
    COLOR.lastIndex = 0;
    // A later rule that resets a color (background: transparent, border: 0, color: var(--x)) has to reach the light layer too,
    // otherwise the twin of an earlier, colored rule wins in the light theme and a panel shows a background the dark theme
    // never had. Values without a literal color are copied unchanged.
    return COLOR_PROPERTY.test(property) ? `${property}: ${value};` : null;
  }
  COLOR.lastIndex = 0;
  const important = /\s*!important\s*$/i.test(value);
  const bare = value.replace(/\s*!important\s*$/i, "");
  const converted = bare.replace(COLOR, (match) => mapColor(match, property));
  if (converted === bare) return null;
  return `${property}: ${converted}${important ? " !important" : ""};`;
}

// The dark theme's literal token values (base.css :root), so that a filled button can keep its dark-theme look
// even though the tokens themselves are overridden for the light theme.
function darkTokenValues() {
  const css = stripComments(fs.readFileSync(path.join(stylesDir, "base.css"), "utf8"));
  const map = new Map();
  for (const m of css.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))\s*;/g)) if (!map.has(m[1])) map.set(m[1], m[2]);
  const ui = stripComments(fs.readFileSync(path.join(stylesDir, "ui-consistency.css"), "utf8"));
  for (const m of ui.matchAll(/(--(?:ui|figma)-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))\s*;/g)) if (!map.has(m[1])) map.set(m[1], m[2]);
  return map;
}
const DARK_TOKENS = darkTokenValues();
const inlineDarkVars = (value) => value.replace(/var\((--[a-z0-9-]+)(?:\s*,[^)]*)?\)/g, (all, name) => DARK_TOKENS.get(name) ?? all);

// A "filled accent" rule (a saturated blue fill with dark text like the primary buttons, or a per-player accent fill with
// light text like the name badges) looks the same in both themes: its fill/border/text colors are kept, with token
// references replaced by their dark-theme values so the light token overrides do not change them.
function isFilledAccent(declarations) {
  let literalFill = false, varFill = false, playerFill = false, darkText = false, lightText = false, darkFill = false;
  for (const declaration of declarations) {
    const colon = declaration.indexOf(":");
    if (colon === -1) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1);
    const colors = (value.match(COLOR) ?? []).map(parseColor).filter(Boolean);
    COLOR.lastIndex = 0;
    if (/^background(-image|-color)?$/.test(property)) {
      if (/var\(--player-accent/.test(value)) playerFill = true;
      else if (/var\(--(gold|ui-blue|figma-accent)/.test(value)) { varFill = true; darkFill = fillStaysDark(value); }
      if (colors.length && colors.every((c) => c.a >= 0.9) && /gradient|#|rgb/.test(value)) {
        literalFill = colors.some((c) => { const [, s2, l2] = rgbToHsl(c); return s2 >= 0.4 && l2 >= 0.4 && l2 <= 0.97; }) && !colors.some((c) => rgbToHsl(c)[2] < 0.3);
      }
    }
    if (property === "color") {
      if (/var\(--ink-dark/.test(value) || (colors.length === 1 && rgbToHsl(colors[0])[2] < 0.2)) darkText = true;
      if (colors.length === 1 && rgbToHsl(colors[0])[2] > 0.85 && colors[0].a >= 0.9) lightText = true;
    }
  }
  if ((literalFill || varFill) && darkText) return "inline";
  if (playerFill && lightText) return "inline";
  if (varFill && lightText && darkFill) return "textOnly";
  return null;
}

// White text may stay white on a token-based accent fill only if every token in that fill is still dark in the light theme.
function fillStaysDark(value) {
  const names = [...value.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
  return names.length > 0 && names.every((name) => {
    const dark = DARK_TOKENS.get(name);
    if (!dark) return false;
    const lightValue = parseColor(mapColor(dark, name));
    return lightValue !== null && luminance(lightValue) < 0.25;
  });
}

const PLAYER_ACCENT_TEXT = /^var\(--player-accent(?:-light)?(?:\s*,[^)]*)?\)$/;

function emit(nodes, indent = "") {
  const out = [];
  for (const node of nodes) {
    if (node.type === "at") {
      const inner = emit(node.children, `${indent}  `);
      if (inner) out.push(`${indent}${node.head} {\n${inner}\n${indent}}`);
      continue;
    }
    const preserveFilled = isFilledAccent(node.declarations);
    const declarations = node.declarations.map((d) => convertDeclaration(d, preserveFilled)).filter(Boolean);
    if (declarations.length) out.push(`${indent}${scopeSelector(node.selector).replace(/\n/g, `\n${indent}`)} {\n${declarations.map((d) => `${indent}  ${d}`).join("\n")}\n${indent}}`);
  }
  return out.join("\n");
}

// The "--gold-rgb: 79, 168, 255" style tokens hold a color as a triplet: derive them from the mapped sibling color.
function tripletTokens(sources) {
  const found = new Map();
  for (const { css } of sources) {
    for (const m of css.matchAll(/(--[a-z-]+)-rgb:\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*;/g)) found.set(m[1], { r: Number(m[2]), g: Number(m[3]), b: Number(m[4]) });
  }
  const lines = [];
  for (const [name, color] of found) {
    const mapped = parseColor(mapColor(toHex(color), "--token"));
    if (mapped) lines.push(`  ${name}-rgb: ${Math.round(mapped.r)}, ${Math.round(mapped.g)}, ${Math.round(mapped.b)};`);
  }
  return lines;
}

// Twins are written in the order the browser loads the stylesheets (index.html), so that "later rule wins" means the same
// in both themes. Files index.html does not load come last, alphabetically.
function sourceFiles() {
  const present = fs.readdirSync(stylesDir).filter((f) => f.endsWith(".css") && !EXCLUDED.has(f));
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const loaded = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="styles\/([^"?]+)/g)].map((m) => m[1]).filter((f) => present.includes(f));
  return [...new Set([...loaded, ...present.slice().sort()])];
}

function computeSourceHash() {
  const hash = crypto.createHash("sha256");
  for (const file of sourceFiles()) hash.update(`${file}\n${fs.readFileSync(path.join(stylesDir, file), "utf8")}\n`);
  hash.update(fs.readFileSync(PALETTE, "utf8"));
  hash.update(fs.readFileSync(__filename, "utf8"));
  return hash.digest("hex").slice(0, 16);
}

function build() {
  const sources = sourceFiles().map((file) => ({ file, css: stripComments(fs.readFileSync(path.join(stylesDir, file), "utf8")) }));
  const blocks = [];
  for (const { file, css } of sources) {
    const body = emit(parseRules(css));
    if (body) blocks.push(`/* ${file} */\n${body}`);
  }
  const triplets = tripletTokens(sources);
  return `/* GENERATED by scripts/build-light-theme.js (source ${computeSourceHash()}). Do not edit by hand:
   change scripts/light-theme-palette.json, the generator, or add corrections to styles/theme-light-manual.css. */

${SCOPE} {
  color-scheme: light;
${triplets.join("\n")}
}

${blocks.join("\n\n")}
`;
}

function computeTvSourceHash() {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(path.join(stylesDir, TV_SOURCE), "utf8"));
  hash.update(fs.readFileSync(PALETTE, "utf8"));
  hash.update(fs.readFileSync(__filename, "utf8"));
  return hash.digest("hex").slice(0, 16);
}

function buildTv() {
  const css = stripComments(fs.readFileSync(path.join(stylesDir, TV_SOURCE), "utf8"));
  return `/* GENERATED by scripts/build-light-theme.js (source ${computeTvSourceHash()}). Do not edit by hand:
   change scripts/light-theme-palette.json, the generator, or add corrections to styles/tv-light-manual.css. */

${emit(parseRules(css))}
`;
}

module.exports = { buildTv, computeTvSourceHash, TV_OUTPUT,  build, computeSourceHash, convertDeclaration, nearestPair, mapColor, contrastRatio, ensureTextContrast, isFilledAccent, parseColor, format, fallback, sourceFiles, OUTPUT, SCOPE };

if (require.main === module) {
  const targets = [[OUTPUT, build()], [TV_OUTPUT, buildTv()]];
  if (process.argv.includes("--check")) {
    let stale = false;
    for (const [file, generated] of targets) {
      const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
      if (current !== generated) { console.error(`${path.relative(root, file)} is out of date: run  node scripts/build-light-theme.js`); stale = true; }
    }
    if (stale) process.exit(1);
    console.log("styles/theme-light.css and styles/tv-light.css are up to date");
  } else {
    for (const [file, generated] of targets) {
      fs.writeFileSync(file, generated);
      console.log(`wrote ${path.relative(root, file)} (${generated.split("\n").length} lines)`);
    }
  }
}
