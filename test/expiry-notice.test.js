// The admin is told when a guest tournament has expired (0.16), and can continue it with one change.
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
vm.runInContext(read("app", "expiry-notice.js"), context);

function page() {
  const notice = { classes: new Set(["hidden"]), classList: { add(c) { notice.classes.add(c); }, toggle(c, on) { on ? notice.classes.add(c) : notice.classes.delete(c); }, contains: (c) => notice.classes.has(c) } };
  const text = { textContent: "" };
  const button = { disabled: false, click: null, addEventListener(name, fn) { if (name === "click") button.click = fn; } };
  const els = { "#expiryNotice": notice, "#expiryNoticeText": text, "#expiryResumeButton": button };
  return { notice, text, button, document: { documentElement: { lang: "nb" }, querySelector: (s) => els[s] ?? null } };
}
function make({ state, status = { expired: true, expiredAt: "2026-09-10T12:00:00Z", deletesAt: "2026-09-17T12:00:00Z" }, rpcError = null, client = {}, resume = async () => {} } = {}) {
  const p = page();
  const calls = [];
  const notice = context.PadelstarExpiryNotice.create({
    document: p.document, getState: () => state, getClient: () => client, isShared: (s) => s.remoteMode === "shared",
    remoteRpc: async (c, name, payload) => { calls.push([name, payload]); return { data: status, error: rpcError }; },
    resume, t: (key, values) => `${key}${values ? JSON.stringify(values.date ? { date: values.date } : values) : ""}`, getLocale: () => "en-GB",
  });
  return { p, notice, calls };
}
const admin = { id: "T1", adminToken: "a".repeat(36), remoteMode: "shared", status: "Runde pågår" };

test("an expired guest tournament shows the notice with the deletion date, asked with the admin token", async () => {
  const { p, notice, calls } = make({ state: admin });
  assert.equal(await notice.refresh(), true);
  assert.equal(p.notice.classes.has("hidden"), false);
  assert.match(p.text.textContent, /expiry\.notice/);
  assert.match(p.text.textContent, /17 September/);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [["admin_tournament_expiry", { p_tournament_id: "T1", p_admin_token: "a".repeat(36) }]]);
});

test("an active tournament shows nothing, and the server is asked once per tournament", async () => {
  const { p, notice, calls } = make({ state: admin, status: { expired: false, expiredAt: null, deletesAt: null } });
  assert.equal(await notice.refresh(), false);
  await notice.refresh(); await notice.refresh();
  assert.equal(p.notice.classes.has("hidden"), true);
  assert.equal(calls.length, 1);
});

test("nothing is asked for players, spectators, local or finished tournaments; a failure keeps the notice hidden", async () => {
  for (const state of [{ ...admin, adminToken: null }, { ...admin, remoteMode: "local" }, { ...admin, status: "Avsluttet" }, { ...admin, id: null }]) {
    const { p, notice, calls } = make({ state });
    assert.equal(await notice.refresh(), false);
    assert.equal(calls.length, 0);
    assert.equal(p.notice.classes.has("hidden"), true);
  }
  const failing = make({ state: admin, rpcError: new Error("denied") });
  assert.equal(await failing.notice.refresh(), false);
  assert.equal(failing.p.notice.classes.has("hidden"), true);
  const noClient = make({ state: admin, client: null });
  assert.equal(await noClient.notice.refresh(), false);
});

test("'continue' makes one change to the tournament and hides the notice", async () => {
  let resumed = 0;
  const { p, notice } = make({ state: admin, resume: async () => { resumed += 1; } });
  await notice.refresh();
  await p.button.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(resumed, 1);
  assert.equal(p.notice.classes.has("hidden"), true);
  assert.equal(p.button.disabled, false);
});

test("the notice, the resume action and the migration are wired together", () => {
  const html = read("index.html");
  assert.match(html, /id="expiryNotice"[\s\S]*id="expiryResumeButton"/);
  assert.match(html, /app\/expiry-notice\.js\?v=padelstar-expiry-notice-\d+/);
  assert.match(read("service-worker.js"), /app\/expiry-notice\.js\?v=padelstar-expiry-notice-\d+/);
  const app = read("app", "app.js");
  assert.match(app, /state\.lastResumedAt = new Date\(\)\.toISOString\(\); saveState\(\); render\(\)/, "continue is a real change of the state (the database trigger reactivates on it)");
  assert.match(app, /void expiryNotice\.refresh\(\)/);
  const i18n = vm.createContext({ window: {} });
  vm.runInContext(read("app", "translations.js"), i18n);
  for (const language of ["nb", "en"]) for (const key of ["expiry.notice", "expiry.resume", "expiry.resumed"]) assert.ok(i18n.window.PadelstarTranslations[language][key], `${language} ${key}`);
  const sql = read("supabase", "migrations", "20260920240000_tournament_expiry_status.sql");
  assert.match(sql, /grant execute on function public\.admin_tournament_expiry\(uuid, text\) to anon, authenticated/);
  assert.match(sql, /revoke all on function public\.admin_tournament_expiry_impl\(uuid, text\) from public, anon, authenticated/);
});
