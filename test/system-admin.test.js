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
vm.runInContext(read("app", "system-admin.js"), context);
const admin = context.PadelstarSystemAdmin;

function node() { return { hidden: true, textContent: "", innerHTML: "", dataset: {}, classes: new Set(), classList: { add(c) { node.last.classes.add(c); }, toggle() {}, contains() { return false; } } }; }
function page() {
  const els = { "#systemAdminStatus": { textContent: "" }, "#systemAdminContent": { hidden: true, innerHTML: "" }, "#systemAdminToast": { textContent: "", classList: { add(c) { this.added = c; } } } };
  return { els, document: { documentElement: {}, querySelector: (s) => els[s] ?? null, querySelectorAll: () => [] } };
}
const client = ({ session = { user: { id: "u" } }, isOwner = true, ownerError = null, overview = { counts: { tournaments: 3 }, recentTournaments: [] }, calls = [] } = {}) => ({
  auth: { getSession: async () => ({ data: { session } }) },
  rpc: async (name) => { calls.push(name); if (name === "is_system_owner") return { data: isOwner, error: ownerError }; if (name === "admin_overview") return { data: overview, error: null }; return { data: null, error: new Error("unexpected") }; },
});

test("the access decision: no session, not the owner, an error, or the owner", () => {
  assert.equal(admin.decideAccess({ session: null, isOwner: true }), "signIn");
  assert.equal(admin.decideAccess({ session: {}, isOwner: false }), "denied");
  assert.equal(admin.decideAccess({ session: {}, isOwner: null }), "denied");
  assert.equal(admin.decideAccess({ session: {}, isOwner: true, error: new Error("x") }), "denied", "an error is never access");
  assert.equal(admin.decideAccess({ session: {}, isOwner: "true" }), "denied", "only a real boolean true counts");
  assert.equal(admin.decideAccess({ session: {}, isOwner: true }), "ok");
});

test("a stranger is redirected Home with a message and no administration data is requested", async () => {
  const p = page(); const redirects = []; const calls = [];
  const result = await admin.runPage({ document: p.document, client: client({ isOwner: false, calls }), redirect: (url) => redirects.push(url) });
  assert.equal(result, "denied");
  assert.deepEqual(calls, ["is_system_owner"], "admin_overview was never called");
  assert.deepEqual(redirects, ["index.html"]);
  assert.equal(p.els["#systemAdminContent"].hidden, true);
  assert.match(p.els["#systemAdminToast"].textContent, /ikke tilgang/);
  assert.equal(p.els["#systemAdminContent"].innerHTML, "");
});

test("signed out goes to sign-in, and a missing client counts as no access", async () => {
  const p = page(); const redirects = []; const calls = [];
  assert.equal(await admin.runPage({ document: p.document, client: client({ session: null, calls }), redirect: (u) => redirects.push(u) }), "signIn");
  assert.deepEqual(calls, []);
  assert.deepEqual(redirects, ["index.html?view=account"]);
  assert.equal(await admin.runPage({ document: page().document, client: null, redirect: () => {} }), "denied");
  const failing = { auth: { getSession: async () => { throw new Error("offline"); } } };
  assert.equal(await admin.runPage({ document: page().document, client: failing, redirect: () => {} }), "signIn");
  const errorOnCheck = client({ ownerError: new Error("rpc failed") });
  assert.equal(await admin.runPage({ document: page().document, client: errorOnCheck, redirect: () => {} }), "denied", "the check failing never opens the page");
});

test("the owner sees the overview, loaded only after the server confirmed ownership", async () => {
  const p = page(); const calls = [];
  const overview = { generatedAt: "2026-09-19T12:00:00Z", counts: { tournaments: 3, running: 1, finished: 1, expired: 1, accountOwned: 1, profiles: 2 }, recentTournaments: [{ name: "<img src=x onerror=alert(1)>", status: "Avsluttet", players: 4, account_owned: true, created_at: "2026-09-01T10:00:00Z" }] };
  const result = await admin.runPage({ document: p.document, client: client({ overview, calls }), language: "en", redirect: () => { throw new Error("no redirect for the owner"); } });
  assert.equal(result, "ok");
  assert.deepEqual(calls, ["is_system_owner", "admin_overview"], "checked first, data second");
  assert.equal(p.els["#systemAdminContent"].hidden, false);
  const html = p.els["#systemAdminContent"].innerHTML;
  assert.match(html, /Tournaments/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/, "tournament names are escaped");
  assert.doesNotMatch(html, /<img/);
});

test("the menu link is shown to the owner only, and stays hidden on any failure", async () => {
  const link = { classes: new Set(["hidden"]), classList: { toggle(c, on) { on ? link.classes.add(c) : link.classes.delete(c); }, add(c) { link.classes.add(c); } } };
  const doc = { querySelector: (s) => (s === "#systemAdminLink" ? link : null) };
  const makeLink = (rpc) => admin.createLink({ document: doc, getClient: () => ({ rpc }) });
  let l = makeLink(async () => ({ data: true, error: null }));
  assert.equal(await l.refresh({ id: "owner" }), true);
  assert.equal(link.classes.has("hidden"), false);
  assert.equal(await l.refresh(null), false);
  assert.equal(link.classes.has("hidden"), true, "signing out hides it");
  l = makeLink(async () => ({ data: false, error: null }));
  assert.equal(await l.refresh({ id: "other" }), false);
  assert.equal(link.classes.has("hidden"), true);
  l = makeLink(async () => { throw new Error("network"); });
  assert.equal(await l.refresh({ id: "x" }), false);
  l = makeLink(async () => ({ data: true, error: new Error("denied") }));
  assert.equal(await l.refresh({ id: "y" }), false, "an error is never ownership");
  let calls = 0;
  l = makeLink(async () => { calls += 1; return { data: true, error: null }; });
  await l.refresh({ id: "same" }); await l.refresh({ id: "same" });
  assert.equal(calls, 1, "the answer is cached per signed-in user");
});

test("the page, the menu link and the assets are in place", () => {
  const admin = read("admin.html");
  assert.match(admin, /id="systemAdminContent" hidden/, "content is hidden until authorized");
  assert.match(admin, /name="robots" content="noindex"/);
  assert.match(admin, /app\/system-admin\.js\?v=padelstar-system-admin-\d+/);
  const index = read("index.html");
  assert.match(index, /id="systemAdminLink" class="module-link hidden" href="admin\.html"/);
  assert.match(read("service-worker.js"), /\.\/admin\.html/);
  assert.match(read("app", "app.js"), /systemAdminLink\.refresh\(user\)/);
  const i18n = vm.createContext({ window: {} });
  vm.runInContext(read("app", "translations.js"), i18n);
  for (const language of ["nb", "en"]) assert.ok(i18n.window.PadelstarTranslations[language]["nav.systemAdmin"], language);
});
