const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app", "profile-manager.js"), "utf8");

function loadProfiles() {
  const storage = new Map();
  const context = vm.createContext({
    crypto: { randomUUID: () => "profile-1" },
    window: {},
  });
  vm.runInContext(source, context);
  return { api: context.window.PadelstarProfiles, storage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  } };
}

test("profile deletion is scheduled exactly 30 days ahead and can be cancelled", () => {
  const { api } = loadProfiles();
  const profile = api.createProfile("Ada", "smash", new Date("2026-08-28T10:00:00Z"));
  const pending = api.requestDeletion(profile, new Date("2026-08-28T10:00:00Z"));

  assert.equal(pending.deletionScheduledFor, "2026-09-27T10:00:00.000Z");
  assert.equal(api.shouldDelete(pending, new Date("2026-09-27T09:59:59Z")), false);
  assert.equal(api.shouldDelete(pending, new Date("2026-09-27T10:00:00Z")), true);
  assert.equal(api.cancelDeletion(pending).deletionScheduledFor, null);
});

test("profile history is isolated and aggregated without exposing tournament state", () => {
  const { api, storage } = loadProfiles();
  api.recordHistory(storage, "history", { id: "t1", profileId: "profile-1", tournamentName: "Spring", points: 3, wins: 1, matches: 2, sets: 2, games: 12 });
  api.recordHistory(storage, "history", { id: "t2", profileId: "profile-2", tournamentName: "Other", points: 9, wins: 3, matches: 3 });
  api.recordHistory(storage, "history", { id: "t1", profileId: "profile-1", tournamentName: "Spring updated", points: 4, wins: 2, matches: 3, sets: 3, games: 18 });

  const own = api.historyForProfile(api.loadHistory(storage, "history"), "profile-1");
  assert.equal(own.length, 1);
  assert.equal(own[0].tournamentName, "Spring updated");
  assert.deepEqual(JSON.parse(JSON.stringify(api.summarizeHistory(own))), { tournaments: 1, wins: 2, matches: 3, points: 4, sets: 3, games: 18 });
  assert.equal(Object.hasOwn(own[0], "adminToken"), false);
});
