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
const MATE = "p-mate";
const OPP = "p-opp";
const team = (...ids) => ({ displayName: ids.join(" & "), players: ids.map((id) => ({ id, name: id })) });
const awaitingMatch = (approval = {}, extra = {}) => ({
  id: "m1", state: "awaitingApproval", teamOne: team(ME, MATE), teamTwo: team(OPP, "p-x"),
  currentGame: { teamOne: 0, teamTwo: 0 }, currentSet: { teamOne: 2, teamTwo: 0 }, completedSets: [{ teamOne: 2, teamTwo: 0 }],
  undoStack: [{ match: {} }], scorer: { playerId: ME },
  approval: { status: "draft", winnerTeamIndex: 0, completedSets: [{ teamOne: 6, teamTwo: 4 }], approvals: [], corrections: 0, autoApproveAt: "2026-09-19T12:30:00.000Z", ...approval },
  ...extra,
});

function cardApi(role, selectedPlayerId = ME, settings = { setsToWinMatch: 1 }) {
  const { window } = load("match-card.js");
  return window.PadelstarMatchCard.create({
    currentLocalRole: () => role,
    escapeAttribute: (v) => String(v),
    escapeHtml: (v) => String(v),
    getState: () => ({ selectedPlayerId, settings }),
    matchIncludesPlayer: (match, id) => [...match.teamOne.players, ...match.teamTwo.players].some((p) => p.id === id),
    setsWonByTeam: () => 0,
    teamAccentStyle: () => "",
    tennisPointLabel: (v) => String(v),
    translate: (key, values = {}) => `${key}${Object.keys(values).length ? `:${Object.values(values).join("/")}` : ""}`,
  });
}
const actions = (html) => [...html.matchAll(/data-approval-action="([\w-]+)"/g)].map((m) => m[1]);

test("the winning point of a player puts the match up for approval; the admin's finishes it", () => {
  const scoring = load("scoring-engine.js").PadelstarScoring;
  const build = (role) => {
    const calls = { approval: 0, finished: 0 };
    const deps = {
      captureMatchUndoState: () => ({}), currentLocalRole: () => role, enterApproval: () => { calls.approval += 1; }, finishMatch: () => { calls.finished += 1; },
      flashMatchCards: () => {}, getState: () => ({ selectedPlayerId: ME, settings: { gamesToWinSet: 1, setsToWinMatch: 1 } }), isSupabaseReady: () => true,
      matchIncludesPlayer: () => true, queuePlayerScore: () => {}, queueRemoteSetResult: () => {}, render: () => {}, renderLargeScore: () => {}, saveState: () => {},
      scoring, showToast: () => {}, t: (key) => key,
    };
    const { awardTennisPoint } = load("score-actions.js").PadelstarScoreActions.create(deps);
    const match = { id: "m1", state: "playing", teamOne: team(ME, MATE), teamTwo: team(OPP, "p-x"), currentGame: { teamOne: 3, teamTwo: 0 }, currentSet: { teamOne: 1, teamTwo: 0 }, completedSets: [], undoStack: [] };
    awardTennisPoint(match, 0);
    return calls;
  };
  assert.deepEqual({ ...build("player") }, { approval: 1, finished: 0 });
  assert.deepEqual({ ...build("admin") }, { approval: 0, finished: 1 });
});

test("approval panel: the scorer submits a draft, teammates wait", () => {
  assert.deepEqual(actions(cardApi("player", ME).approvalPanelMarkup(awaitingMatch(), true, true)), ["submit"]);
  const teammateView = cardApi("player", MATE).approvalPanelMarkup(awaitingMatch(), true, true);
  assert.deepEqual(actions(teammateView), []);
  assert.match(teammateView, /result\.waitingForScorer/);
});

test("approval panel: the opposing team can approve, mark as wrong or propose a correction", () => {
  const pending = awaitingMatch({ status: "pending", approvals: [{ playerId: ME, teamIndex: 0 }] });
  const html = cardApi("player", OPP).approvalPanelMarkup(pending, true, true);
  assert.deepEqual(actions(html), ["approve", "dispute", "correct"]);
  assert.match(html, /approval-correct-one/);
  assert.match(html, /result\.summary:p-opp & p-x|result\.summary:p-me & p-mate/);
  const bestOfThree = cardApi("player", OPP, { setsToWinMatch: 2 }).approvalPanelMarkup(pending, true, true);
  assert.deepEqual(actions(bestOfThree), ["approve", "dispute"], "corrections are single-set only");
});

test("approval panel: a team that already approved and flagged results have no player actions", () => {
  const approved = awaitingMatch({ status: "pending", approvals: [{ playerId: ME, teamIndex: 0 }, { playerId: OPP, teamIndex: 1 }] });
  assert.match(cardApi("player", OPP).approvalPanelMarkup(approved, true, true), /result\.yourTeamApproved/);
  const flagged = awaitingMatch({ status: "flagged", flag: "disputed" });
  const html = cardApi("player", OPP).approvalPanelMarkup(flagged, true, true);
  assert.deepEqual(actions(html), []);
  assert.match(html, /result\.waitingForAdmin/);
  assert.match(html, /approval-badge-flagged/);
});

test("approval panel: the admin can approve any awaiting result; other viewers only see the status", () => {
  const pending = awaitingMatch({ status: "pending", escalatedAt: "2026-09-19T12:10:00.000Z" });
  const admin = cardApi("admin", null).approvalPanelMarkup(pending, true, false);
  assert.deepEqual(actions(admin), ["admin-approve"]);
  assert.match(admin, /approval-badge-escalated/);
  const spectator = cardApi("player", "p-spectator").approvalPanelMarkup(pending, false, true);
  assert.deepEqual(actions(spectator), []);
  assert.equal(cardApi("player", ME).approvalPanelMarkup({ ...awaitingMatch(), state: "playing" }, true, true), "");
});

test("while a result waits, points are locked and undo is open only for a draft (players) or the admin", () => {
  const plus = (html) => (html.match(/scoreboard-point-plus[^>]*>/g) ?? []).map((tag) => !tag.includes("disabled"));
  const minus = (html) => (html.match(/scoreboard-point-minus[^>]*>/g) ?? []).map((tag) => !tag.includes("disabled"));
  const asPlayer = cardApi("player", ME).scoreboardTableMarkup;
  assert.deepEqual(plus(asPlayer(awaitingMatch(), true)), [false, false]);
  assert.deepEqual(minus(asPlayer(awaitingMatch(), true)), [true, true], "the scorer can still undo a draft");
  assert.deepEqual(minus(asPlayer(awaitingMatch({ status: "pending" }), true)), [false, false], "no undo after submission");
  assert.deepEqual(minus(cardApi("admin", null).scoreboardTableMarkup(awaitingMatch({ status: "pending" }), true)), [true, true], "the admin can undo to correct");
});

function resultDeps(rpc) {
  const calls = { toasts: [], rpcs: [], applied: [], refreshed: [] };
  const pending = [];
  const state = { id: "t1", inviteCode: "ABCD2345", selectedPlayerId: ME, playerToken: "a".repeat(48) };
  return {
    calls,
    deps: {
      addPendingScore: (s) => pending.push(s), applyRemoteState: (d) => calls.applied.push(d), getPendingScores: () => pending, getState: () => state,
      getSupabaseClient: () => ({}), handleRemoteError: () => {}, isOnline: () => true, isSupabaseReady: () => true, persistSyncMetadata: () => {},
      refreshRemoteState: (r) => calls.refreshed.push(r), removeFirstPendingScore: () => pending.shift(),
      remoteRpc: async (client, name, args) => { calls.rpcs.push({ name, args }); return rpc(name, args); },
      render: () => {}, showToast: (m) => calls.toasts.push(m), syncConnectionStatus: () => {}, t: (key) => key,
    },
  };
}

test("result actions call match_result_action with the player identity and payload", async () => {
  const { deps, calls } = resultDeps(() => ({ data: { revision: 3 } }));
  const api = load("remote-player-score.js").PadelstarRemotePlayerScore.create(deps);
  assert.equal(await api.resultAction("m1", "dispute", { completedSets: [{ teamOne: 0, teamTwo: 6 }] }), true);
  const { name, args } = calls.rpcs.at(-1);
  assert.equal(name, "match_result_action");
  assert.equal(args.p_action, "dispute");
  assert.equal(args.p_player_id, ME);
  assert.equal(args.p_payload.completedSets[0].teamTwo, 6);
  assert.equal(calls.applied.length, 1);
});

test("result action errors are explained and the shared state is refreshed", async () => {
  const cases = [
    ["Only the active scorer can submit the result", "result.notScorer"],
    ["Result is flagged for admin review", "result.flagged"],
    ["Invalid corrected result", "result.invalidCorrection"],
    ["Match is not awaiting approval", "result.outOfDate"],
    ["boom", "result.failed"],
  ];
  for (const [message, key] of cases) {
    const { deps, calls } = resultDeps(() => ({ error: { message } }));
    const api = load("remote-player-score.js").PadelstarRemotePlayerScore.create(deps);
    assert.equal(await api.resultAction("m1", "approve"), false);
    assert.deepEqual(calls.toasts, [key]);
    assert.deepEqual(calls.refreshed, ["result-action-failed"]);
  }
});

test("the match list shows a separate group for results awaiting approval", () => {
  const { window } = load("match-list.js");
  const fakeDocument = { createElement: () => ({ className: "", innerHTML: "", append() {} }) };
  const list = window.PadelstarMatchList.create({ appendEmptyText: () => {}, document: fakeDocument, t: (key) => key });
  const matches = [{ state: "playing" }, { state: "awaitingApproval" }, { state: "waiting" }, { state: "finished" }];
  assert.deepEqual(list.filterMatches(matches, "active").map((m) => m.state), ["playing", "awaitingApproval"]);
});
