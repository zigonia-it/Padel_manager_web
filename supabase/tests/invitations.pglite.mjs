// Phase 17 (Q2): invitations without a friend list. Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/invitations.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
const U1 = '00000000-0000-4000-8000-0000000000a1', U2 = '00000000-0000-4000-8000-0000000000a2', U3 = '00000000-0000-4000-8000-0000000000a3';
const T = '00000000-0000-4000-8000-000000000701', T2 = '00000000-0000-4000-8000-000000000702';
const ADMIN = 'admin-token-1234567890';
await pg.exec(`
create role anon; create role authenticated;
grant usage on schema public to anon, authenticated;
create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values ('${U1}', 'Ann@Example.com', now()), ('${U2}', 'bob@example.com', now()), ('${U3}', 'unverified@example.com', null);
create table public.tournaments(id uuid primary key, invite_code text, admin_token text, state jsonb);
create table public.tournament_account_players(tournament_id uuid not null references public.tournaments(id) on delete cascade, player_id uuid not null, user_id uuid not null, primary key (tournament_id, player_id));
create function public.consume_api_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer) returns boolean language sql as $$ select true $$;
insert into public.tournaments values ('${T}', 'INVITE23', '${ADMIN}', '{"name":"Friday Cup","status":"Klar","rounds":[]}'), ('${T2}', 'OTHER234', 'other-admin-token-9999', '{"name":"Other","status":"Klar","rounds":[]}');
`);
await pg.exec(fs.readFileSync(dir + '20260920130000_tournament_invitations.sql', 'utf8'));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const call = async (uid, sql, params = []) => { await pg.exec(`set role ${uid === undefined ? 'anon' : 'authenticated'}; select set_config('request.jwt.claim.sub','${uid ?? ''}',false);`); try { return { data: (await pg.query(sql, params)).rows[0]?.r }; } catch (e) { return { error: e.message }; } finally { await pg.exec(`reset role; select set_config('request.jwt.claim.sub','',false);`); } };
const invite = (email, token = ADMIN, tid = T) => call(undefined, 'select public.admin_invite_player($1,$2,$3) as r', [tid, token, email]);
const mine = (uid) => call(uid, 'select public.list_my_invitations() as r');
const setState = (state, tid = T) => pg.query('update public.tournaments set state = $2::jsonb where id = $1', [tid, JSON.stringify(state)]);

console.log('the admin invites by email');
let r = await invite('  Ann@Example.com ');
ok('an invitation is stored, email normalised', !r.error && r.data.invitations.length === 1 && r.data.invitations[0].email === 'ann@example.com' && r.data.invitations[0].status === 'pending', r.error);
r = await invite('ann@example.com');
ok('inviting the same address again changes nothing', r.data.invitations.length === 1);
r = await invite('ghost@nowhere.example');
ok('an address without an account is accepted the same way (no lookup, no oracle)', !r.error && r.data.invitations.length === 2 && r.data.invitations[1].status === 'pending');
r = await invite('not-an-email');
ok('a malformed address is refused', r.error?.includes('Invalid email'), r.error);
r = await invite('a@b.co\nBcc: x@y.com');
ok('a header-injection attempt is refused', r.error?.includes('Invalid email'), r.error);
r = await invite('bob@example.com', 'wrong-token-1234567890');
ok('a wrong admin token is refused', r.error?.includes('Admin token mismatch'), r.error);
r = await invite('bob@example.com', ADMIN, T2);
ok("the admin token of another tournament does not work here", r.error?.includes('Admin token mismatch'), r.error);
r = await call(undefined, 'select public.admin_list_invitations($1,$2) as r', [T, ADMIN]);
ok('the admin can list the invitations', r.data.invitations.length === 2);
ok('pending invitations do not occupy a player slot', (await pg.query('select count(*)::int as n from public.tournament_account_players')).rows[0].n === 0);

console.log('the invitee sees it only when signed in with that verified email');
r = await mine(U1);
ok('Ann sees her invitation (email compared case-insensitively) with the code to join', !r.error && r.data.length === 1 && r.data[0].inviteCode === 'INVITE23' && r.data[0].tournamentName === 'Friday Cup', r.error + JSON.stringify(r.data));
r = await mine(U2);
ok("Bob, invited by nobody, sees nothing", r.data.length === 0);
r = await mine(U3);
ok('an unverified account sees nothing', r.data.length === 0);
r = await call(undefined, 'select public.list_my_invitations() as r');
ok('a signed-out visitor cannot call it', /permission denied/.test(r.error ?? ''), r.error);
r = await call(undefined, 'select * from public.tournament_invitations');
ok('the table is closed to the API roles', /permission denied/.test(r.error ?? ''), r.error);

console.log('decline, cancel and re-invite');
const annInvite = (await mine(U1)).data[0].id;
r = await call(U2, 'select public.decline_invitation($1) as r', [annInvite]);
ok("someone else cannot decline Ann's invitation", r.data === false);
r = await call(U1, 'select public.decline_invitation($1) as r', [annInvite]);
ok('Ann can decline', r.data === true);
ok('a declined invitation disappears for her and shows as declined to the admin', (await mine(U1)).data.length === 0 && (await call(undefined, 'select public.admin_list_invitations($1,$2) as r', [T, ADMIN])).data.invitations.find((i) => i.email === 'ann@example.com').status === 'declined');
ok('declining created no participant', (await pg.query('select count(*)::int as n from public.tournament_account_players')).rows[0].n === 0);
r = await invite('ann@example.com');
ok('the admin can invite a person who declined again', r.data.invitations.find((i) => i.email === 'ann@example.com').status === 'pending' && (await mine(U1)).data.length === 1);
const ghostId = r.data.invitations.find((i) => i.email === 'ghost@nowhere.example').id;
r = await call(undefined, 'select public.admin_cancel_invitation($1,$2,$3) as r', [T, ADMIN, ghostId]);
ok('the admin can cancel a pending invitation', r.data.invitations.length === 1 && !r.data.invitations.some((i) => i.id === ghostId));
r = await call(undefined, 'select public.admin_cancel_invitation($1,$2,$3) as r', [T, 'wrong-token-1234567890', annInvite]);
ok('cancelling needs the admin token', r.error?.includes('Admin token mismatch'), r.error);

console.log('accepting = joining; the status follows the account');
await pg.query(`insert into public.tournament_account_players values ($1, gen_random_uuid(), $2)`, [T, U1]);
ok('once Ann has joined the tournament the invitation is gone for her', (await mine(U1)).data.length === 0);
ok('and shows as accepted to the admin', (await call(undefined, 'select public.admin_list_invitations($1,$2) as r', [T, ADMIN])).data.invitations.find((i) => i.email === 'ann@example.com').status === 'accepted');

console.log('the cutoff: the first round');
await invite('late@example.com');
await setState({ name: 'Friday Cup', status: 'Runde pågår', rounds: [{ id: 'r1', matches: [] }] });
r = await invite('later@example.com');
ok('no new invitations once the tournament has started', r.error?.includes('already started'), r.error);
const lateId = (await pg.query(`select id from public.tournament_invitations where invitee_email = 'late@example.com'`)).rows[0].id;
ok('pending invitations expire for the admin', (await call(undefined, 'select public.admin_list_invitations($1,$2) as r', [T, ADMIN])).data.invitations.find((i) => i.email === 'late@example.com').status === 'expired');
await pg.query(`insert into auth.users values ('00000000-0000-4000-8000-0000000000a4', 'late@example.com', now())`);
ok('and disappear for the invitee', (await mine('00000000-0000-4000-8000-0000000000a4')).data.length === 0);
await setState({ name: 'Friday Cup', status: 'Avsluttet', rounds: [] });
r = await invite('x@example.com');
ok('a finished tournament takes no invitations', r.error?.includes('already started'), r.error);

console.log('limits and cleanup');
await setState({ name: 'Friday Cup', status: 'Klar', rounds: [] });
for (let i = 0; i < 60; i++) { r = await invite(`p${i}@example.com`); if (r.error) break; }
ok('an admin cannot send unlimited invitations', r.error?.includes('Too many'), r.error);
await pg.query('delete from public.tournaments where id = $1', [T]);
ok('deleting the tournament deletes its invitations', (await pg.query('select count(*)::int as n from public.tournament_invitations where tournament_id = $1', [T])).rows[0].n === 0);
const g = (await pg.query(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon from pg_proc p where p.proname in ('_invitations_json','_invitation_window_closed','list_my_invitations','decline_invitation','admin_invite_player') order by 1`)).rows;
ok('helpers are private; the signed-in-only functions are closed to anon; the token-checked admin function is callable', g.find((x) => x.proname === '_invitations_json').anon === false && g.find((x) => x.proname === 'list_my_invitations').anon === false && g.find((x) => x.proname === 'admin_invite_player').anon === true, JSON.stringify(g));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
