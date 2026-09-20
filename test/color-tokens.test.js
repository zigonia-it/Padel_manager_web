// The colour system (2026-09-20): one token set (styles/tokens.css), two themes, no colour literals in components.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const tokens = read("styles", "tokens.css");

function block(selector) {
  const start = tokens.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} block exists`);
  const body = tokens.slice(start, tokens.indexOf("\n}", start));
  return Object.fromEntries([...body.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]));
}
const dark = block(":root");
const light = block('[data-theme="light"]');

const DARK = {
  "--surface-page": "#1b2438", "--surface-card": "#233049", "--surface-raised": "#212d45", "--surface-sunken": "#19283c",
  "--border-subtle": "rgba(159, 207, 255, .108)", "--border-default": "rgba(159, 207, 255, .18)", "--border-strong": "rgba(159, 207, 255, .324)",
  "--ink-heading": "#d5e2f0", "--ink-body": "#c2d4e5", "--ink-muted": "#9cb0c4", "--ink-faint": "#8a9db1",
  "--accent-blue": "#3d97f0", "--accent-blue-bright": "#62b6ff", "--accent-cyan": "#17abe4", "--positive": "#7ed49e", "--negative": "#f2909f", "--warning": "#e6c05a",
  "--btn-primary-from": "#a1d6ff", "--btn-primary-to": "#008df9", "--btn-primary-ink": "#04121f",
  "--btn-secondary-bg": "linear-gradient(180deg, #5badff0d, #5badff30)", "--btn-secondary-border": "rgba(91, 173, 255, .42)", "--btn-secondary-ink": "#8ecbff",
};
const LIGHT = {
  "--surface-page": "#eef3fa", "--surface-card": "#ffffff", "--surface-raised": "#fafcfe", "--surface-sunken": "#f2f6fb",
  "--border-subtle": "rgba(20, 60, 105, .1)", "--border-default": "rgba(20, 60, 105, .154)", "--border-strong": "rgba(20, 60, 105, .277)",
  "--ink-heading": "#14243a", "--ink-body": "#3c5570", "--ink-muted": "#415870", "--ink-faint": "#415870",
  "--accent-blue": "#17559f", "--accent-blue-bright": "#2f7fd4", "--accent-cyan": "#0a7aa8", "--positive": "#17603c", "--negative": "#ad3550", "--warning": "#8a6a10",
  "--btn-primary-from": "#2f7fd4", "--btn-primary-to": "#17559f", "--btn-primary-ink": "#ffffff",
  "--btn-secondary-bg": "linear-gradient(180deg, #5badff0d, #5badff30)", "--btn-secondary-border": "rgba(91, 173, 255, .42)", "--btn-secondary-ink": "#17559f",
};

test("tokens.css holds exactly the specified values for the dark theme (:root) and the light theme ([data-theme=light])", () => {
  for (const [name, value] of Object.entries(DARK)) assert.equal(dark[name], value, `dark ${name}`);
  for (const [name, value] of Object.entries(LIGHT)) assert.equal(light[name], value, `light ${name}`);
  assert.equal(dark["color-scheme"] ?? tokens.match(/:root \{\s*color-scheme:\s*(\w+)/)?.[1], "dark");
  assert.match(tokens, /\[data-theme="light"\] \{\s*color-scheme: light;/);
});

test("the two themes are tuned separately: light is not an inversion, and cards stay white", () => {
  assert.equal(LIGHT["--surface-card"], "#ffffff");
  assert.notEqual(LIGHT["--surface-page"], "#ffffff", "the page does the darkening, not the cards");
  assert.equal(LIGHT["--accent-blue"], "#17559f");
  assert.notEqual(DARK["--accent-blue"], LIGHT["--accent-blue"], "same role, different value");
  assert.notEqual(LIGHT["--btn-primary-from"], DARK["--btn-primary-from"], "the light primary is a deep-blue gradient, not the pale dark one");
  const l = (hex) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  assert.ok(l(LIGHT["--btn-primary-from"]) < l(LIGHT["--surface-page"]), "on a light page the primary action must be darker than the surface");
  assert.ok(l(DARK["--surface-card"]) > l(DARK["--surface-page"]), "on dark, cards are lighter than the page");
});

function contrast(a, b) {
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test("contrast floor: text tokens 4.5:1 on every surface, headline-scale accents 3:1, in both themes", () => {
  for (const [theme, set] of [["dark", DARK], ["light", LIGHT]]) {
    const surfaces = ["--surface-page", "--surface-card", "--surface-raised", "--surface-sunken"];
    const accentText = theme === "dark" ? "--accent-blue-bright" : "--accent-blue"; // --accent-text is defined as exactly this
    for (const surface of surfaces) {
      for (const ink of ["--ink-heading", "--ink-body", "--ink-muted", "--ink-faint", "--positive", "--negative", "--warning", accentText]) {
        assert.ok(contrast(set[ink], set[surface]) >= 4.5, `${theme}: ${ink} on ${surface} = ${contrast(set[ink], set[surface]).toFixed(2)}`);
      }
      for (const accent of ["--accent-blue", "--accent-blue-bright", "--accent-cyan"]) {
        assert.ok(contrast(set[accent], set[surface]) >= 3, `${theme}: ${accent} (headline scale) on ${surface}`);
      }
    }
  }
  assert.match(tokens, /:root \{[^}]*--accent-text:\s*var\(--accent-blue-bright\)/);
  assert.match(tokens, /\[data-theme="light"\] \{[^}]*--accent-text:\s*var\(--accent-blue\)/);
});

test("the primary button: ink 4.5:1 on both ends of the dark gradient, and 4:1 or better on the light one (bold text)", () => {
  assert.ok(contrast(DARK["--btn-primary-ink"], DARK["--btn-primary-from"]) >= 4.5);
  assert.ok(contrast(DARK["--btn-primary-ink"], DARK["--btn-primary-to"]) >= 4.5);
  // white on #2f7fd4 is 4.11:1 (the lighter end of the specified light gradient), on #17559f 7.4:1
  assert.ok(contrast(LIGHT["--btn-primary-ink"], LIGHT["--btn-primary-from"]) >= 4);
  assert.ok(contrast(LIGHT["--btn-primary-ink"], LIGHT["--btn-primary-to"]) >= 4.5);
});

test("components use tokens: no colour literal outside styles/tokens.css (scripts/color-audit.js)", () => {
  const { audit } = require("../scripts/color-audit.js");
  const found = audit();
  assert.deepEqual(found.map((f) => `${f.file}:${f.line} ${f.hits.join(" ")}`), []);
});

test("every stylesheet page loads tokens.css first, and the generated light layer is gone", () => {
  const styles = fs.readdirSync(path.join(root, "styles"));
  for (const gone of ["theme-light.css", "theme-light-manual.css", "tv-light.css", "tv-light-manual.css"]) assert.ok(!styles.includes(gone), `${gone} was removed`);
  assert.ok(!fs.existsSync(path.join(root, "scripts", "build-light-theme.js")));
  assert.match(read("app", "color-mode.js"), /setAttribute\?\.\("data-theme", mode\)/);
  assert.doesNotMatch(read("app", "color-mode.js"), /data-theme-mode/);
});

test("legacy variables are aliases of the tokens, so old rules follow the theme", () => {
  const base = read("styles", "base.css");
  for (const [legacy, token] of [["--ds-page", "--surface-page"], ["--ds-text", "--ink-heading"], ["--ds-border", "--border-default"], ["--gold", "--accent-blue"], ["--danger", "--negative"], ["--finished", "--positive"]]) {
    assert.match(base, new RegExp(`${legacy}:\\s*var\\(${token}\\)`), `${legacy} -> ${token}`);
  }
  assert.doesNotMatch(base, /--warning:\s*var\(--warning\)/, "no self-reference");
});

const accents = (() => { const ctx = {}; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read("app", "accent-system.js"), ctx); return ctx.PadelstarAccentSystem; })();

test("the roster gem palette matches the design and comes from one helper: gemFill, gemInk, gemTint", () => {
  const expected = ["#1a59f2", "#e67a0a", "#148f42", "#d12e52", "#7030d1", "#0a8080", "#c70a33", "#b88c00", "#8a6a10", "#616b7a", "#9e560f", "#052e9e", "#0a7538", "#991020", "#8524b8", "#1f2126"];
  assert.deepEqual(JSON.parse(JSON.stringify(accents.accents.map((key) => accents.palette[key]))), expected);
  const hex = /^#[0-9a-f]{6}$/;
  for (const key of accents.accents) {
    const g = accents.gem(key);
    assert.equal(accents.gemFill(key), accents.palette[key], "the fill is the base hex in both themes");
    assert.equal(g.gemFill, accents.palette[key]);
    assert.match(g.gemInk.dark, hex); assert.match(g.gemInk.light, hex);
    assert.equal(accents.gemInk(key, "dark"), g.gemInk.dark);
    assert.equal(accents.gemInk(key, "light"), g.gemInk.light);
    const [r, gr, b] = [1, 3, 5].map((i) => parseInt(accents.palette[key].slice(i, i + 2), 16));
    assert.equal(accents.gemTint(key), `rgba(${r}, ${gr}, ${b}, 0.09)`);
  }
});

test("gem initials: lightened 45 % on dark, darkened 30 % on light; readable on the card of each theme", () => {
  let darkest = 99, lightest = 99;
  for (const key of accents.accents) {
    const base = accents.palette[key];
    const mixed = (target, amount) => `#${[1, 3, 5].map((i) => Math.round(parseInt(base.slice(i, i + 2), 16) + (target - parseInt(base.slice(i, i + 2), 16)) * amount).toString(16).padStart(2, "0")).join("")}`;
    assert.equal(accents.gemInk(key, "dark"), mixed(255, 0.45), `${key} dark ink`);
    assert.equal(accents.gemInk(key, "light"), mixed(0, 0.3), `${key} light ink`);
    darkest = Math.min(darkest, contrast(accents.gemInk(key, "dark"), DARK["--surface-card"]));
    lightest = Math.min(lightest, contrast(accents.gemInk(key, "light"), LIGHT["--surface-card"]));
  }
  assert.ok(lightest >= 4.5, `light initials on white: worst ${lightest.toFixed(2)}`);
  assert.ok(darkest >= 3.5, `dark initials on the dark card: worst ${darkest.toFixed(2)} (the specified formula; the darkest hues are the limit)`);
});

test("accentStyle emits the gem variables and the ink switches with the theme (light-dark)", () => {
  const style = accents.accentStyle("blue");
  assert.match(style, /--gem-fill: #1a59f2;/);
  assert.match(style, /--gem-ink: light-dark\(#123ea9, #81a4f8\);/);
  assert.match(style, /--gem-tint: rgba\(26, 89, 242, 0\.09\);/);
  assert.match(style, /--player-accent: #1a59f2;/, "the existing variables are unchanged");
  const css = read("styles", "components-v2.css");
  assert.match(css, /\.ds-avatar-gem-inner \{[^}]*color: var\(--gem-ink/);
});

test("the header switch writes data-theme on <html> and the choice is remembered", () => {
  const html = read("index.html");
  assert.match(html, /class="theme-toggle"[\s\S]*data-theme-option="light"[\s\S]*data-theme-option="dark"/);
  const lib = (() => { const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read("app", "color-mode.js"), ctx); return ctx.PadelstarColorMode; })();
  const attrs = {}; const data = {};
  const document = { documentElement: { style: {}, setAttribute: (k, v) => { attrs[k] = v; } }, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
  const mode = lib.create({ document, storage: { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } }, matchMedia: () => ({ matches: false }) });
  mode.bind();
  assert.equal(attrs["data-theme"], "dark");
  mode.setPreference("light");
  assert.equal(attrs["data-theme"], "light");
  assert.equal(data["padelstar-theme"], "light");
});
