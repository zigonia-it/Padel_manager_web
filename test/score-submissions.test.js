const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function load() {
  const context = vm.createContext({ window: {}, crypto: { randomUUID: () => "submission-id" } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "score-submissions.js"), "utf8"), context);
  return context.window.PadelstarScoreSubmissions;
}

test("score submissions confirm matching reports without overwriting", () => {
  const submissions = load();
  const state = { scoreSubmissions: [] };
  const first = submissions.createSubmission({ matchId: "m1", teamOne: 21, teamTwo: 17, submittedBy: "p1", id: "s1" });
  const second = submissions.createSubmission({ matchId: "m1", teamOne: 21, teamTwo: 17, submittedBy: "p2", id: "s2" });
  assert.equal(submissions.add(state, first).status, "pending");
  assert.equal(submissions.add(state, second).status, "confirmed");
  assert.equal(state.scoreSubmissions.length, 2);
});

test("score submissions expose conflicts and require explicit resolution", () => {
  const submissions = load();
  const state = { scoreSubmissions: [] };
  submissions.add(state, submissions.createSubmission({ matchId: "m1", teamOne: 21, teamTwo: 17, submittedBy: "p1", id: "s1" }));
  const result = submissions.add(state, submissions.createSubmission({ matchId: "m1", teamOne: 21, teamTwo: 18, submittedBy: "p2", id: "s2" }));
  assert.equal(result.status, "conflict");
  assert.equal(submissions.forMatch(state, "m1").status, "conflict");
  const resolution = submissions.resolve(state, "m1", 21, 18, "admin");
  assert.equal(resolution.status, "resolved");
  assert.equal(submissions.forMatch(state, "m1").status, "pending");
  assert.equal(state.scoreSubmissions.filter((item) => item.status === "rejected").length, 2);
});

test("a conflict is also explicit on the match state", () => {
  const submissions = load();
  const state = { scoreSubmissions: [], rounds: [{ matches: [{ id: "m1" }] }] };
  submissions.add(state, submissions.createSubmission({ matchId: "m1", teamOne: 21, teamTwo: 17, submittedBy: "p1" }));
  const result = submissions.add(state, submissions.createSubmission({ matchId: "m1", teamOne: 21, teamTwo: 18, submittedBy: "p2" }));
  assert.equal(result.status, "conflict");
  assert.equal(state.rounds[0].matches[0].scoreStatus, "score_conflict");
});
