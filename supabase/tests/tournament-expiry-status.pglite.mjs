// Database tests for migration 20260920240000_tournament_expiry_status.sql.
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/tournament-expiry-status.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
await pg.exec(`
create role anon; create role authenticated;
create table public.tournaments(id uuid primary key, invite_code text, admin_token text, state jsonb default '{}', revision int default 0, expired_at timestamptz);
create or replace function public.consume_api_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer) returns boolean language sql as $$ select true $$;
`);
await pg.exec(fs.readFileSync(dir + '20260920240000_tournament_expiry_status.sql', 'utf8'));

const T1 = '00000000-0000-4000-8000-000000000001', T2 = '00000000-0000-4000-8000-000000000002';
const A1 = '11111111-2222-4333-8444-555555555551', A2 = '11111111-2222-4333-8444-555555555552';
await pg.exec(`
insert into public.tournaments(id, admin_token, expired_at) values ('${T1}', '${A1}', null), ('${T2}', '${A2}', '2026-09-10T12:00:00Z');
`);
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const call = async (id, token) => { try { return { data: (await pg.query(`select public.admin_tournament_expiry($1, $2) as r`, [id, token])).rows[0].r }; } catch (e) { return { error: e.message }; } };

let r = await call(T1, A1);
ok('an active tournament is not expired', r.data?.expired === false && r.data.deletesAt === null, JSON.stringify(r));
r = await call(T2, A2);
ok('an expired tournament says so and when it will be deleted (7 days later)', r.data?.expired === true && new Date(r.data.deletesAt).toISOString() === '2026-09-17T12:00:00.000Z', JSON.stringify(r));
ok('the expiry moment is returned', new Date(r.data?.expiredAt).toISOString() === '2026-09-10T12:00:00.000Z');
r = await call(T2, A1);
ok("another tournament's admin token is refused", r.error?.includes('Admin token mismatch'), r.error);
r = await call(T2, 'short');
ok('a malformed token is refused', r.error?.includes('Invalid expiry request'), r.error);
r = await call(null, A1);
ok('a missing id is refused', r.error?.includes('Invalid expiry request'), r.error);
const before = (await pg.query(`select expired_at from public.tournaments where id = $1`, [T2])).rows[0].expired_at;
await call(T2, A2);
ok('reading changes nothing', String((await pg.query(`select expired_at from public.tournaments where id = $1`, [T2])).rows[0].expired_at) === String(before));
const g = (await pg.query(`select has_function_privilege('anon','public.admin_tournament_expiry(uuid,text)','execute') a, has_function_privilege('anon','public.admin_tournament_expiry_impl(uuid,text)','execute') b, has_function_privilege('authenticated','public.admin_tournament_expiry_impl(uuid,text)','execute') c`)).rows[0];
ok('the wrapper is callable, the implementation is not', g.a === true && g.b === false && g.c === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
