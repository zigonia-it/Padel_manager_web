// Database tests for migration 20260920160000_system_admin_lists.sql (needs 20260920110000_system_owner.sql first).
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/system-admin-lists.pglite.mjs
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
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz, encrypted_password text default 'secret-hash');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users(id, email, email_confirmed_at, created_at) values ('${OWNER}', 'sigurd.grodem@live.no', now(), now() - interval '10 days'), ('${OTHER}', 'Someone_100%@example.com', null, now() - interval '1 day');
create table public.tournaments(id uuid primary key default gen_random_uuid(), state jsonb not null default '{}', created_at timestamptz default now(), updated_at timestamptz default now(), owner_user_id uuid, expired_at timestamptz, retention_expires_at timestamptz, invite_code text default 'ABCD1234', admin_token text default 'tok');
create table public.player_profiles(id uuid primary key default gen_random_uuid(), deletion_scheduled_for timestamptz);
create table public.tournament_account_players(tournament_id uuid, player_id uuid, user_id uuid);
create table public.account_tournament_statistics(user_id uuid, tournament_id uuid);
insert into public.tournaments(state, owner_user_id, created_at, updated_at) values
  ('{"name":"Cup A","status":"Runde pågår","players":[1,2,3,4],"rounds":[1],"settings":{"format":"cup"}}', null, now() - interval '3 days', now()),
  ('{"name":"Liga_100%","status":"Avsluttet","players":[1,2],"rounds":[1,2]}', '${OWNER}', now() - interval '2 days', now()),
  ('{"name":"Gammel","status":"Runde pågår","players":[1]}', null, now() - interval '60 days', now() - interval '40 days');
insert into public.tournaments(state, expired_at, created_at) values ('{"name":"Utløpt","status":"Runde pågår"}', now() - interval '8 days', now() - interval '90 days');
insert into public.tournaments(state, retention_expires_at, created_at) values ('{"name":"Ferdig gammel","status":"Avsluttet"}', now() - interval '1 hour', now() - interval '30 days');
insert into public.player_profiles(deletion_scheduled_for) values (now() - interval '1 day'), (null);
insert into public.tournament_account_players values (gen_random_uuid(), gen_random_uuid(), '${OWNER}');
insert into public.account_tournament_statistics values ('${OWNER}', gen_random_uuid());
`);
await pg.exec(fs.readFileSync(dir + '20260920110000_system_owner.sql', 'utf8'));
await pg.exec(fs.readFileSync(dir + '20260920160000_system_admin_lists.sql', 'utf8'));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const asUser = async (uid, sql) => { await pg.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`); try { return (await pg.query(sql)).rows; } finally { await pg.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); } };
const tryAs = async (uid, sql, expected) => { await pg.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`); try { await pg.query(sql); return { failed: false }; } catch (e) { return { failed: true, matches: expected ? e.message.includes(expected) : true, message: e.message }; } finally { await pg.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); } };
const T = async (args) => (await asUser(OWNER, `select public.admin_list_tournaments(${args}) as v`))[0].v;
const U = async (args) => (await asUser(OWNER, `select public.admin_list_users(${args}) as v`))[0].v;

console.log('admin_list_tournaments');
let r = await T('');
ok('lists every tournament with a total', r.total === 5 && r.rows.length === 5, JSON.stringify(r).slice(0, 200));
ok('newest first', r.rows[0].name === 'Cup A' || r.rows[0].name === 'Liga_100%');
ok('no tokens, invite codes or ids of people', !/token|invite|tok\b|ABCD1234/i.test(JSON.stringify(r)));
ok('row fields: players, rounds, format, account flag', r.rows.some((x) => x.name === 'Cup A' && x.players === 4 && x.rounds === 1 && x.format === 'cup' && x.account_owned === false));
r = await T(`'cup'`);
ok('search by name is case-insensitive', r.total === 1 && r.rows[0].name === 'Cup A');
r = await T(`'100%'`);
ok('a % in the search is matched literally', r.total === 1 && r.rows[0].name === 'Liga_100%', JSON.stringify(r));
r = await T(`'_'`);
ok('a _ in the search is matched literally', r.total === 1, JSON.stringify(r));
r = await T(`null, 'running'`);
ok('status running = not finished and not expired', r.total === 2 && r.rows.every((x) => x.status !== 'Avsluttet' && !x.expired_at), JSON.stringify(r).slice(0, 300));
r = await T(`null, 'finished'`);
ok('status finished', r.total === 2 && r.rows.every((x) => x.status === 'Avsluttet'));
r = await T(`null, 'expired'`);
ok('status expired', r.total === 1 && r.rows[0].name === 'Utløpt');
r = await T(`null, 'nonsense'`);
ok('an unknown status filter means all', r.total === 5);
r = await T(`null, 'all', 2, 0`);
ok('paging: limit 2 offset 0', r.rows.length === 2 && r.total === 5 && r.limit === 2 && r.offset === 0);
r = await T(`null, 'all', 2, 4`);
ok('paging: last page has the remainder', r.rows.length === 1 && r.offset === 4);
r = await T(`null, 'all', 100000, -5`);
ok('limit is capped at 100 and a negative offset becomes 0', r.limit === 100 && r.offset === 0);
r = await tryAs(OTHER, `select public.admin_list_tournaments()`, 'Not authorized');
ok('another signed-in user is refused', r.failed && r.matches, r.message);
r = await tryAs(null, `select public.admin_list_tournaments()`, 'permission denied');
ok('anon cannot call it', r.failed && r.matches, r.message);

console.log('admin_list_users');
r = await U('');
ok('lists accounts with a total', r.total === 2 && r.rows.length === 2);
const owner = r.rows.find((x) => x.email === 'sigurd.grodem@live.no');
ok('counts: owned, played, finished; owner flag; confirmed flag', owner && owner.owned_tournaments === 1 && owner.played_tournaments === 1 && owner.finished_tournaments === 1 && owner.is_system_owner === true && owner.email_confirmed === true, JSON.stringify(owner));
ok('an unconfirmed account is flagged', r.rows.find((x) => x.id === OTHER).email_confirmed === false);
ok('password data is never returned', !/secret|encrypted|hash/i.test(JSON.stringify(r)));
r = await U(`'someone_100%'`);
ok('search by e-mail matches wildcards literally', r.total === 1 && r.rows[0].id === OTHER, JSON.stringify(r));
r = await U(`'%'`);
ok('a bare % matches only addresses containing a %', r.total === 1 && r.rows[0].id === OTHER, JSON.stringify(r));
r = await tryAs(OTHER, `select public.admin_list_users()`, 'Not authorized');
ok('another signed-in user is refused', r.failed && r.matches, r.message);
r = await tryAs(null, `select public.admin_list_users()`, 'permission denied');
ok('anon cannot call it', r.failed && r.matches, r.message);

console.log('admin_maintenance_status');
r = (await asUser(OWNER, 'select public.admin_maintenance_status() as v'))[0].v;
ok('waiting counts', r.waiting.expired === 1 && r.waiting.expiredDeletionDue === 1 && r.waiting.finishedRetentionDue === 1 && r.waiting.idleOver30Days === 1 && r.waiting.profileDeletionDue === 1, JSON.stringify(r.waiting));
ok('without pg_cron the job list is empty instead of failing', Array.isArray(r.jobs) && r.jobs.length === 0);
r = await tryAs(OTHER, `select public.admin_maintenance_status()`, 'Not authorized');
ok('another signed-in user is refused', r.failed && r.matches, r.message);
r = await tryAs(null, `select public.admin_maintenance_status()`, 'permission denied');
ok('anon cannot call it', r.failed && r.matches, r.message);
r = await tryAs(OWNER, `select public._admin_like('x')`, 'permission denied');
ok('the helper is not callable through the API', r.failed && r.matches, r.message);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
