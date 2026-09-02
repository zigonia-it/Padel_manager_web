const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const source = fs.readFileSync(path.join(root, "app", "account-auth.js"), "utf8");
const adminSource = fs.readFileSync(path.join(root, "app", "admin-identity.js"), "utf8");
const authMigration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260902210348_auth_profiles_and_registered_join.sql"), "utf8");

test("account flow supports password auth and shared admin sessions", () => {
  assert.match(index, /id="accountAuthForm"/);
  assert.match(index, /id="accountAuthEmail"[^>]*type="email"/);
  assert.match(index, /id="accountAuthPassword"[^>]*type="password"/);
  assert.match(source, /auth\.signInWithPassword/);
  assert.match(source, /auth\.signUp/);
  assert.match(source, /auth\.signOut/);
  assert.match(adminSource, /adminIdentityForm\?\.classList\.add\("hidden"\)/);
  assert.match(authMigration, /create table if not exists public\.profiles/);
  assert.match(authMigration, /references auth\.users\(id\)/);
  assert.match(authMigration, /auth\.uid\(\)/);
  assert.match(authMigration, /guest.*false/);
});
