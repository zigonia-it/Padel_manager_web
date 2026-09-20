// Withdrawal in a Cup (0.13): the same rules as in a Round Robin for the current round, the rules applied to a newly
// created round, and the lucky loser (both sides of a match withdrew). The database applies the same rules
// (supabase/tests/cup-withdrawal.pglite.mjs); the fixtures below mirror that test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const context = { console, structuredClone };
context.window = context;
vm.createContext(context);
for (const file of ["player-withdrawal.js", "player-replacement.js", "tournament-rounds.js"]) vm.runInContext(read("app", file), context);
const withdrawal = context.PadelstarPlayerWithdrawal;
const rounds = context.PadelstarTournamentRounds;
const replacement = context.PadelstarPlayerReplacement;

const person = (name) => ({ id: name, name, active: true });
const createTeam = (players) => ({ id: `t-${players.map((p) => p.id).join("")}`, players, displayName: players.map((p) => p.name).join(" & ") });
const team = (...names) => createTeam(names.map(person));
let seq = 0;
const match = (state, one, two, extra = {}) => ({
  id: `m${++seq}`, state, status: state === "waiting" ? "scheduled" : state === "playing" ? "active" : state === "cancelled" ? "cancelled" : "completed",
  teamOne: one, teamTwo: two, winnerTeamIndex: null, completedSets: [], currentSet: { teamOne: 0, teamTwo: 0 }, currentGame: { teamOne: 0, teamTwo: 0 }, isThirdPlaceMatch: false, ...extra,
});
const finished = (one, two, winner, sets, extra = {}) => match("finished", one, two, { winnerTeamIndex: winner, completedSets: sets, ...extra });
const cancelled = (one, two) => match("cancelled", one, two, { withdrawal: { bothSides: true, playerId: "x", teamIndex: 0 } });
const set = (a, b) => ({ teamOne: a, teamTwo: b });
const everyone = (...names) => names.map(person);
const gone = (players, ...names) => players.map((p) => (names.includes(p.name) ? { ...p, withdrawn: true, active: false } : p));
const AB = team("A", "B"), CD = team("C", "D"), EF = team("E", "F"), GH = team("G", "H");
const IJ = team("I", "J"), KL = team("K", "L"), MN = team("M", "N"), OP = team("O", "P");
const ALL = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
const state = (players, roundMatches) => ({ status: "Runde pågår", settings: { format: "cup", gamesToWinSet: 6, setsToWinMatch: 1 }, courts: [{ id: "c1", name: "Bane 1" }], players, cupTeams: [], rounds: [{ id: "r1", roundNumber: 1, status: "active", matches: roundMatches }] });
const plain = (value) => JSON.parse(JSON.stringify(value));

test("a player can withdraw in a Cup: the team's match in the current round waits for the teammate", () => {
  const current = match("waiting", AB, CD);
  const other = match("playing", EF, GH, { courtId: "c1", courtName: "Bane 1" });
  const s = state(everyone(...ALL.slice(0, 8)), [current, other]);
  assert.equal(withdrawal.plan(s, "A").ok, true);
  const result = withdrawal.withdraw(s, "A", { createTeam, restartMatch: replacement.restartMatch, nowIso: "2026-09-20T10:00:00.000Z" });
  assert.equal(result.ok, true);
  assert.deepEqual(plain(result.decide), [current.id]);
  assert.equal(current.state, "awaitingWithdrawalDecision");
  assert.deepEqual([current.withdrawal.teammateId, current.withdrawal.teamIndex, current.withdrawal.status], ["B", 0, "pending"]);
  assert.equal(other.state, "playing", "matches of other teams are untouched");
});

test("the teammate can play alone in a Cup: the team gets a new id and the bracket keeps referring to the match", () => {
  const current = match("waiting", AB, CD);
  const s = state(everyone(...ALL.slice(0, 4)), [current]);
  withdrawal.withdraw(s, "A", { createTeam });
  const result = withdrawal.decide(s, current.id, "playAlone", { createTeam });
  assert.equal(result.ok, true);
  assert.deepEqual(current.teamOne.players.map((p) => p.name), ["B"]);
  assert.equal(current.state === "waiting" || current.state === "playing", true);
  assert.equal(current.teamTwo.id, CD.id, "the opponents are untouched");
});

test("if every player of a team withdrew, the opponents win by walkover at once", () => {
  const current = match("waiting", AB, CD);
  const s = state(everyone(...ALL.slice(0, 4)), [current]);
  withdrawal.withdraw(s, "A", { createTeam });
  assert.equal(current.state, "awaitingWithdrawalDecision");
  withdrawal.withdraw(s, "B", { createTeam });
  assert.equal(current.state, "finished");
  assert.equal(current.winnerTeamIndex, 1);
  assert.equal(current.isWalkover, true);
});

test("a new round: a winner with a withdrawn player waits for the teammate", () => {
  const s = state(gone(everyone(...ALL.slice(0, 8)), "A"), []);
  const round = { matches: [match("waiting", AB, GH)] };
  const result = withdrawal.handleNewRound(s, round, { nowIso: "2026-09-20T10:00:00.000Z" });
  assert.deepEqual(plain(result.decide), [round.matches[0].id]);
  assert.equal(round.matches[0].state, "awaitingWithdrawalDecision");
  assert.deepEqual([round.matches[0].withdrawal.playerId, round.matches[0].withdrawal.teammateId, round.matches[0].withdrawal.absentIndex], ["A", "B", 0]);
});

test("a new round: nobody left on one side means a walkover at once; both sides affected means cancelled", () => {
  let s = state(gone(everyone(...ALL.slice(0, 8)), "A", "B"), []);
  let round = { matches: [match("waiting", AB, GH)] };
  withdrawal.handleNewRound(s, round);
  assert.deepEqual([round.matches[0].state, round.matches[0].winnerTeamIndex, round.matches[0].isWalkover], ["finished", 1, true]);
  assert.equal(round.matches[0].withdrawal.decidedBy, "auto");
  s = state(gone(everyone(...ALL.slice(0, 8)), "A", "B", "G", "H"), []);
  round = { matches: [match("waiting", AB, GH)] };
  withdrawal.handleNewRound(s, round);
  assert.deepEqual([round.matches[0].state, round.matches[0].withdrawal.bothSides], ["cancelled", true]);
  s = state(gone(everyone(...ALL.slice(0, 8)), "A", "G"), []);
  round = { matches: [match("waiting", AB, GH)] };
  withdrawal.handleNewRound(s, round);
  assert.deepEqual([round.matches[0].state, round.matches[0].withdrawal.bothSides], ["cancelled", true], "one player gone on each side is cancelled (the Round Robin rule)");
  s = state(gone(everyone(...ALL.slice(0, 8)), "A", "B"), []);
  round = { matches: [match("waiting", AB, GH), match("playing", CD, EF)] };
  withdrawal.handleNewRound(s, round);
  assert.equal(round.matches[1].state, "playing", "only matches that have not started are handled, others are left alone");
});

test("a replaced player is not treated as a withdrawn one in a new round", () => {
  const players = everyone(...ALL.slice(0, 8)).map((p) => (p.id === "A" ? { ...p, withdrawn: true, active: false, replacedBy: "Z" } : p));
  const round = { matches: [match("waiting", AB, GH)] };
  withdrawal.handleNewRound(state(players, []), round);
  assert.equal(round.matches[0].state, "waiting");
});

const lucky = () => state(everyone(...ALL), [
  finished(AB, CD, 0, [set(6, 4)]),
  cancelled(EF, GH),
  finished(IJ, KL, 1, [set(1, 6)]),
  finished(MN, OP, 0, [set(6, 5), set(6, 3)]),
]);

test("lucky loser: the best-placed losing team (games difference over the cup) takes the place of a cancelled match", () => {
  const s = lucky();
  const proposal = rounds.luckyLoserProposal(s, s.rounds[0]);
  assert.equal(proposal.missing, 1);
  assert.deepEqual(plain(proposal.teams.map((t) => t.id)), [CD.id], "CD lost 4-6 (-2); IJ -5 and OP -4 are behind");
  const advancing = rounds.advancingTeams(s.rounds[0], { byeTeams: [] }, [], proposal.teams);
  assert.deepEqual(plain(advancing.map((t) => t.id)), [AB.id, CD.id, KL.id, MN.id], "the team sits where the cancelled match was");
});

test("lucky loser: equal differences are decided by the order of the matches; walkover losers and teams without players are skipped", () => {
  let s = state(everyone(...ALL), [finished(AB, CD, 0, [set(6, 0)]), cancelled(EF, GH), finished(IJ, KL, 0, [set(6, 5)]), finished(MN, OP, 0, [set(6, 5)])]);
  assert.deepEqual(plain(rounds.luckyLoserProposal(s, s.rounds[0]).teams.map((t) => t.id)), [KL.id]);
  s = state(gone(everyone(...ALL), "K", "L"), [finished(AB, CD, 0, [set(6, 4)]), cancelled(EF, GH), finished(IJ, KL, 0, [set(6, 0)]), finished(MN, OP, 1, [], { isWalkover: true })]);
  assert.deepEqual(plain(rounds.luckyLoserProposal(s, s.rounds[0]).teams.map((t) => t.id)), [CD.id], "KL has nobody left and MN lost by walkover");
  s = state(everyone(...ALL), [finished(AB, CD, 0, [], { isWalkover: true }), cancelled(EF, GH)]);
  assert.deepEqual(plain(rounds.luckyLoserProposal(s, s.rounds[0]).teams), [], "no candidate: nobody takes the place");
});

test("lucky loser: two cancelled matches take the two best losers; without a cancelled match there is no proposal", () => {
  const s = state(everyone(...ALL), [cancelled(AB, CD), cancelled(EF, GH), finished(IJ, KL, 0, [set(6, 1)]), finished(MN, OP, 0, [set(6, 5)])]);
  assert.deepEqual(plain(rounds.luckyLoserProposal(s, s.rounds[0]).teams.map((t) => t.id)), [OP.id, KL.id]);
  const plainRound = state(everyone(...ALL), [finished(AB, CD, 0, [set(6, 2)])]);
  assert.deepEqual(plain(rounds.luckyLoserProposal(plainRound, plainRound.rounds[0])), { missing: 0, teams: [] });
});

// the runtime: a round is only created after the admin confirmed the lucky loser, and the new round applies the rules
function runtimeFor(s) {
  const runtimeContext = { console, structuredClone, crypto: { randomUUID: () => `id-${++seq}` } };
  runtimeContext.window = runtimeContext;
  vm.createContext(runtimeContext);
  for (const file of ["player-withdrawal.js", "tournament-rounds.js", "tournament-runtime.js"]) vm.runInContext(read("app", file), runtimeContext);
  let activated = null;
  const runtime = runtimeContext.PadelstarTournamentRuntime.create({
    activateRound: (round) => { round.status = "active"; s.rounds.forEach((r) => { if (r !== round && r.status === "active") r.status = "completed"; }); activated = round; },
    buildSchedule: () => [],
    canCompleteRound: (round) => round.matches.length > 0 && round.matches.every((m) => ["finished", "cancelled"].includes(m.state)),
    createTeam,
    generateRoundMatches: (teams, roundNumber, sittingOut) => {
      const list = [];
      for (let i = 0; i < teams.length - 1; i += 2) list.push(match("waiting", teams[i], teams[i + 1], { rotationNumber: roundNumber, sittingOut }));
      return list;
    },
    getActiveRound: () => s.rounds.find((r) => r.status === "active"),
    getState: () => s,
    matchPlayers: (m) => [...m.teamOne.players, ...m.teamTwo.players],
    rounds: runtimeContext.PadelstarTournamentRounds,
    recordEvent: () => {},
    setsWonByTeam: () => 0,
    showToast: () => {},
    translate: (key) => key,
    uniquePlayers: (list) => [...new Map(list.map((p) => [p.id, p])).values()],
  });
  return { runtime, activated: () => activated };
}

test("the next Cup round is not created before the admin has confirmed the lucky loser", () => {
  const s = lucky();
  s.cup = { includesThirdPlaceMatch: false, byeTeams: [], bracket: { bracketSize: 8, rounds: [{ roundNumber: 1, slots: [], byeTeams: [] }, { roundNumber: 2, slots: [], byeTeams: [], thirdPlaceSlot: null }, { roundNumber: 3, slots: [], byeTeams: [], thirdPlaceSlot: null }] } };
  s.rounds[0].status = "active";
  const { runtime } = runtimeFor(s);
  assert.equal(runtime.cupCanAdvance(), true, "the proposal counts: four teams can play on");
  assert.equal(runtime.luckyLoserProposal().teams.length, 1);
  const before = JSON.stringify(s);
  assert.deepEqual(plain(runtime.startNextScheduledRound()), { needsConfirmation: true });
  assert.equal(JSON.stringify(s), before, "nothing changed");
  s.rounds[0].status = "completed";
  runtime.startNextScheduledRound({ luckyLoserConfirmed: true });
  assert.equal(s.rounds.length, 2);
  const players = s.rounds[1].matches.flatMap((m) => [m.teamOne, m.teamTwo]);
  assert.deepEqual(plain(players.map((t) => t.id)), [AB.id, CD.id, KL.id, MN.id]);
  assert.equal(players.find((t) => t.id === CD.id).luckyLoserRound, 2);
});

test("a round created after a withdrawal applies the rules (walkover, waiting for the teammate) and an odd number of teams gets a bye", () => {
  const s = state(gone(everyone(...ALL.slice(0, 8)), "A"), [finished(AB, CD, 0, [set(6, 2)]), finished(EF, GH, 1, [set(3, 6)])]);
  s.cup = { includesThirdPlaceMatch: false, byeTeams: [], bracket: { bracketSize: 4, rounds: [{ roundNumber: 1, slots: [], byeTeams: [] }, { roundNumber: 2, slots: [], byeTeams: [], thirdPlaceSlot: null }] } };
  s.rounds[0].status = "completed";
  const { runtime } = runtimeFor(s);
  runtime.startNextScheduledRound();
  assert.equal(s.rounds[1].matches[0].state, "awaitingWithdrawalDecision");
  const odd = state(everyone(...ALL), [finished(AB, CD, 0, [], { isWalkover: true }), cancelled(EF, GH), finished(IJ, KL, 0, [], { isWalkover: true }), finished(MN, OP, 0, [], { isWalkover: true })]);
  odd.cup = { includesThirdPlaceMatch: false, byeTeams: [], bracket: { bracketSize: 8, rounds: [{ roundNumber: 1, slots: [], byeTeams: [] }, { roundNumber: 2, slots: [], byeTeams: [], thirdPlaceSlot: null }, { roundNumber: 3, slots: [], byeTeams: [], thirdPlaceSlot: null }] } };
  odd.rounds[0].status = "completed";
  runtimeFor(odd).runtime.startNextScheduledRound();
  assert.equal(odd.rounds[1].matches.length, 1);
  assert.deepEqual(plain(odd.cup.byeTeams.map((t) => t.id)), [MN.id], "the last team has a bye");
});

test("the UI asks the admin to confirm, the server call carries the confirmation, and the texts exist", () => {
  const events = read("app", "admin-form-events.js");
  assert.match(events, /luckyLoserProposal\(\)[\s\S]*withdrawal\.luckyLoserConfirm[\s\S]*luckyLoserConfirmed = true/);
  assert.match(events, /queueRemoteCupAdvance\(\{ confirmLuckyLoser: luckyLoserConfirmed \}\)/);
  assert.match(events, /startNextScheduledRound\(\{ luckyLoserConfirmed \}\)/);
  assert.match(read("app", "remote-admin-actions.js"), /p_confirm_lucky_loser: confirmLuckyLoser/);
  const i18n = vm.createContext({ window: {} });
  vm.runInContext(read("app", "translations.js"), i18n);
  for (const language of ["nb", "en"]) for (const key of ["luckyLoserTitle", "luckyLoserConfirm", "luckyLoserNote"]) assert.ok(i18n.window.PadelstarTranslations[language][`withdrawal.${key}`], `${language} ${key}`);
  assert.match(read("app", "match-card.js"), /luckyLoserRound === match\.rotationNumber/);
  const migration = read("supabase", "migrations", "20260920200000_cup_withdrawal.sql");
  assert.match(migration, /Lucky loser confirmation required/);
  assert.match(migration, /revoke all on function public\.admin_advance_cup_impl\(uuid, text, integer, boolean\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.admin_advance_cup\(uuid, text, integer, boolean\) to anon, authenticated/);
});
