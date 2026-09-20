// Database tests for migration 20260920200000_cup_withdrawal.sql (withdrawal in a Cup, lucky loser).
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/cup-withdrawal.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
await pg.exec(`
create role anon; create role authenticated;
create table public.tournaments(id uuid primary key, invite_code text, admin_token text, state jsonb, revision int default 0, updated_at timestamptz default now());
create or replace function public.consume_api_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer) returns boolean language sql as $$ select true $$;
`);
await pg.exec(fs.readFileSync(dir + '20260920200000_cup_withdrawal.sql', 'utf8'));

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = '11111111-2222-4333-8444-555555555555';
const person = (k) => ({ id: 'p-' + k, name: k });
const team = (...keys) => ({ id: 't-' + keys.join(''), players: keys.map(person), displayName: keys.join(' & ') });
const base = { currentGame: { teamOne: 0, teamTwo: 0 }, currentSet: { teamOne: 0, teamTwo: 0 }, winnerTeamIndex: null, completedSets: [] };
let mid = 0;
const finished = (one, two, winner, sets, extra = {}) => ({ ...base, id: uuid(500 + ++mid), state: 'finished', status: 'completed', teamOne: one, teamTwo: two, winnerTeamIndex: winner, completedSets: sets, isThirdPlaceMatch: false, ...extra });
const cancelledBoth = (one, two) => ({ ...base, id: uuid(500 + ++mid), state: 'cancelled', status: 'cancelled', teamOne: one, teamTwo: two, isThirdPlaceMatch: false, withdrawal: { bothSides: true, playerId: 'x', teamIndex: 0 } });

let seq = 0;
async function fixture({ round, players, third = false, bracketRounds = 3 }) {
  seq += 1;
  const T = uuid(3000 + seq);
  const everyone = players ?? [];
  const state = {
    status: 'Runde pågår', settings: { format: 'cup' }, revision: 1, courts: [{ id: 'c1', name: 'Bane 1' }, { id: 'c2', name: 'Bane 2' }],
    players: everyone,
    cup: { includesThirdPlaceMatch: third, byeTeams: [], bracket: { bracketSize: 2 ** bracketRounds, rounds: Array.from({ length: bracketRounds }, (_, i) => ({ roundNumber: i + 1, slots: [], byeTeams: [], thirdPlaceSlot: null })) } },
    rounds: [{ id: 'r1', roundNumber: 1, status: 'active', matches: round }],
  };
  await pg.query(`insert into public.tournaments(id,invite_code,admin_token,state,revision) values ($1,'ABCD2345',$2,$3::jsonb,1)`, [T, ADMIN, JSON.stringify(state)]);
  return T;
}
const everybody = (...keys) => keys.map((k) => ({ ...person(k), active: true }));
const withdrawn = (list, ...keys) => list.map((p) => (keys.includes(p.name) ? { ...p, withdrawn: true, active: false } : p));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const advance = async (T, confirm, revision = 1) => {
  try {
    const args = confirm === undefined ? [T, ADMIN, revision] : [T, ADMIN, revision, confirm];
    const r = await pg.query(`select public.admin_advance_cup(${args.map((_, i) => '$' + (i + 1)).join(',')}) as r`, args);
    return { data: r.rows[0].r };
  } catch (e) { return { error: e.message }; }
};
const lastRound = (st) => st.rounds[st.rounds.length - 1];
const at = (st, i) => lastRound(st).matches[i];
const set = (a, b) => ({ teamOne: a, teamTwo: b });

console.log('no withdrawals: a plain advance still works with three arguments');
const AB = team('A', 'B'), CD = team('C', 'D'), EF = team('E', 'F'), GH = team('G', 'H');
let players = everybody('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H');
let T = await fixture({ players, round: [finished(AB, CD, 0, [set(6, 2)]), finished(EF, GH, 1, [set(3, 6)])] });
let r = await advance(T);
ok('the next round is created', !r.error && r.data.rounds.length === 2, r.error);
ok('the winners meet and the match starts', at(r.data, 0).teamOne.id === AB.id && at(r.data, 0).teamTwo.id === GH.id && at(r.data, 0).state === 'playing');
ok('the previous round is finished', r.data.rounds[0].status === 'finished');
r = await advance(T, undefined, 7);
ok('a stale revision is still refused', r.error?.includes('Tournament state changed'), r.error);

console.log('a winner has a withdrawn player: the match waits for the teammate');
players = withdrawn(everybody('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'), 'A');
T = await fixture({ players, round: [finished(AB, CD, 0, [set(6, 2)]), finished(EF, GH, 1, [set(3, 6)])] });
r = await advance(T);
ok('the match is blocked, not started', !r.error && at(r.data, 0).state === 'awaitingWithdrawalDecision' && at(r.data, 0).status === 'blocked', r.error);
const w = at(r.data, 0).withdrawal;
ok('the decision belongs to the remaining teammate', w?.playerId === 'p-A' && w.teamIndex === 0 && w.teammateId === 'p-B' && w.status === 'pending' && w.absentIndex === 0);
ok('the other match of the round is played normally', at(r.data, 1) === undefined && lastRound(r.data).matches.length === 1);

console.log('every player of a winning team has withdrawn: walkover for the opponents');
players = withdrawn(everybody('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'), 'A', 'B');
T = await fixture({ players, round: [finished(AB, CD, 0, [set(6, 2)]), finished(EF, GH, 1, [set(3, 6)])] });
r = await advance(T);
ok('the opponents win at once', !r.error && at(r.data, 0).state === 'finished' && at(r.data, 0).winnerTeamIndex === 1 && at(r.data, 0).isWalkover === true, r.error);
ok('no sets and a record of who left', at(r.data, 0).completedSets.length === 0 && at(r.data, 0).withdrawal.status === 'walkover' && at(r.data, 0).withdrawal.decidedBy === 'auto');

console.log('players withdrawn on both sides: the match is cancelled');
players = withdrawn(everybody('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'), 'A', 'B', 'G', 'H');
T = await fixture({ players, round: [finished(AB, CD, 0, [set(6, 2)]), finished(EF, GH, 1, [set(3, 6)])] });
r = await advance(T);
ok('cancelled with both sides recorded', !r.error && at(r.data, 0).state === 'cancelled' && at(r.data, 0).withdrawal.bothSides === true, r.error);
players = withdrawn(everybody('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'), 'A', 'G');
T = await fixture({ players, round: [finished(AB, CD, 0, [set(6, 2)]), finished(EF, GH, 1, [set(3, 6)])] });
r = await advance(T);
ok('one player gone on each side is cancelled too (the Round Robin rule)', !r.error && at(r.data, 0).state === 'cancelled' && at(r.data, 0).withdrawal.bothSides === true, r.error);

console.log('lucky loser: both sides of a first-round match withdrew');
const IJ = team('I', 'J'), KL = team('K', 'L'), MN = team('M', 'N'), OP = team('O', 'P');
players = everybody('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P');
const round1 = () => [
  finished(AB, CD, 0, [set(6, 4)]),          // CD loses 4-6: -2
  cancelledBoth(EF, GH),
  finished(IJ, KL, 1, [set(1, 6)]),          // IJ loses 1-6: -5
  finished(MN, OP, 0, [set(6, 5), set(6, 3)]), // OP loses 5-6 3-6: -4
];
T = await fixture({ players, round: round1() });
r = await advance(T);
ok('without confirmation nothing happens', r.error?.includes('Lucky loser confirmation required'), r.error);
ok('a refused advance changes nothing', (await pg.query(`select revision, jsonb_array_length(state->'rounds') n from public.tournaments where id=$1`, [T])).rows[0].n === 1);
r = await advance(T, false);
ok('an explicit false is refused as well', r.error?.includes('Lucky loser confirmation required'), r.error);
r = await advance(T, true);
ok('confirmed: the next round is created', !r.error && r.data.rounds.length === 2, r.error);
const ids = lastRound(r.data).matches.flatMap((mm) => [mm.teamOne.id, mm.teamTwo.id]);
ok('the best-placed loser (CD, games difference -2) takes the place of the cancelled match', ids.includes(CD.id) && !ids.includes(IJ.id) && !ids.includes(OP.id), JSON.stringify(ids));
ok('four teams play two matches', lastRound(r.data).matches.length === 2);
ok('the lucky loser is marked with the round it entered', lastRound(r.data).matches.flatMap((mm) => [mm.teamOne, mm.teamTwo]).find((t) => t.id === CD.id).luckyLoserRound === 2);
ok('the lucky loser sits where the cancelled match was in the order', ids.join() === [AB.id, CD.id, KL.id, MN.id].join(), JSON.stringify(ids));

console.log('the ranking uses the games over the whole cup, then the match order');
T = await fixture({ players, round: [finished(AB, CD, 0, [set(6, 0)]), cancelledBoth(EF, GH), finished(IJ, KL, 0, [set(6, 5)]), finished(MN, OP, 0, [set(6, 5)])] });
r = await advance(T, true);
const ids2 = lastRound(r.data).matches.flatMap((mm) => [mm.teamOne.id, mm.teamTwo.id]);
ok('KL and OP both lost 5-6 (-1): the earlier match wins; CD lost 0-6 (-6) and is behind both', !r.error && ids2.includes(KL.id) && !ids2.includes(OP.id) && !ids2.includes(CD.id), JSON.stringify(ids2));

console.log('a team that lost by walkover, or has no player left, is not a candidate');
T = await fixture({ players: withdrawn(players, 'K', 'L'), round: [finished(AB, CD, 0, [set(6, 4)]), cancelledBoth(EF, GH), finished(IJ, KL, 0, [set(6, 0)]), finished(MN, OP, 1, [], { isWalkover: true })] });
r = await advance(T, true);
const ids3 = lastRound(r.data).matches.flatMap((mm) => [mm.teamOne.id, mm.teamTwo.id]);
ok('KL (nobody left) and MN (lost by walkover) are skipped: CD takes the place', !r.error && ids3.includes(CD.id) && !ids3.includes(KL.id), JSON.stringify(ids3));

console.log('no candidate: no confirmation is needed');
T = await fixture({ players, round: [finished(AB, CD, 0, [set(6, 4)], { isWalkover: true }), cancelledBoth(EF, GH)] });
r = await advance(T);
ok('the advance goes through (one team advances: the cup is over)', !r.error && r.data.status === 'Cup ferdig' && r.data.cup.winnerTeam.id === AB.id, r.error);

console.log('no candidate and an odd number of winners: the last team gets a bye');
T = await fixture({ players, round: [finished(AB, CD, 0, [], { isWalkover: true }), cancelledBoth(EF, GH), finished(IJ, KL, 0, [], { isWalkover: true }), finished(MN, OP, 0, [], { isWalkover: true })] });
r = await advance(T);
ok('two teams play and the third has a bye', !r.error && lastRound(r.data).matches.length === 1 && r.data.cup.byeTeams.length === 1 && r.data.cup.byeTeams[0].id === MN.id, r.error);

console.log('the lucky loser is not in the third place match too');
T = await fixture({ players, third: true, bracketRounds: 2, round: [cancelledBoth(AB, CD), finished(EF, GH, 0, [set(6, 3)])] });
r = await advance(T, true);
ok('the final is played by the winner and the lucky loser; no third place match', !r.error && lastRound(r.data).matches.length === 1 && lastRound(r.data).matches.flatMap((mm) => [mm.teamOne.id, mm.teamTwo.id]).sort().join() === [EF.id, GH.id].sort().join(), r.error || JSON.stringify(lastRound(r.data).matches.map((mm) => [mm.teamOne.id, mm.teamTwo.id])));

console.log('permissions');
const grants = await pg.query(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as auth from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('admin_advance_cup', 'admin_advance_cup_impl', '_cup_apply_withdrawals', '_cup_lucky_losers', '_cup_games_difference', '_cup_absent_players', '_cup_absent_record') order by 1`);
const g = Object.fromEntries(grants.rows.map((row) => [row.proname, row]));
ok('the public function is callable by guests and accounts', g.admin_advance_cup.anon && g.admin_advance_cup.auth);
ok('the implementation and helpers are not callable from the API', ['admin_advance_cup_impl', '_cup_apply_withdrawals', '_cup_lucky_losers', '_cup_games_difference', '_cup_absent_players', '_cup_absent_record'].every((n) => !g[n].anon && !g[n].auth));
const overloads = await pg.query(`select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'admin_advance_cup'`);
ok('exactly one admin_advance_cup exists (no ambiguous overload)', overloads.rows[0].n === 1);
r = await (async () => { try { await pg.query(`select public.admin_advance_cup($1,$2,1)`, [uuid(3001), 'short']); return {}; } catch (e) { return { error: e.message }; } })();
ok('a bad admin token is refused', r.error?.includes('Invalid cup advance payload'), r.error);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
