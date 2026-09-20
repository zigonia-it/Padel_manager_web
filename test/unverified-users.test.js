// Accounts whose email is not verified within 7 days are deleted (0.13.1). The rules run in the database
// (supabase/tests/unverified-user-cleanup.pglite.mjs); these checks keep the migration and the texts in step.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("the cleanup is a private, scheduled function that spares the owner and tournament owners", () => {
  const sql = read("supabase", "migrations", "20260920210000_unverified_user_cleanup.sql");
  assert.match(sql, /email_confirmed_at is null/);
  assert.match(sql, /created_at \+ interval '7 days'/);
  assert.match(sql, /timestamptz '2026-09-28 00:00:00\+02'/, "nobody is deleted before the developer's date");
  assert.match(sql, /not exists \(select 1 from public\.system_owner/);
  assert.match(sql, /not exists \(select 1 from public\.tournaments t where t\.owner_user_id = u\.id\)/);
  assert.match(sql, /revoke execute on function public\.cleanup_unverified_users\(timestamptz\) from public, anon, authenticated/);
  assert.match(sql, /cron\.schedule\('padelstar-unverified-users', '20 3 \* \* \*'/);
  assert.doesNotMatch(sql, /grant execute/, "not callable from the API");
});

test("the sign-up message and the privacy page tell people about the 7 days", () => {
  const i18n = vm.createContext({ window: {} });
  vm.runInContext(read("app", "translations.js"), i18n);
  for (const language of ["nb", "en"]) assert.match(i18n.window.PadelstarTranslations[language]["account.authConfirmEmail"], /7/, language);
  const privacy = read("app", "privacy-i18n.js");
  assert.match(privacy, /ikke er bekreftet innen 7 dager, slettes automatisk/);
  assert.match(privacy, /has not been verified within 7 days are deleted automatically/);
  assert.match(read("privacy.html"), /ikke er bekreftet innen 7 dager, slettes automatisk/);
});
