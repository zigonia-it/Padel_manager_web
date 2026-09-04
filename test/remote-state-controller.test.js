const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const filename = path.join(__dirname, "..", "app", "core", "remote-state-controller.js");

test("remote state controller rejects stale revisions and preserves local identity", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  let state = { id: "t1", revision: 3, selectedPlayerId: "p1", adminToken: "a", playerToken: "p", settings: { language: "nb" }, status: "Klar" };
  const controller = context.window.PadelstarRemoteStateController.create({
    getState: () => state,
    setState: (nextState) => { state = nextState; },
    getPendingPlayerScores: () => [],
    setPendingPlayerScores: () => {},
    getPendingAdminSync: () => false,
    setPendingAdminSync: () => {},
    setRemoteConflict: () => {},
    getRemoteMutationSequence: () => 1,
    getLastRemotePersistedSequence: () => 1,
    setLastRemotePersistedSequence: () => {},
    setIsApplyingRemoteState: () => {},
    clearRemoteSaveTimer: () => {},
    migrateState: (nextState) => ({ ...nextState, settings: { language: "nb" } }),
    loadUserLanguage: () => "nb",
    saveState: () => {},
    persistSyncMetadata: () => {},
    setRemoteNotice: () => {},
    connectRealtimeForCurrentState: () => {},
    hasRealtimeChannel: () => true,
    render: () => {},
    saveProfileHistory: () => {},
    translate: (_key) => _key,
  });
  assert.equal(controller.applyRemoteState({ id: "t1", revision: 2, settings: {} }), false);
  assert.equal(controller.applyRemoteState({ id: "t1", revision: 4, ownerUserId: "owner", settings: {} }, { source: "rpc" }), true);
  assert.equal(state.selectedPlayerId, "p1");
  assert.equal(state.adminToken, "a");
  assert.equal(state.playerToken, "p");
  assert.equal(state.ownerUserId, "owner");
});
