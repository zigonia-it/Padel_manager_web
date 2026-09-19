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
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "scoring-scenarios.json"), "utf8"));

function expandSteps(steps) {
  return steps.flatMap((step) => {
    if (step === "0" || step === "1") return [Number(step)];
    if (step === "g0" || step === "g1") return Array(4).fill(Number(step[1]));
    if (step === "d") return [0, 1, 0, 1, 0, 1];
    const run = /^a([01]):(\d+)$/.exec(step);
    if (run) return Array(Number(run[2])).fill(Number(run[1]));
    throw new Error(`unknown step ${step}`);
  });
}

function playScenario(scenario) {
  const match = {
    state: "playing", currentGame: { teamOne: 0, teamTwo: 0 }, currentSet: { teamOne: 0, teamTwo: 0 }, completedSets: [],
    teamOne: { players: [] }, teamTwo: { players: [] },
  };
  for (const teamIndex of expandSteps(scenario.steps)) {
    const result = scoring.awardPoint(match, teamIndex, scenario.settings);
    if (result.matchWon) {
      match.state = "finished";
      match.winnerTeamIndex = match.completedSets.filter((set) => set.teamOne > set.teamTwo).length
        > match.completedSets.filter((set) => set.teamTwo > set.teamOne).length ? 0 : 1;
      break;
    }
  }
  return match;
}

for (const scenario of fixture.scenarios) {
  test(`scoring rules: ${scenario.name}`, () => {
    const match = playScenario(scenario);
    const expected = scenario.expect;
    assert.equal(match.state, expected.state);
    if (expected.winnerTeamIndex !== undefined) assert.equal(match.winnerTeamIndex, expected.winnerTeamIndex);
    assert.deepEqual([match.currentGame.teamOne, match.currentGame.teamTwo], expected.currentGame);
    assert.deepEqual([match.currentSet.teamOne, match.currentSet.teamTwo], expected.currentSet);
    assert.deepEqual(match.completedSets.map((set) => [set.teamOne, set.teamTwo]), expected.completedSets);
    assert.equal(Boolean(match.inTiebreak), expected.inTiebreak);
  });
}

test("a tiebreak set records the tiebreak score", () => {
  const scenario = fixture.scenarios.find((item) => item.name.includes("7-0 wins"));
  const match = playScenario(scenario);
  assert.deepEqual({ ...match.completedSets[0].tiebreak }, { teamOne: 7, teamTwo: 0 });
});

test("the rule profile is snapshotted on the first point and later setting changes do not affect the match", () => {
  const settings = { gamesToWinSet: 6, setsToWinMatch: 1, gameMode: "goldenPoint", setTiebreak: true };
  const match = { state: "playing", currentGame: { teamOne: 0, teamTwo: 0 }, currentSet: { teamOne: 0, teamTwo: 0 }, completedSets: [], teamOne: { players: [] }, teamTwo: { players: [] } };
  scoring.awardPoint(match, 0, settings);
  assert.equal(match.rules.gameMode, "goldenPoint");
  assert.equal(match.rules.setTiebreak, true);
  settings.gameMode = "advantage";
  [1, 0, 1, 0, 1].forEach((teamIndex) => scoring.awardPoint(match, teamIndex, settings));
  // 40-40 reached and the next point still wins the game under the snapshotted golden point rule
  assert.deepEqual([match.currentGame.teamOne, match.currentGame.teamTwo], [3, 3]);
  scoring.awardPoint(match, 1, settings);
  assert.deepEqual([match.currentSet.teamOne, match.currentSet.teamTwo], [0, 1]);
});

test("unknown or missing rule settings fall back to classic scoring", () => {
  assert.deepEqual({ ...scoring.matchRules({}, {}) }, { gamesToWinSet: 6, setsToWinMatch: 1, gameMode: "advantage", setTiebreak: false });
  assert.equal(scoring.matchRules({}, { gameMode: "nonsense" }).gameMode, "advantage");
});

test("point labels are plain numbers during a tiebreak", () => {
  assert.equal(scoring.pointLabel({ inTiebreak: true }, 5), "5");
  assert.equal(scoring.pointLabel({}, 3), "40");
  assert.equal(scoring.pointLabel({}, 4), "A");
});
