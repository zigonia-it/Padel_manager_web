// Database tests for migration 20260920100000_withdrawal_decision.sql (on top of 20260919120000_match_scorer_lease.sql).
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/withdrawal-decision.pglite.mjs
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
create or replace function public.consume_api_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer) returns boolean language sql as $$ select true $$;
`);
await pg.exec(fs.readFileSync(dir + '20260919120000_match_scorer_lease.sql', 'utf8'));
await pg.exec(fs.readFileSync(dir + '20260920100000_withdrawal_decision.sql', 'utf8'));

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const P = { A: uuid(101), B: uuid(102), C: uuid(103), D: uuid(104) };
const tok = (c) => c.repeat(48);
const TOK = Object.fromEntries(Object.keys(P).map((k) => [k, tok(k.toLowerCase())]));
const M = { blocked: uuid(11), running: uuid(12), done: uuid(13) };
const player = (k) => ({ id: P[k], name: k });
const team = (...keys) => ({ id: 'team-' + keys.join(''), players: keys.map(player), displayName: keys.join(' & ') });
const base = { currentGame: { teamOne: 0, teamTwo: 0 }, currentSet: { teamOne: 0, teamTwo: 0 }, completedSets: [], winnerTeamIndex: null };
// Ann (A) has withdrawn; her teammate is Bob (B). Cat and Dan (C, D) are the opponents.
const blocked = (id, extra = {}) => ({
  ...base, id, state: 'awaitingWithdrawalDecision', status: 'blocked', teamOne: team('A', 'B'), teamTwo: team('C', 'D'),
  withdrawal: { playerId: P.A, teamIndex: 0, teammateId: P.B, absent: { id: P.A, name: 'A' }, absentIndex: 0, status: 'pending' }, ...extra,
});

let seq = 0;
async function fixture({ busyCourt = false, status = 'Runde pågår' } = {}) {
  seq += 1;
  const T = uuid(2000 + seq);
  const matches = [blocked(M.blocked)];
  if (busyCourt) matches.push({ ...base, id: M.running, state: 'playing', status: 'active', teamOne: team('C', 'D'), teamTwo: team('A', 'B'), courtId: 'c1', courtName: 'Bane 1' });
  const state = { status, settings: { gamesToWinSet: 6, setsToWinMatch: 1 }, revision: 1, courts: [{ id: 'c1', name: 'Bane 1' }], rounds: [{ id: 'r1', status: 'active', matches }] };
  await pg.query(`insert into public.tournaments(id,invite_code,admin_token,state,revision) values ($1,'ABCD2345','admintoken-1234567890',$2::jsonb,1)`, [T, JSON.stringify(state)]);
  for (const k of Object.keys(P)) await pg.query(`insert into public.player_sessions values ($1,$2,encode(extensions.digest($3,'sha256'),'hex'))`, [T, P[k], TOK[k]]);
  return T;
}
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const call = async (fn, args) => { try { const r = await pg.query(`select public.${fn}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as r`, args); return { data: r.rows[0].r }; } catch (e) { return { error: e.message }; } };
const decide = (T, who, decision, match = M.blocked) => call('match_withdrawal_decision', [T, 'ABCD2345', P[who], match, TOK[who], decision]);
const m = (st, id = M.blocked) => st.rounds[0].matches.find((x) => x.id === id);
const cur = async (T) => (await pg.query(`select state, revision from public.tournaments where id=$1`, [T])).rows[0];

console.log('play alone (1 against 2)');
let T = await fixture();
let r = await decide(T, 'B', 'playAlone');
ok('the teammate decides', !r.error, r.error);
ok('the absent player is removed from the team', m(r.data).teamOne.players.length === 1 && m(r.data).teamOne.players[0].id === P.B);
ok('the team is renamed', m(r.data).teamOne.displayName === 'B', m(r.data).teamOne.displayName);
ok('the opponents are untouched', m(r.data).teamTwo.players.length === 2 && m(r.data).teamTwo.displayName === 'C & D');
ok('the decision is recorded', m(r.data).withdrawal.status === 'playAlone' && m(r.data).withdrawal.decidedBy === 'teammate');
ok('the absent player is remembered for restore/replace', m(r.data).withdrawal.absent.name === 'A' && m(r.data).withdrawal.absentIndex === 0);
ok('a free court starts the match at once', m(r.data).state === 'playing' && m(r.data).status === 'active' && m(r.data).courtName === 'Bane 1');
ok('the revision is bumped', (await cur(T)).revision === 2 && r.data.revision === 2);

console.log('play alone while every court is busy');
T = await fixture({ busyCourt: true });
r = await decide(T, 'B', 'playAlone');
ok('the match waits for a court', !r.error && m(r.data).state === 'waiting' && m(r.data).status === 'scheduled' && !m(r.data).courtId, r.error);
ok('the running match is untouched', m(r.data, M.running).state === 'playing' && m(r.data, M.running).courtId === 'c1');

console.log('walkover');
T = await fixture();
r = await decide(T, 'B', 'walkover');
ok('the opponents win by walkover', !r.error && m(r.data).state === 'finished' && m(r.data).winnerTeamIndex === 1 && m(r.data).isWalkover === true, r.error);
ok('no sets are recorded', m(r.data).completedSets.length === 0 && m(r.data).status === 'completed');
ok('the teams keep their players (history)', m(r.data).teamOne.players.length === 2);
r = await decide(T, 'B', 'playAlone');
ok('a decision can only be made once', r.error?.includes('not waiting for a withdrawal decision'), r.error);

console.log('the other side of the court');
T = await fixture();
const before = (await cur(T)).revision;
r = await call('match_withdrawal_decision', [T, 'ABCD2345', P.C, M.blocked, TOK.C, 'walkover']);
ok('an opponent cannot decide', r.error?.includes('Only the remaining teammate'), r.error);
r = await call('match_withdrawal_decision', [T, 'ABCD2345', P.A, M.blocked, TOK.A, 'walkover']);
ok('the withdrawn player cannot decide either', r.error?.includes('Only the remaining teammate'), r.error);
ok('a refused decision changes nothing', (await cur(T)).revision === before && m((await cur(T)).state).state === 'awaitingWithdrawalDecision');

console.log('validation and safety');
r = await call('match_withdrawal_decision', [T, 'ABCD2345', P.B, M.blocked, 'short', 'walkover']);
ok('bad token format rejected', r.error?.includes('Invalid withdrawal decision'), r.error);
r = await call('match_withdrawal_decision', [T, 'ABCD2345', P.B, M.blocked, TOK.C, 'walkover']);
ok('token of another player rejected', r.error?.includes('Player token mismatch'), r.error);
r = await decide(T, 'B', 'explode');
ok('unknown decision rejected', r.error?.includes('Invalid withdrawal decision'), r.error);
r = await decide(T, 'B', 'walkover', uuid(999));
ok('unknown match rejected', r.error?.includes('Match not found'), r.error);
r = await call('match_withdrawal_decision', [T, 'WRONG234', P.B, M.blocked, TOK.B, 'walkover']);
ok('wrong invite code rejected', r.error?.includes('Tournament not found'), r.error);
T = await fixture({ status: 'Avsluttet' });
r = await decide(T, 'B', 'walkover');
ok('a finished tournament cannot change', r.error?.includes('finished'), r.error);
T = await fixture();
await pg.query(`update public.tournaments set state = jsonb_set(state, '{rounds,0,matches,0,state}', '"waiting"') where id = $1`, [T]);
r = await decide(T, 'B', 'walkover');
ok('a match that is not waiting for a decision is refused', r.error?.includes('not waiting for a withdrawal decision'), r.error);

console.log('grants');
const grants = (await pg.query(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon from pg_proc p where p.proname in ('match_withdrawal_decision', 'match_withdrawal_decision_impl') order by 1`)).rows;
ok('the wrapper is callable by anon, the implementation is not', grants.find((g) => g.proname === 'match_withdrawal_decision')?.anon === true && grants.find((g) => g.proname === 'match_withdrawal_decision_impl')?.anon === false, JSON.stringify(grants));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
