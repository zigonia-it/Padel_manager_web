const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
function load(file, extra = {}) {
  const context = { console, structuredClone, setInterval: () => 1, clearInterval: () => {}, ...extra };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "app", file), "utf8"), context, { filename: file });
  return context;
}

const ANN = "p-ann";
const BOB = "p-bob";
const CAT = "p-cat";
const DAN = "p-dan";
const team = (...ids) => ({ displayName: ids.join(" & "), players: ids.map((id) => ({ id, name: id })) });
const blocked = (extra = {}) => ({
  id: "m1", state: "awaitingWithdrawalDecision", status: "blocked", teamOne: team(ANN, BOB), teamTwo: team(CAT, DAN),
  currentGame: { teamOne: 0, teamTwo: 0 }, currentSet: { teamOne: 0, teamTwo: 0 }, completedSets: [],
  withdrawal: { playerId: ANN, teamIndex: 0, teammateId: BOB, absent: { id: ANN, name: "Ann" }, absentIndex: 0, status: "pending" },
  ...extra,
});

function cardApi(role, selectedPlayerId) {
  const { window } = load("match-card.js");
  return window.PadelstarMatchCard.create({
    currentLocalRole: () => role,
    escapeAttribute: (v) => String(v),
    escapeHtml: (v) => String(v),
    getState: () => ({ selectedPlayerId, settings: { setsToWinMatch: 1 } }),
    matchIncludesPlayer: (match, id) => [...match.teamOne.players, ...match.teamTwo.players].some((p) => p.id === id),
    setsWonByTeam: () => 0,
    teamAccentStyle: () => "",
    tennisPointLabel: (v) => String(v),
    translate: (key, values = {}) => `${key}${Object.keys(values).length ? `:${Object.values(values).join("/")}` : ""}`,
  });
}
const decisions = (html) => [...html.matchAll(/data-withdrawal-decision="(\w+)"/g)].map((m) => m[1]);

test("the remaining teammate is offered both choices", () => {
  const html = cardApi("player", BOB).withdrawalPanelMarkup(blocked(), true, true);
  assert.deepEqual(decisions(html), ["playAlone", "walkover"]);
  assert.match(html, /withdrawal\.notice:Ann\/p-bob/, "names the absent player and the teammate");
  assert.doesNotMatch(html, /withdrawal\.adminHint/);
});

test("the admin can decide for the teammate, and is told so", () => {
  const html = cardApi("admin", null).withdrawalPanelMarkup(blocked(), true, false);
  assert.deepEqual(decisions(html), ["playAlone", "walkover"]);
  assert.match(html, /withdrawal\.adminHint:p-bob/);
});

test("opponents and other players only see who is deciding", () => {
  for (const [role, id, editable, scoreOnly] of [["player", CAT, true, true], ["player", DAN, true, true], ["player", ANN, true, true], ["admin", null, true, true], ["spectator", null, false, false]]) {
    const html = cardApi(role, id).withdrawalPanelMarkup(blocked(), editable, scoreOnly);
    assert.deepEqual(decisions(html), [], `${role} ${id} cannot decide`);
    assert.match(html, /withdrawal\.waitingFor:p-bob/);
  }
});

test("no panel unless the match is waiting for a decision", () => {
  const api = cardApi("player", BOB);
  assert.equal(api.withdrawalPanelMarkup(blocked({ state: "waiting" }), true, true), "");
  assert.equal(api.withdrawalPanelMarkup(blocked({ withdrawal: { ...blocked().withdrawal, status: "walkover" } }), true, true), "");
  assert.equal(api.withdrawalPanelMarkup({ ...blocked(), withdrawal: undefined }, true, true), "");
});

test("the decision buttons call the injected decision handler with the match and choice", async () => {
  const calls = [];
  const { window } = load("match-card.js");
  const api = window.PadelstarMatchCard.create({
    currentLocalRole: () => "player", escapeAttribute: String, escapeHtml: String, getState: () => ({ selectedPlayerId: BOB, settings: {} }),
    matchIncludesPlayer: () => true, setsWonByTeam: () => 0, teamAccentStyle: () => "", tennisPointLabel: String, translate: (key) => key,
    withdrawalDecision: (match, decision) => { calls.push([match.id, decision]); return Promise.resolve(true); },
  });
  const buttons = ["playAlone", "walkover"].map((decision) => ({ dataset: { withdrawalDecision: decision }, disabled: false, listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } }));
  api.bindWithdrawalPanel({ querySelectorAll: () => buttons }, blocked());
  buttons[1].listeners.click();
  await Promise.resolve();
  assert.deepEqual(calls, [["m1", "walkover"]]);
});

test("the teammate's decision is sent to match_withdrawal_decision with their own token", async () => {
  const seen = [];
  const { window } = load("remote-player-score.js");
  const state = { id: "t1", inviteCode: "ABCD2345", selectedPlayerId: BOB, playerToken: "b".repeat(48) };
  const toasts = [];
  const applied = [];
  const build = (rpcResult) => window.PadelstarRemotePlayerScore.create({
    applyRemoteState: (next) => applied.push(next), getPendingScores: () => [], getState: () => state, getSupabaseClient: () => ({}), isOnline: () => true, isSupabaseReady: () => true,
    remoteRpc: async (client, name, args) => { seen.push([name, args]); return rpcResult; }, showToast: (message) => toasts.push(message), t: (key) => key,
    persistSyncMetadata: () => {}, refreshRemoteState: () => {}, addPendingScore: () => {},
  });
  assert.equal(await build({ data: { revision: 5 }, error: null }).withdrawalDecision("m1", "playAlone"), true);
  assert.equal(seen[0][0], "match_withdrawal_decision");
  assert.deepEqual({ ...seen[0][1] }, { p_tournament_id: "t1", p_invite_code: "ABCD2345", p_player_id: BOB, p_match_id: "m1", p_player_token: "b".repeat(48), p_decision: "playAlone" });
  assert.deepEqual(applied, [{ revision: 5 }]);
  assert.equal(await build({ data: null, error: { message: "Only the remaining teammate can decide" } }).withdrawalDecision("m1", "walkover"), false);
  assert.equal(toasts.at(-1), "withdrawal.error.notTeammate");
  assert.equal(await build({ data: null, error: { message: "The match is not waiting for a withdrawal decision" } }).withdrawalDecision("m1", "walkover"), false);
  assert.equal(toasts.at(-1), "withdrawal.error.outOfDate");
});

test("a blocked match is listed under its own heading and counts as active", () => {
  const { window } = load("match-list.js");
  const list = window.PadelstarMatchList.create({ appendEmptyText: () => {}, document: null, t: (key) => key });
  assert.deepEqual(list.filterMatches([blocked(), { id: "x", state: "waiting" }], "active").map((m) => m.id), ["m1"]);
});

test("the new module and its texts are wired in and translated", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
  assert.match(html, /app\/player-withdrawal\.js\?v=padelstar-player-withdrawal-\d+/);
  assert.match(sw, /app\/player-withdrawal\.js\?v=padelstar-player-withdrawal-\d+/);
  const i18n = load("translations.js");
  const sources = ["match-card.js", "player-list.js", "player-state.js", "player-next-match.js", "remote-player-score.js", "player-withdrawal.js"]
    .map((file) => fs.readFileSync(path.join(root, "app", file), "utf8")).join("\n");
  const keys = new Set([...sources.matchAll(/t\("((?:withdrawal|players\.withdrawn|actions\.(?:withdraw|reinstate)|messages\.(?:withdraw|reinstate|playerWithdrawn|playerReinstated))[\w.]*)"/g)].map((m) => m[1]));
  ["outOfDate", "notTeammate", "failed"].forEach((name) => keys.add(`withdrawal.error.${name}`));
  ["Approval", "Ended", "Inactive"].forEach((name) => keys.add(`messages.withdrawBlocked${name}`));
  ["Running", "Replaced"].forEach((name) => keys.add(`messages.reinstateBlocked${name}`));
  keys.add("common.awaitingWithdrawal");
  assert.ok(keys.size > 15, "the keys were actually collected");
  for (const language of i18n.PadelstarI18n.productionLanguages().map((entry) => entry.code)) {
    const missing = [...keys].filter((key) => !Object.prototype.hasOwnProperty.call(i18n.PadelstarTranslations[language], key));
    assert.deepEqual(missing, [], `missing in ${language}`);
  }
});

test("the player list offers withdraw, put back and replace for a withdrawn player", () => {
  const source = fs.readFileSync(path.join(root, "app", "player-list.js"), "utf8");
  assert.match(source, /withdraw-player-button/);
  assert.match(source, /reinstate-player-button/);
  assert.match(source, /isWithdrawn/);
  assert.match(source, /lobbyLocked && \(isActive \|\| isWithdrawn\)/, "a withdrawn player can still be replaced");
});
