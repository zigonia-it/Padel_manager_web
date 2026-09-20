// Corrections after the tournament is finished (migration 20260920180000): the result changes, the statistics follow.
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/corrections-after-finish.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
const U1 = '00000000-0000-4000-8000-0000000000a1', U2 = '00000000-0000-4000-8000-0000000000a2';
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
insert into auth.users values ('${U1}'), ('${U2}');
create table public.tournaments(id uuid primary key, invite_code text, admin_token text, state jsonb, created_at timestamptz default now(),
  updated_at timestamptz default now(), revision int default 0, owner_user_id uuid, claimed_at timestamptz, ended_at timestamptz,
  retention_expires_at timestamptz, owner_profile_id text);
create table public.player_sessions(tournament_id uuid, player_id uuid, token_hash text);
create table public.api_rate_limits(bucket_hash text primary key, window_started_at timestamptz, request_count int, updated_at timestamptz);
create or replace function public.consume_api_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer) returns boolean language sql as $$ select true $$;
`);
const source = fs.readFileSync(dir + '20260913123550_account_tournament_finalization.sql', 'utf8');
await pg.exec(source.slice(0, source.indexOf('-- Do not backfill')));
// the live guards, as they were before this migration
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
for (const f of ['20260919120000_match_scorer_lease.sql', '20260919150000_result_approval.sql', '20260919210000_admin_result_correction.sql', '20260919170000_guest_finish_retention.sql']) await pg.exec(fs.readFileSync(dir + f, 'utf8'));
await pg.exec(fs.readFileSync(dir + '20260920180000_corrections_after_finish.sql', 'utf8'));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const TOKEN = 'admintoken-1234567890';
const P = { A: uuid(101), B: uuid(102), C: uuid(103), D: uuid(104) };
let seq = 0;
async function finishedTournament({ sets, winner, format = 'roundRobin', owner = U1, extraRound = false }) {
  seq += 1;
  const id = uuid(6000 + seq);
  const side = (a, b) => ({ players: [{ id: P[a], name: a }, { id: P[b], name: b }] });
  const rounds = [{ id: 'r1', status: 'active', matches: [{ id: uuid(11), state: 'finished', winnerTeamIndex: winner, teamOne: side('A', 'B'), teamTwo: side('C', 'D'), completedSets: sets, undoStack: [] }] }];
  if (extraRound) rounds.push({ id: 'r2', status: 'active', matches: [{ id: uuid(21), state: 'waiting', teamOne: side('A', 'C'), teamTwo: side('B', 'D'), completedSets: [] }] });
  const state = { status: 'Runde pågår', adminToken: 'x', settings: { format, gamesToWinSet: 6, setsToWinMatch: 1 }, revision: 1, rounds };
  await pg.query(`insert into public.tournaments(id,invite_code,admin_token,state,revision,owner_user_id) values ($1,$2,$3,$4::jsonb,1,$5)`, [id, 'CF' + String(seq).padStart(6, '0'), TOKEN, JSON.stringify(state), owner]);
  await pg.query(`insert into public.tournament_account_players values ($1,$2,$3), ($1,$4,$5)`, [id, P.A, U1, P.C, U2]);
  await pg.query(`select public.finalize_tournament($1,$2,1,'completed')`, [id, TOKEN]);
  return id;
}
const rev = async (id) => (await pg.query(`select revision from public.tournaments where id = $1`, [id])).rows[0].revision;
const correct = async (id, sets, { reason = 'entryError', token = TOKEN, expected } = {}) => {
  try { return { ok: true, state: (await pg.query(`select public.admin_correct_result($1,$2,$3,$4::jsonb,$5,null,null,$6) as r`, [id, token, uuid(11), JSON.stringify(sets), reason, expected ?? await rev(id)])).rows[0].r }; }
  catch (e) { return { ok: false, message: e.message }; }
};
const stats = async (id) => Object.fromEntries((await pg.query(`select * from public.account_tournament_statistics where tournament_id = $1`, [id])).rows.map((r) => [r.user_id, r]));

console.log('the result and the statistics change together');
let id = await finishedTournament({ sets: [{ teamOne: 6, teamTwo: 3 }], winner: 0 });
let s = await stats(id);
ok('before: A (team one) won 6 games, C (team two) lost with 3', s[U1].wins === 1 && s[U1].games === 6 && s[U2].wins === 0 && s[U2].games === 3, JSON.stringify(s));
let r = await correct(id, [{ teamOne: 4, teamTwo: 6 }]);
ok('a finished tournament accepts a correction', r.ok, r.message);
s = await stats(id);
ok("the winner flips: A no longer has the win, C has it", s[U1].wins === 0 && s[U2].wins === 1, JSON.stringify(s));
ok('games and sets follow the corrected sets', s[U1].games === 4 && s[U1].sets === 0 && s[U2].games === 6 && s[U2].sets === 1, JSON.stringify(s));
ok('matches played is unchanged, and ended_at / outcome are kept', s[U1].matches === 1 && s[U1].outcome === 'completed');
const st = (await pg.query(`select state from public.tournaments where id = $1`, [id])).rows[0].state;
ok('the tournament is still finished, with the new result and a correction history', st.status === 'Avsluttet' && st.rounds[0].matches[0].winnerTeamIndex === 1 && st.rounds[0].matches[0].correctionHistory.length === 1);
ok('the revision went up by one', (await rev(id)) === 3, String(await rev(id)));
r = await correct(id, [{ teamOne: 6, teamTwo: 2 }], { reason: 'restore' });
s = await stats(id);
ok('a second correction updates the statistics again (restore)', r.ok && s[U1].wins === 1 && s[U1].games === 6 && s[U2].games === 2, JSON.stringify(s));

console.log('what stays closed');
r = await correct(id, [{ teamOne: 6, teamTwo: 2 }]);
ok('the same result is refused', !r.ok && r.message.includes('same as the current'), r.message);
r = await correct(id, [{ teamOne: 6, teamTwo: 1 }], { token: 'wrong-token-1234567890' });
ok('a wrong admin token is refused and nothing changes', !r.ok && (await stats(id))[U1].games === 6, r.message);
r = await correct(id, [{ teamOne: 6, teamTwo: 1 }], { expected: 1 });
ok('a stale revision is refused', !r.ok && r.message.includes('changed'), r.message);
r = await correct(id, [{ teamOne: 9, teamTwo: 1 }]);
ok('an invalid score is refused and the statistics are untouched', !r.ok && (await stats(id))[U1].games === 6, r.message);
try { await pg.query(`update public.tournaments set state = jsonb_set(state, '{name}', '"hacked"') where id = $1`, [id]); ok('a direct edit of a finished tournament is still refused', false); }
catch (e) { ok('a direct edit of a finished tournament is still refused', e.message.includes('read-only'), e.message); }
try { await pg.query(`select set_config('app.finished_correction','on',false)`); await pg.query(`update public.tournaments set state = jsonb_set(state, '{name}', '"hacked"') where id = $1`, [id]); ok('even with the switch on, only results and the revision may change', false); }
catch (e) { ok('even with the switch on, only results and the revision may change', e.message.includes('read-only'), e.message); }
finally { await pg.query(`select set_config('app.finished_correction','off',false)`); }
try { await pg.query(`update public.tournaments set state = jsonb_set(state, '{rounds,0,matches,0,winnerTeamIndex}', '1') where id = $1`, [id]); ok('a direct result edit without the switch is refused', false); }
catch (e) { ok('a direct result edit without the switch is refused', e.message.includes('read-only'), e.message); }
try { await pg.exec(`set role authenticated; select public._recompute_account_statistics('${id}')`); ok('authenticated cannot call the recalculation', false); }
catch (e) { ok('authenticated cannot call the recalculation', e.message.includes('permission denied'), e.message); }
finally { await pg.exec('reset role'); }

console.log('cancelled tournaments and cups');
seq += 1;
const cid = uuid(6500 + seq);
await pg.query(`insert into public.tournaments(id,invite_code,admin_token,state,revision,owner_user_id) values ($1,'CANCEL01',$2,$3::jsonb,1,$4)`, [cid, TOKEN, JSON.stringify({ status: 'Runde pågår', settings: { format: 'roundRobin', gamesToWinSet: 6, setsToWinMatch: 1 }, revision: 1, rounds: [{ id: 'r1', status: 'active', matches: [{ id: uuid(11), state: 'finished', winnerTeamIndex: 0, teamOne: { players: [{ id: P.A }] }, teamTwo: { players: [{ id: P.C }] }, completedSets: [{ teamOne: 6, teamTwo: 3 }], undoStack: [] }] }] }), U1]);
await pg.query(`select public.finalize_tournament($1,$2,1,'cancelled')`, [cid, TOKEN]);
r = await correct(cid, [{ teamOne: 3, teamTwo: 6 }]);
ok('a cancelled tournament stays closed', !r.ok && r.message.includes('cancelled'), r.message);
const cup = await finishedTournament({ sets: [{ teamOne: 6, teamTwo: 3 }], winner: 0, format: 'cup', extraRound: true });
r = await correct(cup, [{ teamOne: 3, teamTwo: 6 }]);
ok('in a cup, a winner change that later matches depend on is still blocked', !r.ok && r.message.includes('depend'), r.message);
r = await correct(cup, [{ teamOne: 6, teamTwo: 4 }]);
ok('but a correction that keeps the winner is fine, and the games follow', r.ok && (await stats(cup))[U2].games === 4, r.message);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
