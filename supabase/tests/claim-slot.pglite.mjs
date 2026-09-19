// Phase 17: claiming a pre-added slot. Runs the real join_tournament_impl (20260917101913) and the new guard
// (20260920120000). Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/claim-slot.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
const U1 = '00000000-0000-4000-8000-0000000000a1', U2 = '00000000-0000-4000-8000-0000000000a2';
await pg.exec(`
create role anon; create role authenticated;
create schema extensions;
create function extensions.digest(t text, alg text) returns bytea language sql immutable as $$ select decode(md5(t),'hex') $$;
create function extensions.gen_random_bytes(n int) returns bytea language sql as $$ select decode(substr(md5(random()::text) || md5(random()::text) || md5(random()::text), 1, n * 2), 'hex') $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
insert into auth.users values ('${U1}'), ('${U2}');
create table public.tournaments(id uuid primary key, invite_code text unique, admin_token text, state jsonb, revision int default 0);
create table public.player_sessions(id uuid primary key default gen_random_uuid(), tournament_id uuid not null, player_id uuid not null, token_hash text not null);
create table public.tournament_account_players(tournament_id uuid not null references public.tournaments(id) on delete cascade, player_id uuid not null, user_id uuid not null references auth.users(id), primary key (tournament_id, player_id), unique (tournament_id, user_id));
`);
// the real join_tournament_impl, extracted from its migration
const impl = fs.readFileSync(dir + '20260917101913_player_accent_choice.sql', 'utf8');
const start = impl.indexOf('create or replace function public.join_tournament_impl');
const end = impl.indexOf('$function$;', impl.indexOf('$function$', start) + 10) + '$function$;'.length;
await pg.exec(impl.slice(start, end));
await pg.exec(fs.readFileSync(dir + '20260920120000_claim_unlinked_slot.sql', 'utf8'));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const T = '00000000-0000-4000-8000-000000000501';
const P = { carl: '00000000-0000-4000-8000-000000000601', dina: '00000000-0000-4000-8000-000000000602', erik: '00000000-0000-4000-8000-000000000603' };
async function fresh({ started = false } = {}) {
  await pg.exec('delete from public.player_sessions; delete from public.tournament_account_players; delete from public.tournaments;');
  const players = Object.entries(P).map(([name, id]) => ({ id, name: name[0].toUpperCase() + name.slice(1), active: true, joinedFrom: 'admin' }));
  await pg.query(`insert into public.tournaments(id, invite_code, admin_token, state, revision) values ($1, 'CLAIM234', 'x', $2::jsonb, 1)`, [T, JSON.stringify({ status: 'Klar', players, rounds: started ? [{ id: 'r1', matches: [] }] : [] })]);
}
const join = async (uid, name) => { try { await pg.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ''}', false)`); const r = await pg.query(`select public.join_tournament_authenticated_impl('CLAIM234', $1::jsonb) as r`, [JSON.stringify({ name })]); return { data: r.rows[0].r }; } catch (e) { return { error: e.message }; } finally { await pg.exec(`select set_config('request.jwt.claim.sub', '', false)`); } };
const binding = async (playerId) => (await pg.query('select user_id from public.tournament_account_players where player_id = $1', [playerId])).rows[0]?.user_id ?? null;
const sessions = async (playerId) => (await pg.query('select count(*)::int as n from public.player_sessions where player_id = $1', [playerId])).rows[0].n;

console.log('an account claims an unclaimed, unlinked slot');
await fresh();
let r = await join(U1, 'carl');
ok('the claim works (case-insensitive name)', !r.error && r.data.playerId === P.carl, r.error);
ok('the slot is linked to the account', (await binding(P.carl)) === U1);
ok('the account gets a session token for that slot', (await sessions(P.carl)) === 1 && /^[0-9a-f]{48}$/.test(r.data.playerToken));
ok("the roster entry shows the account link and is no longer a guest", r.data.state.players.find((p) => p.id === P.carl).userId === U1 && r.data.state.players.find((p) => p.id === P.carl).guest === false);

console.log('no takeover of a slot someone else holds');
r = await join(U2, 'carl');
ok('another account cannot claim a slot linked to an account', r.error?.includes('belongs to another session'), r.error);
ok('and gets no token', (await sessions(P.carl)) === 1);
await fresh();
await pg.query(`insert into public.player_sessions(tournament_id, player_id, token_hash) values ($1, $2, 'guest-device-hash')`, [T, P.dina]);
r = await join(U1, 'dina');
ok('an account cannot take over a slot a guest device already claimed', r.error?.includes('belongs to another session'), r.error);
ok('the guest slot stays unlinked and has no extra token', (await binding(P.dina)) === null && (await sessions(P.dina)) === 1);

console.log('rejoin and one slot per account');
await fresh();
await join(U1, 'carl');
r = await join(U1, 'carl');
ok('the same account can rejoin its own slot', !r.error && (await sessions(P.carl)) === 2, r.error);
r = await join(U1, 'erik');
ok('an account cannot also claim a second slot in the same tournament', r.error?.includes('Account already joined'), r.error);
ok('the second slot stays free', (await binding(P.erik)) === null);

console.log('other rules are unchanged');
await fresh();
r = await join(U1, 'Newcomer');
ok('a new name still joins as a new player (before the start)', !r.error && r.data.state.players.length === 4, r.error);
await fresh({ started: true });
r = await join(U1, 'Latecomer');
ok('after the start a new name is still refused', r.error?.includes('already started'), r.error);
r = await join(U1, 'carl');
ok('but claiming a pre-added slot after the start still works (replacement flow is for changes)', !r.error, r.error);
await pg.query(`update public.tournaments set state = jsonb_set(state, '{status}', '"Avsluttet"')`);
r = await join(U2, 'dina');
ok('a finished tournament cannot be joined', r.error?.includes('not active'), r.error);
await fresh();
r = await join(null, 'erik');
ok('a guest (no account) can still claim an unclaimed slot', !r.error && (await binding(P.erik)) === null, r.error);
const grants = (await pg.query(`select has_function_privilege('anon', 'public.join_tournament_authenticated_impl(text, jsonb)', 'execute') as anon`)).rows[0];
ok('the implementation is still not callable by the API roles', grants.anon === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
