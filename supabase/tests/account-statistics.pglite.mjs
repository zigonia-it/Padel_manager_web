// Phase 15: permanent, account-owned statistics. Uses the real table definitions (migration 20260913123550) and the live
// finalize_tournament (20260919170000). Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/account-statistics.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
const U1 = '00000000-0000-4000-8000-0000000000a1', U2 = '00000000-0000-4000-8000-0000000000a2', U3 = '00000000-0000-4000-8000-0000000000a3';
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
await pg.exec(`
create role anon; create role authenticated;
grant usage on schema public to anon, authenticated;
create schema extensions;
create function extensions.digest(t text, alg text) returns bytea language sql immutable as $$ select decode(md5(t),'hex') $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values ('${U1}'), ('${U2}'), ('${U3}');
create table public.tournaments(id uuid primary key, invite_code text, admin_token text, state jsonb, created_at timestamptz default now(),
  updated_at timestamptz default now(), revision int default 0, owner_user_id uuid, claimed_at timestamptz, ended_at timestamptz,
  retention_expires_at timestamptz, owner_profile_id text);
`);
// the real table definitions: everything before the join function in the account-statistics migration
const source = fs.readFileSync(dir + '20260913123550_account_tournament_finalization.sql', 'utf8');
await pg.exec(source.slice(0, source.indexOf('-- Do not backfill')));
await pg.exec(`
create function public.guard_tournament_finalization_update() returns trigger language plpgsql as $$
begin
  if old.state->>'status' = 'Avsluttet' and new.state is distinct from old.state then raise exception 'Finalized tournament is read-only'; end if;
  if new.state->>'status' = 'Avsluttet' and old.state->>'status' is distinct from 'Avsluttet'
    and not exists(select 1 from public.tournament_finalization_receipts where tournament_id = old.id) then
    raise exception 'Use finalize_tournament to save statistics before completion'; end if;
  return new; end $$;
create function public.guard_tournament_history_deletion() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.tournament_finalization_receipts where tournament_id = old.id) then raise exception 'Finalize tournament statistics before deletion'; end if;
  return old; end $$;
create trigger tournament_finalization_before_update before update on public.tournaments for each row execute function public.guard_tournament_finalization_update();
create trigger tournament_history_before_delete before delete on public.tournaments for each row execute function public.guard_tournament_history_deletion();
`);
await pg.exec(fs.readFileSync(dir + '20260919170000_guest_finish_retention.sql', 'utf8'));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const TOKEN = 'admintoken-1234567890';
const P = { A: uuid(101), B: uuid(102), C: uuid(103), D: uuid(104) };
let seq = 0;
// A (user 1) and B (guest) play C (user 2) and D (guest); one finished match, one still playing.
async function tournament({ sets, winner, owner = null }) {
  seq += 1;
  const id = uuid(5000 + seq);
  const side = (a, b) => ({ players: [{ id: P[a], name: a }, { id: P[b], name: b }] });
  const state = { status: 'Runde pågår', adminToken: 'x', settings: {}, revision: 1, rounds: [{ id: 'r1', status: 'active', matches: [
    { id: uuid(11), state: 'finished', winnerTeamIndex: winner, teamOne: side('A', 'B'), teamTwo: side('C', 'D'), completedSets: sets },
    { id: uuid(12), state: 'playing', winnerTeamIndex: null, teamOne: side('A', 'C'), teamTwo: side('B', 'D'), completedSets: [{ teamOne: 6, teamTwo: 0 }] },
  ] }] };
  await pg.query(`insert into public.tournaments(id,invite_code,admin_token,state,revision,owner_user_id) values ($1,$2,$3,$4::jsonb,1,$5)`, [id, 'ST' + String(seq).padStart(6, '0'), TOKEN, JSON.stringify(state), owner]);
  await pg.query(`insert into public.tournament_account_players values ($1,$2,$3), ($1,$4,$5)`, [id, P.A, U1, P.C, U2]);
  return id;
}
const finalize = (id, outcome = 'completed') => pg.query(`select public.finalize_tournament($1,$2,1,$3) as r`, [id, TOKEN, outcome]).then((r) => r.rows[0].r);
const stats = async (id) => Object.fromEntries((await pg.query(`select * from public.account_tournament_statistics where tournament_id = $1`, [id])).rows.map((r) => [r.user_id, r]));

console.log('account-owned history and personal statistics');
let id = await tournament({ sets: [{ teamOne: 6, teamTwo: 3 }], winner: 0 });
await finalize(id);
let s = await stats(id);
ok('a row per account player, none for the guests', Object.keys(s).length === 2 && s[U1] && s[U2], JSON.stringify(Object.keys(s)));
ok("A's winning team: 1 match, 1 win, 1 set, 6 games", s[U1].matches === 1 && s[U1].wins === 1 && s[U1].sets === 1 && s[U1].games === 6, JSON.stringify(s[U1]));
ok("C's losing team: 1 match, 0 wins, 0 sets, 3 games", s[U2].matches === 1 && s[U2].wins === 0 && s[U2].sets === 0 && s[U2].games === 3, JSON.stringify(s[U2]));
ok('a match that was not finished counts for nobody', s[U1].matches === 1 && s[U2].matches === 1);
ok('the outcome is saved with the row', s[U1].outcome === 'completed' && !!s[U1].ended_at);

console.log('corrections recalculate the authoritative statistics');
id = await tournament({ sets: [{ teamOne: 6, teamTwo: 3 }], winner: 0 });
// the admin corrects the result before finishing (Phase 12): the sets and the winner flip
await pg.query(`update public.tournaments set state = jsonb_set(jsonb_set(state, '{rounds,0,matches,0,completedSets}', '[{"teamOne":2,"teamTwo":6}]'), '{rounds,0,matches,0,winnerTeamIndex}', '1') where id = $1`, [id]);
await finalize(id);
s = await stats(id);
ok('the statistics come from the corrected result: A now lost, C won', s[U1].wins === 0 && s[U1].games === 2 && s[U2].wins === 1 && s[U2].games === 6 && s[U2].sets === 1, JSON.stringify([s[U1], s[U2]]));
const closed = await pg.query(`update public.tournaments set state = jsonb_set(state, '{rounds,0,matches,0,winnerTeamIndex}', '0') where id = $1`, [id]).then(() => false, (e) => e.message);
ok('after finishing, the result can no longer be changed (so the statistics cannot drift)', typeof closed === 'string' && closed.includes('read-only'), closed);

console.log('finalizing twice does not duplicate anything');
const before = (await pg.query('select count(*)::int as n from public.account_tournament_statistics')).rows[0].n;
await finalize(id);
ok('a retry returns the receipt and adds no rows', (await pg.query('select count(*)::int as n from public.account_tournament_statistics')).rows[0].n === before);

console.log("deleting a tournament does not delete anybody's statistics");
const owned = await tournament({ sets: [{ teamOne: 6, teamTwo: 4 }], winner: 0, owner: U1 });
await finalize(owned);
const rowsBefore = Object.keys(await stats(owned)).length;
await pg.query('delete from public.tournaments where id = $1', [owned]);
s = await stats(owned);
ok("the owner's deletion leaves every player's statistics", rowsBefore === 2 && Object.keys(s).length === 2 && s[U1] && s[U2]);
ok('the account bindings of the deleted tournament are gone', (await pg.query('select count(*)::int as n from public.tournament_account_players where tournament_id = $1', [owned])).rows[0].n === 0);
const early = await tournament({ sets: [], winner: null });
const refused = await pg.query('delete from public.tournaments where id = $1', [early]).then(() => false, (e) => e.message);
ok('a tournament cannot be deleted before its statistics were saved', typeof refused === 'string' && refused.includes('Finalize tournament statistics'), refused);

console.log('who can see and change the statistics');
const as = async (uid, sql) => { await pg.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub','${uid ?? ''}',false);`); try { return { rows: (await pg.query(sql)).rows }; } catch (e) { return { error: e.message }; } finally { await pg.exec(`reset role; select set_config('request.jwt.claim.sub','',false);`); } };
let r = await as(U1, 'select user_id from public.account_tournament_statistics');
ok('each account reads only its own rows', r.rows?.length > 0 && r.rows.every((x) => x.user_id === U1), JSON.stringify(r));
r = await as(U3, 'select * from public.account_tournament_statistics');
ok('an account with no tournaments sees nothing', r.rows?.length === 0, JSON.stringify(r));
r = await as(U1, `delete from public.account_tournament_statistics where user_id = '${U1}'`);
ok('an account cannot delete its own or anyone\'s statistics through the API', /permission denied/.test(r.error ?? ''), JSON.stringify(r));
r = await as(U1, `update public.account_tournament_statistics set wins = 99`);
ok('and cannot edit them', /permission denied/.test(r.error ?? ''), JSON.stringify(r));
r = await as(null, 'select * from public.account_tournament_statistics');
ok('an anonymous visitor cannot read them', /permission denied/.test(r.error ?? ''), JSON.stringify(r));

console.log('cancelled tournaments');
id = await tournament({ sets: [{ teamOne: 6, teamTwo: 3 }], winner: 0 });
await finalize(id, 'cancelled');
s = await stats(id);
ok('a cancelled tournament still records what was played, marked cancelled', s[U1]?.outcome === 'cancelled' && s[U1].matches === 1);

console.log('a failed statistics transfer changes nothing (all or nothing)');
id = await tournament({ sets: [{ teamOne: 6, teamTwo: 3 }], winner: 0 });
// corrupt one finished match so the statistics cannot be computed
await pg.query(`update public.tournaments set state = jsonb_set(state, '{rounds,0,matches,0,completedSets}', '[{"teamOne":-1,"teamTwo":3}]') where id = $1`, [id]);
const statsBefore = (await pg.query('select count(*)::int as n from public.account_tournament_statistics')).rows[0].n;
const failedFinalize = await finalize(id).then(() => null, (e) => e.message);
ok('the finalization is refused with a clear error', typeof failedFinalize === 'string' && failedFinalize.includes('Invalid set score'), failedFinalize);
ok('no statistics rows were written', (await pg.query('select count(*)::int as n from public.account_tournament_statistics')).rows[0].n === statsBefore);
ok('no receipt was written, so the tournament is not marked as saved', (await pg.query('select count(*)::int as n from public.tournament_finalization_receipts where tournament_id = $1', [id])).rows[0].n === 0);
ok('the tournament is still running and can be corrected and finished', (await pg.query(`select state->>'status' as s from public.tournaments where id = $1`, [id])).rows[0].s === 'Runde pågår');
await pg.query(`update public.tournaments set state = jsonb_set(state, '{rounds,0,matches,0,completedSets}', '[{"teamOne":6,"teamTwo":4}]') where id = $1`, [id]);
await finalize(id);
ok('after the data is fixed the same finalization succeeds', Object.keys(await stats(id)).length === 2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
