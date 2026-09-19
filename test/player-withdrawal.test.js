const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { console, structuredClone };
context.window = context;
vm.createContext(context);
for (const file of ["player-withdrawal.js", "player-replacement.js", "scoring-engine.js", "tournament-scheduler.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", file), "utf8"), context);
}
const withdrawal = context.PadelstarPlayerWithdrawal;
const replacement = context.PadelstarPlayerReplacement;
const scoring = context.PadelstarScoring;
const scheduler = context.PadelstarTournamentScheduler;

const person = (name) => ({ id: name, name, active: true });
const createTeam = (players) => ({ id: `team-${players.map((p) => p.id).join("")}`, players, displayName: players.map((p) => p.name).join(" & ") });
const team = (...names) => createTeam(names.map(person));
const match = (id, state, one, two, extra = {}) => ({
  id, state, status: state === "waiting" ? "scheduled" : state === "playing" ? "active" : "completed",
  teamOne: team(...one), teamTwo: team(...two), winnerTeamIndex: null, completedSets: [], currentSet: { teamOne: 0, teamTwo: 0 }, currentGame: { teamOne: 0, teamTwo: 0 }, ...extra,
});

function tournament() {
  return {
    status: "Runde pågår",
    settings: { gamesToWinSet: 6, setsToWinMatch: 1, pointMode: "matches", format: "roundRobin" },
    courts: [{ id: "c1", name: "Bane 1" }],
    players: ["Ann", "Bob", "Cat", "Dan"].map(person),
    cupTeams: [],
    rounds: [
      { id: "r1", matches: [match("m1", "finished", ["Ann", "Bob"], ["Cat", "Dan"], { winnerTeamIndex: 0, completedSets: [{ teamOne: 6, teamTwo: 2 }] })] },
      { id: "r2", matches: [
        match("m2", "playing", ["Ann", "Cat"], ["Bob", "Dan"], { courtId: "c1", courtName: "Bane 1", currentSet: { teamOne: 3, teamTwo: 2 }, undoStack: [{ x: 1 }], scorer: { playerId: "Ann" }, startedAt: "2026-09-19T10:00:00.000Z" }),
        match("m2b", "waiting", ["Dan", "Bob"], ["Cat", "Ann"]),
      ] },
      { id: "r3", matches: [match("m3", "waiting", ["Ann", "Dan"], ["Bob", "Cat"])] },
    ],
  };
}
const find = (state, id) => state.rounds.flatMap((round) => round.matches).find((item) => item.id === id);
const names = (t) => t.players.map((p) => p.name);
const doWithdraw = (state, name) => withdrawal.withdraw(state, name, { createTeam, restartMatch: replacement.restartMatch, nowIso: "2026-09-19T12:00:00.000Z" });
const ids = (list) => Array.from(list);

test("the plan says what would happen and changes nothing", () => {
  const state = tournament();
  const snapshot = JSON.stringify(state);
  const plan = withdrawal.plan(state, "Ann");
  assert.equal(plan.ok, true);
  assert.deepEqual(ids(plan.restart), ["m2"]);
  assert.deepEqual(ids(plan.decide).sort(), ["m2", "m2b", "m3"]);
  assert.deepEqual(ids(plan.kept), ["m1"]);
  assert.equal(JSON.stringify(state), snapshot);
});

test("unplayed matches are kept and wait for the teammate's decision; finished matches are untouched", () => {
  const state = tournament();
  const result = doWithdraw(state, "Ann");
  assert.equal(result.ok, true);
  const m3 = find(state, "m3");
  assert.equal(m3.state, "awaitingWithdrawalDecision");
  assert.equal(m3.status, "blocked");
  assert.deepEqual([m3.withdrawal.playerId, m3.withdrawal.teamIndex, m3.withdrawal.teammateId, m3.withdrawal.status], ["Ann", 0, "Dan", "pending"]);
  assert.deepEqual(names(find(state, "m1").teamOne), ["Ann", "Bob"], "history is preserved");
  const ann = state.players.find((p) => p.id === "Ann");
  assert.deepEqual([ann.withdrawn, ann.active, ann.availability], [true, false, "away"]);
});

test("a match in progress is annulled, its court is released and it waits for the decision", () => {
  const state = tournament();
  const result = doWithdraw(state, "Ann");
  assert.deepEqual(ids(result.restarted), ["m2"]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.freed)), [{ courtId: "c1", courtName: "Bane 1" }]);
  const m2 = find(state, "m2");
  assert.equal(m2.state, "awaitingWithdrawalDecision");
  assert.equal(m2.courtId, null);
  assert.deepEqual([m2.currentSet.teamOne, m2.currentSet.teamTwo, m2.completedSets.length], [0, 0, 0]);
  assert.equal("scorer" in m2, false);
});

test("a blocked match is never picked by the scheduler", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  const round = state.rounds[1].matches;
  assert.equal(scheduler.findNextPlayableMatch(round, new Set()), null, "m2 and m2b both wait for a decision");
});

test("the teammate can play alone: 1 against 2", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  const result = withdrawal.decide(state, "m3", "playAlone", { createTeam, by: "teammate", nowIso: "2026-09-19T12:05:00.000Z" });
  assert.equal(result.ok, true);
  const m3 = find(state, "m3");
  assert.deepEqual(names(m3.teamOne), ["Dan"]);
  assert.equal(m3.teamOne.displayName, "Dan");
  assert.deepEqual(names(m3.teamTwo), ["Bob", "Cat"]);
  assert.equal(m3.state === "waiting" || m3.state === "playing", true);
  assert.equal(m3.withdrawal.status, "playAlone");
  assert.equal(m3.withdrawal.decidedBy, "teammate");
  assert.equal(m3.withdrawal.absent.name, "Ann", "the absent player is remembered");
});

test("deciding to play alone starts the match only when a court is free", () => {
  const busy = tournament();
  busy.rounds[2].matches.push(match("busy", "playing", ["Eve", "Fay"], ["Gus", "Hal"], { courtId: "c1" }));
  doWithdraw(busy, "Ann");
  assert.equal(withdrawal.decide(busy, "m3", "playAlone", { createTeam }).started, false);
  assert.equal(find(busy, "m3").state, "waiting");
  const free = tournament();
  doWithdraw(free, "Ann");
  free.rounds[1].matches.forEach((item) => { if (item.state === "awaitingWithdrawalDecision") { item.state = "finished"; item.status = "completed"; } });
  const started = withdrawal.decide(free, "m3", "playAlone", { createTeam });
  assert.equal(started.started, true);
  assert.deepEqual([find(free, "m3").state, find(free, "m3").courtId], ["playing", "c1"]);
});

test("or the teammate gives a walkover: the opponents win", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  assert.equal(withdrawal.decide(state, "m3", "walkover", { createTeam, by: "admin" }).ok, true);
  const m3 = find(state, "m3");
  assert.deepEqual([m3.state, m3.winnerTeamIndex, m3.isWalkover], ["finished", 1, true]);
  assert.equal(m3.withdrawal.decidedBy, "admin");
  const standings = scoring.leaderboardEntries(state.players, state.rounds.flatMap((round) => round.matches), "matches");
  assert.equal(standings.find((entry) => entry.player.id === "Bob").points, 6, "Bob: the finished win plus the walkover win");
  assert.equal(standings.find((entry) => entry.player.id === "Cat").points, 3);
  assert.equal(standings.find((entry) => entry.player.id === "Dan").points, 0, "the teammate who gave the walkover gets nothing");
});

test("a decision can only be made once, and only the two known options are accepted", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  assert.equal(withdrawal.decide(state, "m3", "explode", { createTeam }).error, "invalid");
  assert.equal(withdrawal.decide(state, "m1", "walkover", { createTeam }).error, "notPending");
  assert.equal(withdrawal.decide(state, "m3", "walkover", { createTeam }).ok, true);
  assert.equal(withdrawal.decide(state, "m3", "playAlone", { createTeam }).error, "notPending");
});

test("nobody left on that side: the opponents win by walkover automatically", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  const result = doWithdraw(state, "Dan");
  assert.equal(result.ok, true);
  assert.ok(ids(result.walkover).includes("m3"));
  const m3 = find(state, "m3");
  assert.deepEqual([m3.state, m3.winnerTeamIndex, m3.withdrawal.decidedBy], ["finished", 1, "auto"]);
});

test("both sides lose a player: the match is cancelled", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  const result = doWithdraw(state, "Bob");
  assert.ok(ids(result.cancel).includes("m3"));
  const m3 = find(state, "m3");
  assert.deepEqual([m3.state, m3.withdrawal.bothSides], ["cancelled", true]);
});

test("a result awaiting approval blocks the withdrawal; a finished tournament and a second withdrawal are refused", () => {
  const approval = tournament();
  find(approval, "m2").state = "awaitingApproval";
  assert.equal(doWithdraw(approval, "Ann").blocked, "awaitingApproval");
  assert.equal(approval.players.find((p) => p.id === "Ann").withdrawn, undefined, "nothing changed");
  const ended = tournament();
  ended.status = "Avsluttet";
  assert.equal(doWithdraw(ended, "Ann").blocked, "ended");
  const twice = tournament();
  doWithdraw(twice, "Ann");
  assert.equal(doWithdraw(twice, "Ann").blocked, "inactive");
  assert.equal(doWithdraw(tournament(), "Zed").blocked, "notFound");
});

test("the withdrawn player can be put back: waiting matches return to normal", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  const result = withdrawal.reinstate(state, "Ann", { createTeam });
  assert.equal(result.ok, true);
  const m3 = find(state, "m3");
  assert.deepEqual([m3.state, m3.status, "withdrawal" in m3], ["waiting", "scheduled", false]);
  assert.deepEqual(names(m3.teamOne), ["Ann", "Dan"]);
  const ann = state.players.find((p) => p.id === "Ann");
  assert.deepEqual([ann.active, ann.withdrawn], [true, false]);
});

test("putting the player back also restores a match that was waiting to be played alone", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  withdrawal.decide(state, "m3", "playAlone", { createTeam });
  find(state, "m3").state = "waiting";
  find(state, "m3").status = "scheduled";
  assert.equal(withdrawal.reinstate(state, "Ann", { createTeam }).ok, true);
  assert.deepEqual(names(find(state, "m3").teamOne), ["Ann", "Dan"], "Ann is back in her original position");
});

test("a match already being played alone cannot be changed by putting the player back", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  withdrawal.decide(state, "m3", "playAlone", { createTeam });
  find(state, "m3").state = "playing";
  assert.equal(withdrawal.reinstate(state, "Ann", { createTeam }).blocked, "matchInProgress");
});

test("a walkover that was already given stays, even if the player comes back", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  withdrawal.decide(state, "m3", "walkover", { createTeam });
  withdrawal.reinstate(state, "Ann", { createTeam });
  assert.deepEqual([find(state, "m3").state, find(state, "m3").isWalkover], ["finished", true]);
});

test("a replacement takes over a withdrawn player's slot and their waiting matches", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  const result = replacement.replace(state, "Ann", person("Eve"), { createTeam, nameTaken: (name) => state.players.some((p) => p.name === name), nowIso: "2026-09-19T13:00:00.000Z" });
  assert.equal(result.ok, true);
  assert.ok(ids(result.resolvedWithdrawals).includes("m3"));
  const m3 = find(state, "m3");
  assert.deepEqual([m3.state, "withdrawal" in m3], ["waiting", false]);
  assert.deepEqual(names(m3.teamOne), ["Eve", "Dan"]);
  const ann = state.players.find((p) => p.id === "Ann");
  assert.deepEqual([ann.replacedBy !== undefined, ann.withdrawn], [true, true]);
});

test("a replacement also joins a teammate who was going to play alone", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  withdrawal.decide(state, "m3", "playAlone", { createTeam });
  find(state, "m3").state = "waiting";
  replacement.replace(state, "Ann", person("Eve"), { createTeam, nameTaken: () => false });
  assert.deepEqual(names(find(state, "m3").teamOne), ["Eve", "Dan"]);
});

test("statistics stay with the person: the withdrawn player keeps what they played", () => {
  const state = tournament();
  doWithdraw(state, "Ann");
  withdrawal.decide(state, "m3", "walkover", { createTeam });
  const standings = scoring.leaderboardEntries(state.players, state.rounds.flatMap((round) => round.matches), "matches");
  assert.equal(standings.find((entry) => entry.player.id === "Ann").matchWins, 1, "Ann's finished win is still hers");
});

test("withdrawal is not offered in a Cup (the bracket refers to team ids)", () => {
  const state = tournament();
  state.settings.format = "cup";
  assert.equal(withdrawal.plan(state, "Ann").blocked, "cup");
  assert.equal(doWithdraw(state, "Ann").blocked, "cup");
  assert.equal(state.players.find((p) => p.id === "Ann").withdrawn, undefined);
});
