// Database tests for migration 20260919150000_result_approval.sql (on top of 20260919120000_match_scorer_lease.sql).
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/result-approval.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
await pg.exec(`
create role anon; create role authenticated;
create schema extensions;
create function extensions.digest(t text, alg text) returns bytea language sql immutable as $$ select decode(md5(t),'hex') $$;
create table public.tournaments(id uuid primary key, invite_code text, admin_token text, state jsonb, revision int default 0, updated_at timestamptz default now());
create table public.player_sessions(tournament_id uuid, player_id uuid, token_hash text);
create table public.api_rate_limits(bucket_hash text primary key, window_started_at timestamptz, request_count int, updated_at timestamptz);
create or replace function public.consume_api_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer) returns boolean language sql as $$ select true $$;
`);
await pg.exec(fs.readFileSync(dir + '20260919120000_match_scorer_lease.sql', 'utf8'));
await pg.exec(fs.readFileSync(dir + '20260919150000_result_approval.sql', 'utf8'));
await pg.exec(`create or replace function public.admin_undo_match(p_tournament_id uuid, p_admin_token text, p_match_id uuid, p_expected_revision integer) returns jsonb language plpgsql as $$ begin return public.admin_undo_match_impl(p_tournament_id,p_admin_token,p_match_id,p_expected_revision); end $$;`);

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const M1 = uuid(11), M2 = uuid(12);
const P = { A: uuid(101), B: uuid(102), C: uuid(103), D: uuid(104), E: uuid(105) };
const tok = (c) => c.repeat(48);
const TOK = Object.fromEntries(Object.keys(P).map((k) => [k, tok(k.toLowerCase())]));
const team = (a, b) => ({ players: [{ id: P[a], name: a }, { id: P[b], name: b }] });
const mk = (id, st) => ({ id, state: st, status: 'x', teamOne: team('A', 'B'), teamTwo: team('C', 'D'), currentGame: { teamOne: 0, teamTwo: 0 },
  currentSet: { teamOne: 0, teamTwo: 0 }, completedSets: [], undoStack: [], courtId: 'court-1', courtName: 'Bane 1' });

let seq = 0;
async function fixture(devices = ['A', 'B', 'C', 'D', 'E']) {
  seq += 1;
  const T = uuid(2000 + seq);
  const state = { status: 'Runde pågår', settings: { gamesToWinSet: 2, setsToWinMatch: 1 }, revision: 1, rounds: [{ id: 'r1', status: 'active', matches: [mk(M1, 'playing'), mk(M2, 'waiting')] }] };
  await pg.query(`insert into public.tournaments(id,invite_code,admin_token,state,revision) values ($1,'ABCD2345','admintoken-1234567890',$2::jsonb,1)`, [T, JSON.stringify(state)]);
  for (const k of devices) await pg.query(`insert into public.player_sessions values ($1,$2,encode(extensions.digest($3,'sha256'),'hex'))`, [T, P[k], TOK[k]]);
  return T;
}
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const call = async (fn, args) => { try { const r = await pg.query(`select public.${fn}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as r`, args); return { data: r.rows[0].r }; } catch (e) { return { error: e.message }; } };
const m = (st, id = M1) => st.rounds[0].matches.find((x) => x.id === id);
const cur = async (T) => (await pg.query(`select state, revision from public.tournaments where id=$1`, [T])).rows[0];
const point = (T, who, teamIndex) => call('save_player_point_impl', [T, 'ABCD2345', P[who], M1, teamIndex, TOK[who]]);
const result = (T, who, action, payload = null) => call('match_result_action', [T, 'ABCD2345', P[who], M1, TOK[who], action, payload ? JSON.stringify(payload) : null]);
const patchApproval = (T, patch) => pg.query(`update public.tournaments set state = jsonb_set(state, '{rounds,0,matches,0,approval}', (state->'rounds'->0->'matches'->0->'approval') || $2::jsonb) where id = $1`, [T, JSON.stringify(patch)]);
const scoreToWin = async (T, who = 'A') => { let r; for (let i = 0; i < 8; i++) r = await point(T, who, 0); return r; };
const past = () => new Date(Date.now() - 60_000).toISOString();

console.log('the winning point');
let T = await fixture();
let r = await scoreToWin(T);
ok('match becomes awaitingApproval', !r.error && m(r.data).state === 'awaitingApproval', r.error);
ok('approval starts as a draft with the proposed winner and sets', m(r.data).approval.status === 'draft' && m(r.data).approval.winnerTeamIndex === 0 && m(r.data).approval.completedSets.length === 1);
ok('the match has no official winner yet', m(r.data).winnerTeamIndex === undefined || m(r.data).winnerTeamIndex === null);
ok('the court is freed: the next match starts on it', m(r.data, M2).state === 'playing' && m(r.data, M2).courtName === 'Bane 1');
ok('timers are set 10 and 30 minutes ahead', !!m(r.data).approval.escalateAt && !!m(r.data).approval.autoApproveAt);
r = await point(T, 'A', 0);
ok('no more points once the match is over', r.error?.includes('not currently playing'), r.error);

console.log('draft: undo/redo, then explicit submission');
r = await call('match_scorer_action', [T, 'ABCD2345', P.A, M1, TOK.A, 'undo', null]);
ok('scorer undo reopens a draft result', !r.error && m(r.data).state === 'playing' && m(r.data, M2).state === 'waiting', r.error);
r = await call('match_scorer_action', [T, 'ABCD2345', P.A, M1, TOK.A, 'redo', null]);
ok('redo restores the draft', !r.error && m(r.data).state === 'awaitingApproval' && m(r.data, M2).state === 'playing', r.error);
r = await result(T, 'C', 'submit');
ok('only the active scorer can submit', r.error?.includes('active scorer'), r.error);
r = await result(T, 'C', 'approve');
ok('cannot approve a result that was not submitted', r.error?.includes('not been submitted'), r.error);
r = await result(T, 'A', 'submit');
ok('scorer submits: pending, scorer counts for own team', !r.error && m(r.data).approval.status === 'pending' && m(r.data).approval.approvals.length === 1 && m(r.data).approval.approvals[0].teamIndex === 0, r.error);
ok('the match is still awaiting the other team', m(r.data).state === 'awaitingApproval');
r = await call('match_scorer_action', [T, 'ABCD2345', P.A, M1, TOK.A, 'undo', null]);
ok('undo is closed after submission', r.error?.includes('already submitted'), r.error);
r = await result(T, 'A', 'submit');
ok('cannot submit twice', r.error?.includes('already submitted'), r.error);

console.log('approval');
r = await result(T, 'B', 'approve');
ok('a teammate of the submitter does not complete the approval', !r.error && m(r.data).state === 'awaitingApproval');
r = await result(T, 'E', 'approve');
ok('non-participants cannot approve', r.error?.includes('not part of this match'), r.error);
r = await result(T, 'C', 'approve');
ok('one player of the other team completes it: finished', !r.error && m(r.data).state === 'finished' && m(r.data).winnerTeamIndex === 0, r.error);
ok('final result carries sets, completion time and who approved', m(r.data).completedSets.length === 1 && !!m(r.data).completedAt && m(r.data).approval.status === 'approved' && m(r.data).approval.auto === false);
r = await result(T, 'D', 'approve');
ok('nothing left to approve afterwards', r.error?.includes('not awaiting approval'), r.error);

console.log('dispute without a proposal');
T = await fixture(); await scoreToWin(T); await result(T, 'A', 'submit');
r = await result(T, 'C', 'dispute');
ok('a plain dispute flags the result for the admin', !r.error && m(r.data).approval.status === 'flagged' && m(r.data).approval.flag === 'disputed', r.error);
r = await result(T, 'D', 'approve');
ok('flagged results cannot be approved by players', r.error?.includes('flagged'), r.error);
await patchApproval(T, { autoApproveAt: past(), escalateAt: past() });
r = await call('process_result_approvals', []);
ok('auto-approval never runs for flagged results', !r.error && m((await cur(T)).state).state === 'awaitingApproval' && m((await cur(T)).state).approval.status === 'flagged', r.error);
let st = await cur(T);
r = await call('admin_resolve_result', [T, 'admintoken-1234567890', M1, st.revision]);
ok('the admin can approve a flagged result', !r.error && m(r.data).state === 'finished' && m(r.data).approval.approvedBy === 'admin', r.error);

console.log('dispute with a corrected proposal');
T = await fixture(); await scoreToWin(T); await result(T, 'A', 'submit');
r = await result(T, 'C', 'dispute', { completedSets: [{ teamOne: 1, teamTwo: 1 }] });
ok('an invalid corrected result is rejected', r.error?.includes('Invalid corrected result'), r.error);
r = await result(T, 'C', 'dispute', { completedSets: [{ teamOne: 0, teamTwo: 2 }] });
ok('a valid proposal replaces the result, resets approvals to the proposer', !r.error && m(r.data).approval.status === 'pending' && m(r.data).approval.winnerTeamIndex === 1 && m(r.data).approval.approvals.length === 1 && m(r.data).approval.approvals[0].teamIndex === 1 && m(r.data).approval.corrections === 1, r.error);
ok('the original scorer has to approve the correction again', m(r.data).state === 'awaitingApproval');
r = await result(T, 'B', 'approve');
ok('approval by the other team finalises the corrected result', !r.error && m(r.data).state === 'finished' && m(r.data).winnerTeamIndex === 1 && m(r.data).completedSets[0].teamTwo === 2, r.error);

console.log('two corrections at most, then the admin decides');
T = await fixture(); await scoreToWin(T); await result(T, 'A', 'submit');
r = await result(T, 'C', 'dispute', { completedSets: [{ teamOne: 0, teamTwo: 2 }] });
r = await result(T, 'A', 'dispute', { completedSets: [{ teamOne: 2, teamTwo: 0 }] });
ok('second correction still allowed', !r.error && m(r.data).approval.corrections === 2 && m(r.data).approval.status === 'pending', r.error);
r = await result(T, 'C', 'dispute', { completedSets: [{ teamOne: 0, teamTwo: 2 }] });
ok('a third correction flags the match for the admin', !r.error && m(r.data).approval.status === 'flagged' && m(r.data).approval.flag === 'corrections', r.error);

console.log('teams without devices approve automatically');
T = await fixture(['A', 'B']); await scoreToWin(T);
r = await result(T, 'A', 'submit');
ok('submitting finishes the match when the other team has no device', !r.error && m(r.data).state === 'finished' && m(r.data).winnerTeamIndex === 0, r.error);
ok('the automatic approval is recorded', m(r.data).approval.approvals.some((a) => a.auto && a.reason === 'no_device'));

console.log('timers: 10 minute escalation, 30 minute auto-approval');
T = await fixture(); await scoreToWin(T); await result(T, 'A', 'submit');
r = await call('process_result_approvals', []);
ok('nothing happens before the deadlines', !r.error && m((await cur(T)).state).approval.escalatedAt === undefined);
await patchApproval(T, { escalateAt: past() });
r = await call('process_result_approvals', []);
let mm = m((await cur(T)).state);
ok('after 10 minutes the admin is alerted (escalatedAt set), still pending', !r.error && !!mm.approval.escalatedAt && mm.approval.status === 'pending' && mm.state === 'awaitingApproval', r.error);
await patchApproval(T, { autoApproveAt: past() });
r = await call('process_result_approvals', []);
mm = m((await cur(T)).state);
ok('after 30 minutes an undisputed result is approved automatically', !r.error && mm.state === 'finished' && mm.approval.auto === true && mm.winnerTeamIndex === 0, r.error);
T = await fixture(); await scoreToWin(T);
await patchApproval(T, { autoApproveAt: past() });
await call('process_result_approvals', []);
ok('an unsubmitted draft is auto-approved on the same clock', m((await cur(T)).state).state === 'finished');
T = await fixture(); await scoreToWin(T); await result(T, 'A', 'submit');
await patchApproval(T, { autoApproveAt: past() });
r = await result(T, 'C', 'dispute', { completedSets: [{ teamOne: 0, teamTwo: 2 }] });
await call('process_result_approvals', []);
mm = m((await cur(T)).state);
ok('a corrected proposal restarts the timers', mm.state === 'awaitingApproval' && new Date(mm.approval.autoApproveAt) > new Date());

console.log('admin resolve and progression');
T = await fixture(); await scoreToWin(T); await result(T, 'A', 'submit');
st = await cur(T);
r = await call('admin_resolve_result', [T, 'wrongtoken-1234567890', M1, st.revision]);
ok('admin approval needs the admin token', r.error?.includes('Admin token mismatch'), r.error);
r = await call('admin_resolve_result', [T, 'admintoken-1234567890', M1, st.revision + 5]);
ok('admin approval honours the expected revision', r.error?.includes('changed'), r.error);
r = await call('admin_resolve_result', [T, 'admintoken-1234567890', M2, st.revision]);
ok('only awaiting matches can be resolved', r.error?.includes('not awaiting'), r.error);
r = await call('admin_resolve_result', [T, 'admintoken-1234567890', M1, st.revision]);
ok('admin approves a pending result', !r.error && m(r.data).state === 'finished' && m(r.data).approval.approvedBy === 'admin', r.error);
T = await fixture(); await scoreToWin(T); await result(T, 'A', 'submit');
let st0 = await cur(T);
r = await call('admin_undo_match', [T, 'admintoken-1234567890', M1, st.revision]);
ok('the admin can still undo an awaiting result (to correct it)', !r.error && m(r.data).state === 'playing' && m(r.data, M2).state === 'waiting', r.error);
ok('undo removes the approval record', !r.error && !m(r.data).approval);

console.log('validation');
r = await call('match_result_action', [T, 'ABCD2345', P.A, M1, 'short', 'submit', null]);
ok('bad token format rejected', r.error?.includes('Invalid result payload'), r.error);
r = await call('match_result_action', [T, 'ABCD2345', P.A, M1, TOK.B, 'submit', null]);
ok('token of another player rejected', r.error?.includes('Player token mismatch'), r.error);
r = await call('match_result_action', [T, 'ABCD2345', P.A, M1, TOK.A, 'explode', null]);
ok('unknown action rejected', r.error?.includes('Invalid result payload'), r.error);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
