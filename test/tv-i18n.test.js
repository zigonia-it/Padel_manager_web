// TV Mode must be usable in every production language at all times (developer requirement, 2026-09-19).
// Adding a production language without translating the TV keys, or hard-coding text in tv.html / tv-mode.js, fails here.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const tvHtml = fs.readFileSync(path.join(root, "tv.html"), "utf8");
const tvSource = fs.readFileSync(path.join(root, "app", "tv-mode.js"), "utf8");

function loadI18n() {
  const context = {};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "app", "translations.js"), "utf8"), context);
  return context;
}
const { PadelstarI18n, PadelstarTranslations } = loadI18n();
const productionLanguages = PadelstarI18n.productionLanguages().map((entry) => entry.code);

const usedKeys = () => new Set([
  ...[...tvHtml.matchAll(/data-tv-i18n="([\w.]+)"/g)].map((m) => m[1]),
  ...[...tvSource.matchAll(/\bt\("(tv\.[\w.]+)"/g)].map((m) => m[1]),
  ...[...tvSource.matchAll(/"(tv\.message\d)"/g)].map((m) => m[1]),
]);

function ownValue(language, key) {
  return Object.prototype.hasOwnProperty.call(PadelstarTranslations[language], key) ? PadelstarTranslations[language][key] : undefined;
}

test("every TV key exists in every production language (no silent fallback)", () => {
  const keys = [...usedKeys()];
  assert.ok(keys.length >= 30, `expected the TV keys to be found, got ${keys.length}`);
  for (const language of productionLanguages) {
    const missing = keys.filter((key) => !ownValue(language, key));
    assert.deepEqual(missing, [], `TV keys missing in ${language}`);
  }
});

test("the production languages are Norwegian and English, and both are complete for TV", () => {
  assert.ok(productionLanguages.includes("nb") && productionLanguages.includes("en"));
});

test("placeholders match between languages", () => {
  const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  for (const key of usedKeys()) {
    const reference = placeholders(ownValue("nb", key));
    for (const language of productionLanguages) assert.equal(placeholders(ownValue(language, key)), reference, `${key} (${language})`);
  }
});

test("English TV text is really English, not a copy of the Norwegian", () => {
  const same = [...usedKeys()].filter((key) => ownValue("nb", key) === ownValue("en", key) && !["tv.live", "tv.statusLive", "tv.statusOffline", "tv.versus", "tv.colDiff", "tv.bye"].includes(key));
  assert.deepEqual(same, []);
});

test("tv.html has no hard-coded visible text: every text element carries a translation key", () => {
  const offenders = [];
  for (const match of tvHtml.matchAll(/<(\w+)([^>]*)>([^<]*)<\/\1>/g)) {
    const [, tag, attributes, text] = match;
    if (["script", "style", "title", "time"].includes(tag)) continue;
    const words = text.replace(/&\w+;/g, "").trim();
    if (!/[A-Za-zÆØÅæøå]{3,}/.test(words)) continue;
    if (/^PADELSTAR$/.test(words)) continue; // the brand and the tournament-name placeholder
    if (!/data-tv-i18n=/.test(attributes)) offenders.push(`<${tag}> ${words}`);
  }
  assert.deepEqual(offenders, []);
});

test("tv-mode.js has no hard-coded Norwegian display text", () => {
  const withoutComments = tvSource.replace(/\/\/.*$/gm, "");
  const banned = ["RUNDE ", "STILLING", "NESTE KAMP", "FERDIG", "PÅGÅR", "TILBAKE", "Ingen ", "Venter", "Starter snart", "FINALE", "CUPMESTER", "BRONSEFINALE", "Bracket genereres", "· Kamp"];
  const found = banned.filter((word) => withoutComments.includes(word));
  assert.deepEqual(found, []);
});

test("tv.html loads the shared translations before the TV script", () => {
  assert.ok(tvHtml.indexOf("app/translations.js") > -1 && tvHtml.indexOf("app/translations.js") < tvHtml.indexOf("app/tv-mode.js"));
});

function resolver() {
  const context = { console, URLSearchParams, PadelstarI18n, PadelstarPlayerVisuals: { create: () => ({ avatarMarkup: () => "" }) }, PadelstarAccentSystem: { accentStyle: () => "" }, location: { search: "" }, localStorage: { getItem: () => null }, navigator: {}, document: { documentElement: {}, addEventListener() {} } };
  context.window = context;
  context.addEventListener = () => {};
  vm.createContext(context);
  vm.runInContext(tvSource, context);
  return context.PadelstarTvMode.resolveLanguage;
}

test("language resolution: ?lang first, then the saved choice, then the device language, then Norwegian", () => {
  const resolve = resolver();
  const storage = (value) => ({ getItem: () => value });
  assert.equal(resolve("?lang=en", storage("nb"), { language: "nb-NO" }), "en");
  assert.equal(resolve("?lang=fr", storage("en"), { language: "nb-NO" }), "en", "an unsupported ?lang is ignored");
  assert.equal(resolve("", storage("en"), { language: "nb-NO" }), "en");
  assert.equal(resolve("", storage("device"), { languages: ["en-GB", "nb"], language: "en-GB" }), "en");
  assert.equal(resolve("", storage(null), { languages: ["nb-NO"], language: "nb-NO" }), "nb");
  assert.equal(resolve("", storage(null), { languages: ["nn-NO"], language: "nn-NO" }), "nb", "Nynorsk devices get Bokmål");
  assert.equal(resolve("", storage(null), { languages: ["fr-FR"], language: "fr-FR" }), "nb", "unsupported device languages fall back");
  assert.equal(resolve("", { getItem() { throw new Error("blocked"); } }, { language: "en-US" }), "en", "blocked storage is tolerated");
});

test("TV Mode uses the app's gem avatars, not a third-party image service", () => {
  assert.ok(!/dicebear/i.test(tvSource) && !/dicebear/i.test(tvHtml), "no Dicebear");
  assert.match(tvSource, /avatarMarkup\(player, "tv-avatar"/);
  const order = ["app/accent-system.js", "app/player-visuals.js", "app/tv-mode.js"].map((file) => tvHtml.indexOf(file));
  assert.ok(order.every((position) => position > -1) && order[0] < order[1] && order[1] < order[2]);
});
