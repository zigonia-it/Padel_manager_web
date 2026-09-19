const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
function load(file) {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  return context;
}
const feedback = load("app/feedback.js").PadelstarFeedback;

const fields = (extra = {}) => ({ category: "bug", message: "The score buttons are hard to hit", email: "", website: "", ...extra });
const response = (status) => ({ ok: status >= 200 && status < 300, status });

test("validation: type, message length and an optional, well-formed email", () => {
  assert.equal(feedback.validate(fields()), null);
  assert.equal(feedback.validate(fields({ category: "spam" })), "category");
  assert.equal(feedback.validate(fields({ message: "hi" })), "messageTooShort");
  assert.equal(feedback.validate(fields({ message: "   hi   " })), "messageTooShort", "whitespace does not count");
  assert.equal(feedback.validate(fields({ message: "x".repeat(2001) })), "messageTooLong");
  assert.equal(feedback.validate(fields({ email: "nope" })), "emailInvalid");
  assert.equal(feedback.validate(fields({ email: "a@b.com\nBcc: x@y.com" })), "emailInvalid");
  assert.equal(feedback.validate(fields({ email: "player@example.com" })), null);
});

test("the payload carries the message and technical context, nothing else", () => {
  const payload = feedback.buildPayload(fields({ message: "  hello there  ", email: " a@b.com " }), { version: "0.7.0", language: "en", view: "workspace", role: "player", screen: "390x844", userAgent: "UA", secret: "x" });
  assert.equal(payload.message, "hello there");
  assert.equal(payload.email, "a@b.com");
  assert.deepEqual(Object.keys(payload.context).sort(), ["language", "role", "screen", "userAgent", "version", "view"]);
  assert.equal(payload.website, "", "the honeypot is passed on so the server can drop bots");
});

test("send: success and the different failure reasons", async () => {
  const payload = feedback.buildPayload(fields(), {});
  const sendWith = (status) => feedback.send(payload, { fetchImpl: async () => response(status), online: true });
  assert.deepEqual({ ...(await sendWith(200)) }, { ok: true });
  assert.equal((await sendWith(503)).reason, "notConfigured");
  assert.equal((await sendWith(404)).reason, "notConfigured", "no /api on a local preview");
  assert.equal((await sendWith(429)).reason, "rateLimited");
  assert.equal((await sendWith(400)).reason, "invalid");
  assert.equal((await sendWith(500)).reason, "failed");
  assert.equal((await feedback.send(payload, { fetchImpl: async () => { throw new Error("down"); }, online: true })).reason, "failed");
  assert.equal((await feedback.send(payload, { fetchImpl: async () => response(200), online: false })).reason, "offline");
});

test("send posts JSON to the same-origin endpoint", async () => {
  let seen = null;
  await feedback.send(feedback.buildPayload(fields(), { version: "0.7.0" }), { fetchImpl: async (url, options) => { seen = { url, options }; return response(200); }, online: true });
  assert.equal(seen.url, "/api/feedback");
  assert.equal(seen.options.method, "POST");
  assert.equal(seen.options.headers["Content-Type"], "application/json");
  assert.equal(JSON.parse(seen.options.body).message, "The score buttons are hard to hit");
});

test("a failed send offers an email draft with the same text", () => {
  const href = feedback.mailtoHref(feedback.buildPayload(fields({ message: "Something & more" }), { version: "0.7.0", language: "nb", view: "landing" }));
  assert.match(href, /^mailto:sigurd\.grodem@live\.no\?/);
  const params = new URLSearchParams(href.split("?")[1]);
  assert.match(params.get("subject"), /Padelstar 0\.7\.0/);
  assert.match(params.get("body"), /Something & more/);
});

test("the feedback link is in the footer and the menu, and every text exists in both languages", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.equal((html.match(/data-feedback-open/g) ?? []).length, 2, "footer + menu");
  assert.match(html, /app\/feedback\.js\?v=padelstar-feedback-\d+/);
  assert.match(html, /styles\/feedback\.css\?v=padelstar-feedback-\d+/);
  const sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
  assert.match(sw, /app\/feedback\.js/);
  assert.match(sw, /styles\/feedback\.css/);
  const i18n = load("app/translations.js");
  const source = fs.readFileSync(path.join(root, "app", "feedback.js"), "utf8");
  const keys = new Set([...source.matchAll(/t\("(feedback\.[\w.]+)"\)/g)].map((m) => m[1]));
  ["category", "messageTooShort", "messageTooLong", "emailInvalid", "offline", "notConfigured", "rateLimited", "invalid", "failed"].forEach((name) => keys.add(`feedback.error.${name}`));
  feedback.CATEGORIES.forEach((category) => keys.add(`feedback.category.${category}`));
  keys.add("feedback.open");
  for (const language of i18n.PadelstarI18n.productionLanguages().map((entry) => entry.code)) {
    const missing = [...keys].filter((key) => !Object.prototype.hasOwnProperty.call(i18n.PadelstarTranslations[language], key));
    assert.deepEqual(missing, [], `missing in ${language}`);
  }
});

test("the privacy page mentions the feedback data flow in both languages", () => {
  const source = fs.readFileSync(path.join(root, "app", "privacy-i18n.js"), "utf8");
  assert.equal((source.match(/feedbackText:/g) ?? []).length, 2);
  assert.match(fs.readFileSync(path.join(root, "privacy.html"), "utf8"), /data-privacy-i18n="feedbackText"/);
});
