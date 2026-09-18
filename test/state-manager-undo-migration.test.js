const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadStateManager() {
  const source = fs.readFileSync(path.join(__dirname, "..", "app", "state-manager.js"), "utf8");
  const context = vm.createContext({ window: {}, structuredClone });
  vm.runInContext(source, context);
  return context.window.PadelstarState;
}

function helpers() {
  return {
    buildSchedule: () => [],
    accents: ["blue"],
    normalizeAccent: (accent) => accent ?? "blue",
    createTeam: (players) => ({ players }),
    getPlayerById: () => null,
  };
}

function stateWithMatch(match) {
  return { players: [], rounds: [{ matches: [match] }] };
}

function json(value) {
  return JSON.stringify(value);
}

test("migrateState converts a pre-multi-step-undo lastScoredMatchState snapshot into a one-entry undoStack", () => {
  const { migrateState } = loadStateManager();
  const oldMatch = {
    id: "m1", teamOne: { players: [] }, teamTwo: { players: [] },
    state: "playing", lastScoredMatchState: { match: { id: "m1" }, revision: 3 },
  };
  const migrated = migrateState(stateWithMatch(oldMatch), { settings: {}, courts: [] }, helpers()).rounds[0].matches[0];
  assert.equal(json(migrated.undoStack), json([{ match: { id: "m1" }, revision: 3 }]));
  assert.equal("lastScoredMatchState" in migrated, false);
});

test("migrateState converts a null lastScoredMatchState into an empty undoStack", () => {
  const { migrateState } = loadStateManager();
  const nullMatch = { id: "m2", teamOne: { players: [] }, teamTwo: { players: [] }, state: "waiting", lastScoredMatchState: null };
  const migrated = migrateState(stateWithMatch(nullMatch), { settings: {}, courts: [] }, helpers()).rounds[0].matches[0];
  assert.equal(json(migrated.undoStack), json([]));
  assert.equal("lastScoredMatchState" in migrated, false);
});

test("migrateState leaves an already-migrated undoStack untouched", () => {
  const { migrateState } = loadStateManager();
  const newMatch = { id: "m3", teamOne: { players: [] }, teamTwo: { players: [] }, state: "playing", undoStack: [{ a: 1 }, { b: 2 }] };
  const migrated = migrateState(stateWithMatch(newMatch), { settings: {}, courts: [] }, helpers()).rounds[0].matches[0];
  assert.equal(json(migrated.undoStack), json([{ a: 1 }, { b: 2 }]));
});

test("migrateState defaults a match with neither field to an empty undoStack", () => {
  const { migrateState } = loadStateManager();
  const freshMatch = { id: "m4", teamOne: { players: [] }, teamTwo: { players: [] }, state: "waiting" };
  const migrated = migrateState(stateWithMatch(freshMatch), { settings: {}, courts: [] }, helpers()).rounds[0].matches[0];
  assert.equal(json(migrated.undoStack), json([]));
});
