const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = {};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "scoring-engine.js"), "utf8"), context);
const scoring = context.PadelstarScoring;

const player = (id) => ({ id, name: id });
const players = ["Ann", "Bob", "Cat", "Dan"].map(player);
const team = (...names) => ({ players: names.map(player) });
// winner: 0/1, sets: [[teamOne, teamTwo], ...]
const match = (one, two, winnerTeamIndex, sets, state = "finished") => ({
  state, winnerTeamIndex, teamOne: team(...one), teamTwo: team(...two),
  completedSets: sets.map(([teamOne, teamTwo]) => ({ teamOne, teamTwo })), currentSet: { teamOne: 0, teamTwo: 0 },
});
const order = (matches, pointMode = "matches") => scoring.leaderboardEntries(players, matches, pointMode).map((entry) => entry.player.id);

test("head-to-head decides between players who are tied on points", () => {
  const matches = [
    match(["Ann"], ["Bob"], 1, [[3, 6]]), // Bob beats Ann
    match(["Ann"], ["Cat"], 0, [[6, 0]]), // Ann beats Cat
    match(["Bob"], ["Dan"], 0, [[6, 0]]), // Bob beats Dan
    match(["Cat"], ["Dan"], 0, [[6, 0]]), // Cat beats Dan
  ];
  // Ann and Cat each have one win (3 points); Ann won their direct match.
  assert.deepEqual(order(matches), ["Bob", "Ann", "Cat", "Dan"]);
});

test("head-to-head beats better game difference when players are tied on points", () => {
  // Ann and Cat: 3 points each. Ann has a much better game difference, but Cat won their direct match.
  const matches = [
    match(["Ann"], ["Cat"], 1, [[5, 7]]), // Cat beats Ann narrowly
    match(["Ann"], ["Bob"], 0, [[6, 0]]), // Ann beats Bob heavily
    match(["Cat"], ["Dan"], 1, [[3, 6]]), // Dan beats Cat
    match(["Bob"], ["Dan"], 1, [[3, 6]]),
  ];
  const ranking = scoring.leaderboardEntries(players, matches, "matches");
  const byId = Object.fromEntries(ranking.map((entry) => [entry.player.id, entry]));
  assert.equal(byId.Ann.points, byId.Cat.points);
  assert.ok(byId.Ann.gameDifference > byId.Cat.gameDifference, "Ann has the better game difference");
  assert.ok(ranking.findIndex((entry) => entry.player.id === "Cat") < ranking.findIndex((entry) => entry.player.id === "Ann"), "Cat ranks above Ann on head-to-head");
});

test("game difference breaks the tie when the direct results cancel out", () => {
  const matches = [
    match(["Ann", "Bob"], ["Cat", "Dan"], 0, [[6, 0]]), // Bob beats Cat as opponents, big win
    match(["Ann", "Cat"], ["Bob", "Dan"], 0, [[6, 5]]), // Cat beats Bob as opponents, narrow win
  ];
  // Bob and Cat: 3 points each, one direct win each (head-to-head 0 for both).
  const ranking = scoring.leaderboardEntries(players, matches, "matches");
  const byId = Object.fromEntries(ranking.map((entry) => [entry.player.id, entry]));
  assert.equal(byId.Bob.headToHead, 0);
  assert.equal(byId.Cat.headToHead, 0);
  assert.equal(byId.Bob.gameDifference, 5);
  assert.equal(byId.Cat.gameDifference, -5);
  assert.deepEqual(ranking.map((entry) => entry.player.id), ["Ann", "Bob", "Cat", "Dan"]);
});

test("with no tie the order is unchanged: points, wins, sets", () => {
  const matches = [match(["Ann"], ["Bob"], 0, [[6, 0]]), match(["Cat"], ["Dan"], 0, [[6, 4]])];
  assert.deepEqual(order(matches).slice(0, 2), ["Ann", "Cat"]);
});

test("the last resort is the name", () => {
  assert.deepEqual(order([]), ["Ann", "Bob", "Cat", "Dan"]);
});

test("unfinished and awaiting matches do not count for head-to-head", () => {
  const matches = [match(["Ann"], ["Bob"], 0, [[6, 0]], "awaitingApproval"), match(["Ann"], ["Bob"], 0, [[6, 0]], "playing")];
  const ranking = scoring.leaderboardEntries(players, matches, "matches");
  assert.ok(ranking.every((entry) => entry.headToHead === 0));
});

test("entries expose game difference and games lost", () => {
  const entry = scoring.leaderboardEntries(players, [match(["Ann"], ["Bob"], 0, [[6, 4]])], "matches").find((item) => item.player.id === "Ann");
  assert.deepEqual({ won: entry.gamesWon, lost: entry.gamesLost, diff: entry.gameDifference }, { won: 6, lost: 4, diff: 2 });
});
