const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app", "retention-policy.js"), "utf8");
const context = { window: {}, structuredClone };
vm.runInNewContext(source, context);
const policy = context.window.PadelstarRetentionPolicy;

test("ended tournament state removes guest players and guest matches", () => {
  const state = {
    status: "Avsluttet",
    players: [
      { id: "admin", participantType: "admin-player", profileId: "profile-admin" },
      { id: "registered", profileId: "profile-1" },
      { id: "guest", participantType: "player" },
    ],
    rounds: [{ matches: [{ id: "registered-match", teamOne: { players: [{ id: "admin" }] }, teamTwo: { players: [{ id: "registered" }] } }, { id: "guest-match", teamOne: { players: [{ id: "guest" }] }, teamTwo: { players: [{ id: "registered" }] } }] }],
    schedule: [],
    cupTeams: [],
    schedulerHistory: { matches: [{ playerId: "guest" }] },
    scoreSubmissions: [{ submittedBy: "guest" }],
    events: [{ actorId: "guest" }],
    playerToken: "secret",
  };
  const result = policy.sanitizeEndedTournamentState(state);
  assert.deepEqual(result.players.map((player) => player.id), ["admin", "registered"]);
  assert.deepEqual(result.rounds[0].matches.map((match) => match.id), ["registered-match"]);
  assert.equal(result.schedulerHistory.matches.length, 0);
  assert.equal(result.scoreSubmissions.length, 0);
  assert.equal(result.events.length, 0);
  assert.equal(result.playerToken, undefined);
  assert.equal(state.players.length, 3);
});

test("retention policy leaves active tournament state unchanged", () => {
  const state = { status: "Pågår", players: [{ id: "guest" }], rounds: [], events: [{ actorId: "guest" }] };
  assert.deepEqual(policy.sanitizeEndedTournamentState(state), state);
});

test("a profiled player is retained even when they joined as a guest", () => {
  assert.equal(policy.isRetainedParticipant({ id: "player", profileId: "profile-1", guest: true }), true);
  assert.equal(policy.isRetainedParticipant({ id: "guest", guest: true }), false);
});

test("only a real participant profile retains tournament data", () => {
  assert.equal(policy.isRetainedParticipant({ id: "creator", profileId: "creator-profile" }), true);
  assert.equal(policy.isRetainedParticipant({ id: "guest", participantType: "admin-player" }), false);
});
