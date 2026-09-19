const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appRoot = path.join(__dirname, "..", "app");

function load(file, extra = {}) {
  const context = { console, structuredClone, setInterval: () => 1, clearInterval: () => {}, ...extra };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(appRoot, file), "utf8"), context, { filename: file });
  return context;
}

const ME = "p-me";
const OTHER = "p-other";
const team = (...ids) => ({ displayName: ids.join(" & "), players: ids.map((id) => ({ id, name: id })) });
const playingMatch = (extra = {}) => ({
  id: "m1", state: "playing", teamOne: team(ME, "p-mate"), teamTwo: team(OTHER, "p-x"),
  currentGame: { teamOne: 0, teamTwo: 0 }, currentSet: { teamOne: 0, teamTwo: 0 }, completedSets: [], undoStack: [], ...extra,
});

function scoreDeps(overrides = {}) {
  const calls = { toasts: [], refreshed: [], rpcs: [], applied: [], removed: 0 };
  const pending = [];
  const state = { id: "t1", inviteCode: "ABCD2345", selectedPlayerId: ME, playerToken: "a".repeat(48), rounds: [{ matches: [] }] };
  const deps = {
    addPendingScore: (score) => pending.push(score),
    applyRemoteState: (data) => calls.applied.push(data),
    getPendingScores: () => pending,
    getState: () => state,
    getSupabaseClient: () => ({}),
    handleRemoteError: () => {},
    isOnline: () => true,
    isSupabaseReady: () => true,
    persistSyncMetadata: () => {},
    refreshRemoteState: (reason) => calls.refreshed.push(reason),
    removeFirstPendingScore: () => { pending.shift(); calls.removed += 1; },
    remoteRpc: async (client, name, args) => { calls.rpcs.push({ name, args }); return overrides.rpc ? overrides.rpc(name, args, calls) : { data: { revision: 5 } }; },
    render: () => {},
    showToast: (message) => calls.toasts.push(message),
    syncConnectionStatus: () => {},
    t: (key) => key,
  };
  return { deps, calls, pending, state };
}

test("a point the server rejects is dropped instead of blocking every later point", async () => {
  const { window } = load("remote-player-score.js");
  const { deps, calls, pending } = scoreDeps({
    rpc: (name, args) => (args.p_match_id === "rejected" ? { error: { message: "Not the active scorer" } } : { data: { revision: 9 } }),
  });
  const score = window.PadelstarRemotePlayerScore.create(deps);
  pending.push({ matchId: "rejected", teamIndex: 0 }, { matchId: "ok", teamIndex: 1 });
  await score.processPlayerScoreQueue();
  assert.equal(pending.length, 0, "rejected point removed and the next one still sent");
  assert.deepEqual(calls.rpcs.map((call) => call.args.p_match_id), ["rejected", "ok"]);
  assert.deepEqual(calls.toasts, ["scorer.pointRejected"]);
  assert.deepEqual(calls.refreshed, ["scorer-rejected"]);
});

test("a transient network error keeps the point queued for retry", async () => {
  const { window } = load("remote-player-score.js");
  const { deps, pending } = scoreDeps({ rpc: () => ({ error: { message: "Failed to fetch" } }) });
  const score = window.PadelstarRemotePlayerScore.create(deps);
  pending.push({ matchId: "m1", teamIndex: 0 });
  await score.processPlayerScoreQueue();
  assert.equal(pending.length, 1);
});

test("scorer actions call the RPC with the player identity and apply the returned state", async () => {
  const { window } = load("remote-player-score.js");
  const { deps, calls, state } = scoreDeps();
  const score = window.PadelstarRemotePlayerScore.create(deps);
  assert.equal(await score.scorerAction("m1", "transfer", "p-mate"), true);
  const rpc = calls.rpcs.at(-1);
  assert.equal(rpc.name, "match_scorer_action");
  assert.deepEqual(
    { p: rpc.args.p_player_id, m: rpc.args.p_match_id, a: rpc.args.p_action, t: rpc.args.p_target_player_id, tok: rpc.args.p_player_token },
    { p: ME, m: "m1", a: "transfer", t: "p-mate", tok: state.playerToken },
  );
  assert.equal(calls.applied.length, 1);
});

test("scorer action failures are explained and heartbeats stay silent", async () => {
  const { window } = load("remote-player-score.js");
  const { deps, calls } = scoreDeps({ rpc: () => ({ error: { message: "Match already has an active scorer" } }) });
  const score = window.PadelstarRemotePlayerScore.create(deps);
  assert.equal(await score.scorerAction("m1", "claim"), false);
  assert.deepEqual(calls.toasts, ["scorer.alreadyActive"]);
  calls.toasts.length = 0;
  assert.equal(await score.scorerAction("m1", "heartbeat"), false);
  assert.deepEqual(calls.toasts, []);
  assert.equal(calls.applied.length, 0);
});

test("scorer actions refuse to run offline", async () => {
  const { window } = load("remote-player-score.js");
  const { deps, calls } = scoreDeps();
  deps.isOnline = () => false;
  const score = window.PadelstarRemotePlayerScore.create(deps);
  assert.equal(await score.scorerAction("m1", "undo"), false);
  assert.deepEqual(calls.toasts, ["scorer.offline"]);
  assert.equal(calls.rpcs.length, 0);
});

test("the heartbeat runs only while the player is the scorer of a playing match", () => {
  const timers = { set: 0, cleared: 0 };
  const { window } = load("remote-player-score.js", { setInterval: () => { timers.set += 1; return 7; }, clearInterval: () => { timers.cleared += 1; } });
  const { deps, state } = scoreDeps();
  const score = window.PadelstarRemotePlayerScore.create(deps);
  score.syncHeartbeat();
  assert.equal(timers.set, 0);
  state.rounds = [{ matches: [playingMatch({ scorer: { playerId: ME } })] }];
  score.syncHeartbeat();
  score.syncHeartbeat();
  assert.equal(timers.set, 1, "started once");
  state.rounds = [{ matches: [playingMatch({ scorer: { playerId: OTHER } })] }];
  score.syncHeartbeat();
  assert.equal(timers.cleared, 1, "stopped when the role moved away");
});

function matchCardApi(role, selectedPlayerId = ME) {
  const { window } = load("match-card.js");
  return window.PadelstarMatchCard.create({
    currentLocalRole: () => role,
    escapeAttribute: (v) => String(v),
    escapeHtml: (v) => String(v),
    getState: () => ({ selectedPlayerId }),
    matchIncludesPlayer: (match, id) => [...match.teamOne.players, ...match.teamTwo.players].some((p) => p.id === id),
    setsWonByTeam: () => 0,
    teamAccentStyle: () => "",
    tennisPointLabel: (v) => String(v),
    translate: (key, values = {}) => `${key}${values.name ? `:${values.name}` : ""}`,
  });
}

const enabledPlus = (html) => (html.match(/scoreboard-point-plus[^>]*>/g) ?? []).map((tag) => !tag.includes("disabled"));
const enabledMinus = (html) => (html.match(/scoreboard-point-minus[^>]*>/g) ?? []).map((tag) => !tag.includes("disabled"));

test("players can score only as the active scorer, or on an unclaimed match", () => {
  const { scoreboardTableMarkup } = matchCardApi("player");
  assert.deepEqual(enabledPlus(scoreboardTableMarkup(playingMatch(), true)), [true, true], "unclaimed: first point claims");
  assert.deepEqual(enabledPlus(scoreboardTableMarkup(playingMatch({ scorer: { playerId: ME } }), true)), [true, true]);
  assert.deepEqual(enabledPlus(scoreboardTableMarkup(playingMatch({ scorer: { playerId: OTHER } }), true)), [false, false]);
});

test("player undo needs the scorer role and something to undo; admins are unaffected", () => {
  const withHistory = (extra) => playingMatch({ undoStack: [{ match: {} }], ...extra });
  const asPlayer = matchCardApi("player").scoreboardTableMarkup;
  assert.deepEqual(enabledMinus(asPlayer(withHistory({ scorer: { playerId: ME } }), true)), [true, true]);
  assert.deepEqual(enabledMinus(asPlayer(withHistory({ scorer: { playerId: OTHER } }), true)), [false, false]);
  assert.deepEqual(enabledMinus(asPlayer(withHistory({}), true)), [false, false], "no established scorer yet");
  const asAdmin = matchCardApi("admin").scoreboardTableMarkup;
  assert.deepEqual(enabledMinus(asAdmin(withHistory({ scorer: { playerId: OTHER } }), true)), [true, true]);
  assert.deepEqual(enabledPlus(asAdmin(playingMatch({ scorer: { playerId: OTHER } }), true)), [true, true], "admin override");
});

test("the scorer panel offers the right controls for each role", () => {
  const panel = (role, match, editable = true, scoreOnly = true, me = ME) => matchCardApi(role, me).scorerPanelMarkup(match, editable, scoreOnly);
  const actions = (html) => [...html.matchAll(/data-scorer-action="([\w-]+)"/g)].map((m) => m[1]);
  assert.equal(panel("player", { ...playingMatch(), state: "waiting" }), "", "no panel before the match is playing");
  assert.deepEqual(actions(panel("player", playingMatch())), ["claim"]);
  assert.deepEqual(actions(panel("player", playingMatch({ scorer: { playerId: ME } }))), ["redo", "transfer", "release"]);
  assert.match(panel("player", playingMatch({ scorer: { playerId: ME } })), /disabled/, "redo disabled without a redo branch");
  assert.deepEqual(actions(panel("player", playingMatch({ scorer: { playerId: ME }, scorerRequest: { playerId: OTHER } }))), ["redo", "transfer", "release", "accept", "decline"]);
  assert.deepEqual(actions(panel("player", playingMatch({ scorer: { playerId: OTHER } }))), ["request", "claim"]);
  assert.deepEqual(actions(panel("player", playingMatch({ scorer: { playerId: OTHER }, scorerRequest: { playerId: ME } }))), ["claim"], "request already sent");
  assert.deepEqual(actions(panel("player", playingMatch({ scorer: { playerId: OTHER } }), false, true, "p-spectator")), [], "non-participants only see the status");
  assert.match(panel("player", playingMatch({ scorer: { playerId: OTHER } }), false, true, "p-spectator"), /scorer\.current:p-other/);
  assert.deepEqual(actions(panel("admin", playingMatch({ scorer: { playerId: OTHER } }), true, false)), ["admin-assign"]);
});

test("a player's point claims the scorer role locally, and a new point drops the redo branch", () => {
  const { window } = load("score-actions.js");
  const queued = [];
  const state = { selectedPlayerId: ME, settings: {} };
  const deps = {
    captureMatchUndoState: () => ({ snapshot: true }),
    currentLocalRole: () => "player",
    finishMatch: () => {},
    flashMatchCards: () => {},
    getState: () => state,
    isSupabaseReady: () => true,
    matchIncludesPlayer: () => true,
    queuePlayerScore: (matchId, teamIndex) => queued.push([matchId, teamIndex]),
    queueRemoteSetResult: () => {},
    render: () => {},
    renderLargeScore: () => {},
    saveState: () => {},
    scoring: load("scoring-engine.js").PadelstarScoring,
    showToast: () => {},
    t: (key) => key,
  };
  const { awardTennisPoint } = window.PadelstarScoreActions.create(deps);
  const match = playingMatch({ redoStack: [{ x: 1 }] });
  awardTennisPoint(match, 0);
  assert.equal(match.scorer.playerId, ME);
  assert.equal(match.redoStack.length, 0);
  assert.equal(match.currentGame.teamOne, 1);
  assert.deepEqual(queued, [["m1", 0]]);

  const foreign = playingMatch({ scorer: { playerId: OTHER } });
  awardTennisPoint(foreign, 0);
  assert.equal(foreign.currentGame.teamOne, 0, "a non-scorer's tap changes nothing");
  assert.equal(queued.length, 1);
});
