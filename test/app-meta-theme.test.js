const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..", "app");

function loadModules() {
  const registrations = [];
  const listeners = [];
  const copyrightYearRange = { textContent: "" };
  const themeColor = { setAttribute: (name, value) => { themeColor[name] = value; } };
  const document = {
    body: { dataset: {} },
    querySelector: (selector) => selector === 'meta[name="theme-color"]' ? themeColor : null,
  };
  const navigator = {
    serviceWorker: { register: (pathName) => { registrations.push(pathName); return Promise.resolve(); } },
  };
  const window = {
    addEventListener: (eventName, callback) => { listeners.push({ eventName, callback }); },
  };
  const context = vm.createContext({ document, navigator, window, console });
  for (const relativePath of ["bootstrap/app-meta.js", "ui/theme.js"]) {
    const filename = path.join(root, relativePath);
    vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  }
  return { document, navigator, window, copyrightYearRange, registrations, listeners };
}

test("app metadata owns service-worker registration and copyright output", async () => {
  const fixture = loadModules();
  const meta = fixture.window.PadelstarAppMeta.create({
    navigator: fixture.navigator,
    window: fixture.window,
    elements: { copyrightYearRange: fixture.copyrightYearRange },
    startYear: new Date().getFullYear(),
  });

  meta.syncCopyrightYear();
  meta.registerServiceWorker();
  assert.equal(fixture.copyrightYearRange.textContent, String(new Date().getFullYear()));
  assert.deepEqual(fixture.listeners.map(({ eventName }) => eventName), ["load"]);
  fixture.listeners[0].callback();
  await Promise.resolve();
  assert.deepEqual(fixture.registrations, ["./service-worker.js"]);
});

test("theme module applies the single classic theme and browser color", () => {
  const fixture = loadModules();
  fixture.window.PadelstarTheme.create({ document: fixture.document }).applyTheme();
  assert.equal(fixture.document.body.dataset.theme, "classic");
  assert.equal(fixture.document.querySelector('meta[name="theme-color"]')['content'], "#07101d");
});
