// Push categories on the client (0.15): the switches, what is sent to the server, and the wiring.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const context = { console };
context.window = context;
vm.createContext(context);
vm.runInContext(read("app", "push-preferences.js"), context);
vm.runInContext(read("app", "notification-system.js"), context);
const prefs = context.PadelstarPushPreferences;
const plain = (value) => JSON.parse(JSON.stringify(value));

function memory(initial = {}) {
  const data = { ...initial };
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); }, removeItem: (k) => { delete data[k]; }, data };
}

test("the defaults: everything on except 'only my matches'", () => {
  assert.deepEqual(plain(prefs.load(memory())), { match: true, result: true, withdrawal: true, onlyMine: false });
});

test("only known switches with real booleans are kept", () => {
  assert.deepEqual(plain(prefs.normalize({ match: false, result: "no", onlyMine: true, hack: true })), { match: false, result: true, withdrawal: true, onlyMine: true });
  assert.deepEqual(plain(prefs.normalize("x")), plain(prefs.DEFAULTS));
  const broken = memory({ [prefs.STORAGE_KEY]: "{not json" });
  assert.deepEqual(plain(prefs.load(broken)), plain(prefs.DEFAULTS));
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.deepEqual(plain(prefs.load(blocked)), plain(prefs.DEFAULTS));
  assert.doesNotThrow(() => prefs.save(blocked, { match: false }));
});

test("each message kind belongs to one category", () => {
  assert.equal(prefs.categoryFor("match_started"), "match");
  assert.equal(prefs.categoryFor("round_ready"), "match");
  assert.equal(prefs.categoryFor("result_corrected"), "result");
  assert.equal(prefs.categoryFor("withdrawal_decision"), "withdrawal");
  assert.equal(prefs.categoryFor("something else"), "match");
});

test("the switches show the saved choices, and a change is saved and reported", () => {
  const storage = memory({ [prefs.STORAGE_KEY]: JSON.stringify({ result: false, onlyMine: true }) });
  const inputs = Object.fromEntries(["#pushPrefMatch", "#pushPrefResult", "#pushPrefWithdrawal", "#pushPrefOnlyMine"].map((s) => [s, { checked: false, listener: null, addEventListener(name, fn) { this.listener = fn; } }]));
  const seen = [];
  prefs.bind({ document: { querySelector: (s) => inputs[s] ?? null }, storage, onChange: (next) => seen.push(plain(next)) });
  assert.deepEqual([inputs["#pushPrefMatch"].checked, inputs["#pushPrefResult"].checked, inputs["#pushPrefWithdrawal"].checked, inputs["#pushPrefOnlyMine"].checked], [true, false, true, true]);
  inputs["#pushPrefMatch"].checked = false;
  inputs["#pushPrefMatch"].listener();
  assert.deepEqual(seen, [{ match: false, result: false, withdrawal: true, onlyMine: true }]);
  assert.deepEqual(plain(prefs.load(storage)), seen[0], "saved");
});

function system({ stored = null, rpcError = null, invokeError = null } = {}) {
  const calls = { rpc: [], invoke: [] };
  const storage = memory(stored ? { sub: JSON.stringify({ endpoint: "https://fcm.googleapis.com/abc" }) } : {});
  const state = { id: "T1", adminToken: "a".repeat(36), currentRound: 2, playerToken: "p".repeat(40), selectedPlayerId: "P1" };
  const client = { functions: { invoke: async (name, args) => { calls.invoke.push([name, args]); return { error: invokeError }; } } };
  const created = context.PadelstarNotificationSystem.create({
    getElements: () => ({}), getLocalStorage: () => storage, getNotificationPreferenceKey: () => "pref", getPushSubscriptionStorageKey: () => "sub",
    getPushPreferences: () => ({ match: true, result: false, withdrawal: true, onlyMine: true }),
    getState: () => state, getSupabaseClient: () => client, getSupabaseSettings: () => ({}), remoteRpc: async (c, name, args) => { calls.rpc.push([name, args]); return { error: rpcError }; },
    translate: (key) => key,
  });
  return { calls, created };
}

test("a push message carries its category, the match and (for a withdrawal) the teammate who must decide", async () => {
  const { calls, created } = system();
  await created.sendPushNotification("result_corrected", "m1");
  await created.sendPushNotification("round_ready");
  await created.sendPushNotification("withdrawal_decision", "m2", { playerIds: ["P9"] });
  const bodies = calls.invoke.map(([, args]) => plain(args.body));
  assert.deepEqual([bodies[0].category, bodies[0].matchId, bodies[0].playerIds], ["result", "m1", undefined]);
  assert.deepEqual([bodies[1].category, bodies[1].matchId], ["match", undefined], "a new round names no match");
  assert.deepEqual([bodies[2].category, bodies[2].matchId, bodies[2].playerIds], ["withdrawal", "m2", ["P9"]]);
  assert.equal(bodies[2].title, "notifications.withdrawalTitle");
  assert.equal(calls.invoke[0][1].headers["x-padelstar-admin-token"].length, 36);
});

test("the device's choices are copied to its subscription with the player's own token", async () => {
  const { calls, created } = system({ stored: true });
  assert.equal(await created.syncPushPreferences(), true);
  assert.equal(calls.rpc[0][0], "set_push_preferences");
  assert.deepEqual(plain(calls.rpc[0][1]), { p_tournament_id: "T1", p_player_id: "P1", p_player_token: "p".repeat(40), p_endpoint: "https://fcm.googleapis.com/abc", p_prefs: { match: true, result: false, withdrawal: true, onlyMine: true } });
  const none = system();
  assert.equal(await none.created.syncPushPreferences(), false, "no subscription on this device: nothing to update");
  assert.deepEqual(none.calls.rpc, []);
  assert.equal(await system({ stored: true, rpcError: new Error("x") }).created.syncPushPreferences(), false, "a failure is not fatal");
});

test("the panel, the scripts and the texts are wired in", () => {
  const html = read("index.html");
  for (const id of ["pushPrefMatch", "pushPrefResult", "pushPrefWithdrawal", "pushPrefOnlyMine"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /app\/push-preferences\.js\?v=padelstar-push-preferences-\d+/);
  assert.match(read("service-worker.js"), /app\/push-preferences\.js\?v=padelstar-push-preferences-\d+/);
  const app = read("app", "app.js");
  assert.match(app, /pushPreferences\.bind\(\{ document, storage: localStorage, onChange: \(\) => void notificationSystem\.syncPushPreferences\(\) \}\)/);
  assert.match(app, /notifyWithdrawalDecision: \(matchId, teammateId\)[\s\S]*"withdrawal_decision", matchId, \{ playerIds: \[teammateId\] \}/);
  assert.match(read("app", "player-state.js"), /result\.decide\.forEach\(\(matchId\) =>[\s\S]*notifyWithdrawalDecision\(matchId, record\?\.teammateId\)/);
  const i18n = vm.createContext({ window: {} });
  vm.runInContext(read("app", "translations.js"), i18n);
  for (const language of ["nb", "en"]) for (const key of ["push.title", "push.hint", "push.match", "push.result", "push.withdrawal", "push.onlyMine", "withdrawalTitle", "withdrawalBody"]) assert.ok(i18n.window.PadelstarTranslations[language][`notifications.${key}`], `${language} ${key}`);
  const fn = read("supabase", "functions", "push-send", "index.ts");
  assert.match(fn, /import \{ matchPlayerIds, normalizeCategory, selectRecipients/);
  assert.match(fn, /select\("id, player_id, subscription, prefs"\)/);
  assert.match(fn, /for \(const row of recipients\)/, "only the selected recipients are sent to");
});

test("a withdrawal sends the teammate a push message", () => {
  const stateContext = { console };
  stateContext.window = stateContext;
  vm.createContext(stateContext);
  for (const file of ["player-withdrawal.js", "player-replacement.js", "player-state.js"]) vm.runInContext(read("app", file), stateContext);
  const person = (id) => ({ id, name: id, active: true });
  const team = (...ids) => ({ id: `t-${ids.join("")}`, players: ids.map(person), displayName: ids.join(" & ") });
  const state = { status: "Runde pågår", settings: { format: "roundRobin" }, courts: [], players: ["A", "B", "C", "D"].map(person), cupTeams: [], rounds: [{ matches: [{ id: "m1", state: "waiting", teamOne: team("A", "B"), teamTwo: team("C", "D"), completedSets: [], currentSet: {}, currentGame: {}, winnerTeamIndex: null }] }] };
  const pushed = [];
  const playerState = stateContext.PadelstarPlayerState.create({
    buildSchedule: () => [], createPlayer: () => ({}), createTeam: (players) => ({ id: "x", players, displayName: "x" }), getPlayerById: (id) => state.players.find((p) => p.id === id), getState: () => state,
    notifyWithdrawalDecision: (matchId, teammateId) => pushed.push([matchId, teammateId]), render() {}, saveState() {}, showToast() {}, t: (k) => k,
  });
  playerState.withdrawPlayer("A", { confirmed: true });
  assert.deepEqual(pushed, [["m1", "B"]]);
});
