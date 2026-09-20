const assert = require("node:assert/strict");
const test = require("node:test");

const handler = require("../api/feedback.js");

function response() {
  return { statusCode: null, headers: {}, body: null, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(payload) { this.body = payload; return this; } };
}

const valid = (extra = {}) => ({
  category: "bug",
  message: "The score buttons are hard to hit on my phone",
  email: "",
  website: "",
  context: { version: "0.7.0", language: "nb", view: "workspace", role: "player", screen: "390x844", userAgent: "TestAgent/1.0" },
  ...extra,
});

const calls = [];
const GOOD_ENV = { RESEND_API_KEY: "re_secret", FEEDBACK_TO_EMAIL: "dev@example.com" };

async function call(body, { env = GOOD_ENV, fetchImpl, headers = { "x-forwarded-for": "1.2.3.4" }, method = "POST" } = {}) {
  const names = ["RESEND_API_KEY", "FEEDBACK_TO_EMAIL", "FEEDBACK_FROM"];
  const saved = { fetch: global.fetch, env: Object.fromEntries(names.map((name) => [name, process.env[name]])) };
  names.forEach((name) => delete process.env[name]);
  Object.assign(process.env, env);
  calls.length = 0;
  global.fetch = fetchImpl ?? (async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200 }; });
  const res = response();
  try {
    await handler({ method, body, headers, socket: { remoteAddress: "9.9.9.9" } }, res);
  } finally {
    global.fetch = saved.fetch;
    names.forEach((name) => { if (saved.env[name] === undefined) delete process.env[name]; else process.env[name] = saved.env[name]; });
  }
  return res;
}

// Every test starts with a fresh rate limit unless it is testing the limit.
async function post(body, options) {
  handler._resetRateLimit();
  return call(body, options);
}

test("only POST is accepted", async () => {
  const res = await post(valid(), { method: "GET" });
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "POST");
});

test("a valid message is emailed through Resend with the secret only in the server request", async () => {
  const res = await post(valid({ email: "player@example.com" }));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(calls.length, 1);
  const { url, options } = calls[0];
  assert.equal(url, "https://api.resend.com/emails");
  assert.equal(options.headers.Authorization, "Bearer re_secret");
  const mail = JSON.parse(options.body);
  assert.deepEqual(mail.to, ["dev@example.com"]);
  assert.equal(mail.reply_to, "player@example.com");
  assert.match(mail.subject, /^\[Padelstar 0\.7\.0\] Bug: The score buttons/);
  assert.match(mail.text, /App version: 0\.7\.0/);
  assert.match(mail.text, /The score buttons are hard to hit/);
  assert.doesNotMatch(JSON.stringify(res.body), /re_secret/);
});

test("the sender can be configured; the default is Resend's onboarding sender", async () => {
  await post(valid());
  assert.match(JSON.parse(calls[0].options.body).from, /onboarding@resend\.dev/);
  await post(valid(), { env: { RESEND_API_KEY: "k", FEEDBACK_TO_EMAIL: "d@example.com", FEEDBACK_FROM: "Padelstar <feedback@example.com>" } });
  assert.equal(JSON.parse(calls[0].options.body).from, "Padelstar <feedback@example.com>");
});

test("the email is optional and no reply-to is set without one", async () => {
  await post(valid());
  assert.equal("reply_to" in JSON.parse(calls[0].options.body), false);
});

test("invalid submissions are refused and nothing is sent", async () => {
  const bad = [
    valid({ message: "hi" }),
    valid({ message: "x".repeat(2001) }),
    valid({ category: "spam" }),
    valid({ category: undefined }),
    valid({ email: "not-an-email" }),
    valid({ email: "a@b.com\nBcc: x@y.com" }),
    valid({ email: "a b@c.com" }),
    null,
    "not json {",
  ];
  for (const body of bad) {
    const res = await post(body);
    assert.equal(res.statusCode, 400, String(JSON.stringify(body)).slice(0, 40));
    assert.equal(calls.length, 0);
  }
});

test("a JSON string body is parsed", async () => {
  const res = await post(JSON.stringify(valid()));
  assert.equal(res.statusCode, 200);
});

test("the honeypot silently drops bots without sending anything", async () => {
  const res = await post(valid({ website: "http://spam.example" }));
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 0);
});

test("line breaks in single-line fields cannot inject email headers", async () => {
  await post(valid({ context: { version: "0.7.0\nBcc: evil@example.com", view: "a\r\nBcc: x@y.com" } }));
  const mail = JSON.parse(calls[0].options.body);
  assert.doesNotMatch(mail.subject, /[\r\n]/);
  assert.equal(mail.text.split("\n").filter((line) => /^Bcc:/i.test(line)).length, 0);
});

test("the message is sent as plain text, never as HTML", async () => {
  await post(valid({ message: "<script>alert(1)</script> <b>hi</b>" }));
  const mail = JSON.parse(calls[0].options.body);
  assert.ok(mail.text.includes("<script>"), "kept verbatim as text");
  assert.equal("html" in mail, false);
});

test("without configuration the function says so instead of failing silently", async () => {
  const res = await post(valid(), { env: {} });
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, "notConfigured");
  assert.deepEqual(res.body.missing, ["RESEND_API_KEY", "FEEDBACK_TO_EMAIL"], "names the missing variables so the fix is obvious");
  const half = await post(valid(), { env: { RESEND_API_KEY: "re_secret" } });
  assert.deepEqual(half.body.missing, ["FEEDBACK_TO_EMAIL"]);
  assert.doesNotMatch(JSON.stringify(half.body), /re_secret/, "never a value");
});

test("a provider failure returns 502 and does not leak details", async () => {
  const res = await post(valid(), { fetchImpl: async () => ({ ok: false, status: 401, text: async () => "bad key re_secret" }) });
  assert.equal(res.statusCode, 502);
  assert.doesNotMatch(JSON.stringify(res.body), /re_secret|bad key/);
  assert.equal(res.body.providerStatus, 401, "the status tells a wrong key (401) from an unverified sender (403)");
  const named = await post(valid(), { fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ name: "validation_error", message: "You can only send testing emails to your own email address (me@example.com)" }) }) });
  assert.equal(named.body.providerError, "validation_error");
  assert.doesNotMatch(JSON.stringify(named.body), /me@example|testing emails/, "Resend's message text is never passed on");
  const odd = await post(valid(), { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({ name: "<script>re_secret" }) }) });
  assert.equal(odd.body.providerError, undefined, "only a short lower-case error name is accepted");
  const thrown = await post(valid(), { fetchImpl: async () => { throw new Error("network down"); } });
  assert.equal(thrown.statusCode, 502);
});

test("one client is limited to five messages per window", async () => {
  handler._resetRateLimit();
  const statuses = [];
  for (let i = 0; i < 7; i += 1) statuses.push((await call(valid(), { headers: { "x-forwarded-for": "5.5.5.5" } })).statusCode);
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429, 429]);
  const other = await call(valid(), { headers: { "x-forwarded-for": "6.6.6.6" } });
  assert.equal(other.statusCode, 200, "another client is unaffected");
});
