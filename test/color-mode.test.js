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
  assert.equal(light.attrs["data-theme-mode"], "light");
  assert.equal(light.root.style.colorScheme, "light");
  assert.equal(light.meta.content, "#eef3f9");
  const none = fake({ device: null }); none.mode.bind();
  assert.equal(none.attrs["data-theme-mode"], "dark");
  assert.equal(none.meta.content, "#020b1c");
});

test("a manual choice overrides the device at once, is saved, and 'follow device' removes it", () => {
  const t = fake({ device: "dark" }); t.mode.bind();
  assert.equal(t.mode.setPreference("light"), "light");
  assert.equal(t.attrs["data-theme-mode"], "light", "applied without a reload");
  assert.equal(t.storage.data["padelstar-theme"], "light");
  assert.equal(t.mode.setPreference("dark"), "dark");
  assert.equal(t.mode.setPreference("system"), "dark", "the device (dark) decides again");
  assert.equal("padelstar-theme" in t.storage.data, false);
  const saved = fake({ stored: "light", device: "dark" }); saved.mode.bind();
  assert.equal(saved.attrs["data-theme-mode"], "light", "a saved choice wins over the device on the next visit");
});

test("the device is followed live only while no manual choice is saved", () => {
  const following = fake({ device: "dark" }); following.mode.bind();
  following.setDevice("light");
  assert.equal(following.attrs["data-theme-mode"], "light");
  const manual = fake({ stored: "dark", device: "dark" }); manual.mode.bind();
  manual.setDevice("light");
  assert.equal(manual.attrs["data-theme-mode"], "dark", "a manual choice is not overridden by the device");
});

test("the controls show the active option and stay in step", () => {
  const t = fake({ device: "dark" }); t.mode.bind();
  const state = () => Object.fromEntries(t.buttons.map((b) => [b.dataset.themeOption, b.attrs["aria-pressed"]]));
  assert.deepEqual(state(), { light: "false", dark: "false", system: "true" });
  t.mode.setPreference("light");
  assert.deepEqual(state(), { light: "true", dark: "false", system: "false" });
  t.listeners.click({ target: { closest: () => t.buttons[1] } });
  assert.equal(t.attrs["data-theme-mode"], "dark", "clicking an option applies it");
  assert.deepEqual(state(), { light: "false", dark: "true", system: "false" });
});

test("blocked storage does not break the theme", () => {
  const document = { documentElement: { style: {}, setAttribute() {} }, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
  const mode = lib.create({ document, storage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } }, matchMedia: () => ({ matches: false }) });
  assert.doesNotThrow(() => { mode.bind(); mode.setPreference("light"); });
  assert.equal(lib.readPreference({ getItem() { throw new Error("blocked"); } }), null);
});

test("every page applies the saved theme before it paints; TV Mode stays dark", () => {
  for (const page of ["index.html", "guide.html", "privacy.html", "admin.html"]) {
    const html = read(page);
    const head = html.split("</head>")[0];
    assert.match(head, /localStorage\.getItem\("padelstar-theme"\)[\s\S]*prefers-color-scheme: light[\s\S]*themeMode/, `${page} sets the mode early`);
    assert.match(html, /styles\/theme-light\.css\?v=padelstar-theme-light-\d+/, `${page} loads the light theme`);
    assert.match(html, /styles\/theme-light-manual\.css/);
  }
  assert.doesNotMatch(read("tv.html"), /theme-light/, "TV Mode is always dark");
});

test("the controls exist in the header, the phone menu and the profile page, and the new files are precached", () => {
  const html = read("index.html");
  assert.equal((html.match(/class="theme-toggle"/g) ?? []).length, 2, "header and menu drawer");
  assert.match(html, /class="theme-choice"[\s\S]*data-theme-option="system"[\s\S]*data-theme-option="light"[\s\S]*data-theme-option="dark"/);
  assert.match(html, /app\/color-mode\.js\?v=padelstar-color-mode-\d+/);
  const order = ["ui-consistency.css", "theme-toggle.css", "theme-light.css", "theme-light-manual.css"].map((f) => html.indexOf(`styles/${f}`));
  assert.ok(order.every((v, i) => v > -1 && (i === 0 || v > order[i - 1])), "the light theme loads after the classic theme so it wins");
  const worker = read("service-worker.js");
  for (const f of ["app/color-mode.js", "styles/theme-toggle.css", "styles/theme-light.css", "styles/theme-light-manual.css"]) assert.ok(worker.includes(`./${f}`), f);
  const i18n = vm.createContext({ window: {} });
  vm.runInContext(read("app", "translations.js"), i18n);
  for (const language of ["nb", "en"]) for (const key of ["label", "light", "dark", "system", "title", "hint"]) assert.ok(i18n.window.PadelstarTranslations[language][`theme.${key}`], `${language} theme.${key}`);
});
