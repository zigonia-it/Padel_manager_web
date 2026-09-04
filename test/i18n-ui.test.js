const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "app", "i18n-ui.js"), "utf8");
const context = { document: {}, window: {}, navigator: { language: "nb-NO", languages: ["nb-NO"] } };
vm.runInNewContext(source, context);
const ui = context.window.PadelstarI18nUi;
const languages = [{ code: "nb" }, { code: "en" }, { code: "fr" }];
const i18n = {
  normalizeLanguage(language) {
    const code = String(language).toLowerCase().split("-")[0];
    return languages.some((item) => item.code === code) ? code : "nb";
  },
  supportedLanguages() { return languages; },
};

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("device language is used when no manual preference exists", () => {
  assert.equal(ui.loadUserLanguage({ storage: storage(), storageKey: "language", i18n, navigatorRef: { language: "en-US" } }), "en");
});

test("manual language remains higher priority than device language", () => {
  assert.equal(ui.loadUserLanguage({ storage: storage({ language: "fr" }), storageKey: "language", i18n, navigatorRef: { language: "en-US" } }), "fr");
});

test("device mode and unknown device language fall back safely", () => {
  assert.equal(ui.loadUserLanguage({ storage: storage({ language: "device" }), storageKey: "language", i18n, navigatorRef: { language: "xx-NO" } }), "nb");
});
