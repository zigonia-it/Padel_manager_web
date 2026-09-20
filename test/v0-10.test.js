// 0.10 milestone: decisions of 2026-09-20 (privacy services section, TV on phones, cups, corrections, invitations, system log, merged workspace).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("the privacy page ends with a section naming the services used, in both shipped languages", () => {
  const html = read("privacy.html");
  const i18n = read("app", "privacy-i18n.js");
  const section = html.slice(html.indexOf('data-privacy-i18n="services"'));
  assert.ok(section.length > 0, "the services heading exists");
  assert.ok(html.indexOf('data-privacy-i18n="services"') > html.indexOf('data-privacy-i18n="status"'), "at the bottom, after the consent section");
  const keys = [...html.matchAll(/data-privacy-i18n="([A-Za-z]+)"/g)].map((m) => m[1]);
  for (const language of ["nb", "en"]) {
    const start = i18n.indexOf(`\n    ${language}: {`);
    const block = i18n.slice(start, i18n.indexOf("\n    },", start));
    for (const key of keys) assert.match(block, new RegExp(`\\b${key}:`), `${language} has ${key}`);
  }
  for (const name of ["Supabase", "Vercel", "Resend", "jsDelivr", "flagcdn.com", "quickchart.io"]) assert.match(section, new RegExp(name));
});

test("TV Mode is in the phone's bottom tab bar and its page fits a phone", () => {
  const html = read("index.html");
  const tabs = html.match(/<nav class="workspace-bottom-tabs[\s\S]*?<\/nav>/)[0];
  assert.match(tabs, /id="tvModeBottomButton"[^>]*data-action="tv-mode"/);
  assert.match(read("app", "bootstrap", "app-events.js"), /tvModeBottomButton\?\.addEventListener\("click", callbacks\.toggleTvModeFromMenu\)/);
  const css = read("styles", "tv.css");
  const phone = css.slice(css.lastIndexOf("@media (max-width: 700px)"));
  assert.match(phone, /\.tv-columns, \.tv-columns\.tv-idle \{ grid-template-rows: none/, "panels grow with their content");
  assert.match(phone, /\.tv-match-card \{ overflow: visible; \}/, "names are not clipped");
  assert.match(phone, /\.tv-header-end \{ flex-direction: column/, "the switch and the clock stack so the header fits 375px");
});

test("corrections after the tournament is finished: card, dialog and profile list, and the database side", () => {
  const card = read("app", "match-card.js");
  assert.match(card, /const correctionOnly = Boolean\(editable && !scoreOnly && closedTournament && match\.state === "finished" && getState\(\)\.lifecycleStatus !== "cancelled"\)/);
  assert.match(card, /if \(closedTournament\) editable = false;/, "no scoring, reopening or walkover once finished");
  assert.match(card, /else if \(correctionOnly\)/);
  const app = read("app", "app.js");
  assert.match(app, /if \(state\.status === "Avsluttet"\) return match\.state === "finished" && state\.lifecycleStatus !== "cancelled" && isCurrentUserAdmin\(\);/);
  assert.match(read("app", "result-correction-dialog.js"), /state\.status === "Avsluttet" && state\.lifecycleStatus === "cancelled"/);
  const html = read("index.html");
  assert.match(html, /id="finishedTournamentsList"/);
  assert.match(read("app", "profile-ui.js"), /profile\.openToCorrect/);
  assert.match(read("app", "profile-session.js"), /"list_my_finished_tournaments"/);
  const migration = read("supabase", "migrations", "20260920180000_corrections_after_finish.sql");
  assert.match(migration, /_recompute_account_statistics\(p_tournament_id\)/);
  assert.match(migration, /app\.finished_correction/);
  assert.match(migration, /revoke execute on function public\._recompute_account_statistics\(uuid\) from public, anon, authenticated/);
  assert.ok(fs.existsSync(path.join(root, "supabase", "tests", "corrections-after-finish.pglite.mjs")));
});

// ---- "I'm not a robot" check -------------------------------------------------------------------------------------------------
const vm = require("node:vm");
function loadCaptcha() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read("app", "captcha.js"), ctx);
  return ctx.PadelstarCaptcha;
}
function fakeDom({ closes = false } = {}) {
  const slot = { children: 0, replaceChildren() { this.children = 0; } };
  const notice = { textContent: "" };
  const listeners = {};
  const dialog = { open: false, addEventListener: (type, fn) => { listeners[type] = fn; }, removeEventListener: (type) => { delete listeners[type]; }, showModal() { this.open = true; }, close() { this.open = false; listeners.close?.(); } };
  const document = { querySelector: (s) => ({ "#captchaDialog": dialog, "#captchaSlot": slot, "#captchaNotice": notice }[s] ?? null), documentElement: { dataset: { theme: "light" } }, head: { append() {} }, createElement: () => ({}) };
  return { document, dialog, slot, notice };
}

test("without a site key there is no check: the actions run as before", async () => {
  const lib = loadCaptcha();
  const { document } = fakeDom();
  const captcha = lib.create({ document, window: { PADELSTAR_SUPABASE: { captchaSiteKey: "" } }, getSiteKey: () => "" });
  assert.equal(captcha.enabled(), false);
  assert.equal(await captcha.challenge(), undefined);
});

test("with a site key the dialog opens, renders a fresh Turnstile widget in the current theme and returns its token", async () => {
  const lib = loadCaptcha();
  const { document, dialog } = fakeDom();
  const renders = [];
  const removed = [];
  const turnstile = { render: (el, options) => { renders.push(options); setTimeout(() => options.callback("token-1"), 0); return "w1"; }, remove: (id) => removed.push(id) };
  const captcha = lib.create({ document, window: { turnstile }, getSiteKey: () => "0xSITEKEY" });
  assert.equal(captcha.enabled(), true);
  const token = await captcha.challenge();
  assert.equal(token, "token-1");
  assert.equal(renders[0].sitekey, "0xSITEKEY");
  assert.equal(renders[0].theme, "light", "follows the colour theme");
  assert.deepEqual(removed, ["w1"], "the widget is removed after use (tokens work once)");
  assert.equal(dialog.open, false, "the dialog is closed again");
  assert.equal(await captcha.challenge(), "token-1", "a second action gets its own widget");
  assert.equal(renders.length, 2);
});

test("closing the dialog, or a script that cannot load, returns null so the action stops with a message", async () => {
  const lib = loadCaptcha();
  const { document, dialog } = fakeDom();
  const turnstile = { render: () => { setTimeout(() => dialog.close(), 0); return "w"; }, remove() {} };
  const captcha = lib.create({ document, window: { turnstile }, getSiteKey: () => "k" });
  assert.equal(await captcha.challenge(), null, "backed out");
  const blocked = fakeDom();
  const noScript = lib.create({ document: blocked.document, window: {}, getSiteKey: () => "k", translate: (key) => key, loadScript: (_src, _ok, fail) => fail() });
  assert.equal(await noScript.challenge(), null);
  assert.equal(blocked.notice.textContent, "captcha.unavailable");
});

test("sign-up, sign-in and the sign-in link send the token to Supabase and stop when the check is declined", async () => {
  const accountSource = read("app", "account-auth.js");
  assert.match(accountSource, /await captcha\?\.challenge\(\)/);
  assert.match(accountSource, /signInWithPassword\(\{ email, password, \.\.\.\(captchaToken \? \{ options: \{ captchaToken \} \} : \{\}\) \}\)/);
  assert.match(accountSource, /signUp\(\{ email, password, \.\.\.\(captchaToken \? \{ options: \{ captchaToken \} \} : \{\}\) \}\)/);
  assert.match(accountSource, /captchaToken === null\) \{ notice\(translate\("captcha\.required"\), true\); return false; \}/);
  const identity = read("app", "admin-identity.js");
  assert.match(identity, /signInWithOtp\(\{\s*email,\s*options: \{ emailRedirectTo: global\.location\.origin, \.\.\.\(captchaToken \? \{ captchaToken \} : \{\}\) \}/);
  assert.match(read("app", "app.js"), /const accountAuth = window\.PadelstarAccountAuth\?\.create\(\{\n  captcha,/);

  // behaviour: the real account-auth with a fake client
  const ctx = { console, setTimeout, window: null };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(accountSource, ctx);
  const calls = [];
  const client = { auth: { signUp: async (args) => { calls.push(args); return { data: { session: null }, error: null }; }, getUser: async () => ({ data: { user: null } }) } };
  const elements = { accountAuthForm: { reportValidity: () => true }, accountAuthEmail: { value: "a@b.no" }, accountAuthPassword: { value: "secret1" }, accountAuthNotice: { textContent: "", classList: { toggle() {} } } };
  const make = (captcha) => ctx.PadelstarAccountAuth.create({ getClient: () => client, getElements: () => elements, getProfile: () => null, translate: (key) => key, onAuthChange() {}, captcha });
  await make({ challenge: async () => "tok" }).signUp();
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { email: "a@b.no", password: "secret1", options: { captchaToken: "tok" } });
  calls.length = 0;
  assert.equal(await make({ challenge: async () => null }).signUp(), false, "declined check: nothing is sent");
  assert.equal(calls.length, 0);
  assert.equal(elements.accountAuthNotice.textContent, "captcha.required");
  elements.accountAuthPassword.value = "secret1";
  await make({ challenge: async () => undefined }).signUp();
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { email: "a@b.no", password: "secret1" }, "no check configured: no options");
});

test("the check is wired in: dialog, script, styles, precache, CSP for Cloudflare, privacy text, texts in every language", () => {
  const html = read("index.html");
  assert.match(html, /id="captchaDialog"[\s\S]*id="captchaSlot"/);
  assert.match(html, /app\/captcha\.js\?v=padelstar-captcha-\d+/);
  assert.match(html, /styles\/captcha\.css\?v=padelstar-captcha-\d+/);
  const worker = read("service-worker.js");
  assert.match(worker, /app\/captcha\.js/); assert.match(worker, /styles\/captcha\.css/);
  const csp = JSON.parse(read("vercel.json")).headers.flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy").value;
  assert.match(csp, /script-src[^;]*https:\/\/challenges\.cloudflare\.com/);
  assert.match(csp, /frame-src https:\/\/challenges\.cloudflare\.com/);
  assert.match(read("supabase-config.js"), /captchaSiteKey: "(0x4[A-Za-z0-9_-]{15,40})?"/, "a Turnstile site key (public) or empty = off");
  assert.match(read("privacy.html"), /data-privacy-i18n="serviceTurnstile"/);
  assert.match(read("app", "privacy-i18n.js"), /serviceTurnstile: "Cloudflare Turnstile: robotkontrollen/);
  const i18n = vm.createContext({ window: {} });
  vm.runInContext(read("app", "translations.js"), i18n);
  for (const language of ["nb", "nn", "en", "es", "de", "fr", "sv", "da"]) for (const key of ["title", "hint", "required", "failed", "expired", "unavailable"]) assert.ok(i18n.window.PadelstarTranslations[language][`captcha.${key}`], `${language} captcha.${key}`);
  assert.ok(fs.existsSync(path.join(root, "docs", "technical", "captcha-setup.md")));
});

test("the footer says the site is under beta development, in every language", () => {
  const html = read("index.html");
  assert.match(html, /<span data-i18n="footer\.developedBy">[^<]*<\/span> ·\s*<span data-i18n="footer\.beta">Denne siden er under Betautvikling<\/span> ·/);
  const i18n = vm.createContext({ window: {} });
  vm.runInContext(read("app", "translations.js"), i18n);
  for (const language of ["nb", "nn", "en", "es", "de", "fr", "sv", "da"]) assert.ok(i18n.window.PadelstarTranslations[language]["footer.beta"], language);
  assert.equal(i18n.window.PadelstarTranslations.en["footer.beta"], "This site is under beta development");
});
