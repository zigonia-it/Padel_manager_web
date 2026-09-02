const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function api() { const context = vm.createContext({ window: {} }); vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "tournament-insights.js"), "utf8"), context); return context.window.PadelstarTournamentInsights; }
test("Elo update rewards an underdog and is deterministic", () => {
  const insights = api();
  assert.equal(insights.updateRating(1000, 1200, 1), 1024);
  assert.equal(insights.updateRating(1200, 1000, 0), 1176);
});
test("season summary and assistant findings identify actionable issues", () => {
  const insights = api();
  assert.equal(JSON.stringify(insights.seasonSummary([{ seasonId: "2026", matches: 4, points: 6 }, { seasonId: "2025", matches: 9, points: 3 }], "2026")), JSON.stringify({ seasonId: "2026", tournaments: 1, matches: 4, points: 6 }));
  assert.equal(JSON.stringify(insights.assistantFindings({ players: [{ active: true, availability: "active" }], courts: [], status: "Klar", settings: {} })), JSON.stringify([{ code: "too_few_players", severity: "error" }, { code: "no_active_court", severity: "error" }]));
});

test("ratings can be calculated across historical finished matches", () => {
  const insights = api();
  const match = { state: "finished", winnerTeamIndex: 0, teamOne: { players: [{ id: "p1" }] }, teamTwo: { players: [{ id: "p2" }] } };
  const ratings = insights.calculateRatings([match]);
  assert.equal(ratings.p1, 1016);
  assert.equal(ratings.p2, 984);
});
