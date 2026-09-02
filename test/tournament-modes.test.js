const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function api() {
  const context = vm.createContext({ window: {}, crypto: { randomUUID: (() => { let i = 0; return () => `team-${++i}`; })() } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "tournament-modes.js"), "utf8"), context);
  return context.window.PadelstarTournamentModes;
}
const players = (count) => Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, active: true, availability: "active" }));

test("phase 5 exposes all planned tournament formats", () => {
  assert.equal(JSON.stringify(api().supportedFormats), JSON.stringify(["roundRobin", "americano", "teamAmericano", "mexicano", "teamMexicano", "kingOfCourt", "cup", "groupsPlayoffs"]));
});

test("individual and team modes produce playable non-overlapping teams", () => {
  const modes = api();
  for (const format of ["americano", "mexicano", "kingOfCourt"]) {
    const rounds = modes.build(players(6), format);
    assert.ok(rounds.length > 0);
    assert.equal(new Set(rounds[0].teams.flatMap((team) => team.players.map((player) => player.id))).size, 6);
  }
  const teams = modes.build(players(8), "teamAmericano")[0];
  assert.equal(teams.teams.length, 4);
  assert.equal(teams.matchups.length, 6);
});

test("groups plus playoffs exposes group allocation and bracket metadata", () => {
  const modes = api();
  const plan = modes.groupsPlayoffSchedule(players(8));
  assert.equal(plan.groups.length, 2);
  assert.equal(plan.playoff.bracketSize, 2);
  assert.ok(plan.rounds.every((round) => round.groupIndex));
});

test("Mexicano and King of Court use ranking-aware rounds and expose court advancement", () => {
  const modes = api();
  const roster = players(4);
  const ranked = modes.build(roster, "mexicano", { standings: [{ playerId: "p4", rank: 0 }, { playerId: "p3", rank: 1 }, { playerId: "p2", rank: 2 }, { playerId: "p1", rank: 3 }] });
  assert.equal(JSON.stringify(ranked[0].teams.map((team) => team.players.map((player) => player.id))), JSON.stringify([["p4", "p3"], ["p2", "p1"]]));
  const ordered = modes.advanceKingOfCourt({ teams: [{ id: "a" }, { id: "b" }] }, [{ teamOneId: "a", teamTwoId: "b", winnerTeamIndex: 1 }]);
  assert.equal(ordered[0].id, "b");
});
