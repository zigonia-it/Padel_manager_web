// Database tests for migration 20260920210000_unverified_user_cleanup.sql (needs the system_owner, system_admin_lists and system_log migrations first).
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/unverified-user-cleanup.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const OWNER = id(1), VERIFIED = id(2), OLD_EXISTING = id(3), NEW_FRESH = id(4), NEW_OLD_ENOUGH = id(5), HAS_TOURNAMENT = id(6), CONFIRMED_LATE = id(7);
await pg.exec(`
create role anon; create role authenticated;
grant usage on schema public to anon, authenticated;
create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz, banned_until timestamptz);
create table auth.sessions(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table public.tournaments(id uuid primary key default gen_random_uuid(), state jsonb not null default '{}', created_at timestamptz default now(), updated_at timestamptz default now(), owner_user_id uuid references auth.users(id) on delete set null, expired_at timestamptz, retention_expires_at timestamptz);
create table public.player_profiles(id uuid primary key default gen_random_uuid(), deletion_scheduled_for timestamptz);
create table public.tournament_account_players(tournament_id uuid, player_id uuid, user_id uuid references auth.users(id) on delete cascade);
create table public.account_tournament_statistics(user_id uuid references auth.users(id) on delete cascade, tournament_id uuid);
insert into auth.users(id, email, email_confirmed_at, created_at) values ('${OWNER}', 'sigurd.grodem@live.no', null, '2026-08-01T00:00:00Z');
`);
await pg.exec(fs.readFileSync(dir + '20260920110000_system_owner.sql', 'utf8'));
await pg.exec(fs.readFileSync(dir + '20260920160000_system_admin_lists.sql', 'utf8'));
await pg.exec(fs.readFileSync(dir + '20260920170000_system_log_and_user_admin.sql', 'utf8'));
await pg.exec(fs.readFileSync(dir + '20260920210000_unverified_user_cleanup.sql', 'utf8'));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const exists = async (uid) => (await pg.query(`select 1 from auth.users where id = $1`, [uid])).rows.length === 1;
const run = async (now) => (await pg.query(`select public.cleanup_unverified_users($1::timestamptz) as n`, [now])).rows[0].n;

// the system owner (seeded by the owner migration from the email above) is unverified here on purpose: it must survive anyway
await pg.exec(`
insert into auth.users(id, email, email_confirmed_at, created_at) values
  ('${VERIFIED}', 'verified@example.com', '2026-08-02T00:00:00Z', '2026-08-01T00:00:00Z'),
  ('${OLD_EXISTING}', 'existing@example.com', null, '2026-08-29T10:00:00Z'),
  ('${NEW_FRESH}', 'fresh@example.com', null, '2026-09-30T10:00:00Z'),
  ('${NEW_OLD_ENOUGH}', 'later@example.com', null, '2026-09-21T10:00:00Z'),
  ('${HAS_TOURNAMENT}', 'owner2@example.com', null, '2026-08-01T00:00:00Z'),
  ('${CONFIRMED_LATE}', 'late@example.com', '2026-09-27T00:00:00Z', '2026-08-01T00:00:00Z');
insert into public.tournaments(owner_user_id) values ('${HAS_TOURNAMENT}');
`);

console.log('before 2026-09-28 nobody is deleted, however old the account');
ok('nothing is deleted on 2026-09-27', (await run('2026-09-27T12:00:00Z')) === 0);
ok('the accounts from before the policy are still there', await exists(OLD_EXISTING));

console.log('on 2026-09-28 the unverified accounts that existed before the policy are deleted');
ok('one is deleted (the system owner and the tournament owner are kept)', (await run('2026-09-28T01:00:00Z')) === 1);
ok('the old unverified account is gone', !(await exists(OLD_EXISTING)));
ok('a verified account is kept', await exists(VERIFIED));
ok('the system owner is kept even though unverified', await exists(OWNER));
ok('an account that owns a tournament is kept', await exists(HAS_TOURNAMENT));
ok('a fresh account is kept', await exists(NEW_FRESH));
ok('an account confirmed before the run is kept', await exists(CONFIRMED_LATE));
ok('the account created 2026-09-21 is kept on 2026-09-28 (its 7 days end 2026-09-28 10:00)', await exists(NEW_OLD_ENOUGH));

console.log('new accounts are deleted 7 days after they were created');
ok('nothing more before the 7 days', (await run('2026-09-28T09:00:00Z')) === 0 && await exists(NEW_OLD_ENOUGH));
ok('one is deleted after its 7 days', (await run('2026-09-28T11:00:00Z')) === 1 && !(await exists(NEW_OLD_ENOUGH)));
ok('the fresh account is deleted after its own 7 days', (await run('2026-10-08T00:00:00Z')) === 1 && !(await exists(NEW_FRESH)));
ok('running again deletes nothing', (await run('2026-12-01T00:00:00Z')) === 0);
ok('the verified account, the owner and the tournament owner are still there after any run', (await exists(VERIFIED)) && (await exists(OWNER)) && (await exists(HAS_TOURNAMENT)));

console.log('log and permissions');
const log = (await pg.query(`select kind, subject_type, detail from public.system_log where kind = 'user_deleted' order by id`)).rows;
ok('each deletion is logged with the reason and no email address', log.length === 3 && log.every((row) => row.detail.reason === 'unverifiedEmail' && !JSON.stringify(row).includes('@')), JSON.stringify(log));
const grants = (await pg.query(`select has_function_privilege('anon', 'public.cleanup_unverified_users(timestamptz)', 'execute') a, has_function_privilege('authenticated', 'public.cleanup_unverified_users(timestamptz)', 'execute') b`)).rows[0];
ok('the function is not callable from the API', !grants.a && !grants.b);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
