// The two-factor step of system administration (0.14): the page asks for a code before it loads any data, sets the
// authenticator app up the first time, and the database only answers owner functions to a session that has passed it.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const context = { console, setTimeout: (fn) => { fn(); return 1; } };
context.window = context;
context.document = { querySelector: () => null };
vm.createContext(context);
vm.runInContext(read("app", "system-two-factor.js"), context);
vm.runInContext(read("app", "system-admin.js"), context);
const twoFactor = context.PadelstarSystemTwoFactor;
const admin = context.PadelstarSystemAdmin;
const t = twoFactor.TEXT.nb;

// a container with one form whose submit handler the test can trigger
function fakeContainer() {
  const input = { value: "" };
  const errorNode = { textContent: "" };
  const button = { disabled: false };
  const form = { elements: { code: input }, handler: null, addEventListener(name, fn) { if (name === "submit") form.handler = fn; } };
  const container = {
    hidden: true,
    _html: "",
    set innerHTML(value) { container._html = value; },
    get innerHTML() { return container._html; },
    querySelector(selector) { if (!container._html.includes("<form")) return null; return selector === "form" ? form : selector === "[data-two-factor-error]" ? errorNode : selector === "button[type=submit]" ? button : null; },
  };
  return { container, form, input, errorNode, button, submit: async (code) => { input.value = code; await form.handler({ preventDefault() {} }); } };
}
function mfaClient({ verified = [], stale = [], enrollError = null, verifyResults = [{ error: null }], calls = [] } = {}) {
  return {
    auth: {
      mfa: {
        listFactors: async () => ({ data: { all: [...verified.map((f) => ({ ...f, factor_type: "totp", status: "verified" })), ...stale.map((f) => ({ ...f, factor_type: "totp", status: "unverified" }))], totp: verified.map((f) => ({ ...f, factor_type: "totp", status: "verified" })) }, error: null }),
        unenroll: async (args) => { calls.push(["unenroll", args.factorId]); return { error: null }; },
        enroll: async (args) => { calls.push(["enroll", args.factorType, args.issuer]); return enrollError ? { data: null, error: enrollError } : { data: { id: "new-factor", totp: { qr_code: "data:image/svg+xml;utf-8,<svg/>", secret: "ABCDEFGHIJKLMNOP" } }, error: null }; },
        challengeAndVerify: async (args) => { calls.push(["verify", args.factorId, args.code]); return verifyResults.shift() ?? { error: null }; },
      },
    },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("an owner with an authenticator app is asked for a code, and a wrong code keeps the form open", async () => {
  const calls = [];
  const view = fakeContainer();
  const promise = twoFactor.run({ client: mfaClient({ verified: [{ id: "f1" }], verifyResults: [{ error: new Error("bad") }, { error: null }], calls }), container: view.container, t });
  await settle();
  assert.match(view.container.innerHTML, /autocomplete="one-time-code"/);
  assert.doesNotMatch(view.container.innerHTML, /system-admin-two-factor-qr/, "no set-up when a factor exists");
  assert.equal(view.container.hidden, false);
  await view.submit("12 34");
  assert.equal(view.errorNode.textContent, t.tfBadFormat, "not six digits: nothing is sent");
  assert.deepEqual(calls, []);
  await view.submit("123456");
  assert.equal(view.errorNode.textContent, t.tfWrongCode);
  assert.equal(view.input.value, "", "the field is cleared after a wrong code");
  assert.equal(view.button.disabled, false);
  await view.submit("654 321");
  assert.equal(await promise, true, "the right code passes");
  assert.deepEqual(calls, [["verify", "f1", "123456"], ["verify", "f1", "654321"]]);
  assert.equal(view.container.hidden, true);
  assert.equal(view.container.innerHTML, "");
});

test("the first time the app is set up: a QR code and the key are shown, and stale attempts are removed", async () => {
  const calls = [];
  const view = fakeContainer();
  const promise = twoFactor.run({ client: mfaClient({ stale: [{ id: "old1" }, { id: "old2" }], calls }), container: view.container, t });
  await settle();
  assert.deepEqual(calls.slice(0, 3), [["unenroll", "old1"], ["unenroll", "old2"], ["enroll", "totp", "Padelstar"]]);
  assert.match(view.container.innerHTML, /system-admin-two-factor-qr[\s\S]*data:image\/svg\+xml/);
  assert.match(view.container.innerHTML, /ABCD EFGH IJKL MNOP/, "the key is grouped so it is easy to type");
  assert.match(view.container.innerHTML, /Sikkerhetskopi/, "the backup advice is on the page");
  await view.submit("000111");
  assert.equal(await promise, true);
  assert.deepEqual(calls.at(-1), ["verify", "new-factor", "000111"], "the code is checked against the new factor");
});

test("when the second factor cannot be started the page says so and loads nothing", async () => {
  const view = fakeContainer();
  assert.equal(await twoFactor.run({ client: mfaClient({ enrollError: new Error("disabled") }), container: view.container, t }), false);
  assert.match(view.container.innerHTML, /Supabase/);
  const broken = { auth: { mfa: { listFactors: async () => ({ data: null, error: new Error("x") }) } } };
  assert.equal(await twoFactor.run({ client: broken, container: fakeContainer().container, t }), false);
});

test("the QR code and the key are escaped", () => {
  const html = twoFactor.enrollMarkup(t, { qr: 'x" onerror="alert(1)', secret: "<b>" });
  assert.doesNotMatch(html, /onerror="alert/);
  assert.doesNotMatch(html, /<b>/);
});

function pageFor() {
  const els = { "#systemAdminStatus": { textContent: "" }, "#systemAdminContent": { hidden: true, innerHTML: "" }, "#systemAdminToast": { textContent: "", classList: { add() {} } }, "#systemAdminTwoFactor": null };
  return { els, document: { documentElement: {}, querySelector: (s) => els[s] ?? null, querySelectorAll: () => [] } };
}

test("the page asks for the code before it requests any administration data", async () => {
  const p = pageFor();
  const view = fakeContainer();
  p.els["#systemAdminTwoFactor"] = view.container;
  const calls = [];
  const rpcClient = {
    auth: { ...mfaClient({ verified: [{ id: "f1" }], calls }).auth, getSession: async () => ({ data: { session: { user: { id: "o" } } } }) },
    rpc: async (name) => { calls.push(name); return name === "system_owner_status" ? { data: { owner: true, secondFactor: false }, error: null } : { data: { counts: { tournaments: 1 }, recentTournaments: [] }, error: null }; },
  };
  const running = admin.runPage({ document: p.document, client: rpcClient, redirect() {} });
  await settle();
  assert.deepEqual(calls, ["system_owner_status"], "no data yet: the code form is open");
  assert.equal(p.els["#systemAdminContent"].hidden, true);
  await view.submit("123456");
  assert.equal(await running, "ok");
  assert.deepEqual(calls, ["system_owner_status", ["verify", "f1", "123456"], "admin_overview"]);
  assert.equal(p.els["#systemAdminContent"].hidden, false);
});

test("a session that already passed the second factor goes straight in, and a stranger never sees the form", async () => {
  const p = pageFor();
  const calls = [];
  const direct = { auth: { getSession: async () => ({ data: { session: {} } }) }, rpc: async (name) => { calls.push(name); return name === "system_owner_status" ? { data: { owner: true, secondFactor: true }, error: null } : { data: { counts: {}, recentTournaments: [] }, error: null }; } };
  assert.equal(await admin.runPage({ document: p.document, client: direct, redirect() {} }), "ok");
  assert.deepEqual(calls, ["system_owner_status", "admin_overview"]);
  const stranger = { auth: { getSession: async () => ({ data: { session: {} } }) }, rpc: async () => ({ data: { owner: false, secondFactor: false }, error: null }) };
  const p2 = pageFor();
  assert.equal(await admin.runPage({ document: p2.document, client: stranger, redirect() {} }), "denied");
  assert.equal(p2.els["#systemAdminContent"].hidden, true);
});

test("the page, the service worker and the migration are wired together", () => {
  const html = read("admin.html");
  assert.match(html, /id="systemAdminTwoFactor" hidden/);
  assert.match(html, /app\/system-two-factor\.js\?v=padelstar-system-two-factor-\d+/);
  assert.ok(html.indexOf("system-two-factor.js") < html.indexOf("system-admin.js"), "loaded before the page script that uses it");
  assert.match(read("service-worker.js"), /app\/system-two-factor\.js\?v=padelstar-system-two-factor-\d+/);
  const sql = read("supabase", "migrations", "20260920220000_system_owner_two_factor.sql");
  assert.match(sql, /coalesce\(auth\.jwt\(\)->>'aal', ''\) = 'aal2'/);
  assert.match(sql, /grant execute on function public\.system_owner_status\(\) to authenticated/);
  assert.doesNotMatch(sql, /grant execute[^;]*to anon/);
});
