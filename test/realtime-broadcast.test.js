const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function create({ localRevision = 5, refreshedRevision = 9, refreshDelay = 0 } = {}) {
  const context = { console, setTimeout, clearTimeout };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "realtime-connection.js"), "utf8"), context);
  const state = { id: "t1", inviteCode: "ABCD2345", revision: localRevision };
  const handlers = {};
  const calls = { fetches: 0, channelNames: [] };
  const channel = {
    on(type, filter, callback) { handlers[type] = { filter, callback }; return channel; },
    subscribe() {},
  };
  const client = { channel: (name) => { calls.channelNames.push(name); return channel; }, removeChannel() {} };
  const api = context.PadelstarRealtimeConnection.create({
    applyRemoteState: (data) => { state.revision = data.revision; return true; },
    flushPendingRemoteWrites: () => {},
    getClient: () => client,
    getInviteState: async () => { calls.fetches += 1; if (refreshDelay) await new Promise((r) => setTimeout(r, refreshDelay)); return { data: { id: "t1", revision: refreshedRevision } }; },
    getNavigator: () => ({ onLine: true }),
    getState: () => state,
    handleRemoteError: () => {},
    hasActiveTournament: () => true,
    isReady: () => true,
    observability: null,
    onConnectionStateChange: () => {},
    realtimeSync: { channelName: (id) => `tournament:${id}`, backoffForAttempt: () => 1000, connectionStateForAttempt: () => "connecting", isSubscribed: () => true, shouldReconnect: () => false },
    translate: (key) => key,
  });
  return { api, state, handlers, calls };
}
const tick = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

test("the connection listens for revision broadcasts on the tournament channel", () => {
  const { api, handlers, calls } = create();
  api.connect();
  assert.deepEqual(calls.channelNames, ["tournament:t1"]);
  assert.equal(handlers.broadcast.filter.event, "revision");
  assert.ok(handlers.postgres_changes, "the old change feed stays registered");
});

test("a newer revision is fetched through the RPC", async () => {
  const { api, handlers, calls, state } = create({ localRevision: 5, refreshedRevision: 9 });
  api.connect();
  handlers.broadcast.callback({ payload: { revision: 9 } });
  await tick();
  assert.equal(calls.fetches, 1);
  assert.equal(state.revision, 9);
});

test("a revision we already have causes no fetch", async () => {
  const { api, handlers, calls } = create({ localRevision: 9 });
  api.connect();
  handlers.broadcast.callback({ payload: { revision: 9 } });
  handlers.broadcast.callback({ payload: { revision: 4 } });
  await tick();
  assert.equal(calls.fetches, 0);
});

test("a burst of notices is coalesced and still ends up on the newest revision", async () => {
  const { api, handlers, calls, state } = create({ localRevision: 5, refreshedRevision: 8, refreshDelay: 15 });
  api.connect();
  for (const revision of [6, 7, 8]) handlers.broadcast.callback({ payload: { revision } });
  await tick(120);
  assert.ok(calls.fetches <= 2, `expected few fetches, got ${calls.fetches}`);
  assert.equal(state.revision, 8);
});

test("malformed notices are ignored", async () => {
  const { api, handlers, calls } = create();
  api.connect();
  handlers.broadcast.callback({ payload: {} });
  handlers.broadcast.callback({});
  handlers.broadcast.callback({ payload: { revision: "abc" } });
  await tick();
  assert.equal(calls.fetches, 0);
});

test("if the refresh cannot apply the state, the catch-up stops instead of looping", async () => {
  const { api, handlers, calls, state } = create({ localRevision: 5, refreshedRevision: 5 });
  api.connect();
  handlers.broadcast.callback({ payload: { revision: 12 } });
  await tick();
  assert.equal(calls.fetches, 1);
  assert.equal(state.revision, 5);
});
