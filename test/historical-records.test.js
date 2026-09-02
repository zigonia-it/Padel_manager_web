const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function api() { const context = vm.createContext({ window: {}, structuredClone }); vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "historical-records.js"), "utf8"), context); return context.window.PadelstarHistoricalRecords; }
function storage() { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) }; }

test("ended tournament records are retrievable without security tokens", () => {
  const records = api(); const store = storage();
  const entry = records.create({ id: "t1", name: "Spring", inviteCode: "ABCD", status: "Avsluttet", settings: { format: "roundRobin" }, adminToken: "secret", playerToken: "player-secret", players: [], rounds: [] }, { sanitizeEndedTournamentState: (state) => state }, new Date("2026-09-01T12:00:00Z"));
  records.record(store, "history", entry);
  const loaded = records.get(store, "history", "t1");
  assert.equal(loaded.state.adminToken, undefined);
  assert.equal(loaded.state.playerToken, undefined);
  assert.equal(loaded.tournamentName, "Spring");
});
