const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const handler = require("../api/invitation-email.js");

const TOURNAMENT = "11111111-1111-4111-8111-111111111111";
const TOKEN = "22222222-2222-4222-8222-222222222222";
const valid = (extra = {}) => ({ tournamentId: TOURNAMENT, adminToken: TOKEN, inviteCode: "ABCD2345", email: "Friend@Example.com", language: "nb", ...extra });

function response() {
  return { statusCode: null, headers: {}, body: null, setHeader(n, v) { this.headers[n] = v; }, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } };
}

// A fake network: Supabase RPCs and Resend, recording every request.
function network({ invitations = [{ id: "i1", email: "friend@example.com", status: "pending" }], listStatus = 200, tournament = { id: TOURNAMENT, name: "Sommer\nturnering" }, resend = { ok: true, status: 200 } } = {}) {
  const requests = [];
  const fetchImpl = async (url, options) => {
    const body = options?.body ? JSON.parse(options.body) : null;
    requests.push({ url: String(url), body, headers: options?.headers });
    if (String(url).includes("/rpc/admin_list_invitations")) return listStatus === 200 ? { ok: true, status: 200, json: async () => ({ invitations }) } : { ok: false, status: listStatus };
    if (String(url).includes("/rpc/get_tournament_by_code")) return { ok: true, status: 200, json: async () => tournament };
    if (String(url).includes("api.resend.com")) return { ...resend, json: resend.json ?? (async () => ({})) };
    throw new Error(`unexpected ${url}`);
  };
  return { requests, fetchImpl };
}

async function call(body, { env = { RESEND_API_KEY: "re_secret" }, net = network(), headers = { "x-forwarded-for": "1.2.3.4" }, method = "POST", keepLimit = false } = {}) {
  if (!keepLimit) handler._resetRateLimit();
  const names = ["RESEND_API_KEY", "INVITE_FROM", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const saved = { fetch: global.fetch, env: Object.fromEntries(names.map((n) => [n, process.env[n]])) };
  names.forEach((n) => delete process.env[n]);
  Object.assign(process.env, env);
  global.fetch = net.fetchImpl;
  const res = response();
  try { await handler({ method, body, headers, socket: { remoteAddress: "9.9.9.9" } }, res); }
  finally { global.fetch = saved.fetch; names.forEach((n) => { if (saved.env[n] === undefined) delete process.env[n]; else process.env[n] = saved.env[n]; }); }
  return { res, net };
}

test("a pending invitation is emailed from padelstar.app with the link and code", async () => {
  const { res, net } = await call(valid());
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  const mail = net.requests.find((r) => r.url.includes("api.resend.com"));
  assert.equal(mail.body.from, "Padelstar <invitations@padelstar.app>");
  assert.deepEqual(mail.body.to, ["friend@example.com"]);
  assert.match(mail.body.text, /https:\/\/padelstar\.app\/\?join=ABCD2345/);
  assert.match(mail.body.text, /Invitasjonskode: ABCD2345/);
  assert.equal(mail.body.subject, "Du er invitert til Sommer turnering på Padelstar", "line breaks in the name never reach the subject");
  assert.equal(mail.headers.Authorization, "Bearer re_secret");
  const list = net.requests.find((r) => r.url.includes("admin_list_invitations"));
  assert.deepEqual(list.body, { p_tournament_id: TOURNAMENT, p_admin_token: TOKEN }, "the database checks the admin token");
});

test("English text, and a custom sender", async () => {
  const { res, net } = await call(valid({ language: "en" }), { env: { RESEND_API_KEY: "re_secret", INVITE_FROM: "Padel <hi@example.com>" } });
  assert.equal(res.statusCode, 200);
  const mail = net.requests.find((r) => r.url.includes("api.resend.com")).body;
  assert.match(mail.subject, /You are invited to/);
  assert.equal(mail.from, "Padel <hi@example.com>");
});

test("nothing is sent unless the database confirms an admin and a pending invitation for exactly this address", async () => {
  let r = await call(valid(), { net: network({ listStatus: 400 }) });
  assert.equal(r.res.statusCode, 403, "a wrong admin token is refused by the database");
  assert.ok(!r.net.requests.some((q) => q.url.includes("resend")));
  r = await call(valid({ email: "stranger@example.com" }));
  assert.equal(r.res.statusCode, 409, "an address that was not invited");
  r = await call(valid(), { net: network({ invitations: [{ id: "i1", email: "friend@example.com", status: "accepted" }] }) });
  assert.equal(r.res.statusCode, 409, "an accepted or declined invitation is not mailed again");
  r = await call(valid(), { net: network({ tournament: { id: "33333333-3333-4333-8333-333333333333", name: "Other" } }) });
  assert.equal(r.res.statusCode, 409, "an invite code of another tournament");
  for (const q of [r, await call(valid({ email: "stranger@example.com" }))]) assert.ok(!q.net.requests.some((x) => x.url.includes("resend")));
});

test("bad input is refused before anything is called", async () => {
  for (const bad of [{ tournamentId: "nope" }, { adminToken: "short" }, { inviteCode: "x" }, { email: "not-an-email" }, { email: "a@b.no\nBcc: c@d.no" }]) {
    const { res, net } = await call(valid(bad));
    assert.equal(res.statusCode, 400, JSON.stringify(bad));
    assert.equal(net.requests.length, 0);
  }
  assert.equal((await call(null)).res.statusCode, 400);
  assert.equal((await call(valid(), { method: "GET" })).res.statusCode, 405);
});

test("a missing key is reported by name, never a value; provider failures say why without leaking", async () => {
  const missing = await call(valid(), { env: {} });
  assert.equal(missing.res.statusCode, 503);
  assert.deepEqual(missing.res.body.missing, ["RESEND_API_KEY"]);
  const failed = await call(valid(), { net: network({ resend: { ok: false, status: 403, json: async () => ({ name: "validation_error", message: "secret text friend@example.com" }) } }) });
  assert.equal(failed.res.statusCode, 502);
  assert.equal(failed.res.body.providerStatus, 403);
  assert.equal(failed.res.body.providerError, "validation_error");
  assert.doesNotMatch(JSON.stringify(failed.res.body), /secret text|friend@/);
  const quoted = await call(valid(), { env: { RESEND_API_KEY: ' "re_quoted" ' } });
  assert.equal(quoted.net.requests.find((r) => r.url.includes("resend")).headers.Authorization, "Bearer re_quoted");
});

test("limits: three mails per address and tournament per hour, and per client", async () => {
  handler._resetRateLimit();
  const statuses = [];
  for (let i = 0; i < 5; i += 1) statuses.push((await call(valid(), { keepLimit: true })).res.statusCode);
  assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
  handler._resetRateLimit();
  const many = [];
  for (let i = 0; i < 32; i += 1) many.push((await call(valid({ email: `p${i}@example.com` }), { keepLimit: true, net: network({ invitations: [{ id: "i", email: `p${i}@example.com`, status: "pending" }] }) })).res.statusCode);
  assert.equal(many.filter((s) => s === 200).length, 30);
  assert.equal(many.at(-1), 429);
});

test("the built-in Supabase settings match the app's public configuration", () => {
  const config = fs.readFileSync(path.join(__dirname, "..", "supabase-config.js"), "utf8");
  const source = fs.readFileSync(path.join(__dirname, "..", "api", "invitation-email.js"), "utf8");
  assert.ok(config.includes(source.match(/DEFAULT_SUPABASE_URL = "([^"]+)"/)[1]));
  assert.ok(config.includes(source.match(/DEFAULT_SUPABASE_KEY = "([^"]+)"/)[1]));
});
