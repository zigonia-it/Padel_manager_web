// Database tests for migration 20260920170000_system_log_and_user_admin.sql (needs the system_owner and system_admin_lists migrations first).
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/system-log-users.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
const OWNER = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';
const VICTIM = '00000000-0000-4000-8000-000000000003';
await pg.exec(`
create role anon; create role authenticated;
grant usage on schema public to anon, authenticated;
create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz, banned_until timestamptz);
create table auth.sessions(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users(id, email, email_confirmed_at) values ('${OWNER}', 'sigurd.grodem@live.no', now()), ('${OTHER}', 'other@example.com', now());
create table public.tournaments(id uuid primary key default gen_random_uuid(), state jsonb not null default '{}', created_at timestamptz default now(), updated_at timestamptz default now(), owner_user_id uuid references auth.users(id) on delete set null, expired_at timestamptz, retention_expires_at timestamptz);
create table public.player_profiles(id uuid primary key default gen_random_uuid(), deletion_scheduled_for timestamptz);
create table public.tournament_account_players(tournament_id uuid, player_id uuid, user_id uuid references auth.users(id) on delete cascade);
create table public.account_tournament_statistics(user_id uuid references auth.users(id) on delete cascade, tournament_id uuid);
`);
await pg.exec(fs.readFileSync(dir + '20260920110000_system_owner.sql', 'utf8'));
await pg.exec(fs.readFileSync(dir + '20260920160000_system_admin_lists.sql', 'utf8'));
await pg.exec(fs.readFileSync(dir + '20260920170000_system_log_and_user_admin.sql', 'utf8'));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const asUser = async (uid, sql) => { await pg.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`); try { return (await pg.query(sql)).rows; } finally { await pg.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); } };
const tryAs = async (uid, sql, expected) => { await pg.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`); try { await pg.query(sql); return { failed: false }; } catch (e) { return { failed: true, matches: expected ? e.message.includes(expected) : true, message: e.message }; } finally { await pg.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); } };
const log = async (kind = 'all', limit = 100) => (await asUser(OWNER, `select public.admin_list_log('${kind}', ${limit}, 0) as v`))[0].v;

console.log('what gets logged');
await pg.exec(`insert into auth.users(id, email) values ('${VICTIM}', 'victim@example.com')`);
let r = await log();
ok('a sign-up is logged with the account id only', r.rows.some((x) => x.kind === 'user_signed_up' && x.subject_id === VICTIM) && !JSON.stringify(r).includes('victim@example.com'), JSON.stringify(r));
await pg.exec(`insert into public.tournaments(id, state, owner_user_id) values ('10000000-0000-4000-8000-000000000001', '{"name":"Secret name","status":"Klar","settings":{"format":"cup"}}', '${VICTIM}')`);
r = await log('tournament');
const created = r.rows.find((x) => x.kind === 'tournament_created');
ok('a created tournament is logged (id, format, account flag), never its name', created && created.detail.format === 'cup' && created.detail.accountOwned === true && !JSON.stringify(r).includes('Secret name'), JSON.stringify(r));
await pg.exec(`update public.tournaments set state = jsonb_set(state, '{players}', '[1,2]') where id = '10000000-0000-4000-8000-000000000001'`);
r = await log('tournament');
ok('an update that does not change the status is not logged', r.rows.filter((x) => x.kind === 'tournament_finished').length === 0);
await pg.exec(`update public.tournaments set state = jsonb_set(state, '{status}', '"Avsluttet"') where id = '10000000-0000-4000-8000-000000000001'`);
await pg.exec(`update public.tournaments set state = jsonb_set(state, '{name}', '"x"') where id = '10000000-0000-4000-8000-000000000001'`);
r = await log('tournament');
ok('finishing is logged once', r.rows.filter((x) => x.kind === 'tournament_finished').length === 1);
await pg.exec(`delete from public.tournaments where id = '10000000-0000-4000-8000-000000000001'`);
r = await log('tournament');
const deleted = r.rows.find((x) => x.kind === 'tournament_deleted');
ok('a deleted tournament is logged with its last status', deleted && deleted.detail.status === 'Avsluttet' && deleted.detail.accountOwned === true, JSON.stringify(deleted));
ok('the filter separates users from tournaments', (await log('user')).rows.every((x) => x.kind.startsWith('user_')) && (await log('tournament')).rows.every((x) => x.kind.startsWith('tournament_')));
ok('the log is newest first', (() => { const at = r.rows.map((x) => x.id); return at.every((v, i) => i === 0 || at[i - 1] > v); })());

console.log('the log is closed to everyone but the owner');
let t = await tryAs(OTHER, `select public.admin_list_log()`, 'Not authorized');
ok('another signed-in user is refused', t.failed && t.matches, t.message);
t = await tryAs(null, `select public.admin_list_log()`, 'permission denied');
ok('anon is refused', t.failed && t.matches, t.message);
t = await tryAs(OWNER, `select * from public.system_log`, 'permission denied');
ok('not even the owner can read the table directly through the API roles', t.failed && t.matches, t.message);
t = await tryAs(OTHER, `select public._log_system_event('x','y','z')`, 'permission denied');
ok('nobody can write to the log through the API', t.failed && t.matches, t.message);

console.log('block and unblock');
await pg.exec(`insert into auth.sessions(user_id) values ('${VICTIM}'), ('${VICTIM}')`);
r = (await asUser(OWNER, `select public.admin_block_user('${VICTIM}', true) as v`))[0].v;
ok('blocking answers with the new state', r.blocked === true);
ok('banned_until is set far in the future', (await pg.query(`select banned_until > now() + interval '50 years' as far from auth.users where id = '${VICTIM}'`)).rows[0].far === true);
ok('the sessions of the account are ended', (await pg.query(`select count(*)::int as n from auth.sessions where user_id = '${VICTIM}'`)).rows[0].n === 0);
r = (await asUser(OWNER, `select public.admin_list_users('victim') as v`))[0].v;
ok('the user list says blocked', r.rows[0].blocked === true);
await asUser(OWNER, `select public.admin_block_user('${VICTIM}', false)`);
ok('unblocking clears it', (await pg.query(`select banned_until is null as free from auth.users where id = '${VICTIM}'`)).rows[0].free === true);
r = await log('user');
ok('both actions are logged with the actor', r.rows.some((x) => x.kind === 'user_blocked' && x.actor_id === OWNER) && r.rows.some((x) => x.kind === 'user_unblocked'));
t = await tryAs(OWNER, `select public.admin_block_user('${OWNER}', true)`, 'cannot be blocked');
ok('the owner cannot block themselves', t.failed && t.matches, t.message);
await pg.exec(`insert into auth.users(id, email) values ('00000000-0000-4000-8000-0000000000aa', 'second@example.com')`);
t = await tryAs(OTHER, `select public.admin_block_user('${VICTIM}', true)`, 'Not authorized');
ok('another user cannot block', t.failed && t.matches, t.message);
t = await tryAs(OWNER, `select public.admin_block_user('00000000-0000-4000-8000-0000000000ff', true)`, 'User not found');
ok('an unknown account is refused', t.failed && t.matches, t.message);
ok('nothing about the owner changed', (await pg.query(`select banned_until is null as free from auth.users where id = '${OWNER}'`)).rows[0].free === true);

console.log('delete');
await pg.exec(`insert into public.tournaments(id, state, owner_user_id) values ('10000000-0000-4000-8000-000000000002', '{"name":"Kept","status":"Klar"}', '${VICTIM}')`);
await pg.exec(`insert into public.account_tournament_statistics values ('${VICTIM}', gen_random_uuid())`);
await pg.exec(`insert into public.tournament_account_players values (gen_random_uuid(), gen_random_uuid(), '${VICTIM}')`);
t = await tryAs(OWNER, `select public.admin_delete_user('${OWNER}')`, 'cannot be deleted');
ok('the owner cannot delete themselves', t.failed && t.matches, t.message);
t = await tryAs(OTHER, `select public.admin_delete_user('${VICTIM}')`, 'Not authorized');
ok('another user cannot delete', t.failed && t.matches, t.message);
r = (await asUser(OWNER, `select public.admin_delete_user('${VICTIM}') as v`))[0].v;
ok('deleting answers with what it touched', r.deleted === true && r.ownedTournaments === 1);
ok('the account, its statistics and links are gone', (await pg.query(`select (select count(*) from auth.users where id='${VICTIM}')::int + (select count(*) from public.account_tournament_statistics where user_id='${VICTIM}')::int + (select count(*) from public.tournament_account_players where user_id='${VICTIM}')::int as n`)).rows[0].n === 0);
ok('the tournament it owned stays, without an owner', (await pg.query(`select owner_user_id is null as free from public.tournaments where id = '10000000-0000-4000-8000-000000000002'`)).rows[0].free === true);
r = await log('user');
const del = r.rows.find((x) => x.kind === 'user_deleted');
ok('the deletion is logged by id, without the e-mail address', del && del.subject_id === VICTIM && !JSON.stringify(r).includes('victim@example.com'), JSON.stringify(del));

console.log('retention and safety of the log');
await pg.exec(`insert into public.system_log(at, kind, subject_type) values (now() - interval '91 days', 'user_signed_up', 'user'), (now() - interval '10 days', 'user_signed_up', 'user')`);
const removed = (await pg.query(`select public.cleanup_system_log() as n`)).rows[0].n;
ok('entries older than 90 days are removed, newer ones stay', removed === 1 && (await pg.query(`select count(*)::int as n from public.system_log where at < now() - interval '90 days'`)).rows[0].n === 0);
await pg.exec(`alter table public.system_log rename to system_log_gone`);
let broke = false;
try { await pg.exec(`insert into public.tournaments(state) values ('{"name":"still works"}')`); } catch { broke = true; }
ok('a failing log write never breaks creating a tournament', !broke);
await pg.exec(`alter table public.system_log_gone rename to system_log`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
