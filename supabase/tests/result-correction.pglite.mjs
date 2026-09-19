// Database tests for 20260919210000_admin_result_correction.sql (on top of the scorer and approval migrations).
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/result-correction.pglite.mjs
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
for (const f of ['20260919120000_match_scorer_lease.sql', '20260919150000_result_approval.sql', '20260919210000_admin_result_correction.sql']) await pg.exec(fs.readFileSync(dir + f, 'utf8'));

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const TOKEN = 'admintoken-1234567890';
const team = (a, b) => ({ players: [{ id: uuid(a), name: 'P' + a }, { id: uuid(b), name: 'P' + b }] });
const match = (n, state, winner, sets) => ({ id: uuid(n), state, winnerTeamIndex: winner, teamOne: team(101, 102), teamTwo: team(103, 104), completedSets: sets, timeWinnerTeamIndex: null, undoStack: [] });
let seq = 0;
async function tournament({ format = 'roundRobin', status = 'Runde pågår', rounds } = {}) {
  seq += 1;
  const id = uuid(4000 + seq);
  const state = { status, settings: { gamesToWinSet: 6, setsToWinMatch: 1, format }, revision: 1,
    rounds: rounds ?? [
      { id: 'r1', status: 'finished', matches: [match(11, 'finished', 0, [{ teamOne: 6, teamTwo: 3 }]), match(12, 'playing', null, []), match(13, 'awaitingApproval', null, [])] },
      { id: 'r2', status: 'scheduled', matches: [match(21, 'waiting', null, [])] }] };
  await pg.query(`insert into public.tournaments(id,invite_code,admin_token,state,revision) values ($1,$2,$3,$4::jsonb,1)`, [id, 'CODE' + String(seq).padStart(4, '0'), TOKEN, JSON.stringify(state)]);
  return id;
}
const row = async (id) => (await pg.query(`select state, revision from public.tournaments where id = $1`, [id])).rows[0];
const call = async (fn, args) => { try { const r = await pg.query(`select public.${fn}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as r`, args); return { data: r.rows[0].r }; } catch (e) { return { error: e.message }; } };
const correct = async (id, sets, reason = 'entryError', comment = null, { match: m = uuid(11), token = TOKEN, revision, level = 'orange' } = {}) => {
  const rev = revision ?? (await row(id)).revision;
  return call('admin_correct_result', [id, token, m, JSON.stringify(sets), reason, comment, level, rev]);
};
const find = (state, n) => state.rounds.flatMap((r) => r.matches).find((x) => x.id === uuid(n));
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };

console.log('a correction changes the result and keeps the history');
let T = await tournament();
let r = await correct(T, [{ teamOne: 3, teamTwo: 6 }], 'entryError', null, { level: 'orange' });
let m = find(r.data ?? {}, 11);
ok('the corrected sets and winner are now authoritative', !r.error && m.completedSets[0].teamTwo === 6 && m.winnerTeamIndex === 1, r.error);
ok('the old result is kept as a history entry', m.correctionHistory.length === 1 && m.correctionHistory[0].before.completedSets[0].teamOne === 6 && m.correctionHistory[0].before.winnerTeamIndex === 0);
ok('the entry records reason, level, who and what changed', m.correctionHistory[0].reason === 'entryError' && m.correctionHistory[0].level === 'orange' && m.correctionHistory[0].by === 'admin' && m.correctionHistory[0].winnerChanged === true && m.correctionHistory[0].after.winnerTeamIndex === 1);
ok('the correction time is recorded and the revision bumped', !!m.correctedAt && r.data.revision === 2);

console.log('several corrections and restoring the old result');
r = await correct(T, [{ teamOne: 6, teamTwo: 4 }], 'playersAgreed');
m = find(r.data ?? {}, 11);
ok('a second correction is appended, the first entry is untouched', !r.error && m.correctionHistory.length === 2 && m.correctionHistory[0].reason === 'entryError' && m.correctionHistory[1].reason === 'playersAgreed', r.error);
r = await correct(T, [{ teamOne: 6, teamTwo: 3 }], 'restore');
m = find(r.data ?? {}, 11);
ok('restoring the original result is just another correction', !r.error && m.correctionHistory.length === 3 && m.correctionHistory[2].reason === 'restore' && m.completedSets[0].teamTwo === 3 && m.winnerTeamIndex === 0, r.error);

console.log('reason is mandatory');
T = await tournament();
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }], null);
ok('a missing reason is refused', r.error?.includes('valid reason'), r.error);
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }], 'because');
ok('an unknown reason is refused', r.error?.includes('valid reason'), r.error);
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }], 'other');
ok('"Other" needs a comment', r.error?.includes('comment is required'), r.error);
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }], 'other', '   ');
ok('a blank comment does not count', r.error?.includes('comment is required'), r.error);
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }], 'entryError', 'x'.repeat(501));
ok('an over-long comment is refused', r.error?.includes('too long'), r.error);
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }], 'other', 'the scorer misheard the umpire');
ok('"Other" with a comment is accepted and the comment is stored', !r.error && find(r.data, 11).correctionHistory[0].comment === 'the scorer misheard the umpire', r.error);

console.log('validation and safety');
T = await tournament();
r = await correct(T, [{ teamOne: 4, teamTwo: 4 }]);
ok('an impossible score is refused', r.error?.includes('Invalid corrected result'), r.error);
r = await correct(T, [{ teamOne: 6, teamTwo: 3 }]);
ok('a correction that changes nothing is refused', r.error?.includes('same as the current'), r.error);
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }], 'entryError', null, { match: uuid(12) });
ok('an ongoing match is not touched', r.error?.includes('Only finished'), r.error);
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }], 'entryError', null, { match: uuid(13) });
ok('a match awaiting approval is not corrected here', r.error?.includes('Only finished'), r.error);
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }], 'entryError', null, { match: uuid(21) });
ok('a match that has not been played is refused', r.error?.includes('Only finished'), r.error);
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }], 'entryError', null, { token: 'wrongtoken-1234567890' });
ok('only the admin token can correct', r.error?.includes('Admin token mismatch'), r.error);
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }], 'entryError', null, { revision: 99 });
ok('the expected revision is enforced', r.error?.includes('changed'), r.error);
r = await call('admin_correct_result', [T, TOKEN, uuid(11), JSON.stringify([{ teamOne: 3, teamTwo: 6 }]), 'entryError', null, 'purple', 1]);
ok('an unknown consequence level is refused', r.error?.includes('Invalid correction payload'), r.error);
const before = await row(T);
await correct(T, [{ teamOne: 4, teamTwo: 4 }]);
const after = await row(T);
ok('a refused correction changes nothing (atomic)', before.revision === after.revision && JSON.stringify(before.state) === JSON.stringify(after.state));

console.log('after the tournament is finished');
T = await tournament({ status: 'Avsluttet' });
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }]);
ok('corrections are closed once the tournament is finished', r.error?.includes('closed') || r.error?.includes('read-only') || /finished/.test(r.error || ''), r.error);

console.log('round robin rounds are independent');
T = await tournament();
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }]);
ok('changing a winner is allowed although later rounds exist', !r.error && find(r.data, 21).state === 'waiting', r.error);

console.log('cup: later matches that depend on the result are protected');
const cupRounds = (withFinal) => [
  { id: 'c1', status: 'finished', matches: [match(11, 'finished', 0, [{ teamOne: 6, teamTwo: 3 }]), match(12, 'finished', 1, [{ teamOne: 2, teamTwo: 6 }])] },
  ...(withFinal ? [{ id: 'c2', status: 'active', matches: [match(31, 'playing', null, [])] }] : [])];
T = await tournament({ format: 'cup', rounds: cupRounds(true) });
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }]);
ok('a winner change is refused once the next round exists', r.error?.includes('Later matches already depend'), r.error);
r = await correct(T, [{ teamOne: 6, teamTwo: 4 }]);
ok('a score-only correction (same winner) is still allowed', !r.error && find(r.data, 11).winnerTeamIndex === 0, r.error);
T = await tournament({ format: 'cup', rounds: cupRounds(false) });
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }]);
ok('a winner change is allowed while no later round exists', !r.error && find(r.data, 11).winnerTeamIndex === 1, r.error);

console.log('time-ended and approved matches');
T = await tournament({ rounds: [{ id: 'r1', status: 'active', matches: [{ ...match(11, 'finished', 0, [{ teamOne: 4, teamTwo: 3 }]), timeWinnerTeamIndex: 0, endReason: 'timeExpired', approval: { status: 'approved', winnerTeamIndex: 0, completedSets: [{ teamOne: 4, teamTwo: 3 }] } }] }] });
r = await correct(T, [{ teamOne: 3, teamTwo: 6 }]);
m = find(r.data ?? {}, 11);
ok('the corrected sets replace a time-forced winner', !r.error && m.winnerTeamIndex === 1 && !('timeWinnerTeamIndex' in m), r.error);
ok('the approval record is kept in sync', m.approval.status === 'approved' && m.approval.winnerTeamIndex === 1 && m.approval.completedSets[0].teamTwo === 6);
ok('the correction function is not callable without the API wrapper', (await pg.query(`select has_function_privilege('anon', 'public.admin_correct_result_impl(uuid,text,uuid,jsonb,text,text,text,integer)', 'execute') as a`)).rows[0].a === false);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
