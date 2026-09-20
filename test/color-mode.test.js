const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const context = { console };
context.window = context;
vm.createContext(context);
vm.runInContext(read("app", "color-mode.js"), context);
const lib = context.PadelstarColorMode;

test("the theme priority: a manual choice, then the device, then dark", () => {
  const cases = [
    [{ preference: "light", systemScheme: "dark" }, "light"],
    [{ preference: "dark", systemScheme: "light" }, "dark"],
    [{ preference: null, systemScheme: "light" }, "light"],
    [{ preference: null, systemScheme: "dark" }, "dark"],
    [{ preference: null, systemScheme: null }, "dark"],
    [{}, "dark"],
    [{ preference: "sepia", systemScheme: "light" }, "light"], // an unknown saved value is ignored, the device decides
  ];
  for (const [input, expected] of cases) assert.equal(lib.resolveMode(input), expected, JSON.stringify(input));
});

function fake({ stored = null, device = null } = {}) {
  const data = stored ? { "padelstar-theme": stored } : {};
  const storage = { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; }, data };
  const attrs = {};
  const root = { style: {}, setAttribute: (k, v) => { attrs[k] = v; } };
  const meta = { content: "", setAttribute(k, v) { this[k] = v; } };
  const buttons = ["light", "dark", "system"].map((option) => ({ dataset: { themeOption: option }, attrs: {}, classes: new Set(), setAttribute(k, v) { this.attrs[k] = v; }, classList: { toggle(c, on) { on ? this.owner.classes.add(c) : this.owner.classes.delete(c); } } }));
  buttons.forEach((b) => { b.classList.owner = b; });
  const listeners = {};
  const document = { documentElement: root, querySelector: (s) => (s.includes("theme-color") ? meta : null), querySelectorAll: () => buttons, addEventListener: (n, fn) => { listeners[n] = fn; } };
  let changeHandler = null;
  let current = device;
  const matchMedia = (query) => ({ matches: current === "light" && query.includes("light") || current === "dark" && query.includes("dark"), addEventListener: (n, fn) => { changeHandler = fn; } });
  const mode = lib.create({ document, storage, matchMedia });
  return { mode, storage, attrs, root, meta, buttons, listeners, setDevice: (scheme) => { current = scheme; changeHandler?.(); } };
}

test("first use follows the device; without a device preference it is dark", () => {
  const light = fake({ device: "light" }); light.mode.bind();
  assert.equal(light.attrs["data-theme"], "light");
  assert.equal(light.root.style.colorScheme, "light");
  assert.equal(light.meta.content, "#eef3fa");
  const none = fake({ device: null }); none.mode.bind();
  assert.equal(none.attrs["data-theme"], "dark");
  assert.equal(none.meta.content, "#1b2438");
});

test("a manual choice overrides the device at once, is saved, and 'follow device' removes it", () => {
  const t = fake({ device: "dark" }); t.mode.bind();
  assert.equal(t.mode.setPreference("light"), "light");
  assert.equal(t.attrs["data-theme"], "light", "applied without a reload");
  assert.equal(t.storage.data["padelstar-theme"], "light");
  assert.equal(t.mode.setPreference("dark"), "dark");
  assert.equal(t.mode.setPreference("system"), "dark", "the device (dark) decides again");
  assert.equal("padelstar-theme" in t.storage.data, false);
  const saved = fake({ stored: "light", device: "dark" }); saved.mode.bind();
  assert.equal(saved.attrs["data-theme"], "light", "a saved choice wins over the device on the next visit");
});

test("the device decides only on the first visit: a change while the page is open does not switch the theme", () => {
  const following = fake({ device: "dark" }); following.mode.bind();
  following.setDevice("light");
  assert.equal(following.attrs["data-theme"], "dark", "no live following (the choice is read once when the page loads)");
  const manual = fake({ stored: "dark", device: "dark" }); manual.mode.bind();
  manual.setDevice("light");
  assert.equal(manual.attrs["data-theme"], "dark", "a manual choice is not overridden by the device");
});

test("the controls show the active option and stay in step", () => {
  const t = fake({ device: "dark" }); t.mode.bind();
  const state = () => Object.fromEntries(t.buttons.map((b) => [b.dataset.themeOption, b.attrs["aria-pressed"]]));
  assert.deepEqual(state(), { light: "false", dark: "false", system: "true" });
  t.mode.setPreference("light");
  assert.deepEqual(state(), { light: "true", dark: "false", system: "false" });
  t.listeners.click({ target: { closest: () => t.buttons[1] } });
  assert.equal(t.attrs["data-theme"], "dark", "clicking an option applies it");
  assert.deepEqual(state(), { light: "false", dark: "true", system: "false" });
});

test("blocked storage does not break the theme", () => {
  const document = { documentElement: { style: {}, setAttribute() {} }, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
  const mode = lib.create({ document, storage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } }, matchMedia: () => ({ matches: false }) });
  assert.doesNotThrow(() => { mode.bind(); mode.setPreference("light"); });
  assert.equal(lib.readPreference({ getItem() { throw new Error("blocked"); } }), null);
});

test("every page applies the saved theme before it paints and loads the one token file first", () => {
  for (const page of ["index.html", "guide.html", "privacy.html", "admin.html", "tv.html"]) {
    const html = read(page);
    const head = html.split("</head>")[0];
    assert.match(head, /localStorage\.getItem\("padelstar-theme"\)[\s\S]*prefers-color-scheme: light[\s\S]*dataset\.theme=/, `${page} sets data-theme early`);
    assert.match(html, /styles\/tokens\.css\?v=padelstar-tokens-\d+/, `${page} loads the tokens`);
    assert.ok(html.indexOf("styles/tokens.css") < html.search(/styles\/(base|tv)\.css/), `${page}: tokens before every other stylesheet`);
    assert.doesNotMatch(html, /theme-light|tv-light|data-theme-mode/, `${page}: the generated light layer is gone`);
  }
});

test("the controls exist in the header, the phone menu and the profile page, and the new files are precached", () => {
  const html = read("index.html");
  assert.equal((html.match(/class="theme-toggle"/g) ?? []).length, 2, "header and menu drawer");
  assert.match(html, /class="theme-choice"[\s\S]*data-theme-option="system"[\s\S]*data-theme-option="light"[\s\S]*data-theme-option="dark"/);
  assert.match(html, /app\/color-mode\.js\?v=padelstar-color-mode-\d+/);
  const worker = read("service-worker.js");
  for (const f of ["app/color-mode.js", "styles/theme-toggle.css", "styles/tokens.css"]) assert.ok(worker.includes(`./${f}`), f);
  assert.doesNotMatch(worker, /theme-light|tv-light/);
  const i18n = vm.createContext({ window: {} });
  vm.runInContext(read("app", "translations.js"), i18n);
  for (const language of ["nb", "en"]) for (const key of ["label", "light", "dark", "system", "title", "hint"]) assert.ok(i18n.window.PadelstarTranslations[language][`theme.${key}`], `${language} theme.${key}`);
});
