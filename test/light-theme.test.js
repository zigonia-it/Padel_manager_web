const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const gen = require("../scripts/build-light-theme.js");
const generated = fs.readFileSync(gen.OUTPUT, "utf8");

test("styles/theme-light.css is up to date with the stylesheets it is generated from", () => {
  assert.equal(gen.build(), generated, "run: node scripts/build-light-theme.js");
  assert.ok(generated.includes(`source ${gen.computeSourceHash()}`));
});

test("the light theme only changes colors, and only when the light mode is on", () => {
  const body = generated.replace(/\/\*[\s\S]*?\*\//g, "");
  // every rule (also inside @media) starts with the scoped selector: nothing changes in dark mode
  const selectors = [...body.matchAll(/(?:^|[}\n])\s*([^{}@\n][^{}]*)\{/g)].map((m) => m[1].trim()).filter(Boolean);
  assert.ok((generated.match(/html\[data-theme-mode="light"\]/g) ?? []).length > 300, "a full theme was generated");
  for (const selector of selectors) for (const part of selector.split(",")) assert.match(part.trim(), /^html\[data-theme-mode="light"\]/, part.trim().slice(0, 60));
  const layoutProperty = /^\s+(?:display|position|width|height|margin|padding|grid[a-z-]*|flex[a-z-]*|font[a-z-]*|gap|top|left|right|bottom|z-index|min-[a-z-]+|max-[a-z-]+|transform|transition|animation)\s*:/m;
  assert.doesNotMatch(body, layoutProperty, "only color-related properties are emitted (layout comes from the dark theme's rules)");
});

test("key text and surface tokens meet WCAG contrast in the light theme", () => {
  const block = generated.split("/* base.css */")[1].split("/* ")[0];
  const token = (name) => {
    const m = block.match(new RegExp(`\\s${name}:\\s*([^;]+);`));
    assert.ok(m, `${name} is defined for the light theme`);
    return gen.parseColor(m[1]);
  };
  const page = token("--ds-page"), soft = token("--soft");
  const over = (c, bg) => ({ r: c.r * c.a + bg.r * (1 - c.a), g: c.g * c.a + bg.g * (1 - c.a), b: c.b * c.a + bg.b * (1 - c.a) });
  const check = (name, min) => assert.ok(gen.contrastRatio(over(token(name), soft), soft) >= min, `${name} on the page: ${gen.contrastRatio(over(token(name), soft), soft).toFixed(2)} < ${min}`);
  check("--ink", 12);
  check("--ds-text", 12);
  check("--muted", 5);
  check("--ds-text-muted", 5);
  check("--gold", 4.5);
  check("--finished", 4.5);
  assert.ok(gen.contrastRatio(over(token("--ds-text"), page), page) >= 12);
});

test("colors are converted with the design's pairs first, then by rule", () => {
  assert.equal(gen.mapColor("#eef7ff", "color"), "#0d1b2a", "the ink color of the mockup");
  assert.equal(gen.mapColor("#0e1a2c", "background"), "#ffffff", "a dark surface becomes white");
  assert.equal(gen.mapColor("#04121f", "color"), "#04121f", "colors the mockups keep are kept");
  const line = gen.parseColor(gen.mapColor("rgba(159, 207, 255, 0.1)", "border-color"));
  assert.deepEqual([line.r, line.g, line.b, line.a], [20, 60, 105, 0.1], "a light border tint becomes an ink tint");
  const shadow = gen.parseColor(gen.mapColor("rgba(0, 0, 0, 0.5)", "box-shadow"));
  assert.ok(shadow.a < 0.3 && shadow.r < 40, "a black shadow stays a soft shadow, it does not become a white glow");
});

test("text colors are darkened until they are readable; primary buttons keep their look", () => {
  for (const color of ["#8ecbff", "#62b6ff", "#93a8bd", "#4fa8ff", "#8ee0ad"]) {
    const mapped = gen.mapColor(color, "color");
    assert.ok(gen.contrastRatio(gen.parseColor(mapped), { r: 205, g: 215, b: 228 }) >= 5.2, `${color} -> ${mapped}`);
  }
  assert.equal(gen.isFilledAccent(["background: linear-gradient(135deg, #e6f6ff, #62b6ff)", "color: #07111f"]), "inline", "light-blue fill with dark text");
  assert.equal(gen.isFilledAccent(["background: var(--player-accent)", "color: #fff"]), "inline", "a player's color fill with white text");
  assert.equal(gen.isFilledAccent(["background: var(--ds-surface-1)", "color: #fff"]), null, "a surface with light text is converted");
  assert.match(generated, /body\[data-theme="classic"\] \.landing-cta:not\(\.landing-cta-secondary\) \{\s*box-shadow/, "the primary CTA twin only softens its shadow");
  assert.doesNotMatch(generated, /text-shadow:\s*0/, "dark-theme text glows are removed");
});

test("a later rule that resets a color reaches the light layer (no panel gets a background the dark theme does not have)", () => {
  assert.equal(gen.convertDeclaration("background: transparent"), "background: transparent;");
  assert.equal(gen.convertDeclaration("border: 0"), "border: 0;");
  assert.equal(gen.convertDeclaration("box-shadow: none"), "box-shadow: none;");
  assert.equal(gen.convertDeclaration("color: var(--ink)"), "color: var(--ink);");
  assert.equal(gen.convertDeclaration("display: flex"), null, "layout properties are still not copied");
  assert.equal(gen.convertDeclaration("border-radius: 12px"), null);
});

test("the light layer keeps the stylesheets in the order the browser loads them", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const loaded = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="styles\/([^"?]+)/g)].map((m) => m[1]).filter((file) => gen.sourceFiles().includes(file));
  const order = gen.sourceFiles();
  assert.deepEqual(order.slice(0, loaded.length), loaded);
  const marks = [...generated.matchAll(/^\/\* ([a-z0-9-]+\.css) \*\/$/gm)].map((m) => m[1]);
  assert.deepEqual(marks, order.filter((file) => marks.includes(file)), "the generated blocks follow that order");
  assert.ok(order.indexOf("components-v2.css") < order.indexOf("workspace-nav.css"));
});

test("the same color written as rgba() finds the design's pair", () => {
  assert.equal(gen.mapColor("rgba(91, 173, 255, 0.32)", "background"), "#5badff26");
  assert.equal(gen.nearestPair(gen.parseColor("rgba(91,173,255,1)")), null, "opaque colors keep the exact-match rules");
});

test("the hand-made corrections cover the design's buttons and the scrims that turn gray on a light page", () => {
  const manual = fs.readFileSync(path.join(root, "styles", "theme-light-manual.css"), "utf8");
  assert.match(manual, /linear-gradient\(180deg, #a1d6ff, #008df9\)/, "primary buttons use the design gradient");
  assert.match(manual, /\.intro::before[\s\S]*?background: none/, "no dark vignette on the light hero");
  assert.match(manual, /input::placeholder/);
});

test("styles/tv-light.css (TV Mode's light theme) is up to date and only changes colors", () => {
  const tv = fs.readFileSync(gen.TV_OUTPUT, "utf8");
  assert.equal(gen.buildTv(), tv, "run: node scripts/build-light-theme.js");
  assert.ok(tv.includes(`source ${gen.computeTvSourceHash()}`));
  const body = tv.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [...body.matchAll(/(?:^|[}\n])\s*([^{}@\n][^{}]*)\{/g)].map((m) => m[1].trim()).filter(Boolean);
  for (const selector of selectors) for (const part of selector.split(",")) assert.match(part.trim(), /^html\[data-theme-mode="light"\]/, part.trim().slice(0, 60));
  assert.match(tv, /--ink: #0d1b2a/, "dark text on the light page");
});
