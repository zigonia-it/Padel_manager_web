const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function load(file) {
  const context = { console, structuredClone };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", file), "utf8"), context);
  return context;
}
const replacement = load("player-replacement.js").PadelstarPlayerReplacement;
const scoring = load("scoring-engine.js").PadelstarScoring;

const person = (name) => ({ id: name, name, active: true });
const createTeam = (players) => ({ displayName: players.map((player) => player.name).join(" & "), players });
const team = (...names) => createTeam(names.map(person));
const match = (id, state, one, two, extra = {}) => ({ id, state, teamOne: team(...one), teamTwo: team(...two), completedSets: [], currentSet: { teamOne: 0, teamTwo: 0 }, currentGame: { teamOne: 0, teamTwo: 0 }, ...extra });

function tournament() {
  return {
    status: "Runde pågår",
    settings: { gamesToWinSet: 6, setsToWinMatch: 1, pointMode: "matches", format: "roundRobin" },
    players: ["Ann", "Bob", "Cat", "Dan"].map(person),
    cupTeams: [],
    rounds: [
      { id: "r1", matches: [match("m1", "finished", ["Ann", "Bob"], ["Cat", "Dan"], { winnerTeamIndex: 0, completedSets: [{ teamOne: 6, teamTwo: 2 }] })] },
      { id: "r2", matches: [match("m2", "playing", ["Ann", "Cat"], ["Bob", "Dan"], {
        currentSet: { teamOne: 3, teamTwo: 2 }, currentGame: { teamOne: 2, teamTwo: 1 }, completedSets: [{ teamOne: 6, teamTwo: 4 }],
        undoStack: [{ x: 1 }], redoStack: [{ y: 1 }], scorer: { playerId: "Ann" }, startedAt: "2026-09-19T10:00:00.000Z", rules: { timedMinutes: 10 } })] },
      { id: "r3", matches: [match("m3", "waiting", ["Ann", "Dan"], ["Bob", "Cat"])] },
    ],
  };
}
const find = (state, id) => state.rounds.flatMap((round) => round.matches).find((item) => item.id === id);
const names = (team) => team.players.map((player) => player.name);
const doReplace = (state, playerId, name) => replacement.replace(state, playerId, person(name), { createTeam, nameTaken: (candidate) => state.players.some((player) => player.name === candidate), nowIso: "2026-09-19T11:00:00.000Z" });

test("the plan says what would happen and changes nothing", () => {
  const state = tournament();
  const snapshot = JSON.stringify(state);
  const plan = replacement.plan(state, "Ann");
  assert.deepEqual([plan.ok, Array.from(plan.restart), Array.from(plan.future), Array.from(plan.kept)], [true, ["m2"], ["m3"], ["m1"]]);
  assert.equal(JSON.stringify(state), snapshot);
});

test("finished matches keep the original player, unplayed matches follow the slot", () => {
  const state = tournament();
  const result = doReplace(state, "Ann", "Eve");
  assert.equal(result.ok, true);
  assert.deepEqual(names(find(state, "m1").teamOne), ["Ann", "Bob"], "history shows the actual player");
  assert.deepEqual(names(find(state, "m3").teamOne), ["Eve", "Dan"], "future matches follow the slot");
  assert.deepEqual(names(find(state, "m2").teamOne), ["Eve", "Cat"]);
});

test("a match in progress restarts from 0-0 and the ongoing score is annulled", () => {
  const state = tournament();
  const result = doReplace(state, "Ann", "Eve");
  assert.deepEqual(Array.from(result.restarted), ["m2"]);
  const restarted = find(state, "m2");
  assert.deepEqual([restarted.currentSet.teamOne, restarted.currentSet.teamTwo, restarted.currentGame.teamOne, restarted.completedSets.length], [0, 0, 0, 0]);
  assert.equal(restarted.state, "playing", "it stays on its court");
  assert.equal(restarted.undoStack.length + restarted.redoStack.length, 0);
  for (const field of ["scorer", "startedAt", "rules", "approval"]) assert.equal(field in restarted, false, `${field} cleared`);
  assert.equal(restarted.restartCount, 1);
  assert.equal(restarted.restartReason, "playerReplaced");
});

test("the replacement takes over the structural slot; the original keeps their record", () => {
  const state = tournament();
  const { replacement: eve } = doReplace(state, "Ann", "Eve");
  const ann = state.players.find((player) => player.id === "Ann");
  assert.equal(eve.slotId, "Ann");
  assert.equal(eve.replacedPlayerId, "Ann");
  assert.equal(ann.active, false);
  assert.equal(ann.replacedBy, eve.id);
  const stats = scoring.leaderboardEntries(state.players, state.rounds.flatMap((round) => round.matches), "matches");
  assert.equal(stats.find((entry) => entry.player.id === "Ann").matchWins, 1, "personal stats stay with the person who played");
  assert.equal(stats.find((entry) => entry.player.id === eve.id).matchesPlayed, 0, "the replacement starts from 0");
});

test("replacing the replacement keeps the same slot", () => {
  const state = tournament();
  const { replacement: eve } = doReplace(state, "Ann", "Eve");
  const { replacement: fay } = doReplace(state, eve.id, "Fay");
  assert.equal(fay.slotId, "Ann");
  assert.deepEqual(names(find(state, "m3").teamOne), ["Fay", "Dan"]);
});

test("a result waiting for approval blocks the replacement, even for the admin", () => {
  for (const status of ["draft", "pending", "flagged"]) {
    const state = tournament();
    find(state, "m2").state = "awaitingApproval";
    find(state, "m2").approval = { status };
    const result = doReplace(state, "Ann", "Eve");
    assert.deepEqual([result.ok, result.blocked], [false, "awaitingApproval"], status);
    assert.equal(state.players.length, 4, "nothing changed");
  }
  const state = tournament();
  find(state, "m2").state = "awaitingApproval";
  assert.equal(replacement.plan(state, "Ann").blocked, "awaitingApproval");
  assert.equal(replacement.plan(state, "Cat").blocked, "awaitingApproval", "every player of that match is blocked");
});

test("a player who is not in that match can still be replaced", () => {
  const state = tournament();
  state.rounds[1].matches.push(match("m4", "awaitingApproval", ["Eve", "Fay"], ["Gus", "Hal"]));
  assert.equal(replacement.plan(state, "Ann").ok, true);
});

test("a finished tournament cannot be changed", () => {
  const state = tournament();
  state.status = "Avsluttet";
  assert.equal(doReplace(state, "Ann", "Eve").blocked, "ended");
});

test("the same person cannot fill two slots", () => {
  const state = tournament();
  assert.equal(doReplace(state, "Ann", "Bob").blocked, "duplicate");
  assert.equal(state.players.length, 4);
});

test("an inactive (already replaced) player cannot be replaced again", () => {
  const state = tournament();
  doReplace(state, "Ann", "Eve");
  assert.equal(doReplace(state, "Ann", "Fay").blocked, "inactive");
});

test("the original can be put back: the slot moves back, the running match restarts again", () => {
  const state = tournament();
  const { replacement: eve } = doReplace(state, "Ann", "Eve");
  const result = replacement.restore(state, eve.id, { createTeam, nameTaken: (candidate, other) => other.name === candidate, nowIso: "2026-09-19T12:00:00.000Z" });
  assert.equal(result.ok, true);
  const ann = state.players.find((player) => player.id === "Ann");
  assert.equal(ann.active, true);
  assert.equal("replacedBy" in ann, false);
  assert.equal(eve.active, false);
  assert.deepEqual(names(find(state, "m3").teamOne), ["Ann", "Dan"]);
  assert.deepEqual(Array.from(result.restarted), ["m2"]);
  assert.equal(find(state, "m2").restartCount, 2);
  assert.deepEqual(names(find(state, "m1").teamOne), ["Ann", "Bob"], "finished matches were never touched");
});

test("restoring is blocked while a result of the replacement waits for approval", () => {
  const state = tournament();
  const { replacement: eve } = doReplace(state, "Ann", "Eve");
  find(state, "m2").state = "awaitingApproval";
  assert.equal(replacement.restore(state, eve.id, { createTeam }).blocked, "awaitingApproval");
});

test("cup teams follow the slot as well", () => {
  const state = tournament();
  state.cupTeams = [createTeam([person("Ann"), person("Bob")]), createTeam([person("Cat"), person("Dan")])];
  doReplace(state, "Ann", "Eve");
  assert.deepEqual(names(state.cupTeams[0]), ["Eve", "Bob"]);
});
