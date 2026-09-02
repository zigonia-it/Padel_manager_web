const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function api() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "player-statistics.js"), "utf8"), context);
  return context.window.PadelstarPlayerStatistics;
}

const player = (id, name, profileId = id) => ({ id, profileId, name });
function match(winnerTeamIndex = 0) {
  return { state: "finished", winnerTeamIndex, teamOne: { players: [player("p1", "Ada")] }, teamTwo: { players: [player("p2", "Bea")] }, completedSets: [{ teamOne: 6, teamTwo: 3 }] };
}

test("historical statistics aggregate wins, sets and games deterministically", () => {
  const stats = api();
  assert.equal(JSON.stringify(stats.aggregate([player("p2", "Bea"), player("p1", "Ada")], [match()])), JSON.stringify([
    { playerId: "p1", name: "Ada", matches: 1, wins: 1, sets: 1, games: 6 },
    { playerId: "p2", name: "Bea", matches: 1, wins: 0, sets: 0, games: 3 },
  ]));
});

test("partner and head-to-head statistics only count finished matches", () => {
  const stats = api();
  const doubles = { ...match(), teamOne: { players: [player("p1", "Ada"), player("p3", "Cal")] }, teamTwo: { players: [player("p2", "Bea"), player("p4", "Dee")] } };
  assert.equal(JSON.stringify(stats.partnerStats("p1", [doubles])), JSON.stringify([{ playerId: "p3", name: "Cal", matches: 1, wins: 1 }]));
  assert.equal(JSON.stringify(stats.headToHead("p1", "p2", [doubles])), JSON.stringify({ matches: 1, firstWins: 1, secondWins: 0 }));
});
