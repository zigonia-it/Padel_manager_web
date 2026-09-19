const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { console };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "page-language.js"), "utf8"), context);
const resolve = (stored, languages = []) => context.PadelstarPageLanguage.resolve({ storage: { getItem: () => stored }, navigatorRef: { languages, language: languages[0] } });

test("an explicit choice wins over the device language", () => {
  assert.equal(resolve("nb", ["en-GB"]), "nb");
  assert.equal(resolve("en", ["nb-NO"]), "en");
});

test("'device' (and nothing stored) follows the device language", () => {
  assert.equal(resolve("device", ["en-US", "nb"]), "en");
  assert.equal(resolve(null, ["nb-NO"]), "nb");
  assert.equal(resolve("device", ["no"]), "nb", "Norwegian 'no' and Nynorsk map to Bokmål");
  assert.equal(resolve("device", ["nn-NO"]), "nb");
  assert.equal(resolve("device", ["sv-SE", "en-GB"]), "en", "the first supported device language is used");
});

test("an unsupported device language falls back to Norwegian; unreadable storage does not break", () => {
  assert.equal(resolve("device", ["ja-JP"]), "nb");
  assert.equal(resolve("fr", ["ja"]), "nb", "a saved but unsupported language is ignored");
  const broken = context.PadelstarPageLanguage.resolve({ storage: { getItem() { throw new Error("blocked"); } }, navigatorRef: { languages: ["en"] } });
  assert.equal(broken, "en");
});

test("the guide and privacy pages use it", () => {
  const root = path.join(__dirname, "..");
  for (const [page, script] of [["guide.html", "guide-i18n.js"], ["privacy.html", "privacy-i18n.js"]]) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.ok(html.indexOf("app/page-language.js") > -1 && html.indexOf("app/page-language.js") < html.indexOf(`app/${script}`), `${page} loads the resolver first`);
    assert.match(fs.readFileSync(path.join(root, "app", script), "utf8"), /PadelstarPageLanguage\.resolve/);
  }
  assert.match(fs.readFileSync(path.join(root, "service-worker.js"), "utf8"), /app\/page-language\.js/);
});
