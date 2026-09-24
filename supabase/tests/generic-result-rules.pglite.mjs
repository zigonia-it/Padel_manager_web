// Typed results, corrections and disputes on the generic scoring rules (20260924120000_generic_scoring_rules.sql).
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/generic-result-rules.pglite.mjs
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
for (const f of ['20260915040000_admin_set_result_status_sync.sql', '20260919120000_match_scorer_lease.sql', '20260919150000_result_approval.sql', '20260919210000_admin_result_correction.sql', '20260924120000_generic_scoring_rules.sql']) await pg.exec(fs.readFileSync(dir + f, 'utf8'));

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const TOKEN = 'admintoken-1234567890';
const team = (a, b) => ({ players: [{ id: uuid(a), name: 'P' + a }, { id: uuid(b), name: 'P' + b }] });
let seq = 0;
async function tournament(settings, matchState = 'playing', sets = [], winner = null) {
  seq += 1;
  const id = uuid(5000 + seq);
  const state = { status: 'Runde pågår', settings: { format: 'roundRobin', ...settings }, revision: 1,
    rounds: [{ id: 'r1', status: 'active', matches: [{ id: uuid(11), state: matchState, status: 'active', winnerTeamIndex: winner, teamOne: team(101, 102), teamTwo: team(103, 104), completedSets: sets, currentSet: { teamOne: 0, teamTwo: 0 }, currentGame: { teamOne: 0, teamTwo: 0 }, undoStack: [] }] }] };
  await pg.query(`insert into public.tournaments(id,invite_code,admin_token,state,revision) values ($1,$2,$3,$4::jsonb,1)`, [id, 'CODE' + String(seq).padStart(4, '0'), TOKEN, JSON.stringify(state)]);
  return id;
}
const call = async (fn, args) => { try { const r = await pg.query(`select public.${fn}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as r`, args); return { data: r.rows[0].r }; } catch (e) { return { error: e.message }; } };
const validate = async (sets, rules) => call('_approval_validate_proposal', [JSON.stringify(sets), JSON.stringify(rules)]);
const setResult = (id, a, b, rev = 1) => call('admin_set_result_impl', [id, TOKEN, uuid(11), a, b, rev]);
const s = (a, b) => ({ teamOne: a, teamTwo: b });

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => { if (ok) { pass += 1; console.log('  ok  ', name); } else { fail += 1; console.log('  FAIL', name, detail); } };

const tennis = { gamesToWinSet: 6, setsToWinMatch: 1 };
const points = { scoringMode: 'points', gameToWin: 1, gameWinBy: 1, gamesToWinSet: 21, setWinBy: 2, setDecider: 'continue', setsToWinMatch: 1 };
const bestOf3 = { ...points, gamesToWinSet: 11, setsToWinMatch: 2 };
const rulesOf = async (settings) => (await pg.query(`select public._scoring_rules(null, $1::jsonb) r`, [JSON.stringify(settings)])).rows[0].r;

// legacy settings still validate exactly as before
{
  const rules = await rulesOf(tennis);
  check('legacy: 6-3 is a valid match', (await validate([s(6, 3)], rules)).data === 0);
  check('legacy: 7-5 and 7-6 are valid', (await validate([s(5, 7)], rules)).data === 1 && (await validate([s(7, 6)], rules)).data === 0);
  check('legacy: 6-5 is invalid', Boolean((await validate([s(6, 5)], rules)).error));
  check('legacy: an extra set after the winner is invalid', Boolean((await validate([s(6, 3), s(6, 2)], rules)).error));
  const best3 = await rulesOf({ gamesToWinSet: 6, setsToWinMatch: 2 });
  check('legacy: 6-3 3-6 6-4 is valid', (await validate([s(6, 3), s(3, 6), s(6, 4)], best3)).data === 0);
  check('legacy: 6-3 6-4 then a third set is invalid', Boolean((await validate([s(6, 3), s(6, 4), s(6, 1)], best3)).error));
  check('legacy: one set of a best of 3 is not a finished match', Boolean((await validate([s(6, 3)], best3)).error));
}
// points rules
{
  const rules = await rulesOf(points);
  check('points: 21-15 is valid', (await validate([s(21, 15)], rules)).data === 0);
  check('points: 22-20 and 30-28 are valid', (await validate([s(20, 22)], rules)).data === 1 && (await validate([s(30, 28)], rules)).data === 0);
  check('points: 21-20 is invalid (margin 2)', Boolean((await validate([s(21, 20)], rules)).error));
  check('points: 25-20 is invalid (the game would have ended earlier)', Boolean((await validate([s(25, 20)], rules)).error));
  check('points: margin 1 cannot exceed the target (25-24 with first to 24)', Boolean((await validate([s(25, 24)], await rulesOf({ ...points, gamesToWinSet: 24, setWinBy: 1 }))).error));
  check('points: 19-21 is valid for team two', (await validate([s(19, 21)], rules)).data === 1);
  const b = await rulesOf(bestOf3);
  check('best of 3 points: 11-5 5-11 11-9 is valid', (await validate([s(11, 5), s(5, 11), s(11, 9)], b)).data === 0);
  check('best of 3 points: 11-5 then 11-3 is a finished match', (await validate([s(11, 5), s(11, 3)], b)).data === 0);
  check('best of 3 points: three sets after 2-0 are invalid', Boolean((await validate([s(11, 5), s(11, 3), s(11, 1)], b)).error));
  const limit = await rulesOf({ ...points, gamesToWinSet: 999 });
  check('999 is accepted as target', (await validate([s(999, 0)], limit)).data === 0);
  const clamped = await rulesOf({ ...points, gamesToWinSet: 5000 });
  check('a target above 999 is clamped', clamped.gamesToWinSet === 999);
  const byTwoSets = await rulesOf({ ...points, gamesToWinSet: 1, setWinBy: 1, setsToWinMatch: 2, matchWinBy: 2 });
  check('match margin: 2-1 in sets is not decided, 3-1 is', Boolean((await validate([s(1, 0), s(0, 1), s(1, 0)], byTwoSets)).error) && (await validate([s(1, 0), s(0, 1), s(1, 0), s(1, 0)], byTwoSets)).data === 0);
}
// admin set result (one set typed at a time)
{
  const id = await tournament(points);
  check('admin set result: 21-20 is refused', Boolean((await setResult(id, 21, 20)).error));
  const ok = await setResult(id, 22, 20);
  const m = ok.data?.rounds?.[0]?.matches?.[0];
  check('admin set result: 22-20 finishes a first-to-21 match', m?.state === 'finished' && m?.winnerTeamIndex === 0, JSON.stringify(ok.error ?? m?.state));
  const id2 = await tournament(bestOf3);
  const first = (await setResult(id2, 11, 4)).data?.rounds?.[0]?.matches?.[0];
  check('admin set result: the first game of a best of 3 keeps the match playing', first?.state === 'playing' && first?.completedSets?.length === 1);
  const second = (await setResult(id2, 5, 11, 2)).data?.rounds?.[0]?.matches?.[0];
  check('admin set result: 1-1 keeps it playing', second?.state === 'playing');
  const third = (await setResult(id2, 11, 9, 3)).data?.rounds?.[0]?.matches?.[0];
  check('admin set result: the deciding game finishes it', third?.state === 'finished' && third?.winnerTeamIndex === 0);
  const id3 = await tournament(tennis);
  check('admin set result: legacy 6-4 still finishes a match', (await setResult(id3, 6, 4)).data?.rounds?.[0]?.matches?.[0]?.state === 'finished');
  const id4 = await tournament(tennis);
  check('admin set result: legacy 6-5 is still refused', Boolean((await setResult(id4, 6, 5)).error));
}
// correction of a finished result
{
  const id = await tournament(points, 'finished', [s(21, 10)], 0);
  const r = await call('admin_correct_result_impl', [id, TOKEN, uuid(11), JSON.stringify([s(19, 21)]), 'entryError', null, 'orange', 1]);
  const m = r.data?.rounds?.[0]?.matches?.[0];
  check('correction: a points result can be corrected to 19-21', m?.winnerTeamIndex === 1, JSON.stringify(r.error));
  const bad = await call('admin_correct_result_impl', [id, TOKEN, uuid(11), JSON.stringify([s(21, 20)]), 'entryError', null, 'orange', 2]);
  check('correction: 21-20 is refused', Boolean(bad.error));
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
