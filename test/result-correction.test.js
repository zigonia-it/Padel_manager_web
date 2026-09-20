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
const scoring = load("scoring-engine.js").PadelstarScoring;
const correction = load("result-correction.js").PadelstarResultCorrection;

const player = (name) => ({ id: name, name });
const team = (...names) => ({ displayName: names.join(" & "), players: names.map(player) });
const players = ["Ann", "Bob", "Cat", "Dan"].map(player);
const finished = (id, one, two, winner, sets) => ({
  id, state: "finished", winnerTeamIndex: winner, teamOne: team(...one), teamTwo: team(...two),
  completedSets: sets.map(([teamOne, teamTwo]) => ({ teamOne, teamTwo })), currentSet: { teamOne: 0, teamTwo: 0 },
});
const stateOf = (rounds, extra = {}) => ({
  status: "Runde pågår", players, settings: { gamesToWinSet: 6, setsToWinMatch: 1, pointMode: "matches", format: "roundRobin", ...extra },
  rounds: rounds.map((matches, index) => ({ id: `r${index + 1}`, status: "finished", matches })),
});
const sets = (...pairs) => pairs.map(([teamOne, teamTwo]) => ({ teamOne, teamTwo }));

test("green: the standings do not change", () => {
  const state = stateOf([[finished("a", ["Ann"], ["Bob"], 0, [[6, 3]]), finished("b", ["Cat"], ["Dan"], 0, [[6, 0]])]]);
  const result = correction.simulate(state, "a", sets([6, 4]), scoring);
  assert.equal(result.ok, true);
  assert.equal(result.level, "green");
  assert.equal(result.winnerChanged, false);
});

test("yellow: the winner stays but ranking positions change", () => {
  // Ann and Cat each win one match (3 points); Cat is ahead on game difference until Cat's score is corrected.
  const state = stateOf([[finished("a", ["Ann"], ["Bob"], 0, [[6, 4]]), finished("b", ["Cat"], ["Dan"], 0, [[6, 0]])]]);
  assert.equal(scoring.leaderboardEntries(state.players, state.rounds[0].matches, "matches")[0].player.name, "Cat");
  const result = correction.simulate(state, "b", sets([6, 4]), scoring);
  assert.equal(result.level, "yellow");
  assert.ok(result.changes.some((change) => change.name === "Ann" && change.rankAfter < change.rankBefore));
});

test("orange: a changed winner moves the points", () => {
  const state = stateOf([[finished("a", ["Ann"], ["Bob"], 0, [[6, 3]]), finished("b", ["Cat"], ["Dan"], 0, [[6, 0]])]]);
  const result = correction.simulate(state, "a", sets([3, 6]), scoring);
  assert.equal(result.level, "orange");
  assert.equal(result.winnerChanged, true);
  assert.equal(result.newWinnerTeam.displayName, "Bob");
  const ann = result.changes.find((change) => change.name === "Ann");
  const bob = result.changes.find((change) => change.name === "Bob");
  assert.deepEqual([ann.pointsBefore, ann.pointsAfter, bob.pointsBefore, bob.pointsAfter], [3, 0, 0, 3]);
});

test("simulation never changes the tournament", () => {
  const state = stateOf([[finished("a", ["Ann"], ["Bob"], 0, [[6, 3]])]]);
  const snapshot = JSON.stringify(state);
  correction.simulate(state, "a", sets([3, 6]), scoring);
  assert.equal(JSON.stringify(state), snapshot);
});

test("red: in a cup a winner change is blocked once a later round exists", () => {
  const rounds = stateOf([[finished("a", ["Ann"], ["Bob"], 0, [[6, 3]])], [{ id: "final", state: "playing", teamOne: team("Ann"), teamTwo: team("Cat"), completedSets: [], currentSet: { teamOne: 0, teamTwo: 0 } }]], { format: "cup" });
  const blocked = correction.simulate(rounds, "a", sets([3, 6]), scoring);
  assert.equal(blocked.level, "red");
  assert.equal(blocked.blocked, true);
  const scoreOnly = correction.simulate(rounds, "a", sets([6, 4]), scoring);
  assert.equal(scoreOnly.blocked, false, "the same winner does not affect later matches");
  const noLaterRound = stateOf([[finished("a", ["Ann"], ["Bob"], 0, [[6, 3]])]], { format: "cup" });
  assert.equal(correction.simulate(noLaterRound, "a", sets([3, 6]), scoring).blocked, false);
});

test("invalid, unchanged, unfinished and closed corrections are rejected", () => {
  const state = stateOf([[finished("a", ["Ann"], ["Bob"], 0, [[6, 3]]), { ...finished("p", ["Cat"], ["Dan"], null, []), state: "playing" }]]);
  assert.equal(correction.simulate(state, "a", sets([4, 4]), scoring).error, "invalid");
  assert.equal(correction.simulate(state, "a", sets([6, 3]), scoring).error, "same");
  assert.equal(correction.simulate(state, "p", sets([6, 3]), scoring).error, "notFinished");
  assert.equal(correction.simulate(state, "zzz", sets([6, 3]), scoring).error, "notFound");
  assert.equal(correction.simulate({ ...state, status: "Avsluttet", lifecycleStatus: "cancelled" }, "a", sets([3, 6]), scoring).error, "closed", "a cancelled tournament stays closed");
  assert.notEqual(correction.simulate({ ...state, status: "Avsluttet", lifecycleStatus: "completed" }, "a", sets([3, 6]), scoring).error, "closed", "a finished one can still be corrected (0.10)");
  assert.equal(correction.simulate(state, "a", [], scoring).error, "invalid");
  assert.equal(correction.simulate(state, "a", sets([6, 3], [6, 3]), scoring).error, "invalid", "too many sets for a one-set match");
});

test("best of three: only a complete two-set (or three-set) result is valid", () => {
  const state = stateOf([[finished("a", ["Ann"], ["Bob"], 0, [[6, 3], [6, 4]])]], { setsToWinMatch: 2 });
  assert.equal(correction.simulate(state, "a", sets([6, 3]), scoring).error, "invalid", "one set is not enough");
  assert.equal(correction.simulate(state, "a", sets([6, 3], [3, 6], [6, 2]), scoring).ok, true);
  assert.equal(correction.simulate(state, "a", sets([6, 3], [6, 3], [6, 3]), scoring).error, "invalid");
});

test("applying locally keeps the old result as history and needs a valid reason", () => {
  const state = stateOf([[finished("a", ["Ann"], ["Bob"], 0, [[6, 3]])]]);
  assert.equal(correction.applyLocally(state, "a", sets([3, 6]), "nonsense", "", "orange", scoring).error, "reason");
  assert.equal(correction.applyLocally(state, "a", sets([3, 6]), "other", "  ", "orange", scoring).error, "comment");
  const done = correction.applyLocally(state, "a", sets([3, 6]), "entryError", "", "orange", scoring, "2026-09-19T10:00:00.000Z");
  assert.equal(done.ok, true);
  const match = state.rounds[0].matches[0];
  assert.equal(match.winnerTeamIndex, 1);
  assert.equal(match.completedSets[0].teamTwo, 6);
  assert.equal(match.correctionHistory.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(match.correctionHistory[0].before)), { completedSets: [{ teamOne: 6, teamTwo: 3 }], winnerTeamIndex: 0 });
  assert.equal(match.correctionHistory[0].reason, "entryError");
});

test("restoring an old result is just another correction; the history keeps every entry", () => {
  const state = stateOf([[finished("a", ["Ann"], ["Bob"], 0, [[6, 3]])]]);
  correction.applyLocally(state, "a", sets([3, 6]), "entryError", "", "orange", scoring, "2026-09-19T10:00:00.000Z");
  const restored = correction.applyLocally(state, "a", sets([6, 3]), "restore", "", "orange", scoring, "2026-09-19T10:05:00.000Z");
  assert.equal(restored.ok, true);
  const match = state.rounds[0].matches[0];
  assert.equal(match.winnerTeamIndex, 0);
  assert.deepEqual(Array.from(match.correctionHistory, (entry) => entry.reason), ["entryError", "restore"]);
});

test("a blocked correction is refused locally and changes nothing", () => {
  const state = stateOf([[finished("a", ["Ann"], ["Bob"], 0, [[6, 3]])], [{ id: "final", state: "waiting", teamOne: team("Ann"), teamTwo: team("Cat"), completedSets: [], currentSet: { teamOne: 0, teamTwo: 0 } }]], { format: "cup" });
  const snapshot = JSON.stringify(state);
  assert.equal(correction.applyLocally(state, "a", sets([3, 6]), "entryError", "", "red", scoring).error, "blocked");
  assert.equal(JSON.stringify(state), snapshot);
});

test("the correction keeps an approval record in sync and drops a time-forced winner", () => {
  const state = stateOf([[{ ...finished("a", ["Ann"], ["Bob"], 0, [[4, 3]]), timeWinnerTeamIndex: 0, approval: { status: "approved", winnerTeamIndex: 0, completedSets: sets([4, 3]) } }]]);
  correction.applyLocally(state, "a", sets([3, 6]), "refereeDecision", "", "orange", scoring);
  const match = state.rounds[0].matches[0];
  assert.equal(match.winnerTeamIndex, 1);
  assert.equal("timeWinnerTeamIndex" in match, false);
  assert.equal(match.approval.winnerTeamIndex, 1);
});

test("every reason has text in every production language", () => {
  const context = {};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "translations.js"), "utf8"), context);
  const dictionary = context.PadelstarTranslations;
  const languages = context.PadelstarI18n.productionLanguages().map((entry) => entry.code);
  const keys = [
    ...correction.REASONS.map((reason) => `correction.reason.${reason}`),
    ...["green", "yellow", "orange", "red"].map((level) => `correction.level.${level}`),
    ...["invalid", "same", "closed", "notFinished", "notFound", "blocked", "reason", "comment"].map((error) => `correction.error.${error}`),
    "correction.button", "correction.title", "correction.intro", "correction.simulate", "correction.confirm", "correction.cancel", "correction.applied",
    "correction.historyTitle", "correction.restore", "notifications.resultCorrectedTitle", "notifications.resultCorrectedBody",
  ];
  for (const language of languages) {
    const missing = keys.filter((key) => !Object.prototype.hasOwnProperty.call(dictionary[language], key));
    assert.deepEqual(missing, [], `missing in ${language}`);
  }
});

test("the match card lists the correction history and offers restore only to the admin", () => {
  const cardContext = { console, structuredClone };
  cardContext.window = cardContext;
  vm.createContext(cardContext);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "match-card.js"), "utf8"), cardContext);
  const api = cardContext.PadelstarMatchCard.create({
    currentLocalRole: () => "admin", escapeAttribute: (v) => String(v), escapeHtml: (v) => String(v),
    getState: () => ({ status: "Runde pågår", settings: {} }), translate: (key) => key,
  });
  const match = { state: "finished", correctionHistory: [{ at: "2026-09-19T10:00:00.000Z", reason: "entryError", level: "orange", comment: "misheard", before: { completedSets: sets([6, 3]) }, after: { completedSets: sets([3, 6]) } }] };
  const adminHtml = api.correctionHistoryMarkup(match, true);
  assert.match(adminHtml, /6–3 → 3–6/);
  assert.match(adminHtml, /correction\.reason\.entryError/);
  assert.match(adminHtml, /misheard/);
  assert.match(adminHtml, /data-correction-restore="0"/);
  assert.doesNotMatch(api.correctionHistoryMarkup(match, false), /data-correction-restore/);
  assert.equal(api.correctionHistoryMarkup({ state: "finished" }, true), "");
});
