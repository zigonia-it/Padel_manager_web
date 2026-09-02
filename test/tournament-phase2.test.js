const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadApi() {
  const context = vm.createContext({ window: {}, crypto: { randomUUID: () => "test-id" } });
  ["tournament-state-machine.js", "tournament-scheduler.js"].forEach((file) => {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", file), "utf8"), context, { filename: file });
  });
  return context.window;
}

function players(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `p${index + 1}`, name: `Player ${index + 1}`, active: true, availability: "active" }));
}

test("phase 2 state machine exposes explicit tournament, round and match statuses", () => {
  const api = loadApi().PadelstarTournamentStateMachine;
  assert.equal(api.canTransition("tournament", "ready", "active"), true);
  assert.equal(api.canTransition("round", "active", "completed"), true);
  assert.equal(api.canTransition("match", "scheduled", "completed"), false);

  const match = { state: "playing" };
  api.synchronizeLegacyMatch(match);
  assert.equal(match.status, "active");
  assert.equal(api.transition("match", match, "completed"), true);
  assert.equal(match.status, "completed");
});

test("scheduler creates fixed teams and a complete round-robin matchup set", () => {
  const scheduler = loadApi().PadelstarTournamentScheduler;
  const plan = scheduler.buildRoundRobinRound(players(8), {}, { courtCount: 2, random: () => 0 });

  assert.equal(plan.teams.length, 4);
  assert.equal(plan.sittingOut.length, 0);
  assert.equal(plan.matchups.length, 6);
  assert.equal(new Set(plan.matchups.map((match) => [match.teamOne.id, match.teamTwo.id].sort().join("/"))).size, 6);
  assert.ok(plan.waves.length > 0);
  assert.equal(plan.queue.length, 6);
  assert.equal(plan.queue.every((match) => Number.isInteger(match.queuePosition)), true);
});

test("scheduler puts independent matches in the same wave without sharing players", () => {
  const scheduler = loadApi().PadelstarTournamentScheduler;
  const plan = scheduler.buildRoundRobinRound(players(8), {}, { courtCount: 2, random: () => 0 });
  assert.equal(plan.waves[0].length, 2);
  assert.equal(plan.waves.every((wave) => {
    const ids = wave.flatMap((match) => scheduler.matchPlayerIds(match));
    return ids.length === new Set(ids).size;
  }), true);
});

test("scheduler assigns queued matches to a planned court without duplicating them", () => {
  const scheduler = loadApi().PadelstarTournamentScheduler;
  const roster = players(8);
  const round = scheduler.buildRoundRobinRound(roster, {}, { courtCount: 2, random: () => 0.5 });
  const firstWave = round.waves[0];
  assert.equal(firstWave.length, 2);
  assert.equal(firstWave[0].plannedCourtIndex, 0);
  assert.equal(firstWave[1].plannedCourtIndex, 1);
  assert.equal(new Set(firstWave.map((match) => match.id ?? `${match.teamOne.id}-${match.teamTwo.id}`)).size, firstWave.length);
});

test("scheduler distributes an odd-player bye and penalizes repeated partners", () => {
  const scheduler = loadApi().PadelstarTournamentScheduler;
  const roster = players(5);
  const history = { partners: { "p1:p2": 2 } };
  const plan = scheduler.buildRoundRobinRound(roster, history, { courtCount: 1, random: () => 0 });

  assert.equal(plan.teams.length, 2);
  assert.equal(plan.sittingOut.length, 1);
  assert.equal(plan.teams.some((team) => team.players.map((player) => player.id).sort().join(":") === "p1:p2"), false);
});

test("scheduler gives the next bye to the player with the fewest prior byes", () => {
  const scheduler = loadApi().PadelstarTournamentScheduler;
  const roster = players(5);
  const plan = scheduler.buildRoundRobinRound(roster, { byes: [["p1"], ["p2"]] }, { random: () => 0 });
  assert.ok(["p3", "p4", "p5"].includes(plan.sittingOut[0].id));
});

test("scheduler excludes away and inactive players", () => {
  const scheduler = loadApi().PadelstarTournamentScheduler;
  const roster = players(6);
  roster[0].availability = "away";
  roster[1].active = false;
  const plan = scheduler.buildRoundRobinRound(roster);
  const scheduledIds = plan.teams.flatMap((team) => team.players).map((player) => player.id);
  assert.equal(scheduledIds.includes("p1"), false);
  assert.equal(scheduledIds.includes("p2"), false);
});

test("scheduler finds a non-conflicting queued match and assigns a free court", () => {
  const scheduler = loadApi().PadelstarTournamentScheduler;
  const roster = players(4);
  const plan = scheduler.buildRoundRobinRound(roster, {}, { courtCount: 1 });
  const first = { ...plan.queue[0], status: "active" };
  const next = [{ ...plan.queue[1], status: "scheduled" }, {
    ...plan.queue[2],
    teamOne: { players: [roster[2]] },
    teamTwo: { players: [roster[3]] },
    status: "scheduled",
  }];
  const match = scheduler.assignNextCourt(next, { id: "court-2", name: "Bane 2" }, new Set(first.teamOne.players.map((player) => player.id)));

  assert.ok(match);
  assert.equal(match.status, "ready");
  assert.equal(match.courtName, "Bane 2");
  assert.equal(scheduler.findNextPlayableMatch([first]), null);
});

test("scheduler records partner and opponent history for completed matches", () => {
  const scheduler = loadApi().PadelstarTournamentScheduler;
  const plan = scheduler.buildRoundRobinRound(players(4), {}, { random: () => 0 });
  const history = scheduler.recordMatchHistory({}, plan.queue[0]);
  const partnerIds = plan.queue[0].teamOne.players.map((player) => player.id).sort().join(":");
  assert.equal(history.partners[partnerIds], 1);
  assert.equal(Object.keys(history.opponents).length, 4);
  assert.equal(history.matches.length, 1);
});

test("scheduler covers supported roster sizes without dropping active players", () => {
  const scheduler = loadApi().PadelstarTournamentScheduler;
  [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16].forEach((count) => {
    const roster = players(count);
    const plan = scheduler.buildRoundRobinRound(roster, {}, { courtCount: 3, random: () => 0 });
    const scheduledIds = new Set(plan.teams.flatMap((team) => team.players).map((player) => player.id));
    const sittingOutIds = new Set(plan.sittingOut.map((player) => player.id));
    assert.equal(scheduledIds.size + sittingOutIds.size, count, `${count} players should be accounted for`);
    assert.equal(plan.matchups.length, (plan.teams.length * (plan.teams.length - 1)) / 2, `${count} matchup count`);
  });
});
