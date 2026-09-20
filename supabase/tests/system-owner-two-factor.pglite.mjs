// Database tests for migration 20260920220000_system_owner_two_factor.sql: every owner function needs an aal2 session.
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/system-owner-two-factor.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
const OWNER = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';
await pg.exec(`
create role anon; create role authenticated;
grant usage on schema public to anon, authenticated;
create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz, banned_until timestamptz);
create table auth.sessions(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('sub', current_setting('request.jwt.claim.sub', true), 'aal', nullif(current_setting('request.jwt.claim.aal', true), '')) $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant execute on function auth.jwt() to anon, authenticated;
insert into auth.users(id, email, email_confirmed_at) values ('${OWNER}', 'sigurd.grodem@live.no', now()), ('${OTHER}', 'other@example.com', now());
create table public.tournaments(id uuid primary key default gen_random_uuid(), state jsonb not null default '{}', created_at timestamptz default now(), updated_at timestamptz default now(), owner_user_id uuid references auth.users(id) on delete set null, expired_at timestamptz, retention_expires_at timestamptz);
create table public.player_profiles(id uuid primary key default gen_random_uuid(), deletion_scheduled_for timestamptz);
create table public.tournament_account_players(tournament_id uuid, player_id uuid, user_id uuid references auth.users(id) on delete cascade);
create table public.account_tournament_statistics(user_id uuid references auth.users(id) on delete cascade, tournament_id uuid);
`);
for (const file of ['20260920110000_system_owner.sql', '20260920160000_system_admin_lists.sql', '20260920170000_system_log_and_user_admin.sql', '20260920220000_system_owner_two_factor.sql']) await pg.exec(fs.readFileSync(dir + file, 'utf8'));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const as = async (uid, aal, sql) => {
  await pg.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); select set_config('request.jwt.claim.aal', '${aal ?? ''}', false);`);
  try { return { rows: (await pg.query(sql)).rows }; } catch (e) { return { error: e.message }; } finally { await pg.exec('reset role'); }
};
const value = async (uid, aal, sql) => (await as(uid, aal, sql)).rows?.[0]?.v;

console.log('is_system_owner needs the second factor');
ok('the owner with a password-only session (aal1) is not accepted', (await value(OWNER, 'aal1', 'select public.is_system_owner() as v')) === false);
ok('the owner with no assurance level at all is not accepted', (await value(OWNER, '', 'select public.is_system_owner() as v')) === false);
ok('the owner with a second factor (aal2) is accepted', (await value(OWNER, 'aal2', 'select public.is_system_owner() as v')) === true);
ok('someone else with aal2 is not the owner', (await value(OTHER, 'aal2', 'select public.is_system_owner() as v')) === false);
ok('anon cannot even ask', (await as(null, 'aal2', 'select public.is_system_owner() as v')).error?.includes('permission denied'));

console.log('every owner function refuses an aal1 session');
const calls = {
  admin_overview: 'select public.admin_overview() as v',
  admin_list_tournaments: `select public.admin_list_tournaments('', 'all', 10, 0) as v`,
  admin_list_users: `select public.admin_list_users('', 10, 0) as v`,
  admin_maintenance_status: 'select public.admin_maintenance_status() as v',
  admin_list_log: 'select public.admin_list_log() as v',
  admin_block_user: `select public.admin_block_user('${OTHER}', true) as v`,
  admin_delete_user: `select public.admin_delete_user('${OTHER}') as v`,
};
for (const [name, sql] of Object.entries(calls)) {
  const weak = await as(OWNER, 'aal1', sql);
  ok(`${name}: aal1 is refused`, weak.error?.includes('Not authorized'), weak.error);
}
ok('nothing was blocked or deleted by the refused calls', (await pg.query(`select banned_until is null as free from auth.users where id = '${OTHER}'`)).rows[0]?.free === true);
const strong = await as(OWNER, 'aal2', calls.admin_overview);
ok('admin_overview works with aal2', !strong.error && strong.rows[0].v.counts !== undefined, strong.error);
const blocked = await as(OWNER, 'aal2', calls.admin_block_user);
ok('blocking works with aal2', !blocked.error && blocked.rows[0].v.blocked === true, blocked.error);

console.log('system_owner_status tells the page what to do');
let status = await value(OWNER, 'aal1', 'select public.system_owner_status() as v');
ok('the owner at aal1 is the owner but has no second factor yet', status.owner === true && status.secondFactor === false, JSON.stringify(status));
status = await value(OWNER, 'aal2', 'select public.system_owner_status() as v');
ok('the owner at aal2 is the owner with the second factor', status.owner === true && status.secondFactor === true, JSON.stringify(status));
status = await value(OTHER, 'aal2', 'select public.system_owner_status() as v');
ok('another user is never the owner, whatever the level', status.owner === false, JSON.stringify(status));
const anon = await as(null, 'aal2', 'select public.system_owner_status() as v');
ok('anon cannot call the status function', anon.error?.includes('permission denied'), anon.error);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
