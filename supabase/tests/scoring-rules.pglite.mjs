// Runs test/fixtures/scoring-scenarios.json against save_player_point_impl (the SQL twin of the JS point engine).
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/scoring-rules.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const MIG = new URL('../migrations/20260919120000_match_scorer_lease.sql', import.meta.url).pathname;
const FIXTURE = new URL('../../test/fixtures/scoring-scenarios.json', import.meta.url).pathname;
const { scenarios } = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

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
await pg.exec(fs.readFileSync(MIG, 'utf8'));

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const M1 = uuid(11);
const A = uuid(101);
const TOK = 'a'.repeat(48);
const team = (ids) => ({ players: ids.map((id) => ({ id, name: id })) });

function expandSteps(steps) {
  return steps.flatMap((step) => {
    if (step === '0' || step === '1') return [Number(step)];
    if (step === 'g0' || step === 'g1') return Array(4).fill(Number(step[1]));
    if (step === 'd') return [0, 1, 0, 1, 0, 1];
    const run = /^a([01]):(\d+)$/.exec(step);
    if (run) return Array(Number(run[2])).fill(Number(run[1]));
    throw new Error(`unknown step ${step}`);
  });
}

let pass = 0, fail = 0;
let n = 0;
for (const scenario of scenarios) {
  n += 1;
  const T = uuid(1000 + n);
  const match = { id: M1, state: 'playing', status: 'active', teamOne: team([A, uuid(102)]), teamTwo: team([uuid(103), uuid(104)]),
    currentGame: { teamOne: 0, teamTwo: 0 }, currentSet: { teamOne: 0, teamTwo: 0 }, completedSets: [], undoStack: [], courtId: 'c1', courtName: 'Bane 1' };
  const state = { status: 'Runde pågår', settings: scenario.settings, revision: 1, rounds: [{ id: 'r1', status: 'active', matches: [match] }] };
  await pg.query(`insert into public.tournaments(id,invite_code,admin_token,state,revision) values ($1,'ABCD2345','admintoken-1234567890',$2::jsonb,1)`, [T, JSON.stringify(state)]);
  await pg.query(`insert into public.player_sessions values ($1,$2,encode(extensions.digest($3,'sha256'),'hex'))`, [T, A, TOK]);

  let last = null, error = null;
  for (const teamIndex of expandSteps(scenario.steps)) {
    try {
      const r = await pg.query(`select public.save_player_point_impl($1,'ABCD2345',$2,$3,$4,$5) as r`, [T, A, M1, teamIndex, TOK]);
      last = r.rows[0].r;
    } catch (e) { error = e.message; break; }
  }
  const got = last?.rounds?.[0]?.matches?.[0];
  const e = scenario.expect;
  const problems = [];
  if (error) problems.push(`error: ${error}`);
  else {
    // only player A has a device here, so nobody on the other team can approve: the result is approved automatically
    if (got.state !== e.state) problems.push(`state ${got.state} != ${e.state}`);
    if (e.winnerTeamIndex !== undefined && got.winnerTeamIndex !== e.winnerTeamIndex) problems.push(`winner ${got.winnerTeamIndex} != ${e.winnerTeamIndex}`);
    if (JSON.stringify([got.currentGame.teamOne, got.currentGame.teamTwo]) !== JSON.stringify(e.currentGame)) problems.push(`game ${JSON.stringify(got.currentGame)}`);
    if (JSON.stringify([got.currentSet.teamOne, got.currentSet.teamTwo]) !== JSON.stringify(e.currentSet)) problems.push(`set ${JSON.stringify(got.currentSet)}`);
    if (JSON.stringify(got.completedSets.map((s) => [s.teamOne, s.teamTwo])) !== JSON.stringify(e.completedSets)) problems.push(`completed ${JSON.stringify(got.completedSets)}`);
    if (Boolean(got.inTiebreak) !== e.inTiebreak) problems.push(`inTiebreak ${got.inTiebreak}`);
    if (got.rules?.gameMode !== scenario.settings.gameMode) problems.push(`rules snapshot ${JSON.stringify(got.rules)}`);
  }
  if (problems.length) { fail += 1; console.log('  FAIL', scenario.name, problems.join('; ')); } else { pass += 1; console.log('  ok  ', scenario.name); }
}
// the tiebreak score is stored with the completed set
{
  const r = await pg.query(`select state->'rounds'->0->'matches'->0->'completedSets'->0->'tiebreak' as tb from public.tournaments where id = $1`, [uuid(1000 + scenarios.findIndex((s) => s.name.includes('7-0 wins')) + 1)]);
  const ok = JSON.stringify(r.rows[0].tb) === JSON.stringify({ teamOne: 7, teamTwo: 0 });
  if (ok) { pass += 1; console.log('  ok   tiebreak score stored on the completed set'); } else { fail += 1; console.log('  FAIL tiebreak score', JSON.stringify(r.rows[0])); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
