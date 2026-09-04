const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const filename = path.join(__dirname, "..", "app", "core", "language-controller.js");

function makeController(overrides = {}) {
  const state = { settings: { language: "nb", languageMode: "device" } };
  const select = { value: "device" };
  const calls = [];
  const storage = { values: new Map(), getItem(key) { return this.values.get(key) ?? null; }, setItem(key, value) { this.values.set(key, value); calls.push(["setItem", key, value]); } };
  const i18n = {
    normalizeLanguage: (value) => value === "en-US" ? "en" : value,
    translate: (language, key) => `${language}:${key}`,
  };
  const i18nUi = {
    loadUserLanguage: (options) => { options.onMode("device"); calls.push(["load", options.fallbackLanguage]); return "en"; },
    applyLanguage: (options) => { calls.push(["apply", options.state, options.elements, options.translate("common.ok")]); options.applyTheme(); },
    syncLanguageOptions: (options) => calls.push(["sync", options.currentLanguage, options.languageMode]),
  };
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  const instance = context.window.PadelstarLanguageController.create({
    getState: () => state,
    getElements: () => ({ languageSelect: select }),
    storage,
    storageKey: "language",
    navigatorRef: { language: "en-US" },
    i18n,
    i18nUi,
    localizeGeneratedCourtNames: () => calls.push(["localize"]),
    applyTheme: () => calls.push(["theme"]),
    getProfile: () => ({ id: "profile-1" }),
    syncProfile: (...args) => calls.push(["profile", ...args]),
    syncJoinPreview: () => calls.push(["preview"]),
    render: () => calls.push(["render"]),
    ...overrides,
  });
  return { instance, state, select, storage, calls };
}

test("language controller delegates loading and keeps mode in local state", () => {
  const { instance, state, calls } = makeController();
  assert.equal(instance.loadUserLanguage("nn"), "en");
  assert.equal(state.settings.languageMode, "device");
  assert.deepEqual(calls[0], ["load", "nn"]);
});

test("language controller applies localization in the existing UI order", () => {
  const { instance, calls } = makeController();
  instance.applyLanguage();
  assert.deepEqual(calls.map(([name]) => name), ["localize", "apply", "theme"]);
});

test("language controller handles manual selection and completes the UI refresh flow", () => {
  const { instance, state, select, storage, calls } = makeController();
  select.value = "en-US";
  instance.handleChange();
  assert.equal(state.settings.languageMode, "manual");
  assert.equal(state.settings.language, "en");
  assert.equal(storage.getItem("language"), "en");
  assert.deepEqual(calls.map(([name]) => name), ["setItem", "profile", "localize", "apply", "theme", "preview", "render", "sync"]);
});
