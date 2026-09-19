const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { console };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "notification-center.js"), "utf8"), context);
const plain = (value) => JSON.parse(JSON.stringify(value));
const realCenter = context.PadelstarNotificationCenter;
const center = {
  ...realCenter,
  detect: (...args) => plain(realCenter.detect(...args)),
  createStore: (options) => { const store = realCenter.createStore(options); return { ...store, list: (...args) => plain(store.list(...args)), add: (...args) => plain(store.add(...args)) }; },
};

const ME = "p-me";
const team = (...ids) => ({ displayName: ids.join(" & "), players: ids.map((id) => ({ id, name: id })) });
const match = (id, state, extra = {}) => ({ id, state, teamOne: team(ME, "p-mate"), teamTwo: team("p-a", "p-b"), courtName: "Bane 1", ...extra });
const tournament = (matches, extra = {}) => ({ id: "t1", status: "Runde pågår", rounds: [{ matches }], ...extra });
const kinds = (updates) => updates.map((update) => update.kind);

test("nothing is news without an earlier state of the same tournament", () => {
  const next = tournament([match("m1", "playing")]);
  assert.deepEqual(center.detect(null, next, ME), []);
  assert.deepEqual(center.detect({ ...next, id: "other" }, next, ME), []);
  assert.deepEqual(center.detect(next, next, null), []);
  assert.deepEqual(center.detect(next, next, ME), [], "unchanged state");
});

test("my match becoming ready is notification 1, other matches are ignored", () => {
  const before = tournament([match("m1", "waiting"), match("m2", "waiting", { teamOne: team("x", "y") })]);
  const after = tournament([match("m1", "playing"), match("m2", "playing", { teamOne: team("x", "y") })]);
  const updates = center.detect(before, after, ME);
  assert.deepEqual(kinds(updates), ["matchReady"]);
  assert.equal(updates[0].sound, 1);
  assert.equal(updates[0].values.court, "Bane 1");
  assert.equal(center.soundFor(updates), 1);
});

test("a result waiting for my team's approval is notification 2, once per submission", () => {
  const before = tournament([match("m1", "playing")]);
  const pending = tournament([match("m1", "awaitingApproval", { approval: { status: "pending", submittedAt: "t1", approvals: [{ teamIndex: 1 }] } })]);
  const first = center.detect(before, pending, ME);
  assert.deepEqual(kinds(first), ["approvalNeeded"]);
  assert.equal(first[0].sound, 2);
  assert.deepEqual(center.detect(pending, pending, ME), [], "the same submission is not announced again");
  const resubmitted = tournament([match("m1", "awaitingApproval", { approval: { status: "pending", submittedAt: "t2", approvals: [{ teamIndex: 1 }] } })]);
  assert.deepEqual(kinds(center.detect(pending, resubmitted, ME)), ["approvalNeeded"], "a corrected proposal is new");
  const mineApproved = tournament([match("m1", "awaitingApproval", { approval: { status: "pending", submittedAt: "t1", approvals: [{ teamIndex: 0 }] } })]);
  assert.deepEqual(center.detect(before, mineApproved, ME), [], "my own team already approved: nothing to do");
});

test("a withdrawn teammate asks me to decide; a correction and the end are announced", () => {
  const before = tournament([match("m1", "waiting")]);
  const blocked = tournament([match("m1", "awaitingWithdrawalDecision", { withdrawal: { status: "pending", teammateId: ME, absent: { name: "Mate" } } })]);
  const decide = center.detect(before, blocked, ME);
  assert.deepEqual(kinds(decide), ["withdrawalDecision"]);
  assert.equal(decide[0].values.absent, "Mate");
  const notMe = tournament([match("m1", "awaitingWithdrawalDecision", { withdrawal: { status: "pending", teammateId: "someone-else" } })]);
  assert.deepEqual(center.detect(before, notMe, ME), [], "only the teammate who must decide");

  const finished = tournament([match("m1", "finished")]);
  const corrected = tournament([match("m1", "finished", { correctionHistory: [{ at: "x" }] })]);
  assert.deepEqual(kinds(center.detect(finished, corrected, ME)), ["resultCorrected"]);
  const ended = { ...finished, status: "Avsluttet" };
  const end = center.detect(finished, ended, ME);
  assert.deepEqual(kinds(end), ["tournamentFinished"]);
  assert.equal(center.soundFor([...decide, ...end]), 2);
  assert.equal(center.soundFor([]), null);
  assert.equal(center.soundFor([{ sound: 2 }, { sound: 1 }]), 1, "notification 1 wins when both occur");
});

function storage() {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); }, data };
}

test("the store keeps new items, ignores duplicates, and tracks read/unread per item", () => {
  let now = 1_000;
  const store = center.createStore({ storage: storage(), now: () => now });
  const update = (key) => ({ key, kind: "matchReady", sound: 1, matchId: "m1", values: {} });
  const fresh = store.add("t1", ME, [update("a"), update("b"), update("a")]);
  assert.equal(fresh.length, 2, "the duplicate key is dropped");
  assert.equal(store.add("t1", ME, [update("a")]).length, 0, "already stored");
  assert.equal(store.unreadCount("t1", ME), 2);
  now += 10;
  store.add("t1", ME, [update("c")]);
  assert.deepEqual(store.list("t1", ME).map((item) => item.key), ["c", "b", "a"], "newest first");
  assert.equal(store.markRead(fresh[0].id), true);
  assert.equal(store.markRead(fresh[0].id), false, "already read");
  assert.equal(store.unreadCount("t1", ME), 2);
  assert.equal(store.markAllRead("t1", ME), 2);
  assert.equal(store.unreadCount("t1", ME), 0);
  assert.equal(store.unreadCount("t2", ME), 0, "another tournament has its own list");
});

test("cleanup drops old items and items of other tournaments or players, and the list is capped", () => {
  let now = 1_000_000;
  const mem = storage();
  const store = center.createStore({ storage: mem, now: () => now });
  const update = (key) => ({ key, kind: "matchReady", sound: 1, matchId: null, values: {} });
  store.add("t1", ME, [update("old")]);
  now += center.MAX_AGE_MS + 1;
  store.add("t1", ME, [update("fresh")]);
  store.add("t2", ME, [update("other-tournament")]);
  store.add("t1", "someone-else", [update("other-player")]);
  assert.equal(store.prune("t1", ME), 1);
  assert.deepEqual(store.list("t1", ME).map((item) => item.key), ["fresh"]);
  const many = Array.from({ length: center.MAX_ITEMS + 20 }, (_, i) => update(`k${i}`));
  store.add("t1", ME, many);
  assert.equal(store.list("t1", ME).length, center.MAX_ITEMS);
  assert.doesNotThrow(() => center.createStore({ storage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } } }).add("t1", ME, [update("x")]));
});

test("sounds: default on, can be switched off, and each number maps to its file", () => {
  const mem = storage();
  assert.equal(center.soundsEnabled(mem), true);
  center.setSoundsEnabled(mem, false);
  assert.equal(center.soundsEnabled(mem), false);
  center.setSoundsEnabled(mem, true);
  assert.equal(center.soundsEnabled(mem), true);
  const played = [];
  class FakeAudio {
    constructor(src) { this.src = src; if (src) played.push(src); }
    canPlayType(type) { return type === "audio/mpeg" ? "maybe" : ""; }
    play() { return Promise.reject(new Error("autoplay blocked")); }
  }
  assert.equal(center.playSound(1, { AudioClass: FakeAudio }), true);
  assert.equal(center.playSound(2, { AudioClass: FakeAudio }), true);
  assert.equal(center.playSound(3, { AudioClass: FakeAudio }), false);
  assert.deepEqual(played, ["assets/sounds/notification1.mp3", "assets/sounds/notification2.mp3"]);
  class NoMp3 extends FakeAudio { canPlayType() { return ""; } }
  played.length = 0;
  center.playSound(1, { AudioClass: NoMp3 });
  assert.deepEqual(played, ["assets/sounds/notification1.m4a"], "falls back to AAC where MP3 is unsupported");
});

test("the two sound files exist", () => {
  for (const file of ["notification1.mp3", "notification1.m4a", "notification2.mp3", "notification2.m4a"]) {
    assert.ok(fs.statSync(path.join(__dirname, "..", "assets", "sounds", file)).size > 10_000, file);
  }
});

test("vibration: a preference that defaults on, a double pulse for notification 1, and a quiet no-op where unsupported", () => {
  const mem = storage();
  assert.equal(center.vibrationEnabled(mem), true);
  center.setVibrationEnabled(mem, false);
  assert.equal(center.vibrationEnabled(mem), false);
  const calls = [];
  const phone = { vibrate: (pattern) => { calls.push(pattern); return true; } };
  assert.equal(center.vibrationSupported(phone), true);
  assert.equal(center.vibrate(1, phone), true);
  assert.equal(center.vibrate(2, phone), true);
  assert.equal(center.vibrate(3, phone), false);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [[200, 100, 200], [120]]);
  assert.equal(center.vibrationSupported({}), false, "an iPhone has no vibrate()");
  assert.equal(center.vibrate(1, {}), false);
  assert.equal(center.vibrate(1, { vibrate() { throw new Error("blocked"); } }), false);
});
