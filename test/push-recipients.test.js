// Who gets a push message (0.15): the choices each player made are enforced by the push-send function through these
// pure functions. Node runs the TypeScript file directly (type stripping).
const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const load = () => import(pathToFileURL(path.join(__dirname, "..", "supabase", "functions", "push-send", "recipients.ts")).href);

const sub = (player, prefs) => ({ id: `s-${player}`, player_id: player, subscription: { endpoint: "https://fcm.googleapis.com/x" }, prefs });
const state = { rounds: [{ matches: [
  { id: "m1", teamOne: { players: [{ id: "A" }, { id: "B" }] }, teamTwo: { players: [{ id: "C" }, { id: "D" }] } },
] }, { matches: [{ id: "m2", teamOne: { players: [{ id: "E" }] }, teamTwo: { players: [{ id: "A" }] } }] }] };
const ids = (list) => list.map((item) => item.player_id);

test("no choices made: everyone gets it (the old behaviour)", async () => {
  const { selectRecipients } = await load();
  const all = [sub("A", {}), sub("B", null), sub("E", undefined)];
  assert.deepEqual(ids(selectRecipients(all, { category: "match" })), ["A", "B", "E"]);
});

test("a category that is switched off is not sent", async () => {
  const { selectRecipients } = await load();
  const all = [sub("A", { result: false }), sub("B", { match: false }), sub("C", {})];
  assert.deepEqual(ids(selectRecipients(all, { category: "result" })), ["B", "C"]);
  assert.deepEqual(ids(selectRecipients(all, { category: "match" })), ["A", "C"]);
  assert.deepEqual(ids(selectRecipients([sub("A", { withdrawal: false }), sub("B", {})], { category: "withdrawal" })), ["B"]);
});

test("only my matches: a match message reaches the players of that match, a new round reaches everyone", async () => {
  const { selectRecipients, matchPlayerIds } = await load();
  const all = [sub("A", { onlyMine: true }), sub("E", { onlyMine: true }), sub("F", {})];
  const participants = matchPlayerIds(state, "m1");
  assert.deepEqual(participants.sort(), ["A", "B", "C", "D"]);
  assert.deepEqual(ids(selectRecipients(all, { category: "match", participants })), ["A", "F"], "E asked for only their own matches and is not in m1; F did not ask");
  assert.deepEqual(ids(selectRecipients(all, { category: "result", participants })), ["A", "F"]);
  assert.deepEqual(ids(selectRecipients(all, { category: "match", participants: null })), ["A", "E", "F"], "a message with no match (round ready) goes to everyone");
});

test("a match that cannot be found bothers nobody who asked for only their own", async () => {
  const { selectRecipients, matchPlayerIds } = await load();
  assert.deepEqual(matchPlayerIds(state, "nope"), []);
  assert.deepEqual(matchPlayerIds(state, undefined), []);
  assert.deepEqual(matchPlayerIds(null, "m1"), []);
  const all = [sub("A", { onlyMine: true }), sub("B", {})];
  assert.deepEqual(ids(selectRecipients(all, { category: "match", participants: [] })), ["B"]);
});

test("a withdrawal message goes only to the teammate who must decide, whatever their 'only mine' choice", async () => {
  const { selectRecipients } = await load();
  const all = [sub("A", {}), sub("B", { onlyMine: true }), sub("C", {})];
  assert.deepEqual(ids(selectRecipients(all, { category: "withdrawal", targets: ["B"] })), ["B"]);
  assert.deepEqual(ids(selectRecipients([sub("B", { withdrawal: false })], { category: "withdrawal", targets: ["B"] })), [], "unless they switched it off");
});

test("old clients (no category) and unknown categories count as match messages", async () => {
  const { normalizeCategory } = await load();
  assert.equal(normalizeCategory(undefined), "match");
  assert.equal(normalizeCategory("admin"), "match");
  assert.equal(normalizeCategory("result"), "result");
  assert.equal(normalizeCategory("withdrawal"), "withdrawal");
});
