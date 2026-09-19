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
vm.runInContext(read("app", "invitations.js"), context);
const lib = context.PadelstarInvitations;

function node() {
  return { handlers: {}, classes: new Set(["hidden"]), innerHTML: "", listeners: [], elements: {},
    classList: { toggle(c, on) { this._owner.classes[on ? "add" : "delete"](c); }, contains(c) { return this._owner.classes.has(c); } },
    addEventListener(name, fn) { this.handlers[name] = fn; }, reset() { this.resetCalled = true; },
    querySelectorAll() { return []; } };
}
function fakeDocument() {
  const map = {};
  for (const id of ["#lobbyInviteCard", "#lobbyInviteForm", "#lobbyInvitationsList", "#myInvitationsPanel", "#myInvitationsList"]) { map[id] = node(); map[id].classList._owner = map[id]; }
  return { map, querySelector: (selector) => map[selector] ?? null };
}

function build({ state = {}, account = { id: "u1" }, rpc } = {}) {
  const doc = fakeDocument();
  const calls = []; const toasts = []; const prefilled = []; const modules = [];
  const current = { id: "t1", adminToken: "a".repeat(20), remoteMode: "shared", rounds: [], status: "Klar", ...state };
  const api = lib.create({
    document: doc, getState: () => current, getClient: () => ({}), isShared: (s) => s.remoteMode === "shared",
    remoteRpc: async (client, name, payload) => { calls.push([name, { ...payload }]); return rpc ? rpc(name, payload) : { data: { invitations: [] }, error: null }; },
    t: (key, values = {}) => `${key}${Object.keys(values).length ? `:${Object.values(values).join("/")}` : ""}`, showToast: (message, cls) => toasts.push([message, cls]), escapeHtml: (v) => String(v).replace(/</g, "&lt;"),
    prefillJoinForm: (code) => prefilled.push(code), showModule: (m) => modules.push(m), getAccountUser: () => account,
  });
  return { api, doc, calls, toasts, prefilled, modules, current };
}
const shown = (doc, id) => !doc.map[id].classes.has("hidden");

test("server messages map to readable texts", () => {
  assert.equal(lib.errorKey(new Error("Invalid email address")), "invitations.error.email");
  assert.equal(lib.errorKey(new Error("The tournament has already started")), "invitations.error.started");
  assert.equal(lib.errorKey(new Error("Too many invitations")), "invitations.error.tooMany");
  assert.equal(lib.errorKey(new Error("Rate limit exceeded")), "invitations.error.rateLimit");
  assert.equal(lib.errorKey(new Error("boom")), "invitations.error.failed");
  assert.equal(lib.errorKey(null), "invitations.error.failed");
});

test("the lobby card shows only for the admin of a shared tournament that has not started", async () => {
  let t = build();
  t.api.renderAdmin();
  assert.equal(shown(t.doc, "#lobbyInviteCard"), true);
  assert.deepEqual(t.calls.map((c) => c[0]), ["admin_list_invitations"], "the list is fetched once");
  t.api.renderAdmin(); t.api.renderAdmin();
  assert.equal(t.calls.length, 1, "not on every render");
  for (const state of [{ remoteMode: "local" }, { adminToken: null }, { rounds: [{}] }, { status: "Avsluttet" }, { id: null }]) {
    t = build({ state }); t.api.renderAdmin();
    assert.equal(shown(t.doc, "#lobbyInviteCard"), false, JSON.stringify(state));
    assert.equal(t.calls.length, 0, "nothing is requested when the card is hidden");
  }
});

test("inviting sends the admin token with the email, shows the list and a message; a server error shows a text", async () => {
  const list = [{ id: "i1", email: "a@b.co", status: "pending" }, { id: "i2", email: "<x>@b.co", status: "accepted" }];
  const t = build({ rpc: () => ({ data: { invitations: list }, error: null }) });
  assert.ok(await t.api.invite("a@b.co"));
  assert.deepEqual(t.calls[0][1], { p_tournament_id: "t1", p_admin_token: "a".repeat(20), p_email: "a@b.co" });
  assert.match(t.doc.map["#lobbyInvitationsList"].innerHTML, /a@b\.co/);
  assert.match(t.doc.map["#lobbyInvitationsList"].innerHTML, /invitations\.status\.accepted/);
  assert.match(t.doc.map["#lobbyInvitationsList"].innerHTML, /&lt;x>@b\.co/, "addresses are escaped");
  assert.match(t.doc.map["#lobbyInvitationsList"].innerHTML, /data-cancel-invitation="i1"/, "only a pending one can be withdrawn");
  assert.doesNotMatch(t.doc.map["#lobbyInvitationsList"].innerHTML, /data-cancel-invitation="i2"/);
  assert.deepEqual(t.toasts.at(-1), ["invitations.sent", "status-message-success"]);
  const failing = build({ rpc: () => ({ data: null, error: new Error("Invalid email address") }) });
  assert.equal(await failing.api.invite("nope"), null);
  assert.deepEqual(failing.toasts.at(-1), ["invitations.error.email", "status-message-error"]);
  const started = build({ state: { rounds: [{}] } });
  assert.equal(await started.api.invite("a@b.co"), null);
  assert.equal(started.calls.length, 0, "no call once the tournament has started");
});

test("cancelling a pending invitation calls the server with the admin token", async () => {
  const t = build();
  await t.api.cancel("i9");
  assert.deepEqual(t.calls[0], ["admin_cancel_invitation", { p_tournament_id: "t1", p_admin_token: "a".repeat(20), p_invitation_id: "i9" }]);
});

test("my invitations: listed only when signed in; joining fills the join form, declining removes it", async () => {
  const mine = [{ id: "m1", tournamentName: "Friday Cup", inviteCode: "ABCD2345" }, { id: "m2", tournamentName: "", inviteCode: "ZZZZ2345" }];
  const t = build({ rpc: (name) => (name === "list_my_invitations" ? { data: mine, error: null } : { data: true, error: null }) });
  await t.api.loadMine();
  assert.equal(shown(t.doc, "#myInvitationsPanel"), true);
  assert.match(t.doc.map["#myInvitationsList"].innerHTML, /invitations\.invitedTo:Friday Cup/);
  assert.match(t.doc.map["#myInvitationsList"].innerHTML, /invitations\.invitedTo:ZZZZ2345/, "falls back to the code without a name");
  assert.equal(t.api.accept("m1"), true);
  assert.deepEqual(t.prefilled, ["ABCD2345"]);
  assert.deepEqual(t.modules, ["setup-player"], "the person still presses Join themselves");
  assert.equal(t.calls.filter((c) => c[0] === "decline_invitation").length, 0, "accepting does not tell the server anything");
  assert.equal(await t.api.decline("m1"), true);
  assert.deepEqual(t.calls.at(-1), ["decline_invitation", { p_invitation_id: "m1" }]);
  assert.doesNotMatch(t.doc.map["#myInvitationsList"].innerHTML, /Friday Cup/);
  assert.equal(t.api.accept("unknown"), false);
  const signedOut = build({ account: null });
  await signedOut.api.loadMine();
  assert.equal(shown(signedOut.doc, "#myInvitationsPanel"), false);
  assert.equal(signedOut.calls.length, 0, "no request without an account");
  const failing = build({ rpc: () => ({ data: null, error: new Error("x") }) });
  await failing.api.loadMine();
  assert.equal(shown(failing.doc, "#myInvitationsPanel"), false, "an error just shows nothing");
});

test("the markup, script, precache and texts are in place", () => {
  const html = read("index.html");
  for (const id of ["lobbyInviteCard", "lobbyInviteForm", "lobbyInvitationsList", "myInvitationsPanel", "myInvitationsList"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /type="email"[\s\S]{0,120}name="email"|name="email"[\s\S]{0,60}type="email"/);
  assert.match(html, /app\/invitations\.js\?v=padelstar-invitations-\d+/);
  assert.match(read("service-worker.js"), /app\/invitations\.js/);
  assert.match(read("app", "app.js"), /"admin_list_invitations", "list_my_invitations"/, "reads do not count as sync attempts");
  const i18n = vm.createContext({ window: {} });
  vm.runInContext(read("app", "translations.js"), i18n);
  const source = read("app", "invitations.js");
  const keys = new Set([...source.matchAll(/"(invitations\.[\w.]+)"/g)].map((m) => m[1]));
  ["pending", "accepted", "declined", "expired"].forEach((s) => keys.add(`invitations.status.${s}`));
  for (const k of ["title", "hint", "email", "send", "eyebrow", "myTitle"]) keys.add(`invitations.${k}`);
  for (const language of ["nb", "en"]) {
    const missing = [...keys].filter((key) => !i18n.window.PadelstarTranslations[language][key]);
    assert.deepEqual(Array.from(missing), [], `missing in ${language}`);
  }
});
