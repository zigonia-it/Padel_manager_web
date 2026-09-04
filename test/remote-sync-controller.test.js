const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const filename = path.join(__dirname, "..", "app", "core", "remote-sync-controller.js");

test("remote sync controller debounces admin writes and preserves sequence ordering", () => {
  const timers = [];
  const context = vm.createContext({ window: { setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; }, clearTimeout: () => {} } });
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  let chain = Promise.resolve();
  let saveCount = 0;
  let sequence = 1;
  const controller = context.window.PadelstarRemoteSyncController.create({
    windowRef: context.window,
    isSupabaseReady: () => true,
    isOnline: () => true,
    hasPendingRemoteWrites: () => true,
    isApplyingRemoteState: () => false,
    hasAdminTokenAndTournament: () => true,
    isCurrentUserAdmin: () => true,
    getRemoteMutationSequence: () => sequence,
    getLastRemotePersistedSequence: () => 3,
    setRemoteMutationSequence: (value) => { sequence = value; },
    getRemoteSaveTimer: () => null,
    setRemoteSaveTimer: () => {},
    getRemoteRetryTimer: () => null,
    setRemoteRetryTimer: () => {},
    getRemoteRetryAttempt: () => 0,
    setRemoteRetryAttempt: () => {},
    getRemoteWriteChain: () => chain,
    setRemoteWriteChain: (value) => { chain = value; },
    saveRemoteState: () => { saveCount += 1; },
    processPlayerScoreQueue: () => {},
    scheduleRealtimeReconnect: () => {},
  });
  controller.queueRemoteSave();
  assert.equal(timers[0].delay, 350);
  controller.flushPendingRemoteWrites();
  assert.equal(sequence, 4);
  assert.equal(saveCount, 0);
});
