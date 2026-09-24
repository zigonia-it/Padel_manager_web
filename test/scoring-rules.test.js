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

const T0 = Date.parse("2026-09-19T10:00:00.000Z");

function playScenario(scenario) {
  const match = {
    state: "playing", currentGame: { teamOne: 0, teamTwo: 0 }, currentSet: { teamOne: 0, teamTwo: 0 }, completedSets: [],
    teamOne: { players: [] }, teamTwo: { players: [] },
  };
  const pair = ([teamOne, teamTwo]) => ({ teamOne, teamTwo });
  if (scenario.initial) {
    match.completedSets = (scenario.initial.completedSets ?? []).map(pair);
    if (scenario.initial.currentSet) match.currentSet = pair(scenario.initial.currentSet);
    if (scenario.initial.currentGame) match.currentGame = pair(scenario.initial.currentGame);
    match.startedAt = new Date(T0).toISOString();
  }
  let clock = T0;
  for (const step of scenario.steps) {
    if (step === "x") { clock = T0 + ((scenario.settings.timedMinutes ?? 0) * 60 + 30) * 1000; continue; }
    for (const teamIndex of expandSteps([step])) {
      const result = scoring.awardPoint(match, teamIndex, scenario.settings, clock);
      if (result.matchWon) {
        match.state = "finished";
        const bySets = match.completedSets.filter((set) => set.teamOne > set.teamTwo).length
          > match.completedSets.filter((set) => set.teamTwo > set.teamOne).length ? 0 : 1;
        match.winnerTeamIndex = match.timeWinnerTeamIndex ?? bySets;
        break;
      }
    }
    if (match.state === "finished") break;
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
    assert.equal(Boolean(match.decidingGame), Boolean(expected.decidingGame));
    assert.equal(match.endReason ?? null, expected.endReason ?? null);
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
  assert.deepEqual({ ...scoring.matchRules({}, {}) }, {
    scoringMode: "tennis", gamesToWinSet: 6, setsToWinMatch: 1, gameToWin: 4, gameWinBy: 2, setWinBy: 2, matchWinBy: 1,
    setDecider: "nextGame", gameMode: "advantage", setTiebreak: false, timedMinutes: 0,
  });
  assert.equal(scoring.matchRules({}, { gameMode: "nonsense" }).gameMode, "advantage");
});

test("point labels are plain numbers during a tiebreak", () => {
  assert.equal(scoring.pointLabel({ inTiebreak: true }, 5), "5");
  assert.equal(scoring.pointLabel({}, 3), "40");
  assert.equal(scoring.pointLabel({}, 4), "A");
});

test("legacy settings map onto the three-level rules", () => {
  assert.equal(scoring.normalizeRules({ gameMode: "goldenPoint" }).gameWinBy, 1);
  assert.equal(scoring.normalizeRules({ setTiebreak: true }).setDecider, "tiebreak");
  assert.equal(scoring.normalizeRules({ setTiebreak: true, setWinBy: 3 }).setDecider, "continue");
  assert.equal(scoring.normalizeRules({ setDecider: "tiebreak" }).setTiebreak, true);
});

test("every rule number is limited to 1..999", () => {
  const rules = scoring.normalizeRules({ gameToWin: 5000, gamesToWinSet: 0, setsToWinMatch: -3, gameWinBy: "x", setWinBy: 1000.7, matchWinBy: 12 });
  assert.equal(rules.gameToWin, 999);
  assert.equal(rules.gamesToWinSet, 1);
  assert.equal(rules.setsToWinMatch, 1);
  assert.equal(rules.gameWinBy, 2);
  assert.equal(rules.setWinBy, 999);
  assert.equal(rules.matchWinBy, 12);
  assert.equal(scoring.MAX_LEVEL, 999);
});

test("only the classic four point game is labelled 15/30/40", () => {
  assert.equal(scoring.pointLabel({ rules: { gameToWin: 4 } }, 2), "30");
  assert.equal(scoring.pointLabel({ rules: { gameToWin: 3 } }, 2), "2");
  assert.equal(scoring.pointLabel({ rules: { gameToWin: 1 } }, 0), "0");
});

test("typed set scores follow the generic set rule", () => {
  const points = { gamesToWinSet: 21, setWinBy: 2, setDecider: "continue" };
  assert.equal(scoring.isSetComplete(22, 20, points), true);
  assert.equal(scoring.isSetComplete(21, 20, points), false);
  assert.equal(scoring.isSetComplete(30, 28, points), true);
  assert.equal(scoring.isSetComplete(21, 19, points), true);
  assert.equal(scoring.isSetComplete(25, 20, points), false);
  assert.equal(scoring.isSetComplete(25, 24, { gamesToWinSet: 24, setWinBy: 1, setDecider: "continue" }), false);
});

test("rules from form input: tennis keeps every number, points maps onto the three levels", () => {
  const tennis = scoring.rulesFromInput({ scoringMode: "tennis", gamesToWinSet: "6", setsToWinMatch: "2", gameToWin: "4", gameWinBy: "1", setWinBy: "2", matchWinBy: "1", setTiebreak: true, timedMinutes: "45" });
  assert.deepEqual({ ...tennis }, {
    scoringMode: "tennis", gamesToWinSet: 6, setsToWinMatch: 2, gameToWin: 4, gameWinBy: 1, setWinBy: 2, matchWinBy: 1,
    setDecider: "tiebreak", gameMode: "goldenPoint", setTiebreak: true, timedMinutes: 45,
  });
  const points = scoring.rulesFromInput({ scoringMode: "points", pointsToWin: "21", pointsWinBy: "2", pointsMatchGames: "2", timedMinutes: "0" });
  assert.deepEqual([points.scoringMode, points.gameToWin, points.gameWinBy, points.gamesToWinSet, points.setWinBy, points.setDecider, points.setsToWinMatch],
    ["points", 1, 1, 21, 2, "continue", 2]);
  // empty fields fall back to the tennis defaults
  const empty = scoring.rulesFromInput({});
  assert.deepEqual([empty.gamesToWinSet, empty.setsToWinMatch, empty.gameToWin, empty.gameWinBy, empty.setWinBy, empty.matchWinBy], [6, 2, 4, 2, 2, 1]);
  // older tournaments without the field still mean one set
  assert.equal(scoring.normalizeRules({ gamesToWinSet: 6 }).setsToWinMatch, 1);
  assert.equal(scoring.rulesFromInput({ timedMinutes: "999" }).timedMinutes, 180);
});

test("form values are the reverse of the rules, and older tournaments fill the tennis fields", () => {
  const values = scoring.formValuesFromRules({ gamesToWinSet: 4, setsToWinMatch: 2, gameMode: "goldenPoint", setTiebreak: true });
  assert.deepEqual([values.scoringMode, values.gamesToWinSet, values.setsToWinMatch, values.gameToWin, values.gameWinBy, values.setTiebreak], ["tennis", 4, 2, 4, 1, true]);
  const round = scoring.formValuesFromRules(scoring.rulesFromInput({ scoringMode: "points", pointsToWin: 15, pointsWinBy: 1, pointsMatchGames: 3 }));
  assert.deepEqual([round.scoringMode, round.pointsToWin, round.pointsWinBy, round.pointsMatchGames], ["points", 15, 1, 3]);
});

test("a typed match result must decide the match with its last set, never earlier", () => {
  const bestOfThree = { gamesToWinSet: 6, setsToWinMatch: 2 };
  const sets = (...pairs) => pairs.map(([teamOne, teamTwo]) => ({ teamOne, teamTwo }));
  assert.equal(scoring.validateMatchSets(sets([6, 3], [3, 6], [7, 5]), bestOfThree).winner, 0);
  assert.equal(scoring.validateMatchSets(sets([6, 3], [6, 4], [6, 1]), bestOfThree).error, "invalid");
  assert.equal(scoring.validateMatchSets(sets([6, 3]), bestOfThree).error, "invalid");
  const points = { scoringMode: "points", gameToWin: 1, gameWinBy: 1, gamesToWinSet: 21, setWinBy: 2, setDecider: "continue", setsToWinMatch: 1 };
  assert.equal(scoring.validateMatchSets(sets([19, 21]), points).winner, 1);
  assert.equal(scoring.validateMatchSets(sets([21, 20]), points).error, "invalid");
  const marginMatch = { gamesToWinSet: 1, setWinBy: 1, setDecider: "continue", setsToWinMatch: 2, matchWinBy: 2 };
  assert.equal(scoring.validateMatchSets(sets([1, 0], [0, 1], [1, 0]), marginMatch).error, "invalid");
  assert.equal(scoring.validateMatchSets(sets([1, 0], [0, 1], [1, 0], [1, 0]), marginMatch).winner, 0);
});

test("quick-pick scores: a short list for tennis and small targets, a long one (manual entry) for first to 21", () => {
  const tennis = scoring.finishedSetScores({ gamesToWinSet: 6 });
  assert.deepEqual(JSON.parse(JSON.stringify(tennis)), [[6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 5], [7, 6]]);
  assert.equal(scoring.finishedSetScores({ gamesToWinSet: 6, setTiebreak: false }).length, 7);
  assert.ok(scoring.finishedSetScores({ scoringMode: "points", gamesToWinSet: 11, setWinBy: 2, setDecider: "continue" }).length <= 14);
  assert.ok(scoring.finishedSetScores({ scoringMode: "points", gamesToWinSet: 21, setWinBy: 2, setDecider: "continue" }).length > 14);
});

test("points matches are recognised from the match snapshot first, then from the tournament settings", () => {
  assert.equal(scoring.isPointsMatch({ rules: { scoringMode: "points" } }, { scoringMode: "tennis" }), true);
  assert.equal(scoring.isPointsMatch({}, { scoringMode: "points" }), true);
  assert.equal(scoring.isPointsMatch({ rules: { scoringMode: "tennis" } }, { scoringMode: "points" }), false);
  assert.equal(scoring.isPointsMatch({}, {}), false);
});
