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

const t = admin.TEXT.nb;

test("the page has four tabs; only the overview is loaded at first (the lists load when opened)", async () => {
  const p = page(); const calls = [];
  const c = client({ calls });
  await admin.runPage({ document: p.document, client: c, redirect: () => {} });
  assert.deepEqual(calls, ["is_system_owner", "admin_overview"]);
  const html = p.els["#systemAdminContent"].innerHTML;
  for (const tab of ["overview", "tournaments", "users", "maintenance"]) assert.match(html, new RegExp(`data-tab="${tab}"`));
  assert.match(html, /id="systemAdminPanel-tournaments"[^>]* hidden/, "the other panels start hidden");
  assert.match(html, /role="tablist"/);
});

test("tournament list: escaped, labelled cells for phones, format names and a pager", () => {
  const data = { total: 60, limit: 25, offset: 25, rows: [{ name: "<b>x</b>", status: "Avsluttet", format: "cup", players: 8, rounds: 3, account_owned: true, created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-02T10:00:00Z" }] };
  const html = admin.renderTournamentList(data, t);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>x/);
  assert.match(html, /data-label="Navn"/);
  assert.match(html, />Cup</);
  assert.match(html, /Viser 26–50 av 60/);
  assert.match(html, /data-page="previous"(?![^>]*disabled)/, "previous is enabled on page 2");
  assert.match(html, /data-page="next"(?![^>]*disabled)/);
  assert.match(admin.renderTournamentList({ total: 3, limit: 25, offset: 0, rows: data.rows }, t), /data-page="previous" disabled/);
  assert.match(admin.renderTournamentList({ total: 3, limit: 25, offset: 0, rows: data.rows }, t), /data-page="next" disabled/);
  assert.match(admin.renderTournamentList({ total: 0, rows: [] }, t), /Ingen treff/);
});

test("user list: the owner badge, unconfirmed and never-signed-in, escaped e-mail, no password fields", () => {
  const data = { total: 2, limit: 25, offset: 0, rows: [
    { id: "1", email: "sigurd.grodem@live.no", email_confirmed: true, created_at: "2026-09-01T10:00:00Z", last_sign_in_at: "2026-09-19T10:00:00Z", owned_tournaments: 2, played_tournaments: 1, finished_tournaments: 1, is_system_owner: true },
    { id: "2", email: "<script>@x.no", email_confirmed: false, created_at: "2026-09-02T10:00:00Z", last_sign_in_at: null, owned_tournaments: 0, played_tournaments: 0, finished_tournaments: 0, is_system_owner: false },
  ] };
  const html = admin.renderUserList(data, t);
  assert.match(html, /Systemeier/);
  assert.match(html, /Ikke bekreftet/);
  assert.match(html, />Aldri</);
  assert.match(html, /&lt;script&gt;@x\.no/);
  assert.doesNotMatch(html, /<script/);
  assert.match(admin.renderUserList({ total: 0, rows: [] }, t), /Ingen brukere/);
});

test("maintenance: waiting counts and the scheduled jobs with their last run", () => {
  const html = admin.renderMaintenance({ generatedAt: "2026-09-20T01:00:00Z", waiting: { expired: 3, expiredDeletionDue: 1, finishedRetentionDue: 0, idleOver30Days: 2, profileDeletionDue: 0 }, jobs: [{ name: "padelstar-retention-cleanup", schedule: "15 * * * *", active: true, lastRun: { status: "succeeded", startedAt: "2026-09-20T01:15:00Z" } }, { name: "other", schedule: "* * * * *", active: false, lastRun: null }] }, t);
  assert.match(html, /padelstar-retention-cleanup/);
  assert.match(html, /succeeded/);
  assert.match(html, /Ikke kjørt ennå/);
  assert.match(html, /Utløpte turneringer[\s\S]*?<strong>3</);
  assert.match(admin.renderMaintenance({ waiting: {}, jobs: [] }, t), /Ingen planlagte oppgaver/);
});

test("searching and paging ask the server for one page at a time", async () => {
  const handlers = {}; const calls = [];
  const targets = { tournaments: { innerHTML: "", setAttribute() {}, removeAttribute() {} }, users: { innerHTML: "", setAttribute() {}, removeAttribute() {} }, maintenance: { innerHTML: "", setAttribute() {}, removeAttribute() {} } };
  const content = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    querySelector: (selector) => targets[selector.match(/data-results="(\w+)"/)?.[1]] ?? null,
    querySelectorAll: () => [],
  };
  const rpc = async (name, args) => { calls.push([name, args]); return { data: { total: 80, limit: 25, offset: args?.p_offset ?? 0, rows: [{ name: "A", status: "Avsluttet", players: 1, rounds: 1, email: "a@b.no" }] }, error: null }; };
  admin.bindPanels({ content, client: { rpc }, t, locale: "nb-NO" });

  const form = { dataset: { searchForm: "tournaments" }, elements: { q: { value: "  cup  " }, status: { value: "finished" } } };
  handlers.submit({ target: { closest: () => form }, preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))), ["admin_list_tournaments", { p_search: "cup", p_status: "finished", p_limit: 25, p_offset: 0 }]);

  const next = { dataset: { page: "next" }, disabled: false, closest: (s) => (s === "[data-panel]" ? { dataset: { panel: "tournaments" } } : null) };
  handlers.click({ target: { closest: (s) => (s === "[data-page]" ? next : null) } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.at(-1)[1].p_offset, 25);
  handlers.click({ target: { closest: (s) => (s === "[data-page]" ? next : null) } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.at(-1)[1].p_offset, 50);
  const previous = { ...next, dataset: { page: "previous" } };
  handlers.click({ target: { closest: (s) => (s === "[data-page]" ? previous : null) } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.at(-1)[1].p_offset, 25);

  const userForm = { dataset: { searchForm: "users" }, elements: { q: { value: "%" } } };
  handlers.submit({ target: { closest: () => userForm }, preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))), ["admin_list_users", { p_search: "%", p_limit: 25, p_offset: 0 }], "a new search starts on the first page");
  assert.match(targets.users.innerHTML, /a@b\.no/);
});

test("a failing list shows an error instead of an empty table", async () => {
  const handlers = {};
  const target = { innerHTML: "", setAttribute() {}, removeAttribute() {} };
  const content = { addEventListener: (type, fn) => { handlers[type] = fn; }, querySelector: () => target, querySelectorAll: () => [] };
  admin.bindPanels({ content, client: { rpc: async () => ({ data: null, error: new Error("denied") }) }, t, locale: "nb-NO" });
  handlers.submit({ target: { closest: () => ({ dataset: { searchForm: "users" }, elements: { q: { value: "" } } }) }, preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(target.innerHTML, /Kunne ikke hente data/);
});

test("the admin styles keep long text inside the page: wrapping names, cards on phones, no cropped headings", () => {
  const css = read("styles", "system-admin.css");
  assert.match(css, /td:first-child \{[^}]*overflow-wrap: anywhere/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*attr\(data-label\)/);
  assert.match(css, /#systemAdminTitle \{ font-size: clamp\(/);
  assert.match(css, /\.privacy-page:has\(#systemAdminRoot\)/);
});
