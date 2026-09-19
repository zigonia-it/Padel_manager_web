// Database tests for migration 20260920110000_system_owner.sql.
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/system-owner.pglite.mjs
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
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values ('${OWNER}', 'Sigurd.Grodem@live.no'), ('${OTHER}', 'someone@example.com');
create table public.tournaments(id uuid primary key default gen_random_uuid(), state jsonb not null default '{}', created_at timestamptz default now(), updated_at timestamptz default now(), owner_user_id uuid, expired_at timestamptz);
create table public.player_profiles(id uuid primary key default gen_random_uuid());
insert into public.tournaments(state, owner_user_id) values ('{"name":"Cup A","status":"Runde pågår","players":[1,2,3,4]}', null), ('{"name":"Cup B","status":"Avsluttet","players":[1,2]}', '${OWNER}');
insert into public.tournaments(state, expired_at) values ('{"name":"Old","status":"Runde pågår"}', now());
insert into public.player_profiles default values;
`);
await pg.exec(fs.readFileSync(dir + '20260920110000_system_owner.sql', 'utf8'));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const fails = async (sql, expected) => { try { await pg.exec(sql); return { failed: false }; } catch (e) { return { failed: true, message: e.message, matches: expected ? e.message.includes(expected) : true }; } };
const asUser = async (uid, sql) => { await pg.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`); try { return (await pg.query(sql)).rows; } finally { await pg.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); } };
const tryAs = async (uid, sql, expected) => { await pg.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`); try { await pg.query(sql); return { failed: false }; } catch (e) { return { failed: true, matches: expected ? e.message.includes(expected) : true, message: e.message }; } finally { await pg.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); } };

console.log('seed and singleton');
let rows = (await pg.query('select user_id from public.system_owner')).rows;
ok('exactly one owner is seeded, matched case-insensitively by email', rows.length === 1 && rows[0].user_id === OWNER);
let r = await fails(`insert into public.system_owner(user_id) values ('${OTHER}')`);
ok('a second owner row is impossible', r.failed, r.message);
r = await fails(`insert into public.system_owner(singleton, user_id) values (false, '${OTHER}')`);
ok('the singleton flag cannot be faked', r.failed, r.message);

console.log('protection in the database itself');
r = await fails(`delete from public.system_owner`, 'protected');
ok('the owner row cannot be deleted', r.failed && r.matches, r.message);
r = await fails(`update public.system_owner set user_id = '${OTHER}'`, 'protected');
ok('the owner cannot be changed by an ordinary update', r.failed && r.matches, r.message);
r = await fails(`truncate public.system_owner`, 'protected');
ok('the table cannot be truncated', r.failed && r.matches, r.message);
r = await fails(`delete from auth.users where id = '${OWNER}'`);
ok("the owner's account cannot be deleted while it is the owner", r.failed, r.message);
rows = (await pg.query('select user_id from public.system_owner')).rows;
ok('still exactly the same owner after all attempts', rows.length === 1 && rows[0].user_id === OWNER);

console.log('closed to the API roles');
r = await tryAs(OTHER, 'select * from public.system_owner', 'permission denied');
ok('an authenticated user cannot read the table', r.failed && r.matches, r.message);
r = await tryAs(OWNER, 'select * from public.system_owner', 'permission denied');
ok('not even the owner can read it through the API roles', r.failed && r.matches, r.message);
r = await tryAs(OTHER, `insert into public.system_owner(user_id) values ('${OTHER}')`, 'permission denied');
ok('an authenticated user cannot insert', r.failed && r.matches, r.message);
r = await tryAs(null, 'select * from public.system_owner', 'permission denied');
ok('anon cannot read it', r.failed && r.matches, r.message);

console.log('is_system_owner');
ok('true for the owner', (await asUser(OWNER, 'select public.is_system_owner() as v'))[0].v === true);
ok('false for another signed-in user', (await asUser(OTHER, 'select public.is_system_owner() as v'))[0].v === false);
r = await tryAs(null, 'select public.is_system_owner()', 'permission denied');
ok('anon cannot call it', r.failed && r.matches, r.message);
ok('false for a user id that does not exist', (await asUser('00000000-0000-4000-8000-0000000000ff', 'select public.is_system_owner() as v'))[0].v === false);

console.log('admin_overview');
const overview = (await asUser(OWNER, 'select public.admin_overview() as v'))[0].v;
ok('the owner gets the counts', overview.counts.tournaments === 3 && overview.counts.finished === 1 && overview.counts.expired === 1 && overview.counts.running === 1 && overview.counts.accountOwned === 1 && overview.counts.profiles === 1, JSON.stringify(overview.counts));
ok('and the latest tournaments, without tokens or codes', overview.recentTournaments.length === 3 && !JSON.stringify(overview).match(/token|invite/i) && overview.recentTournaments.some((t) => t.name === 'Cup A' && t.players === 4));
r = await tryAs(OTHER, 'select public.admin_overview()', 'Not authorized');
ok('another user is refused', r.failed && r.matches, r.message);
r = await tryAs(null, 'select public.admin_overview()', 'permission denied');
ok('anon cannot call it', r.failed && r.matches, r.message);

console.log('the deliberate transfer path (database owner only)');
await pg.exec(`set app.system_owner_transfer = 'confirmed'; update public.system_owner set user_id = '${OTHER}'; reset app.system_owner_transfer;`);
ok('a confirmed transfer works and the new owner is recognised', (await asUser(OTHER, 'select public.is_system_owner() as v'))[0].v === true && (await asUser(OWNER, 'select public.is_system_owner() as v'))[0].v === false);
r = await fails(`update public.system_owner set user_id = '${OWNER}'`, 'protected');
ok('without the confirmation flag it is refused again', r.failed && r.matches, r.message);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
