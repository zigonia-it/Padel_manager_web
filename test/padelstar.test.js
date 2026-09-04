const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appRoot = path.join(__dirname, "..", "app");
const storageKeysPath = path.join(appRoot, "config", "storage-keys.js");
const supabaseConfigPath = path.join(appRoot, "config", "supabase-config.js");
const utilitiesPath = path.join(appRoot, "core", "utilities.js");
const domElementsPath = path.join(appRoot, "bootstrap", "dom-elements.js");
const appMetaPath = path.join(appRoot, "bootstrap", "app-meta.js");
const themePath = path.join(appRoot, "ui", "theme.js");
const translationsPath = path.join(appRoot, "translations.js");
const i18nUiPath = path.join(appRoot, "i18n-ui.js");
const storagePath = path.join(appRoot, "storage.js");
const renderingPath = path.join(appRoot, "rendering.js");
const remoteTournamentPath = path.join(appRoot, "remote-tournament.js");
const adminActionsPath = path.join(appRoot, "admin-actions.js");
const playerActionsPath = path.join(appRoot, "player-actions.js");
const avatarSystemPath = path.join(appRoot, "avatar-system.js");
const accentSystemPath = path.join(appRoot, "accent-system.js");
const uiFeedbackPath = path.join(appRoot, "ui-feedback.js");
const notificationSystemPath = path.join(appRoot, "notification-system.js");
const profileSessionPath = path.join(appRoot, "profile-session.js");
const profileHistoryPath = path.join(appRoot, "profile-history.js");
const courtSettingsPath = path.join(appRoot, "court-settings.js");
const setupFormsPath = path.join(appRoot, "setup-forms.js");
const tournamentQueriesPath = path.join(appRoot, "tournament-queries.js");
const tournamentSharingPath = path.join(appRoot, "tournament-sharing.js");
const resultSubmissionsPath = path.join(appRoot, "result-submissions.js");
const matchCardPath = path.join(appRoot, "match-card.js");
const backupFormatPath = path.join(appRoot, "backup-format.js");
const linkUtilsPath = path.join(appRoot, "link-utils.js");
const tournamentStatePath = path.join(appRoot, "tournament-state.js");
const stateBootstrapPath = path.join(appRoot, "state-bootstrap.js");
const moduleRoutingPath = path.join(appRoot, "module-routing.js");
const sessionPolicyPath = path.join(appRoot, "session-policy.js");
const tournamentEnginePath = path.join(appRoot, "tournament-engine.js");
const tournamentRoundsPath = path.join(appRoot, "tournament-rounds.js");
const playerVisualsPath = path.join(appRoot, "player-visuals.js");
const tournamentRuntimePath = path.join(appRoot, "tournament-runtime.js");
const workspaceOverviewPath = path.join(appRoot, "workspace-overview.js");
const matchListPath = path.join(appRoot, "match-list.js");
const standingsPath = path.join(appRoot, "standings.js");
const playerListPath = path.join(appRoot, "player-list.js");
const cupBracketPath = path.join(appRoot, "cup-bracket.js");
const playerStatusPath = path.join(appRoot, "player-status.js");
const playerNextMatchPath = path.join(appRoot, "player-next-match.js");
const rulesPath = path.join(appRoot, "rules.js");
const playerControlsPath = path.join(appRoot, "player-controls.js");
const largeScorePath = path.join(appRoot, "large-score.js");
const setScoreDialogPath = path.join(appRoot, "set-score-dialog.js");
const adminStatusPath = path.join(appRoot, "admin-status.js");
const profileUiPath = path.join(appRoot, "profile-ui.js");
const backupUiPath = path.join(appRoot, "backup-ui.js");
const playerStatePath = path.join(appRoot, "player-state.js");
const tournamentStatusPath = path.join(appRoot, "tournament-status.js");
const scoringEnginePath = path.join(appRoot, "scoring-engine.js");
const stateManagerPath = path.join(appRoot, "state-manager.js");
const realtimeSyncPath = path.join(appRoot, "realtime-sync.js");
const offlineStoragePath = path.join(appRoot, "offline-storage.js");
const persistencePath = path.join(appRoot, "persistence.js");
const adminIdentityPath = path.join(appRoot, "admin-identity.js");
const remoteFeedbackPath = path.join(appRoot, "remote-feedback.js");
const realtimeConnectionPath = path.join(appRoot, "realtime-connection.js");
const remoteStateWritePath = path.join(appRoot, "remote-state-write.js");
const remoteAdminActionsPath = path.join(appRoot, "remote-admin-actions.js");
const remotePlayerScorePath = path.join(appRoot, "remote-player-score.js");
const scoreActionsPath = path.join(appRoot, "score-actions.js");
const workspaceNavigationPath = path.join(appRoot, "workspace-navigation.js");
const appEventsPath = path.join(appRoot, "app-events.js");
const matchActionsPath = path.join(appRoot, "match-actions.js");
const initialViewPath = path.join(appRoot, "initial-view.js");
const appPath = path.join(appRoot, "app.js");
const indexPath = path.join(__dirname, "..", "index.html");

function collectTranslationKeys() {
  const htmlSource = fs.readFileSync(indexPath, "utf8");
  const appSource = fs.readFileSync(appPath, "utf8");
  const keys = new Set();
  const htmlKeyPatterns = [
    /data-i18n="([^"]+)"/g,
    /data-i18n-aria-label="([^"]+)"/g,
    /data-i18n-placeholder="([^"]+)"/g,
    /data-i18n-alt="([^"]+)"/g,
    /data-i18n-content="([^"]+)"/g,
  ];

  htmlKeyPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(htmlSource))) keys.add(match[1]);
  });

  const translateCallPattern = /(?:^|[^\w.])t\("([^"]+)"/g;
  let match;
  while ((match = translateCallPattern.exec(appSource))) keys.add(match[1]);

  return [...keys].sort();
}

function loadPadelstar(options = {}) {
  const storage = new Map(Object.entries(options.initialStorage ?? {}));
  let uuidCounter = 0;
  const localStorage = {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  const window = {
    PADELSTAR_TEST_MODE: true,
    PADELSTAR_SUPABASE: null,
    PADEL_MANAGER_SUPABASE: null,
    addEventListener() {},
    clearTimeout() {},
    setTimeout() {},
    location: { hostname: "localhost", origin: "http://localhost:8080", href: "http://localhost:8080/?spectate=TEST1", search: "" },
    history: { replaceState() {} },
  };
  const document = {
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ classList: { add() {}, toggle() {} }, append() {}, setAttribute() {} }),
    body: { classList: { toggle() {}, contains: () => false } },
    documentElement: { lang: "" },
    addEventListener() {},
  };
  const context = vm.createContext({
    Blob,
    FormData,
    URL,
    URLSearchParams,
    console,
    crypto: { randomUUID: () => `id-${++uuidCounter}` },
    document,
    Element: function Element() {},
    localStorage,
    navigator: { onLine: true },
    requestAnimationFrame: (callback) => callback(),
    structuredClone,
    window,
  });

  vm.runInContext(fs.readFileSync(translationsPath, "utf8"), context, { filename: translationsPath });
  vm.runInContext(fs.readFileSync(i18nUiPath, "utf8"), context, { filename: i18nUiPath });
  vm.runInContext(fs.readFileSync(storageKeysPath, "utf8"), context, { filename: storageKeysPath });
  vm.runInContext(fs.readFileSync(supabaseConfigPath, "utf8"), context, { filename: supabaseConfigPath });
  vm.runInContext(fs.readFileSync(utilitiesPath, "utf8"), context, { filename: utilitiesPath });
  vm.runInContext(fs.readFileSync(domElementsPath, "utf8"), context, { filename: domElementsPath });
  vm.runInContext(fs.readFileSync(appMetaPath, "utf8"), context, { filename: appMetaPath });
  vm.runInContext(fs.readFileSync(themePath, "utf8"), context, { filename: themePath });
  vm.runInContext(fs.readFileSync(storagePath, "utf8"), context, { filename: storagePath });
  vm.runInContext(fs.readFileSync(renderingPath, "utf8"), context, { filename: renderingPath });
  vm.runInContext(fs.readFileSync(remoteTournamentPath, "utf8"), context, { filename: remoteTournamentPath });
  vm.runInContext(fs.readFileSync(adminActionsPath, "utf8"), context, { filename: adminActionsPath });
  vm.runInContext(fs.readFileSync(playerActionsPath, "utf8"), context, { filename: playerActionsPath });
  vm.runInContext(fs.readFileSync(avatarSystemPath, "utf8"), context, { filename: avatarSystemPath });
  vm.runInContext(fs.readFileSync(accentSystemPath, "utf8"), context, { filename: accentSystemPath });
  vm.runInContext(fs.readFileSync(uiFeedbackPath, "utf8"), context, { filename: uiFeedbackPath });
  vm.runInContext(fs.readFileSync(notificationSystemPath, "utf8"), context, { filename: notificationSystemPath });
  vm.runInContext(fs.readFileSync(profileSessionPath, "utf8"), context, { filename: profileSessionPath });
  vm.runInContext(fs.readFileSync(profileHistoryPath, "utf8"), context, { filename: profileHistoryPath });
  vm.runInContext(fs.readFileSync(courtSettingsPath, "utf8"), context, { filename: courtSettingsPath });
  vm.runInContext(fs.readFileSync(setupFormsPath, "utf8"), context, { filename: setupFormsPath });
  vm.runInContext(fs.readFileSync(tournamentQueriesPath, "utf8"), context, { filename: tournamentQueriesPath });
  vm.runInContext(fs.readFileSync(tournamentSharingPath, "utf8"), context, { filename: tournamentSharingPath });
  vm.runInContext(fs.readFileSync(resultSubmissionsPath, "utf8"), context, { filename: resultSubmissionsPath });
  vm.runInContext(fs.readFileSync(matchCardPath, "utf8"), context, { filename: matchCardPath });
  vm.runInContext(fs.readFileSync(backupFormatPath, "utf8"), context, { filename: backupFormatPath });
  vm.runInContext(fs.readFileSync(linkUtilsPath, "utf8"), context, { filename: linkUtilsPath });
  vm.runInContext(fs.readFileSync(tournamentStatePath, "utf8"), context, { filename: tournamentStatePath });
  vm.runInContext(fs.readFileSync(stateBootstrapPath, "utf8"), context, { filename: stateBootstrapPath });
  vm.runInContext(fs.readFileSync(moduleRoutingPath, "utf8"), context, { filename: moduleRoutingPath });
  vm.runInContext(fs.readFileSync(sessionPolicyPath, "utf8"), context, { filename: sessionPolicyPath });
  vm.runInContext(fs.readFileSync(tournamentEnginePath, "utf8"), context, { filename: tournamentEnginePath });
  vm.runInContext(fs.readFileSync(tournamentRoundsPath, "utf8"), context, { filename: tournamentRoundsPath });
  vm.runInContext(fs.readFileSync(playerVisualsPath, "utf8"), context, { filename: playerVisualsPath });
  vm.runInContext(fs.readFileSync(tournamentRuntimePath, "utf8"), context, { filename: tournamentRuntimePath });
  vm.runInContext(fs.readFileSync(workspaceOverviewPath, "utf8"), context, { filename: workspaceOverviewPath });
  vm.runInContext(fs.readFileSync(matchListPath, "utf8"), context, { filename: matchListPath });
  vm.runInContext(fs.readFileSync(standingsPath, "utf8"), context, { filename: standingsPath });
  vm.runInContext(fs.readFileSync(playerListPath, "utf8"), context, { filename: playerListPath });
  vm.runInContext(fs.readFileSync(cupBracketPath, "utf8"), context, { filename: cupBracketPath });
  vm.runInContext(fs.readFileSync(playerStatusPath, "utf8"), context, { filename: playerStatusPath });
  vm.runInContext(fs.readFileSync(playerNextMatchPath, "utf8"), context, { filename: playerNextMatchPath });
  vm.runInContext(fs.readFileSync(rulesPath, "utf8"), context, { filename: rulesPath });
  vm.runInContext(fs.readFileSync(playerControlsPath, "utf8"), context, { filename: playerControlsPath });
  vm.runInContext(fs.readFileSync(largeScorePath, "utf8"), context, { filename: largeScorePath });
  vm.runInContext(fs.readFileSync(setScoreDialogPath, "utf8"), context, { filename: setScoreDialogPath });
  vm.runInContext(fs.readFileSync(adminStatusPath, "utf8"), context, { filename: adminStatusPath });
  vm.runInContext(fs.readFileSync(profileUiPath, "utf8"), context, { filename: profileUiPath });
  vm.runInContext(fs.readFileSync(backupUiPath, "utf8"), context, { filename: backupUiPath });
  vm.runInContext(fs.readFileSync(playerStatePath, "utf8"), context, { filename: playerStatePath });
  vm.runInContext(fs.readFileSync(tournamentStatusPath, "utf8"), context, { filename: tournamentStatusPath });
  vm.runInContext(fs.readFileSync(scoringEnginePath, "utf8"), context, { filename: scoringEnginePath });
  vm.runInContext(fs.readFileSync(stateManagerPath, "utf8"), context, { filename: stateManagerPath });
  vm.runInContext(fs.readFileSync(realtimeSyncPath, "utf8"), context, { filename: realtimeSyncPath });
  vm.runInContext(fs.readFileSync(offlineStoragePath, "utf8"), context, { filename: offlineStoragePath });
  vm.runInContext(fs.readFileSync(persistencePath, "utf8"), context, { filename: persistencePath });
  vm.runInContext(fs.readFileSync(adminIdentityPath, "utf8"), context, { filename: adminIdentityPath });
  vm.runInContext(fs.readFileSync(remoteFeedbackPath, "utf8"), context, { filename: remoteFeedbackPath });
  vm.runInContext(fs.readFileSync(realtimeConnectionPath, "utf8"), context, { filename: realtimeConnectionPath });
  vm.runInContext(fs.readFileSync(remoteStateWritePath, "utf8"), context, { filename: remoteStateWritePath });
  vm.runInContext(fs.readFileSync(remoteAdminActionsPath, "utf8"), context, { filename: remoteAdminActionsPath });
  vm.runInContext(fs.readFileSync(remotePlayerScorePath, "utf8"), context, { filename: remotePlayerScorePath });
  vm.runInContext(fs.readFileSync(scoreActionsPath, "utf8"), context, { filename: scoreActionsPath });
  vm.runInContext(fs.readFileSync(workspaceNavigationPath, "utf8"), context, { filename: workspaceNavigationPath });
  vm.runInContext(fs.readFileSync(matchActionsPath, "utf8"), context, { filename: matchActionsPath });
  vm.runInContext(fs.readFileSync(initialViewPath, "utf8"), context, { filename: initialViewPath });
  vm.runInContext(fs.readFileSync(appPath, "utf8"), context, { filename: appPath });
  return Object.assign(window.PadelstarTest, {
    storageKeys: window.PadelstarStorageKeys,
    supabaseConfig: window.PadelstarSupabaseConfig,
    utilities: window.PadelstarUtilities,
    domElements: window.PadelstarDomElements,
    appMeta: window.PadelstarAppMeta,
    theme: window.PadelstarTheme,
    engine: window.PadelstarTournamentEngine,
    scoring: window.PadelstarScoring,
    stateManager: window.PadelstarState,
    storage: window.PadelstarStorage,
    realtime: window.PadelstarRealtime,
    offlineStorage: window.PadelstarOfflineStorage,
    persistence: window.PadelstarPersistence,
    links: window.PadelstarLinks,
    initialView: window.PadelstarInitialView,
    localStorage,
  });
}

function namesForTeam(team) {
  return team.players.map((player) => player.name);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeTournament(api, playerNames, options = {}) {
  const tournament = api.createTournament({
    name: options.name ?? "Testcup",
    inviteCode: options.inviteCode ?? "TEST1",
    players: playerNames,
    courtCount: options.courtCount ?? 1,
  });
  return api.setState({
    ...tournament,
    settings: {
      ...tournament.settings,
      ...(options.settings ?? {}),
    },
  });
}

test("round-robin singles schedules every pair once for three players", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo", "Cy"]);

  state.schedule = api.buildSchedule(state.players, "singles");

  assert.equal(state.schedule.length, 3);
  assert.deepEqual(
    plain(state.schedule.map((round) => round.teams.map(namesForTeam))),
    [
      [["Ada"], ["Bo"]],
      [["Ada"], ["Cy"]],
      [["Bo"], ["Cy"]],
    ],
  );
});

test("tournament engine can schedule matches without app.js state", () => {
  const api = loadPadelstar();
  const players = ["Ada", "Bo", "Cy", "Di"].map((name, index) => ({
    id: `player-${index}`,
    name,
    accent: "gold",
    active: true,
  }));

  const schedule = api.engine.buildSchedule(players, "roundRobin");
  const matches = api.engine.generateRoundMatches(schedule[0].teams, 7, [], "tournament-1");

  assert.equal(schedule.length, 3);
  assert.deepEqual(plain(schedule[0].teams.map(namesForTeam)), [["Ada", "Di"], ["Bo", "Cy"]]);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].tournamentId, "tournament-1");
  assert.equal(matches[0].rotationNumber, 7);
  assert.equal(matches[0].state, "waiting");
});

test("doubles rotation keeps one fixed participant and records sit-out with odd players", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo", "Cy", "Di", "Eli"]);

  state.schedule = api.buildSchedule(state.players, "roundRobin");

  assert.equal(state.schedule.length, 5);
  assert.equal(state.schedule.every((round) => round.teams.length === 2), true);
  assert.equal(state.schedule.every((round) => round.sittingOut.length === 1), true);
  assert.deepEqual(
    plain(state.schedule.flatMap((round) => round.sittingOut.map((player) => player.name))),
    ["Ada", "Di", "Bo", "Eli", "Cy"],
  );
});

test("away players stay in state but are excluded from future schedules", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo", "Cy", "Di"]);
  state.players[0].availability = "away";

  state.schedule = api.buildSchedule(state.players, "roundRobin");

  assert.equal(state.players[0].active, true);
  assert.equal(state.players[0].availability, "away");
  assert.equal(state.schedule.every((round) => round.teams.flatMap((team) => team.players).every((player) => player.id !== state.players[0].id)), true);
});

test("generating a round assigns only available courts to live matches", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo", "Cy", "Di", "Eli", "Fia"], { courtCount: 1 });

  api.generateFullTournamentSchedule();

  assert.equal(state.rounds.length, 5);
  assert.equal(state.rounds[0].status, "active");
  assert.equal(state.rounds[0].matches.length, 3);
  assert.equal(state.rounds[0].matches[0].state, "playing");
  assert.equal(state.rounds[0].matches.filter((match) => match.state === "playing").length, 1);
  assert.equal(state.rounds[0].matches.filter((match) => match.state === "waiting").length, 2);
  assert.equal(state.currentRound, 1);
});

test("cup start creates byes and pending final slots for an odd bracket", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo", "Cy", "Di", "Eli", "Fia"], {
    settings: { format: "cup", includesThirdPlaceMatch: true },
  });

  api.generateCupTournament();

  assert.equal(state.cup.bracketSize, 4);
  assert.equal(state.cup.byeTeams.length, 1);
  assert.equal(state.rounds[0].matches.length, 1);
  assert.equal(state.cup.bracket.rounds.length, 2);
  assert.equal(state.cup.bracket.rounds[1].slots.length, 1);
  assert.deepEqual(plain(state.cup.bracket.rounds[1].slots[0]), { type: "pending" });
  assert.deepEqual(plain(state.cup.bracket.rounds[1].thirdPlaceSlot), { type: "pending" });
});

test("completed cup semifinal advances winners and creates a third-place match", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo", "Cy", "Di", "Eli", "Fia", "Gia", "Han"], {
    settings: { format: "cup", includesThirdPlaceMatch: true },
  });

  api.generateCupTournament();
  state.rounds[0].matches.forEach((match) => api.saveSetResult(match, 6, 4));
  state.rounds[0].status = "finished";
  const nextRound = api.createNextCupRound();

  assert.equal(nextRound.roundNumber, 2);
  assert.equal(nextRound.matches.length, 2);
  assert.equal(nextRound.matches.some((match) => match.isThirdPlaceMatch), true);
  assert.equal(state.cup.bracket.finalMatchId, nextRound.matches.find((match) => !match.isThirdPlaceMatch).id);
  assert.equal(state.cup.bracket.thirdPlaceMatchId, nextRound.matches.find((match) => match.isThirdPlaceMatch).id);
});

test("tennis scoring moves through deuce, advantage, game, set and match", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo"], { settings: { gamesToWinSet: 1, setsToWinMatch: 1 } });
  api.generateFullTournamentSchedule();
  const [match] = state.rounds[0].matches;

  [0, 0, 0, 1, 1, 1].forEach((team) => api.awardTennisPoint(match, team));
  assert.deepEqual(plain(match.currentGame), { teamOne: 3, teamTwo: 3 });

  api.awardTennisPoint(match, 0);
  assert.deepEqual(plain(match.currentGame), { teamOne: 4, teamTwo: 3 });

  api.awardTennisPoint(match, 1);
  assert.deepEqual(plain(match.currentGame), { teamOne: 3, teamTwo: 3 });

  api.awardTennisPoint(match, 0);
  api.awardTennisPoint(match, 0);

  assert.equal(match.state, "playing");
  assert.deepEqual(plain(match.completedSets), []);
  assert.deepEqual(plain(match.currentSet), { teamOne: 1, teamTwo: 0 });

  [0, 0, 0, 0].forEach((team) => api.awardTennisPoint(match, team));

  assert.equal(match.state, "finished");
  assert.equal(match.winnerTeamIndex, 0);
  assert.deepEqual(plain(match.completedSets), [{ teamOne: 2, teamTwo: 0 }]);
  assert.deepEqual(plain(match.currentGame), { teamOne: 0, teamTwo: 0 });
});

test("set validation accepts standard padel set shapes and rejects impossible scores", () => {
  const api = loadPadelstar();
  makeTournament(api, ["Ada", "Bo"]);

  assert.equal(api.validateSetScore(6, 4), "");
  assert.equal(api.validateSetScore(7, 6), "");
  assert.equal(api.validateSetScore(6, 6), "messages.invalidScoreDraw");
  assert.equal(api.validateSetScore(6, 5), "messages.invalidScoreShape");
  assert.equal(api.validateSetScore(-1, 6), "messages.invalidScoreNegative");
});

test("scoring engine calculates leaderboard without app.js state", () => {
  const api = loadPadelstar();
  const [ada, bo] = ["Ada", "Bo"].map((name, index) => ({
    id: `player-${index}`,
    name,
    active: true,
  }));
  const match = {
    teamOne: { players: [ada] },
    teamTwo: { players: [bo] },
    state: "finished",
    completedSets: [{ teamOne: 6, teamTwo: 4 }, { teamOne: 3, teamTwo: 6 }, { teamOne: 7, teamTwo: 5 }],
    currentSet: { teamOne: 0, teamTwo: 0 },
    winnerTeamIndex: 0,
  };

  const entries = api.scoring.leaderboardEntries([ada, bo], [match], "sets");

  assert.equal(api.scoring.validateSetScore(6, 5, { gamesToWinSet: 6 }), "messages.invalidScoreShape");
  assert.deepEqual(plain(api.scoring.pointsByPlayer([match], "matches")), { "player-0": 3 });
  assert.equal(entries[0].player.name, "Ada");
  assert.equal(entries[0].points, 2);
  assert.equal(entries[1].points, 1);
});

test("state manager handles sync metadata and remote errors without app.js state", () => {
  const api = loadPadelstar();
  api.localStorage.setItem("sync", JSON.stringify({
    admin: true,
    playerScores: [
      { matchId: "match-1", teamIndex: 0 },
      { matchId: "match-2", teamIndex: 3 },
      null,
    ],
  }));

  assert.equal(api.stateManager.loadPendingAdminSync(api.localStorage, "sync"), true);
  assert.deepEqual(
    plain(api.stateManager.loadPendingPlayerScores(api.localStorage, "sync")),
    [{ matchId: "match-1", teamIndex: 0 }],
  );
  assert.equal(api.stateManager.hasPendingRemoteWrites(false, []), false);
  assert.equal(api.stateManager.hasPendingRemoteWrites(false, [{ matchId: "match-1", teamIndex: 0 }]), true);

  api.stateManager.persistSyncMetadata(api.localStorage, "sync", false, []);
  assert.equal(api.localStorage.getItem("sync"), null);
  assert.equal(
    api.stateManager.remoteErrorMessage({ message: "Rate limit exceeded" }, "Fallback"),
    "For mange forespørsler akkurat nå. Vent litt og prøv igjen.",
  );
  assert.equal(api.stateManager.isConflictError({ message: "Tournament state changed" }), true);
  assert.equal(api.stateManager.isTransientRemoteError({ message: "fetch failed" }, true), true);

  const sharedState = api.stateManager.sanitizeSharedState({
    name: "Cup",
    adminToken: "secret-admin",
    playerToken: "secret-player",
    selectedPlayerId: "player-1",
  });
  assert.deepEqual(plain(sharedState), { name: "Cup" });
});

test("realtime sync helper owns channel names, backoff and retry status", () => {
  const api = loadPadelstar();

  assert.equal(api.realtime.channelName("tournament-1"), "tournament:tournament-1");
  assert.equal(api.realtime.backoffForAttempt(0), 1000);
  assert.equal(api.realtime.backoffForAttempt(99), 30000);
  assert.equal(api.realtime.connectionStateForAttempt(0), "connecting");
  assert.equal(api.realtime.connectionStateForAttempt(2), "reconnecting");
  assert.equal(api.realtime.isSubscribed("SUBSCRIBED"), true);
  assert.equal(api.realtime.shouldReconnect("CHANNEL_ERROR"), true);
  assert.equal(api.realtime.shouldReconnect("TIMED_OUT"), true);
  assert.equal(api.realtime.shouldReconnect("CLOSED"), true);
  assert.equal(api.realtime.shouldReconnect("SUBSCRIBED"), false);
});

test("offline storage module keeps localStorage as fallback without IndexedDB", async () => {
  const api = loadPadelstar();

  assert.equal(api.offlineStorage.databaseName, "padelstar-offline");
  assert.equal(api.offlineStorage.isSupported(), false);
  assert.equal(await api.offlineStorage.loadRecord("missing"), null);
  assert.deepEqual(plain(await api.offlineStorage.mirrorFromLocalStorage(["padelstar-demo"], api.localStorage)), [null]);
});

test("persistence module writes recovery state and delegates offline cleanup", async () => {
  const api = loadPadelstar();
  const mirrored = [];
  const removed = [];
  const persistence = api.persistence.create({
    storage: api.storage,
    localStorage: api.localStorage,
    offlineStorage: {
      isSupported: () => true,
      mirrorFromLocalStorage: async (keys) => { mirrored.push(keys); },
      removeRecord: async (key) => { removed.push(key); },
    },
  });
  const state = { id: "tournament-1", players: [], rounds: [] };

  persistence.writeTournamentState({
    state,
    stateKey: "current",
    recoveryKey: "recovery",
    isValidState: () => true,
  });
  persistence.removeKeys(["current", "recovery"]);
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(plain(JSON.parse(api.localStorage.getItem("current"))), state);
  assert.deepEqual(plain(JSON.parse(api.localStorage.getItem("recovery"))), state);
  assert.deepEqual(plain(mirrored), [["current", "recovery"]]);
  assert.deepEqual(removed, ["current", "recovery"]);
});

test("leaderboard ranks match winners by configured point mode", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo", "Cy", "Di"], { settings: { pointMode: "matches" } });
  api.generateFullTournamentSchedule();
  const [match] = state.rounds[0].matches;

  api.saveSetResult(match, 6, 4);

  const entries = api.leaderboardEntries([match]);
  assert.equal(entries[0].player.name, match.teamOne.players[0].name);
  assert.equal(entries[0].points, 3);
  assert.equal(entries[0].matchWins, 1);
  assert.equal(entries.at(-1).points, 0);
});

test("unsaved tournaments cannot open workspace-only modules", () => {
  const api = loadPadelstar();

  assert.equal(api.normalizeModule("admin"), "landing");
  assert.equal(api.normalizeModule("player"), "landing");
  assert.equal(api.normalizeModule("tournament"), "landing");
  assert.equal(api.normalizeModule("setup-admin"), "setup-admin");
  assert.equal(api.normalizeModule("setup-player"), "setup-player");
});

test("admin role can open admin module and falls back there without a player identity", () => {
  const api = loadPadelstar();
  makeTournament(api, ["Ada", "Bo"]);

  api.saveState({ remote: false });
  api.setLocalRole("admin");

  assert.equal(api.currentLocalRole(), "admin");
  assert.equal(api.isCurrentUserAdmin(), true);
  assert.equal(api.normalizeModule("admin"), "admin");
  assert.equal(api.normalizeModule("player"), "admin");
  assert.equal(api.normalizeModule("tournament"), "tournament");
});

test("player role cannot open admin module and falls back to player workspace", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo"]);
  state.selectedPlayerId = state.players[0].id;

  api.saveState({ remote: false });
  api.setLocalRole("player");

  assert.equal(api.currentLocalRole(), "player");
  assert.equal(api.isCurrentUserAdmin(), false);
  assert.equal(api.normalizeModule("admin"), "player");
  assert.equal(api.normalizeModule("player"), "player");
  assert.equal(api.normalizeModule("tournament"), "tournament");
});

test("player can leave local tournament session without mutating tournament data", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo", "Cy", "Di"]);
  api.generateFullTournamentSchedule();
  state.selectedPlayerId = state.players[0].id;
  state.playerToken = "local-player-token";

  api.saveState({ remote: false });
  api.setLocalRole("player");

  assert.equal(api.leaveCurrentTournament({ confirm: false }), true);

  assert.equal(state.selectedPlayerId, null);
  assert.equal(state.playerToken, null);
  assert.equal(api.currentLocalRole(), "spectator");
  assert.equal(api.localStorage.getItem("padelstar-demo"), null);
  assert.equal(api.localStorage.getItem("padelstar-demo-last-good"), null);
  assert.equal(api.localStorage.getItem("padelstar-role"), null);
  assert.equal(api.normalizeModule("player"), "landing");
});

test("admin player can leave player role without losing the tournament", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo"]);
  state.selectedPlayerId = state.players[0].id;

  api.saveState({ remote: false });
  api.setLocalRole("admin");

  assert.equal(api.leaveCurrentTournament({ confirm: false }), true);

  assert.equal(api.currentLocalRole(), "admin");
  assert.notEqual(api.localStorage.getItem("padelstar-demo"), null);
  assert.equal(api.normalizeModule("admin"), "admin");
});

test("spectator role can see tournament view but not admin or player modules", () => {
  const api = loadPadelstar();
  makeTournament(api, ["Ada", "Bo"]);

  api.saveState({ remote: false });
  api.setLocalRole("spectator");

  assert.equal(api.currentLocalRole(), "spectator");
  assert.equal(api.isCurrentUserAdmin(), false);
  assert.equal(api.normalizeModule("admin"), "tournament");
  assert.equal(api.normalizeModule("player"), "tournament");
  assert.equal(api.normalizeModule("tournament"), "tournament");
});

test("spectator can leave the viewing session without keeping a local tournament", () => {
  const api = loadPadelstar();
  makeTournament(api, ["Ada", "Bo"]);
  api.saveState({ remote: false });
  api.setLocalRole("spectator");

  api.leaveSpectatorView();

  assert.equal(api.localStorage.getItem("padelstar-demo"), null);
  assert.equal(api.localStorage.getItem("padelstar-demo-last-good"), null);
  assert.equal(api.localStorage.getItem("padelstar-role"), null);
  assert.equal(api.normalizeModule("tournament"), "landing");
});

test("invite matching requires a saved local tournament unless remote state was loaded", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo"], { inviteCode: "ABCD1" });

  assert.equal(api.hasTournamentForInvite(state.inviteCode), false);
  assert.equal(api.hasTournamentForInvite(state.inviteCode, true), true);

  api.saveState({ remote: false });

  assert.equal(api.hasTournamentForInvite(state.inviteCode), true);
  assert.equal(api.hasTournamentForInvite("WRONG"), false);
});

test("saved tournaments keep a last-known-good recovery copy", () => {
  const api = loadPadelstar();
  makeTournament(api, ["Ada", "Bo"], { name: "Recovery Cup" });

  api.saveState({ remote: false });
  const savedState = api.localStorage.getItem("padelstar-demo");

  assert.equal(api.localStorage.getItem("padelstar-demo-last-good"), savedState);

  const recoveredApi = loadPadelstar({
    initialStorage: {
      "padelstar-demo": "{broken-json",
      "padelstar-demo-last-good": savedState,
    },
  });

  assert.equal(recoveredApi.getState().name, "Recovery Cup");
  assert.equal(recoveredApi.getState().players.length, 2);
  assert.equal(recoveredApi.wasRecoveredFromLastGood(), true);
});

test("shared state removes local admin and player secrets", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo"]);
  state.selectedPlayerId = state.players[0].id;
  state.playerToken = "player-token";

  const sharedState = api.sanitizeSharedState(state);

  assert.equal(Object.hasOwn(sharedState, "adminToken"), false);
  assert.equal(Object.hasOwn(sharedState, "playerToken"), false);
  assert.equal(Object.hasOwn(sharedState, "selectedPlayerId"), false);
  assert.equal(sharedState.inviteCode, state.inviteCode);
  assert.equal(sharedState.players.length, 2);
});

test("translations are loaded from the shared dictionary with Bokmål fallback", () => {
  const api = loadPadelstar();
  const state = makeTournament(api, ["Ada", "Bo"], { settings: { language: "en" } });

  for (const [language, label] of Object.entries({ nb: "Profil", nn: "Profil", en: "Profile", es: "Perfil", de: "Profil", fr: "Profil", sv: "Profil", da: "Profil" })) {
    assert.equal(api.i18n.translate(language, "nav.account"), label);
  }
  assert.equal(api.t("startTournament"), "Start tournament");
  assert.equal(api.t("actions.leaveTournament"), "Leave tournament");
  assert.equal(api.t("refreshRemoteState"), "Load latest");
  assert.equal(api.i18n.translate("en", "score.pointsLabel", { team: "Elin & Håkon" }), "Points Elin & Håkon");
  assert.equal(
    api.i18n.translate("en", "score.courtForMatch", { teamOne: "Elin & Håkon", teamTwo: "Elisabeth & Tina" }),
    "Court for Elin & Håkon vs Elisabeth & Tina",
  );
  assert.equal(api.i18n.translate("en", "score.matchup", { teamOne: "Ruben & Magnus", teamTwo: "Karoline & Lars" }), "Ruben & Magnus vs Karoline & Lars");
  assert.equal(api.i18n.translate("en", "matches.restingPlayers", { players: "Sigurd" }), "Break: Sigurd");
  assert.equal(
    api.t("player.leaveConfirm", { name: "Ada", pendingScoreText: "" }),
    "Leave the tournament as Ada? The tournament and player list stay unchanged for everyone else.",
  );
  assert.equal(api.i18n.has("en", "status.connectionAria"), true);
  assert.equal(api.i18n.htmlLang("en"), "en");
  assert.equal(api.i18n.translate("sv", "queue.title"), "Bokö");
  assert.equal(api.i18n.translate("da", "queue.title"), "Bane kø");
  assert.equal(api.i18n.translate("es", "profile.avatar"), "Avatar");
  assert.equal(api.i18n.translate("de", "admin.sectionsAria"), "Admin sections");
  assert.equal(api.i18n.translate("fr", "admin.sectionsAria"), "Admin sections");
  assert.equal(api.i18n.normalizeLanguage("international-en"), "nb");
  assert.equal(
    JSON.stringify(api.i18n.supportedLanguages().map((language) => language.code)),
    JSON.stringify(["nb", "nn", "en", "es", "de", "fr", "sv", "da"]),
  );
  assert.equal(
    api.i18n.supportedLanguages().filter((language) => language.code === "en").length,
    1,
  );

  api.i18n.clearMissingKeys();
  assert.equal(api.t("missingTranslationKey"), "missingTranslationKey");
  assert.equal(JSON.stringify(api.i18n.missingKeys()), JSON.stringify(["en:missingTranslationKey"]));

  state.settings.language = "es";
  assert.equal(api.t("startTournament"), "Iniciar torneo");
  assert.equal(api.t("actions.leaveTournament"), "Salir del torneo");

  state.settings.language = "de";
  assert.equal(api.t("startNextRound"), "Nächste Runde starten");

  state.settings.language = "fr";
  assert.equal(api.t("finishTournament"), "Terminer le tournoi");

  state.settings.language = "unknown";
  assert.equal(api.t("finishTournament"), "Fullfør turnering");
  assert.equal(api.t("actions.leaveTournament"), "Forlat turnering");
});

test("spectator links use a dedicated read-only query parameter", () => {
  const api = loadPadelstar();
  makeTournament(api, ["Ada", "Bo"]);

  assert.match(api.createSpectatorLink(), /[?&]spectate=TEST1(?:&|$)/);
  assert.doesNotMatch(api.createSpectatorLink(), /[?&]join=/);
});

test("link utility keeps local join and spectator URLs isolated", () => {
  const api = loadPadelstar();
  const location = { hostname: "localhost", origin: "http://localhost:8080" };

  assert.equal(api.links.createJoinLink({ location, inviteCode: "TEST1" }), "http://localhost:8080/?join=TEST1");
  assert.equal(api.links.createSpectatorLink({ location, inviteCode: "TEST1" }), "http://localhost:8080/?spectate=TEST1");
  assert.match(api.links.createQrCodeUrl("http://localhost:8080/?join=TEST1"), /quickchart\.io\/qr\?/);
});

test("all visible app translation keys have Bokmål fallback text", () => {
  const api = loadPadelstar();
  const missingKeys = collectTranslationKeys().filter((key) => !api.i18n.has("nb", key));

  assert.deepEqual(missingKeys, []);
});

test("initial view boundary routes join URLs and saved sessions", () => {
  const { initialView } = loadPadelstar();
  const calls = [];
  const callbacks = {
    currentLocalRole: () => "player",
    hasSelectedPlayer: () => true,
    hasSupabaseClient: () => false,
    hasTournamentForInvite: () => false,
    isCurrentUserAdmin: () => false,
    loadRemoteTournamentByInvite: async () => false,
    render: () => calls.push("render"),
    setLocalRole: (role) => calls.push(`role:${role}`),
    setSpectatorMode: (value) => calls.push(`spectator:${value}`),
    setSpectatorPreviousRole: (role) => calls.push(`previous:${role}`),
    showModule: (moduleName) => calls.push(`module:${moduleName}`),
    showWorkspace: (view) => calls.push(`workspace:${view}`),
  };
  initialView.restore({
    windowRef: { location: { search: "?join=ABCD" } },
    storage: { getItem: () => null },
    keys: { storageKey: "state", spectatorQueryKey: "spectate" },
    callbacks,
  });
  assert.deepEqual(calls, ["module:setup-player"]);
});

test("initial visible fallback labels are translation-bound", () => {
  const htmlSource = fs.readFileSync(indexPath, "utf8");
  assert.match(htmlSource, /id="connectionStatus"[^>]*data-i18n="localPwa"/);
  assert.match(htmlSource, /id="resumeTitle"[^>]*data-i18n="resume\.continueTournament"/);
});
