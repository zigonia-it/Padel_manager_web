const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("tournament event log keeps bounded, actor-aware undoable events", () => {
  const context = vm.createContext({ window: {}, structuredClone, crypto: { randomUUID: () => "event-id" } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "tournament-events.js"), "utf8"), context);
  const state = { id: "tournament-1", events: [] };
  const events = context.window.PadelstarTournamentEvents.create({ getActor: () => "admin", getState: () => state, now: () => "2026-09-02T12:00:00Z", randomUUID: () => `event-${state.events.length + 1}` });
  const event = events.record("match_completed", "match", "match-1", { winnerTeamIndex: 0 }, { state: "active" });

  assert.equal(event.actorId, "admin");
  assert.deepEqual(event.payload, { winnerTeamIndex: 0 });
  assert.deepEqual(Array.from(events.recent(1), (item) => item.id), ["event-1"]);
  assert.equal(events.markUndone("event-1").undoneAt, "2026-09-02T12:00:00Z");
  assert.equal(events.markUndone("event-1"), null);
});
