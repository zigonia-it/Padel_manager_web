const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const privacySource = fs.readFileSync(path.join(root, "privacy.html"), "utf8");
const retentionSource = fs.readFileSync(path.join(root, "docs", "data_retention.md"), "utf8");
const runbookSource = fs.readFileSync(path.join(root, "docs", "operations_runbook.md"), "utf8");
const pushSource = fs.readFileSync(path.join(root, "supabase", "functions", "push-send", "index.ts"), "utf8");
const vercelSource = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

test("footer exposes the public privacy page", () => {
  assert.match(indexSource, /href="privacy\.html"/);
  assert.match(indexSource, /Personvern/);
});

test("privacy page covers the beta data handling basics", () => {
  assert.match(privacySource, /behandlingsansvarlig/i);
  assert.match(privacySource, /spillernavn/i);
  assert.match(privacySource, /Supabase/);
  assert.match(privacySource, /Vercel Analytics/);
  assert.match(privacySource, /localStorage/);
  assert.match(privacySource, /IndexedDB/);
  assert.match(privacySource, /Lagringstid og sletting/);
  assert.match(privacySource, /beta-utkast/i);
});

test("retention note records the approved beta policy and profile follow-up", () => {
  assert.match(retentionSource, /30 dager/);
  assert.match(retentionSource, /Anonyme live-turneringer/);
  assert.match(retentionSource, /brukerprofiler/);
  assert.match(retentionSource, /profilen/);
  assert.match(retentionSource, /Vercel Analytics/);
});

test("operations runbook covers deploy, Supabase, rollback and production checks", () => {
  assert.match(runbookSource, /npm test/);
  assert.match(runbookSource, /Supabase-migrering/);
  assert.match(runbookSource, /Backup og rollback/);
  assert.match(runbookSource, /Produksjonssjekk/);
  assert.match(runbookSource, /service-worker\.js/);
});

test("push sender exposes a browser-safe CORS contract and bounded delivery", () => {
  assert.match(pushSource, /Access-Control-Allow-Methods/);
  assert.match(pushSource, /POST, OPTIONS/);
  assert.match(pushSource, /Access-Control-Allow-Headers/);
  assert.match(pushSource, /Promise\.race/);
  assert.match(pushSource, /Push delivery timed out/);
});

test("hosting headers establish basic browser security policy", () => {
  assert.match(vercelSource, /X-Content-Type-Options/);
  assert.match(vercelSource, /Referrer-Policy/);
  assert.match(vercelSource, /Permissions-Policy/);
  assert.match(vercelSource, /Content-Security-Policy/);
});
