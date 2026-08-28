const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const schemaSql = readSql("supabase_schema.sql");
const accessHardeningSql = readSql("supabase/migrations/20260826235212_access_hardening.sql");
const undoSql = readSql("supabase/migrations/20260827000755_admin_undo_match.sql");
const retentionSql = readSql("supabase/migrations/20260827003000_retention_cleanup.sql");
const availabilitySql = readSql("supabase/migrations/20260828090000_player_availability.sql");
const profileSql = readSql("supabase/migrations/20260828100000_player_profiles.sql");
const identitySql = readSql("supabase/migrations/20260828120000_admin_identity.sql");
const lifecycleSql = readSql("supabase/migrations/20260828121000_tournament_lifecycle.sql");
const profileFixSql = readSql("supabase/migrations/20260828122000_profile_history_fixes.sql");
const pushSql = readSql("supabase/migrations/20260828130000_push_subscriptions.sql");
const retentionCronSql = readSql("supabase/migrations/20260828103000_retention_cron.sql");

function readSql(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function normalizeSql(sql) {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

function functionBlock(sql, functionName) {
  const match = sql.match(new RegExp(`create or replace function public\\.${functionName}\\([\\s\\S]*?\\$\\$;`, "i"));
  assert.ok(match, `Expected function public.${functionName} to exist`);
  return match[0];
}

function assertContains(sql, pattern, message) {
  assert.match(normalizeSql(sql), pattern, message);
}

test("public tables keep RLS enabled and private token/rate-limit tables revoked", () => {
  assertContains(schemaSql, /alter table public\.tournaments enable row level security/, "tournaments must use RLS");
  assertContains(schemaSql, /alter table public\.player_sessions enable row level security/, "player_sessions must use RLS");
  assertContains(schemaSql, /alter table public\.api_rate_limits enable row level security/, "api_rate_limits must use RLS");
  assertContains(
    schemaSql,
    /revoke all privileges on table public\.player_sessions from public, anon, authenticated/,
    "player_sessions must not be directly exposed",
  );
  assertContains(
    schemaSql,
    /revoke all privileges on table public\.api_rate_limits from public, anon, authenticated/,
    "api_rate_limits must not be directly exposed",
  );
});

test("anon select grant on tournaments excludes admin_token", () => {
  assertContains(
    schemaSql,
    /grant select \(id, invite_code, state, revision, created_at, updated_at\) on public\.tournaments to anon/,
    "anon should only read non-secret tournament columns",
  );
  assert.doesNotMatch(
    normalizeSql(schemaSql),
    /grant select \([^)]*admin_token[^)]*\) on public\.tournaments to anon/,
    "admin_token must not be granted to anon",
  );
});

test("public RPC wrappers are rate limited and private implementations stay revoked", () => {
  const publicWrappers = [
    "create_tournament",
    "get_tournament_by_code",
    "save_tournament_state",
    "join_tournament",
    "save_player_point",
    "set_player_availability",
    "admin_advance_cup",
    "admin_advance_round",
    "admin_set_result",
    "admin_match_action",
    "admin_undo_match",
    "delete_tournament",
  ];

  for (const rpcName of publicWrappers) {
    const block = functionBlock(schemaSql, rpcName);
    assertContains(block, /security definer/, `${rpcName} wrapper must keep explicit security mode`);
    assertContains(block, /set search_path = public, pg_catalog/, `${rpcName} wrapper must pin search_path`);
    assertContains(block, /consume_api_rate_limit/, `${rpcName} wrapper must enforce rate limiting`);
    assertContains(schemaSql, new RegExp(`grant execute on function public\\.${rpcName.replaceAll("_", "_")}\\(`), `${rpcName} must be granted intentionally`);
  }

  const privateImplementations = [
    "create_tournament_impl(jsonb, text)",
    "get_tournament_by_code_impl(text)",
    "save_tournament_state_impl(uuid, text, jsonb, integer)",
    "join_tournament_impl(text, jsonb)",
    "save_player_point_impl(uuid, text, uuid, uuid, integer, text)",
    "set_player_availability_impl(uuid, text, uuid, text, text)",
    "admin_advance_cup_impl(uuid, text, integer)",
    "admin_advance_round_impl(uuid, text, integer)",
    "admin_set_result_impl(uuid, text, uuid, integer, integer, integer)",
    "admin_match_action_impl(uuid, text, uuid, text, integer, integer)",
    "admin_undo_match_impl(uuid, text, uuid, integer)",
    "delete_tournament_impl(uuid, text)",
  ];

  for (const signature of privateImplementations) {
    assertContains(
      schemaSql,
      new RegExp(`revoke all on function public\\.${signature.replace(/[()]/g, "\\$&")} from public, anon, authenticated`),
      `${signature} must not be callable directly`,
    );
  }
});

test("admin state writes use expected revision and strip local-only secrets", () => {
  const block = functionBlock(schemaSql, "save_tournament_state_impl");

  assertContains(block, /p_expected_revision integer/, "admin state writes must require expected revision");
  assertContains(block, /and t\.revision = p_expected_revision/, "admin state writes must compare-and-swap revision");
  assertContains(block, /revision = t\.revision \+ 1/, "admin state writes must increment revision atomically");
  assertContains(
    block,
    /saved_state := p_state - 'admintoken' - 'playertoken' - 'selectedplayerid' - 'revision'/,
    "admin state writes must strip local-only fields",
  );
});

test("player score writes require token hash and cannot score for another team", () => {
  const block = functionBlock(schemaSql, "save_player_point_impl");

  assertContains(block, /from public\.player_sessions/, "player score must verify a server-issued session");
  assertContains(block, /token_hash = encode\(extensions\.digest\(trim\(p_player_token\), 'sha256'\), 'hex'\)/, "player token must be checked as a hash");
  assertContains(block, /raise exception 'player is not part of this match'/, "player must be part of the scored team");
  assertContains(block, /where id = p_tournament_id\s+and invite_code = upper\(trim\(p_invite_code\)\)\s+for update/, "score writes must lock the target tournament row");
});

test("player availability writes require a session token and preserve atomic revisions", () => {
  const block = functionBlock(availabilitySql, "set_player_availability_impl");

  assertContains(block, /p_availability text/, "availability writes must carry a requested status");
  assertContains(block, /p_availability not in \('active', 'away'\)/, "availability must use the supported statuses");
  assertContains(block, /from public\.player_sessions/, "availability must verify a server-issued session");
  assertContains(block, /token_hash = encode\(extensions\.digest\(trim\(p_player_token\), 'sha256'\), 'hex'\)/, "availability token must be checked as a hash");
  assertContains(block, /for update/, "availability must lock the tournament row");
  assertContains(block, /revision = current_revision \+ 1/, "availability must increment the revision atomically");
  assertContains(availabilitySql, /revoke all on function public\.set_player_availability_impl\(/, "private implementation must be revoked");
  assertContains(availabilitySql, /consume_api_rate_limit/, "availability wrapper must enforce rate limiting");
  assertContains(availabilitySql, /grant execute on function public\.set_player_availability\(uuid, text, uuid, text, text\) to anon/, "public wrapper must be granted intentionally");
});

test("admin match RPCs require token, revision and row locks", () => {
  for (const rpcName of ["admin_match_action_impl", "admin_set_result_impl", "admin_advance_round_impl", "admin_advance_cup_impl", "admin_undo_match_impl"]) {
    const block = functionBlock(schemaSql, rpcName);
    assertContains(block, /p_admin_token text/, `${rpcName} must require admin token`);
    assertContains(block, /p_expected_revision integer/, `${rpcName} must require expected revision`);
    assertContains(block, /and admin_token = p_admin_token/, `${rpcName} must verify admin token`);
    assertContains(block, /current_revision <> p_expected_revision/, `${rpcName} must reject stale writes`);
    assertContains(block, /for update/, `${rpcName} must lock tournament state before mutation`);
  }
});

test("undo snapshots carry source revision and are single-use", () => {
  const block = functionBlock(undoSql, "admin_undo_match_impl");

  assertContains(block, /source_revision := \(undo_state->>'revision'\)::integer/, "undo must read source revision");
  assertContains(block, /current_revision <> source_revision \+ 1/, "undo must reject stale or repeated snapshots");
  assertContains(block, /restored_match := \(undo_state->'match'\)::jsonb - 'lastscoredmatchstate'::text/, "undo must clear the consumed snapshot");
  assertContains(block, /and revision = p_expected_revision/, "undo update must preserve compare-and-swap semantics");
});

test("access hardening migration keeps implementation renames and wrapper revokes together", () => {
  const sql = normalizeSql(accessHardeningSql);

  for (const rpcName of ["create_tournament", "save_tournament_state", "join_tournament", "save_player_point", "admin_match_action", "delete_tournament"]) {
    assert.match(sql, new RegExp(`alter function public\\.${rpcName}\\([^)]+\\) rename to ${rpcName}_impl`), `${rpcName} should be renamed behind a wrapper`);
    assert.match(sql, new RegExp(`revoke all on function public\\.${rpcName}_impl\\(`), `${rpcName}_impl should be revoked in the same hardening migration`);
  }
});

test("retention cleanup is internal, bounded and only removes explicitly ended tournaments", () => {
  const block = functionBlock(schemaSql, "cleanup_expired_tournaments");
  const migration = normalizeSql(retentionSql);

  assertContains(block, /p_retention_days integer default 30/, "cleanup must default to the documented retention window");
  assertContains(block, /p_retention_days < 1 or p_retention_days > 3650/, "cleanup must bound the retention window");
  assertContains(block, /state->>'status' = 'avsluttet'/, "cleanup must only remove explicitly ended tournaments");
  assertContains(block, /coalesce\(retention_expires_at, updated_at \+ make_interval\(days => p_retention_days\)\) <= now\(\)/, "cleanup must use server timestamps");
  assertContains(block, /delete from public\.api_rate_limits/, "cleanup must remove stale rate-limit rows");
  assertContains(
    schemaSql,
    /revoke all on function public\.cleanup_expired_tournaments\(integer\) from public, anon, authenticated/,
    "cleanup must not be callable by public roles",
  );
  assert.match(migration, /revoke all on function public\.cleanup_expired_tournaments\(integer\)/, "migration must preserve the revoke");
  assert.match(lifecycleSql, /retention_expires_at/);
  assert.match(lifecycleSql, /tournaments_lifecycle_dates/);
  assert.match(lifecycleSql, /interval '30 days'/);
});

test("admin identity claim requires authenticated ownership and preserves token compatibility", () => {
  assert.match(identitySql, /owner_user_id uuid references auth\.users/);
  assert.match(identitySql, /auth\.uid\(\) is null/);
  assert.match(identitySql, /admin_token = p_admin_token/);
  assert.match(identitySql, /owner_user_id is null or owner_user_id = auth\.uid\(\)/);
  assert.match(identitySql, /grant execute on function public\.claim_tournament\(uuid, text\) to authenticated/);
  assert.match(identitySql, /revoke all on function public\.claim_tournament\(uuid, text\) from public, anon/);
});

test("push subscriptions are token-bound and private", () => {
  assert.match(pushSql, /create table if not exists public\.push_subscriptions/);
  assert.match(pushSql, /alter table public\.push_subscriptions enable row level security/);
  assert.match(pushSql, /player_sessions/);
  assert.match(pushSql, /token_hash = encode\(extensions\.digest/);
  assert.match(pushSql, /on conflict \(endpoint\) do update/);
  assert.match(pushSql, /revoke all on function public\.upsert_push_subscription/);
  assert.match(pushSql, /grant execute on function public\.upsert_push_subscription.*to anon/);
});

test("profile migration protects profile ownership and delayed deletion", () => {
  assert.match(profileSql, /create table if not exists public\.player_profiles/);
  assert.match(profileSql, /create table if not exists public\.player_profile_history/);
  assert.match(profileSql, /primary key \(profile_id, id\)/);
  assert.match(profileFixSql, /insert into public\.player_profiles[\s\S]*on conflict \(id\)/);
  assert.match(profileFixSql, /insert into public\.player_profile_history[\s\S]*on conflict \(profile_id, id\)/);
  assert.match(profileFixSql, /nullif\(p_history->>'tournamentId', ''\)::uuid/);
  assert.match(profileSql, /alter table public\.player_profiles enable row level security/);
  assert.match(profileSql, /revoke all privileges on table public\.player_profiles from public, anon, authenticated/);
  assert.match(profileSql, /token_hash = encode\(extensions\.digest\(trim\(p_profile_token\), 'sha256'\), 'hex'\)/);
  assert.match(profileSql, /interval '30 days'/);
  assert.match(profileSql, /cleanup_expired_player_profiles/);
  assert.match(retentionCronSql, /cron\.schedule/);
  assert.match(retentionCronSql, /padelstar-retention-cleanup/);
  for (const signature of [
    "upsert_player_profile_impl(uuid, text, text, text)",
    "save_player_profile_history_impl(uuid, text, jsonb)",
    "request_player_profile_deletion_impl(uuid, text)",
    "cancel_player_profile_deletion_impl(uuid, text)",
  ]) {
    assert.match(profileSql, new RegExp(`revoke all on function public\\.${signature.replace(/[()]/g, "\\$&")}`));
  }
  assert.match(profileFixSql, /revoke all on function public\.get_player_profile_history_impl\(uuid, text\)/);
  assert.match(profileSql, /grant execute on function public\.upsert_player_profile\(uuid, text, text, text\) to anon/);
  assert.match(profileSql, /grant execute on function public\.save_player_profile_history\(uuid, text, jsonb\) to anon/);
  assert.match(profileFixSql, /grant execute on function public\.get_player_profile_history\(uuid, text\) to anon/);
});
