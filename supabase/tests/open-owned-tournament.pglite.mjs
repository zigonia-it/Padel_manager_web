// Database tests for migration 20260920150000_open_owned_tournament.sql.
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/open-owned-tournament.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const T_A = '10000000-0000-4000-8000-000000000001';
const T_GUEST = '10000000-0000-4000-8000-000000000002';
await pg.exec(`
create role anon; create role authenticated;
grant usage on schema public to anon, authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create function public.consume_api_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer) returns boolean language sql as $$ select true $$;
create table public.tournaments(id uuid primary key, state jsonb not null default '{}', revision integer not null default 1, admin_token text, owner_user_id uuid);
insert into public.tournaments(id, state, revision, admin_token, owner_user_id) values
 ('${T_A}', '{"name":"Mine","status":"Runde pågår"}', 7, 'secret-admin-token', '${A}'),
 ('${T_GUEST}', '{"name":"Guest","status":"Runde pågår"}', 2, 'guest-token', null);
`);
await pg.exec(fs.readFileSync(dir + '20260920150000_open_owned_tournament.sql', 'utf8'));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const call = async (uid, id) => {
  await pg.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`);
  try { return { rows: (await pg.query(`select public.open_owned_tournament(${id ? `'${id}'` : 'null'}) as r`)).rows }; }
  catch (e) { return { error: e.message }; }
  finally { await pg.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
};

let r = await call(A, T_A);
ok('the owner gets state and admin token', r.rows?.[0]?.r?.adminToken === 'secret-admin-token' && r.rows[0].r.state.name === 'Mine', JSON.stringify(r));
ok('the revision column is merged into the state', r.rows?.[0]?.r?.state?.revision === 7);
r = await call(B, T_A);
ok('another account is refused', r.error === 'Tournament not found', JSON.stringify(r));
r = await call(A, T_GUEST);
ok('a tournament without an owner is refused for everyone', r.error === 'Tournament not found', JSON.stringify(r));
r = await call(A, '10000000-0000-4000-8000-0000000000ff');
ok('unknown id gives the same answer as someone else\'s', r.error === 'Tournament not found', JSON.stringify(r));
r = await call(null, T_A);
ok('anon cannot call it', r.error?.includes('permission denied'), JSON.stringify(r));
r = await call(A, null);
ok('null id is refused', r.error === 'Tournament not found', JSON.stringify(r));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
