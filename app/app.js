const legacyStorageKey = "padel-manager-demo";
const legacyRoleStorageKey = "padel-manager-role";
const storageKey = "padelstar-demo";
const roleStorageKey = "padelstar-role";
const languageStorageKey = "padelstar-language";
const profileStorageKey = "padelstar-profile";
const profileHistoryStorageKey = "padelstar-profile-history";
const tournamentHistoryStorageKey = "padelstar-tournament-history";
const notificationPreferenceKey = "padelstar-notifications";
const pushSubscriptionStorageKey = "padelstar-push-subscription";
const syncStorageKey = `${storageKey}-sync`;
const recoveryStorageKey = `${storageKey}-last-good`;
const tournamentLibraryStorageKey = "padelstar-tournament-library";
const linkUtils = window.PadelstarLinks;
const publicAppUrl = linkUtils.publicAppUrl;
const spectatorQueryKey = linkUtils.spectatorQueryKey;
const accentSystem = window.PadelstarAccentSystem;
const playerAccentPalette = accentSystem.palette;
const legacyAccentMap = accentSystem.legacyAccentMap;
const accents = accentSystem.accents;
const avatarSystem = window.PadelstarAvatarSystem;
const playerVisuals = window.PadelstarPlayerVisuals.create({
  avatarUrl: (player) => avatarSystem.url(player),
  accentStyle: (accent) => accentSystem.accentStyle(accent),
  escapeHtml: (value) => escapeHtml(value),
});
const defaultAvatarId = avatarSystem.defaultAvatarId;
const tournamentState = window.PadelstarTournamentState.create({
  accents,
  buildSchedule: (...args) => window.PadelstarTournamentEngine.buildSchedule(...args),
  defaultAvatarId,
  randomAvatarId: () => avatarSystem.randomId(),
  randomUUID: () => crypto.randomUUID(),
});
const tennisPointLabels = ["0", "15", "30", "40", "A"];
const i18n = window.PadelstarI18n;
const i18nUi = window.PadelstarI18nUi;
const storage = window.PadelstarStorage;
const rendering = window.PadelstarRendering.create({
  translate: (key, values) => t(key, values),
  globalMatchNumber: (match) => globalMatchNumber(match),
  setScoreText: (match) => setScoreText(match),
  scoreConflict: (match) => match.scoreStatus === "score_conflict" || window.PadelstarScoreSubmissions?.forMatch(state, match.id)?.status === "conflict",
  gameScoreText: (match) => gameScoreText(match),
  escapeHtml: (value) => escapeHtml(value),
});
const remoteTournament = window.PadelstarRemoteTournament.create({
  isReady: () => isSupabaseReady(),
  getState: () => state,
  call: (name, payload) => remoteRpc(supabaseClient, name, payload),
  getTournamentByInvite: (inviteCode) => getTournamentByInviteRpc(inviteCode),
  sanitizeSharedState: (nextState) => sanitizeSharedState(nextState),
  applyRemoteState: (nextState, options) => applyRemoteState(nextState, options),
  createPlayer: (name, index, avatarId) => createPlayer(name, index, avatarId),
  linkProfileToPlayer: (player) => linkProfileToPlayer(player),
  saveState: (options) => saveState(options),
  showToast: (message, statusClass) => showToast(message, statusClass),
  errorMessage: (error, fallback) => remoteErrorMessage(error, fallback),
  translate: (key, values) => t(key, values),
});
const adminActions = window.PadelstarAdminActions.create({
  getState: () => state,
  translate: (key, values) => t(key, values),
  showToast: (message, statusClass) => showToast(message, statusClass),
  buildSchedule: (players, format) => buildSchedule(players, format),
  createTeam: (players) => createTeam(players),
  findPlayerByName: (name) => findPlayerByName(name),
  saveState: (options) => saveState(options),
  render: () => render(),
  parseCourtNumbers: (value) => parseCourtNumbers(value),
  randomUUID: () => crypto.randomUUID(),
});
const playerActions = window.PadelstarPlayerActions.create({
  getState: () => state,
  getPlayerById: (id) => getPlayerById(id),
  requestConfirmation: (message) => requestConfirmation(message),
  translate: (key, values) => t(key, values),
  isSupabaseReady: () => isSupabaseReady(),
  remoteRpc: (client, name, payload) => remoteRpc(client, name, payload),
  getSupabaseClient: () => supabaseClient,
  applyRemoteState: (nextState, options) => applyRemoteState(nextState, options),
  handleRemoteError: (error, fallback) => handleRemoteError(error, fallback),
  saveState: (options) => saveState(options),
  isCurrentUserAdmin: () => isCurrentUserAdmin(),
  render: () => render(),
});
const tournamentEngine = window.PadelstarTournamentEngine;
const tournamentRounds = window.PadelstarTournamentRounds;
const tournamentRuntime = window.PadelstarTournamentRuntime.create({
  activateRound: (round) => activateRound(round),
  buildSchedule: (players, format) => buildSchedule(players, format),
  canCompleteRound: (round) => canCompleteRound(round),
  createTeam: (players) => createTeam(players),
  generateRoundMatches: (teams, rotationNumber, sittingOut) => generateRoundMatches(teams, rotationNumber, sittingOut),
  getActiveRound: () => getActiveRound(),
  getLocalStorage: () => localStorage,
  getState: () => state,
  matchPlayers: (match) => matchPlayers(match),
  rounds: tournamentRounds,
  recordEvent: (eventType, entityType, entityId, payload, inverse) => eventLog.record(eventType, entityType, entityId, payload, inverse),
  setsWonByTeam: (match, teamIndex) => setsWonByTeam(match, teamIndex),
  showToast: (message, statusClass) => showToast(message, statusClass),
  translate: (key, values) => t(key, values),
  uniquePlayers: (players) => uniquePlayers(players),
});
const scoring = window.PadelstarScoring;
const stateManager = window.PadelstarState;
const realtimeSync = window.PadelstarRealtime;
const offlineStorage = window.PadelstarOfflineStorage;
const persistence = window.PadelstarPersistence.create({ storage, localStorage, offlineStorage });
const profileManager = window.PadelstarProfiles;
const observability = window.PadelstarObservability;
const uiEffects = window.PadelstarUiEffects;
const remoteReadRpcNames = new Set(["get_tournament_by_code", "get_spectator_tournament_by_code", "get_player_profile_history"]);
const remoteRpc = (client, name, payload = {}) => {
  if (!remoteReadRpcNames.has(name)) markSyncAttempt();
  return window.PadelstarRemoteRpc.call(client, name, payload);
};
const remotePlayerResult = window.PadelstarRemotePlayerResult?.create({
  applyRemoteState: (nextState, options) => applyRemoteState(nextState, options),
  getState: () => state,
  getSupabaseClient: () => supabaseClient,
  isSupabaseReady: () => isSupabaseReady(),
  remoteRpc,
  showToast: (message, statusClass) => showToast(message, statusClass),
  translate: (key, values) => t(key, values),
});
let profile = null;

const defaultTournament = createTournament({
  name: "Padelstar-turnering",
  inviteCode: "P4K7D",
  players: [],
  courtCount: 1,
});

const hadStoredTournament = Boolean(localStorage.getItem(storageKey));
let recoveredFromLastGood = false;
migrateLegacyLocalStorage();

const stateBootstrap = window.PadelstarStateBootstrap.create({
  defaultState: defaultTournament,
  localStorage,
  migrateState: (nextState) => migrateState(nextState),
  parseJson: (serializedState) => storage.parseJson(serializedState),
  recoveryStorageKey,
  setRecoveredFromLastGood: (value) => { recoveredFromLastGood = value; },
  storageKey,
});
let state = stateBootstrap.loadState();
const tournamentLibrary = window.PadelstarTournamentLibrary?.create({
  storage,
  localStorage,
  migrateState: (nextState) => migrateState(nextState),
  storageKey: tournamentLibraryStorageKey,
}) ?? { get: () => null, list: () => [], remove: () => {}, upsert: () => {} };
if (hadStoredTournament) tournamentLibrary.upsert(state);
const eventLog = window.PadelstarTournamentEvents?.create({
  getActor: () => currentLocalRole(),
  getState: () => state,
  randomUUID: () => crypto.randomUUID(),
}) ?? { record() { return null; }, markUndone() { return null; }, recent() { return []; } };
const backupFormat = window.PadelstarBackupFormat.create({
  isValidState: (candidate) => isValidTournamentState(candidate),
  migrateState: (candidate) => migrateState(candidate),
  sanitizeState: (candidate) => sanitizeSharedState(candidate),
});
state.settings.language = loadUserLanguage(state.settings?.language ?? "nb");
let largeScoreMatchId = null;
let activeModule = "landing";
let spectatorMode = false;
let tvMode = false;
let spectatorPreviousRole = "spectator";
let localLeftPlayerId = null;
const sessionPolicy = window.PadelstarSessionPolicy.create({
  localStorage,
  mirrorStorageKeys: (keys) => persistence.mirrorKeys(keys),
  roleStorageKey,
  state: () => state,
  storageKey,
});
const moduleRouting = window.PadelstarModuleRouting.create({
  hasActiveTournament: () => hasActiveTournament(),
  isCurrentUserAdmin: () => isCurrentUserAdmin(),
  hasSelectedPlayer: () => Boolean(state.selectedPlayerId),
  getActiveModule: () => activeModule,
});
const remoteStateWrite = window.PadelstarRemoteStateWrite.create({
  applyRemoteState: (nextState, options) => applyRemoteState(nextState, options),
  getMutationSequence: () => remoteMutationSequence,
  getState: () => state,
  getSupabaseClient: () => supabaseClient,
  handleRemoteError: (error, fallback) => handleRemoteError(error, fallback),
  isConflictError: (error) => isConflictError(error),
  isOnline: () => navigator.onLine,
  isSupabaseReady: () => isSupabaseReady(),
  persistSyncMetadata: () => persistSyncMetadata(),
  remoteRpc,
  resetRemoteRetry: () => {
    remoteRetryAttempt = 0;
    window.clearTimeout(remoteRetryTimer);
    remoteRetryTimer = null;
  },
  saveLocalRevision: (revision) => {
    state.revision = revision;
    saveState({ remote: false });
  },
  sanitizeSharedState: (nextState) => sanitizeSharedState(nextState),
  setLastPersistedSequence: (sequence) => {
    lastRemotePersistedSequence = Math.max(lastRemotePersistedSequence, sequence);
  },
  setPendingAdminSync: (pending) => { pendingAdminSync = pending; },
  setRemoteConflict: () => markRemoteConflict(),
  syncConnectionStatus: () => syncConnectionStatus(),
  t: (key, values) => t(key, values),
});
const remoteAdminActions = window.PadelstarRemoteAdminActions.create({
  applyRemoteState: (nextState, options) => applyRemoteState(nextState, options),
  clearRemoteSaveTimer: () => {
    window.clearTimeout(remoteSaveTimer);
    remoteSaveTimer = null;
  },
  enqueueRemoteWrite: (operation) => {
    remoteWriteChain = remoteWriteChain.catch(() => {}).then(operation);
  },
  getLastPersistedSequence: () => lastRemotePersistedSequence,
  getMutationSequence: () => remoteMutationSequence,
  getState: () => state,
  getSupabaseClient: () => supabaseClient,
  handleRemoteError: (error, fallback) => handleRemoteError(error, fallback),
  isCurrentUserAdmin: () => isCurrentUserAdmin(),
  isOnline: () => navigator.onLine,
  isSupabaseReady: () => isSupabaseReady(),
  persistSyncMetadata: () => persistSyncMetadata(),
  recordEvent: (eventType, entityType, entityId, payload) => eventLog.record(eventType, entityType, entityId, payload),
  remoteRpc,
  saveLocalRevision: (revision) => {
    state.revision = revision;
    saveState({ remote: false });
  },
  saveRemoteState: () => saveRemoteState(),
  sendPushNotification: (kind, matchId) => sendPushNotification(kind, matchId),
  setLastPersistedSequence: (sequence) => {
    lastRemotePersistedSequence = Math.max(lastRemotePersistedSequence, sequence);
  },
  setPendingAdminSync: (pending) => { pendingAdminSync = pending; },
  setRemoteNotice: (message) => setRemoteNotice(message),
  syncConnectionStatus: () => syncConnectionStatus(),
  t: (key, values) => t(key, values),
});
const remotePlayerScore = window.PadelstarRemotePlayerScore.create({
  addPendingScore: (score) => pendingPlayerScores.push(score),
  applyRemoteState: (nextState, options) => applyRemoteState(nextState, options),
  getPendingScores: () => pendingPlayerScores,
  getState: () => state,
  getSupabaseClient: () => supabaseClient,
  handleRemoteError: (error, fallback) => handleRemoteError(error, fallback),
  isOnline: () => navigator.onLine,
  isSupabaseReady: () => isSupabaseReady(),
  persistSyncMetadata: () => persistSyncMetadata(),
  removeFirstPendingScore: () => { pendingPlayerScores.shift(); },
  remoteRpc,
  render: () => render(),
  syncConnectionStatus: () => syncConnectionStatus(),
  t: (key, values) => t(key, values),
});
const scoreActions = window.PadelstarScoreActions.create({
  captureMatchUndoState: (match) => captureMatchUndoState(match),
  currentLocalRole: () => currentLocalRole(),
  finishMatch: (match) => finishMatch(match),
  flashMatchCards: (matchId) => uiEffects?.flashMatchCards(matchId),
  getState: () => state,
  isSupabaseReady: () => isSupabaseReady(),
  matchIncludesPlayer: (match, playerId) => matchIncludesPlayer(match, playerId),
  queuePlayerScore: (matchId, teamIndex) => queuePlayerScore(matchId, teamIndex),
  queueRemoteSetResult: (match, teamOne, teamTwo) => queueRemoteSetResult(match, teamOne, teamTwo),
  render: () => render(),
  renderLargeScore: () => renderLargeScore(),
  resolveScoreSubmission: (matchId, teamOne, teamTwo) => window.PadelstarScoreSubmissions?.resolve(state, matchId, teamOne, teamTwo, "admin"),
  saveState: () => saveState(),
  scoring,
  showToast: (message, statusClass) => showToast(message, statusClass),
  t: (key, values) => t(key, values),
});
const workspaceNavigation = window.PadelstarWorkspaceNavigation.create({
  focusModuleHeading: (section) => uiEffects?.focusModuleHeading(section),
  getActiveModule: () => activeModule,
  getElements: () => elements,
  getSpectatorMode: () => spectatorMode,
  getState: () => state,
  hasActiveTournament: () => hasActiveTournament(),
  isCurrentUserAdmin: () => isCurrentUserAdmin(),
  isTestMode: () => Boolean(window.PADELSTAR_TEST_MODE),
  normalizeModule: (moduleName) => normalizeModule(moduleName),
  normalizeWorkspaceModule: (view) => normalizeWorkspaceModule(view),
  prefillJoinForm: (inviteCode) => prefillJoinForm(inviteCode),
  requestAnimationFrame: (callback) => requestAnimationFrame(callback),
  setActiveModule: (moduleName) => { activeModule = moduleName; },
  syncJoinPreview: () => syncJoinPreview(),
  t: (key, values) => t(key, values),
  workspaceModuleFromActiveModule: () => workspaceModuleFromActiveModule(),
});
const supabaseSettings = window.PADELSTAR_SUPABASE ?? window.PADEL_MANAGER_SUPABASE ?? {};
let supabaseClient = supabaseSettings.url && supabaseSettings.anonKey && window.supabase
  ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  : null;
let supabaseClientActivated = false;
let remoteSaveTimer = null;
let remoteRetryTimer = null;
let remoteRetryAttempt = 0;
let remoteWriteChain = Promise.resolve();
let lastRemotePersistedSequence = 0;
let isApplyingRemoteState = false;
let remoteMutationSequence = 0;
let remoteConflict = false;
let pendingAdminSync = loadPendingAdminSync();
let pendingPlayerScores = loadPendingPlayerScores();
const initialSyncMetadata = readSyncMetadata();
let syncLastAttemptAt = initialSyncMetadata.lastAttemptAt ?? null;
let syncLastError = initialSyncMetadata.lastError ?? null;
if (pendingAdminSync) remoteMutationSequence = 1;
mirrorOfflineStorage();

const elements = {
  startView: document.querySelector("#startView"),
  setupAdminView: document.querySelector("#setupAdminView"),
  setupPlayerView: document.querySelector("#setupPlayerView"),
  workspaceView: document.querySelector("#workspaceView"),
  connectionStatus: document.querySelector("#connectionStatus"),
  accountAuthPanel: document.querySelector("#accountAuthPanel"),
  accountAuthForm: document.querySelector("#accountAuthForm"),
  accountAuthEmail: document.querySelector("#accountAuthEmail"),
  accountAuthPassword: document.querySelector("#accountAuthPassword"),
  accountAuthSignUp: document.querySelector("#accountAuthSignUp"),
  accountAuthSignedIn: document.querySelector("#accountAuthSignedIn"),
  accountDetailsForm: document.querySelector("#accountDetailsForm"),
  accountAuthAccountEmail: document.querySelector("#accountAuthAccountEmail"),
  accountAuthNewPassword: document.querySelector("#accountAuthNewPassword"),
  accountAuthPasswordConfirm: document.querySelector("#accountAuthPasswordConfirm"),
  accountAuthDisplayName: document.querySelector("#accountAuthDisplayName"),
  accountAuthEmailStatus: document.querySelector("#accountAuthEmailStatus"),
  accountAuthCreated: document.querySelector("#accountAuthCreated"),
  accountAuthSignOut: document.querySelector("#accountAuthSignOut"),
  accountAuthIdentity: document.querySelector("#accountAuthIdentity"),
  accountAuthNotice: document.querySelector("#accountAuthNotice"),
  resumePanel: document.querySelector("#resumePanel"),
  savedTournamentsList: document.querySelector("#savedTournamentsList"),
  resumeTitle: document.querySelector("#resumeTitle"),
  resumeSummary: document.querySelector("#resumeSummary"),
  resumeTournamentButton: document.querySelector("#resumeTournamentButton"),
  createTournamentForm: document.querySelector("#createTournamentForm"),
  createAdminSignInLinkButton: document.querySelector("#createAdminSignInLinkButton"),
  createAccountAuthButton: document.querySelector("#createAccountAuthButton"),
  adminParticipatesInput: document.querySelector("#adminParticipatesInput"),
  adminPlayerNameField: document.querySelector("#adminPlayerNameField"),
  joinTournamentForm: document.querySelector("#joinTournamentForm"),
  joinAvatarPreview: document.querySelector("#joinAvatarPreview"),
  joinAvatarPreviewFrame: document.querySelector("#joinAvatarPreviewFrame"),
  joinNamePreview: document.querySelector("#joinNamePreview"),
  avatarPicker: document.querySelector("#avatarPicker"),
  languageSelect: document.querySelector("#languageSelect"),
  appMenuToggle: document.querySelector("#appMenuToggle"),
  copyrightYearRange: document.querySelector("#copyrightYearRange"),
  showExistingPlayersButton: document.querySelector("#showExistingPlayersButton"),
  existingPlayerList: document.querySelector("#existingPlayerList"),
  adminTab: document.querySelector("#adminModuleLink"),
  playerTab: document.querySelector("#playerModuleLink"),
  tournamentTab: document.querySelector("#tournamentModuleLink"),
  createTab: document.querySelector("#createModuleLink"),
  addPlayerForm: document.querySelector("#addPlayerForm"),
  courtSettingsForm: document.querySelector("#courtSettingsForm"),
  courtNamesForm: document.querySelector("#courtNamesForm"),
  courtNamesList: document.querySelector("#courtNamesList"),
  tournamentSettingsForm: document.querySelector("#tournamentSettingsForm"),
  cupTeamSetupModeField: document.querySelector("#cupTeamSetupModeField"),
  cupThirdPlaceField: document.querySelector("#cupThirdPlaceField"),
  cupTeamBuilder: document.querySelector("#cupTeamBuilder"),
  cupTeamForm: document.querySelector("#cupTeamForm"),
  cupTeamSummary: document.querySelector("#cupTeamSummary"),
  cupBracket: document.querySelector("#cupBracket"),
  tournamentTitle: document.querySelector("#tournamentTitle"),
  roleIndicator: document.querySelector("#roleIndicator"),
  roundLabel: document.querySelector("#roundLabel"),
  adminInviteCode: document.querySelector("#adminInviteCode"),
  joinQrCode: document.querySelector("#joinQrCode"),
  joinLink: document.querySelector("#joinLink"),
  spectatorLink: document.querySelector("#spectatorLink"),
  copyInviteCodeButton: document.querySelector("#copyInviteCodeButton"),
  copyJoinLinkButton: document.querySelector("#copyJoinLinkButton"),
  copySpectatorLinkButton: document.querySelector("#copySpectatorLinkButton"),
  shareTournamentButton: document.querySelector("#shareTournamentButton"),
  copyStatus: document.querySelector("#copyStatus"),
  appToast: document.querySelector("#appToast"),
  syncStatusDetail: document.querySelector("#syncStatusDetail"),
  confirmDialog: document.querySelector("#appConfirmDialog"),
  confirmMessage: document.querySelector("#appConfirmMessage"),
  confirmCancel: document.querySelector("#appConfirmCancel"),
  confirmAccept: document.querySelector("#appConfirmAccept"),
  conflictActions: document.querySelector("#conflictActions"),
  adminResultSubmissions: document.querySelector("#adminResultSubmissions"),
  keepLocalBackupButton: document.querySelector("#keepLocalBackupButton"),
  refreshRemoteButton: document.querySelector("#refreshRemoteButton"),
  tournamentStatus: document.querySelector("#tournamentStatus"),
  adminLiveOverview: document.querySelector("#adminLiveOverview"),
  courtQueue: document.querySelector("#courtQueue"),
  tournamentCourtQueue: document.querySelector("#tournamentCourtQueue"),
  tvModeButton: document.querySelector("#tvModeButton"),
  tvModeMenuButton: document.querySelector("#tvModeMenuButton"),
  lobbyStatus: document.querySelector("#lobbyStatus"),
  playerCount: document.querySelector("#playerCount"),
  matchCount: document.querySelector("#matchCount"),
  playersList: document.querySelector("#playersList"),
  roundSummary: document.querySelector("#roundSummary"),
  adminMatches: document.querySelector("#adminMatches"),
  playerMatches: document.querySelector("#playerMatches"),
  spectatorMatches: document.querySelector("#spectatorMatches"),
  standingsList: document.querySelector("#standingsList"),
  rulesList: document.querySelector("#rulesList"),
  playerStandingsList: document.querySelector("#playerStandingsList"),
  playerIdentityCard: document.querySelector("#playerIdentityCard"),
  leaveSessionButton: document.querySelector("#leaveSessionButton"),
  toggleNotificationsButton: document.querySelector("#toggleNotificationsButton"),
  toggleAvailabilityButton: document.querySelector("#toggleAvailabilityButton"),
  playerNextMatch: document.querySelector("#playerNextMatch"),
  playerResultPanel: document.querySelector("#playerResultPanel"),
  playerResultForm: document.querySelector("#playerResultForm"),
  playerResultMatch: document.querySelector("#playerResultMatch"),
  playerResultStatus: document.querySelector("#playerResultStatus"),
  playerResultHint: document.querySelector("#playerResultHint"),
  playerStatusGrid: document.querySelector("#playerStatusGrid"),
  generateRoundButton: document.querySelector("#generateRoundButton"),
  completeRoundButton: document.querySelector("#completeRoundButton"),
  exportBackupButton: document.querySelector("#exportBackupButton"),
  importBackupButton: document.querySelector("#importBackupButton"),
  backupFileInput: document.querySelector("#backupFileInput"),
  endTournamentButton: document.querySelector("#endTournamentButton"),
  resetTournamentButton: document.querySelector("#resetTournamentButton"),
  adminIdentityPanel: document.querySelector("#adminIdentityPanel"),
  adminIdentityForm: document.querySelector("#adminIdentityForm"),
  adminIdentityEmail: document.querySelector("#adminIdentityEmail"),
  adminIdentityStatus: document.querySelector("#adminIdentityStatus"),
  claimTournamentButton: document.querySelector("#claimTournamentButton"),
  adminIdentityNotice: document.querySelector("#adminIdentityNotice"),
  adminAccountAuthButton: document.querySelector("#adminAccountAuthButton"),
  largeScoreDialog: document.querySelector("#largeScoreDialog"),
  largeScoreSurface: document.querySelector("#largeScoreSurface"),
  largeScoreContext: document.querySelector("#largeScoreContext"),
  largeScoreTitle: document.querySelector("#largeScoreTitle"),
  largeScoreBoard: document.querySelector("#largeScoreBoard"),
  largeScoreActions: document.querySelector("#largeScoreActions"),
  closeLargeScoreButton: document.querySelector("#closeLargeScoreButton"),
  setScoreDialog: document.querySelector("#setScoreDialog"),
  setScoreTitle: document.querySelector("#setScoreTitle"),
  setScoreContext: document.querySelector("#setScoreContext"),
  setScoreOptions: document.querySelector("#setScoreOptions"),
  closeSetScoreButton: document.querySelector("#closeSetScoreButton"),
  profileForm: document.querySelector("#profileForm"),
  profileLightPanel: document.querySelector(".profile-light-panel"),
  profileNameInput: document.querySelector("#profileNameInput"),
  profileAvatarPicker: document.querySelector("#profileAvatarPicker"),
  profileStats: document.querySelector("#profileStats"),
  profileHistory: document.querySelector("#profileHistory"),
  profileHistoryFilter: document.querySelector("#profileHistoryFilter"),
  profileHistoryList: document.querySelector("#profileHistoryList"),
  profileDeletionStatus: document.querySelector("#profileDeletionStatus"),
  deleteProfileButton: document.querySelector("#deleteProfileButton"),
  cancelProfileDeletionButton: document.querySelector("#cancelProfileDeletionButton"),
  adminMatchFilter: document.querySelector("#adminMatchFilter"),
  playerMatchFilter: document.querySelector("#playerMatchFilter"),
};

const workspaceOverview = window.PadelstarWorkspaceOverview.create({
  appendEmptyText: (container, text) => appendEmptyText(container, text),
  assistantFindings: (currentState) => window.PadelstarTournamentInsights?.assistantFindings(currentState) ?? [],
  elements,
  escapeHtml: (value) => escapeHtml(value),
  gameScoreText: (match) => gameScoreText(match),
  getActiveRound: () => getActiveRound(),
  getState: () => state,
  matchContextText: (match) => matchContextText(match),
  matchStateText: (matchState) => matchStateText(matchState),
  primaryMatchHeadline: (match) => primaryMatchHeadline(match),
  roundProgress: (round) => roundProgress(round),
  storageKey,
  setScoreText: (match) => setScoreText(match),
  translate: (key, values) => t(key, values),
});
const courtQueue = window.PadelstarCourtQueue?.create({
  document,
  elements,
  escapeHtml: (value) => escapeHtml(value),
  getState: () => state,
  matchContextText: (match) => matchContextText(match),
  t: (key, values) => t(key, values),
}) ?? { render() {} };
const matchList = window.PadelstarMatchList.create({
  appendEmptyText: (container, text) => appendEmptyText(container, text),
  document,
  elements,
  escapeHtml: (value) => escapeHtml(value),
  matchContextText: (match) => matchContextText(match),
  setScoreText: (match) => setScoreText(match),
  t: (key, values) => t(key, values),
  teamAccentStyle: (team) => teamAccentStyle(team),
  teamDisplay: (team, variant) => teamDisplay(team, variant),
});
const standings = window.PadelstarStandings.create({
  accentStyle: (accent) => accentStyle(accent),
  appendEmptyText: (container, text) => appendEmptyText(container, text),
  avatarMarkup: (player, className, size) => avatarMarkup(player, className, size),
  document,
  elements,
  escapeHtml: (value) => escapeHtml(value),
  leaderboardEntries: (matches) => leaderboardEntries(matches),
  t: (key, values) => t(key, values),
});
const playerList = window.PadelstarPlayerList.create({
  accentStyle: (accent) => accentStyle(accent),
  appendEmptyText: (container, text) => appendEmptyText(container, text),
  avatarMarkup: (player, className, size) => avatarMarkup(player, className, size),
  document,
  elements,
  escapeAttribute: (value) => escapeAttribute(value),
  escapeHtml: (value) => escapeHtml(value),
  getAllMatches: () => getAllMatches(),
  getSupabaseClient: () => supabaseClient,
  getState: () => state,
  joinRemoteTournament: (name, avatarId) => joinRemoteTournament(name, avatarId),
  leaderboardEntries: (matches) => leaderboardEntries(matches),
  playerStatusLabel: (player) => playerStatusLabel(player),
  removePlayer: (playerId) => removePlayer(playerId),
  replacePlayer: (playerId, name) => replacePlayer(playerId, name),
  render: () => render(),
  saveState: (options) => saveState(options),
  setLocalRole: (role) => setLocalRole(role),
  showWorkspace: (view) => showWorkspace(view),
  t: (key, values) => t(key, values),
  updatePlayer: (playerId, updates) => updatePlayer(playerId, updates),
});
const cupBracket = window.PadelstarCupBracket.create({
  document,
  elements,
  escapeHtml: (value) => escapeHtml(value),
  getMatchById: (matchId) => getMatchById(matchId),
  getState: () => state,
  matchStateText: (matchState) => matchStateText(matchState),
  t: (key, values) => t(key, values),
});
const playerStatus = window.PadelstarPlayerStatus.create({
  elements,
  getPlayerById: (id) => getPlayerById(id),
  getState: () => state,
  matchIncludesPlayer: (match, playerId) => matchIncludesPlayer(match, playerId),
  playerTournamentState: (player, matches) => playerTournamentState(player, matches),
  pointsByPlayer: (matches, pointMode) => pointsByPlayer(matches, pointMode),
  statsForPlayer: (player, matches) => statsForPlayer(player, matches),
  t: (key, values) => t(key, values),
});
const playerNextMatch = window.PadelstarPlayerNextMatch.create({
  accentStyle: (accent) => accentStyle(accent),
  elements,
  escapeHtml: (value) => escapeHtml(value),
  gameScoreText: (match) => gameScoreText(match),
  getActiveRound: () => getActiveRound(),
  getPlayerById: (id) => getPlayerById(id),
  getState: () => state,
  matchContextText: (match) => matchContextText(match),
  notifyPlayerMatch: (match, kind) => notifyPlayerMatch(match, kind),
  playerPlacement: (player, matches) => playerPlacement(player, matches),
  playerTournamentState: (player, matches) => playerTournamentState(player, matches),
  scoreSummary: (match) => scoreSummary(match),
  t: (key, values) => t(key, values),
});
const rules = window.PadelstarRules.create({
  elements,
  escapeHtml: (value) => escapeHtml(value),
  getState: () => state,
  t: (key, values) => t(key, values),
});
const playerControls = window.PadelstarPlayerControls.create({
  accentStyle: (accent) => accentStyle(accent),
  avatarMarkup: (player, className, size) => avatarMarkup(player, className, size),
  elements,
  escapeHtml: (value) => escapeHtml(value),
  getPlayerById: (id) => getPlayerById(id),
  getState: () => state,
  getSpectatorMode: () => spectatorMode,
  t: (key, values) => t(key, values),
});
const largeScore = window.PadelstarLargeScore.create({
  awardTennisPoint: (match, teamIndex) => awardTennisPoint(match, teamIndex),
  closeLargeScore: () => closeLargeScore(),
  elements,
  escapeHtml: (value) => escapeHtml(value),
  getMatchById: (matchId) => getMatchById(matchId),
  getState: () => state,
  gameScoreText: (match) => gameScoreText(match),
  matchContextText: (match) => matchContextText(match),
  setScoreText: (match) => setScoreText(match),
  startingTeamText: (match) => startingTeamText(match),
  teamAccentStyle: (team) => teamAccentStyle(team),
  teamDisplay: (team) => teamDisplay(team),
  tennisPointLabel: (points) => tennisPointLabel(points),
  t: (key, values) => t(key, values),
});
const setScoreDialog = window.PadelstarSetScoreDialog.create({
  elements,
  escapeHtml: (value) => escapeHtml(value),
  getMatchById: (matchId) => getMatchById(matchId),
  getState: () => state,
  saveSetResult: (match, teamOne, teamTwo) => saveSetResult(match, teamOne, teamTwo),
  t: (key, values) => t(key, values),
});
const adminStatus = window.PadelstarAdminStatus.create({
  canGenerateRound: () => canGenerateRound(),
  elements,
  generateRoundBlockReason: () => generateRoundBlockReason(),
  getActiveRound: () => getActiveRound(),
  getLocalStorage: () => localStorage,
  getSavedTournaments: () => tournamentLibrary.list(),
  getState: () => state,
  hasActiveTournament: () => hasActiveTournament(),
  hasPendingRemoteWrites: () => hasPendingRemoteWrites(),
  isSupabaseReady: () => isSupabaseReady(),
  isCurrentUserAdmin: () => isCurrentUserAdmin(),
  pendingRemoteWriteCount: () => pendingRemoteWriteCount(),
  realtimeConnectionState: () => realtimeConnection.getConnectionState(),
  roundProgress: (round) => roundProgress(round),
  storageKey,
  syncLastAttemptAt: () => syncLastAttemptAt,
  syncLastError: () => syncLastError,
  remoteConflict: () => remoteConflict,
  t: (key, values) => t(key, values),
});
const profileUi = window.PadelstarProfileUi.create({
  defaultAvatarId,
  elements,
  escapeHtml: (value) => escapeHtml(value),
  getLocalStorage: () => localStorage,
  getProfile: () => profile,
  getProfileManager: () => profileManager,
  profileHistoryStorageKey,
  t: (key, values) => t(key, values),
});
const backupUi = window.PadelstarBackupUi.create({
  backupFormat,
  elements,
  getState: () => state,
  render: () => render(),
  saveState: () => saveState(),
  setLocalRole: (role) => setLocalRole(role),
  setState: (nextState) => { state = nextState; },
  showToast: (message, statusClass) => showToast(message, statusClass),
  showAccount: () => showModule("account"),
  showWorkspace: (view) => showWorkspace(view),
  slugify: (value) => slugify(value),
  t: (key, values) => t(key, values),
});
const playerState = window.PadelstarPlayerState.create({
  buildSchedule: (players, format) => buildSchedule(players, format),
  createPlayer: (name, index, avatarId) => createPlayer(name, index, avatarId),
  createTeam: (players) => createTeam(players),
  defaultAvatarId,
  findPlayerByName: (name) => findPlayerByName(name),
  getPlayerById: (id) => getPlayerById(id),
  getState: () => state,
  recordEvent: (eventType, entityType, entityId, payload) => eventLog.record(eventType, entityType, entityId, payload),
  render: () => render(),
  saveState: () => saveState(),
  showToast: (message, statusClass) => showToast(message, statusClass),
  t: (key, values) => t(key, values),
});
const tournamentStatus = window.PadelstarTournamentStatus.create({
  cupCanAdvance: () => cupCanAdvance(),
  cupCanFinalize: () => cupCanFinalize(),
  getActiveRound: () => getActiveRound(),
  getNextScheduledRound: () => getNextScheduledRound(),
  getState: () => state,
  t: (key, values) => t(key, values),
});

const uiFeedback = window.PadelstarUiFeedback.create({
  elements,
  translate: (key, values) => t(key, values),
});
const notificationSystem = window.PadelstarNotificationSystem.create({
  getElements: () => elements,
  getLocalStorage: () => localStorage,
  getNotificationPreferenceKey: () => notificationPreferenceKey,
  getObservability: () => observability,
  getPushSubscriptionStorageKey: () => pushSubscriptionStorageKey,
  getState: () => state,
  getSupabaseClient: () => supabaseClient,
  getSupabaseSettings: () => supabaseSettings,
  getSpectatorMode: () => spectatorMode,
  remoteRpc,
  translate: (key, values) => t(key, values),
});
const profileSession = window.PadelstarProfileSession.create({
  defaultAvatarId,
  getElements: () => elements,
  getIsCurrentUserAdmin: () => isCurrentUserAdmin(),
  getLocalStorage: () => localStorage,
  getObservability: () => observability,
  getPlayerById: (id) => getPlayerById(id),
  getProfile: () => profile,
  getState: () => state,
  getSupabaseClient: () => supabaseClient,
  mirrorStorageKeys: (keys) => persistence.mirrorKeys(keys),
  profileHistoryStorageKey,
  profileManager,
  profileStorageKey,
  removeOfflineStorageKeys: (keys) => persistence.removeKeys(keys),
  remoteRpc,
  render: () => render(),
  renderProfile: () => renderProfile(),
  requestConfirmation: (message) => requestConfirmation(message),
  recordEvent: (eventType, entityType, entityId, payload, inverse) => eventLog.record(eventType, entityType, entityId, payload, inverse),
  saveProfileHistory: () => saveProfileHistory(),
  saveState: (options) => saveState(options),
  syncJoinPreview: () => syncJoinPreview(),
  syncAuthenticatedProfile: (nextProfile) => accountAuth?.syncProfile(nextProfile, state.settings.language),
  translate: (key, values) => t(key, values),
  setProfile: (nextProfile) => { profile = nextProfile; },
});
profile = profileSession.loadLocalProfile();
const matchCard = window.PadelstarMatchCard.create({
  awardTennisPoint: (match, teamIndex) => awardTennisPoint(match, teamIndex),
  cancelMatch: (match) => cancelMatch(match),
  escapeAttribute: (value) => escapeAttribute(value),
  escapeHtml: (value) => escapeHtml(value),
  gameScoreText: (match) => gameScoreText(match),
  matchContextText: (match) => matchContextText(match),
  matchIncludesPlayer: (match, playerId) => matchIncludesPlayer(match, playerId),
  matchStateText: (stateName) => matchStateText(stateName),
  openLargeScore: (matchId) => openLargeScore(matchId),
  openSetScoreDialog: (matchId) => openSetScoreDialog(matchId),
  primaryMatchHeadline: (match) => primaryMatchHeadline(match),
  reopenMatch: (match) => reopenMatch(match),
  setScoreText: (match) => setScoreText(match),
  setWalkover: (match, teamIndex) => setWalkover(match, teamIndex),
  sittingOutSummary: (match) => sittingOutSummary(match),
  startMatch: (match) => startMatch(match),
  teamAccentStyle: (team) => teamAccentStyle(team),
  teamDisplay: (team, variant) => teamDisplay(team, variant),
  tennisPointLabel: (value) => tennisPointLabel(value),
  translate: (key, values) => t(key, values),
  updateMatchCourt: (match, courtName) => updateMatchCourt(match, courtName),
});
const adminIdentity = window.PadelstarAdminIdentity.create({
  getClient: () => supabaseClient,
  getElements: () => elements,
  getState: () => state,
  isAdmin: () => isCurrentUserAdmin(),
  observability,
  remoteErrorMessage,
  remoteRpc,
  saveState: (options) => saveState(options),
  translate: (key, values) => t(key, values),
});
const accountAuth = window.PadelstarAccountAuth?.create({
  getClient: () => supabaseClient,
  getElements: () => elements,
  getProfile: () => profile,
  onAuthChange: () => { syncAdminPlayerNameFromProfile(); syncAdminPlayerChoice(); void renderAdminIdentity(); render(); },
  onProfileLoaded: (remoteProfile) => {
    profile = profile
      ? profileManager.normalizeProfile({ ...profile, ...remoteProfile })
      : profileManager.createProfile(remoteProfile.displayName, remoteProfile.avatarId);
    profileSession.persistLocalProfile();
    syncAdminPlayerNameFromProfile();
    syncJoinFormFromProfile();
    syncJoinPreview();
    renderProfile();
  },
  translate: (key, values) => t(key, values),
});
const remoteFeedback = window.PadelstarRemoteFeedback.create({
  getClient: () => supabaseClient,
  getElements: () => elements,
  getNavigator: () => navigator,
  getSpectatorMode: () => spectatorMode,
  isConflictError: (error) => isConflictError(error),
  isTransientRemoteError: (error) => isTransientRemoteError(error),
  markSyncAttempt: () => markSyncAttempt(),
  remoteRpc,
  renderSyncControls: () => renderSyncControls(),
  sanitizeSharedState: (nextState) => sanitizeSharedState(nextState),
  showToast: (message, statusClass) => showToast(message, statusClass),
  stateManager,
  translate: (key, values) => t(key, values),
});
const realtimeConnection = window.PadelstarRealtimeConnection.create({
  applyRemoteState: (nextState, options) => applyRemoteState(nextState, options),
  flushPendingRemoteWrites: () => flushPendingRemoteWrites(),
  getClient: () => supabaseClient,
  getInviteState: (inviteCode) => getTournamentByInviteRpc(inviteCode),
  getNavigator: () => navigator,
  getState: () => state,
  handleRemoteError: (error, fallback) => handleRemoteError(error, fallback),
  hasActiveTournament: () => hasActiveTournament(),
  isReady: () => isSupabaseReady(),
  observability,
  onConnectionStateChange: () => syncConnectionStatus(),
  realtimeSync,
  translate: (key, values) => t(key, values),
});

let pendingSetScoreMatchId = null;
const matchFilters = { admin: "all", player: "all" };
const matchActions = window.PadelstarMatchActions.create({
  activateNextWaitingMatch: (match) => activateNextWaitingMatch(match),
  getActiveRound: () => getActiveRound(),
  getMatchById: (matchId) => getMatchById(matchId),
  getRoundForMatch: (match) => getRoundForMatch(match),
  getState: () => state,
  isSupabaseReady: () => isSupabaseReady(),
  markCupCompleteIfDone: () => markCupCompleteIfDone(),
  queueRemoteMatchAction: (match, action, teamIndex) => queueRemoteMatchAction(match, action, teamIndex),
  render: () => render(),
  renderLargeScore: () => renderLargeScore(),
  requestConfirmation: (message) => requestConfirmation(message),
  saveState: () => saveState(),
  showToast: (message, statusClass) => showToast(message, statusClass),
  t: (key, values) => t(key, values),
});
const initialView = window.PadelstarInitialView;
const tournamentEntry = window.PadelstarTournamentEntry?.create({
  createInviteCode: () => createInviteCode(),
  createRemoteTournament: () => createRemoteTournament(),
  createTournament: (options) => createTournament(options),
  getAdminAuthUser: async () => accountAuth?.currentUser() ?? await accountAuth?.refresh() ?? currentAuthUser(),
  getAdminEmail: () => elements.createTournamentForm?.elements.adminEmail?.value.trim(),
  randomAvatarId: () => avatarSystem.randomId(),
  ensureProfileForJoin: (displayName, avatarId) => ensureProfileForJoin(displayName, avatarId),
  findPlayerByName: (name) => findPlayerByName(name),
  getClient: () => supabaseClient,
  getState: () => state,
  hasTournamentForInvite: (inviteCode, loadedRemote) => hasTournamentForInvite(inviteCode, loadedRemote),
  joinRemoteTournament: (playerName, avatarId) => joinRemoteTournament(playerName, avatarId),
  joinTournament: (playerName, avatarId) => joinTournament(playerName, avatarId),
  linkProfileToPlayer: (player) => linkProfileToPlayer(player),
  loadRemoteTournamentByInvite: (inviteCode) => loadRemoteTournamentByInvite(inviteCode),
  parsePlayerNames: (value) => parsePlayerNames(value),
  render: () => render(),
  saveState: (options) => saveState(options),
  showAccount: () => showModule("account"),
  sendAdminSignInLink: async (email) => {
    const sent = await adminIdentity.sendSignInLink(email);
    showToast(sent ? t("admin.identityLinkSent") : t("admin.identityFailed"), sent ? "status-message-success" : "status-message-error");
    return sent;
  },
  setLocalRole: (role) => setLocalRole(role),
  setState: (nextState) => { state = nextState; },
  showToast: (message, statusClass) => showToast(message, statusClass),
  showWorkspace: (view) => showWorkspace(view),
  syncJoinPreview: () => syncJoinPreview(),
  t: (key, values) => t(key, values),
});
const adminFormEvents = window.PadelstarAdminFormEvents?.create({
  addPlayers: (names, joinedFrom) => addPlayers(names, joinedFrom),
  canCompleteRound: (round) => canCompleteRound(round),
  endTournament: () => endTournament(),
  exportBackup: () => exportBackup(),
  generateFullTournamentSchedule: () => generateFullTournamentSchedule(),
  generateRoundBlockReason: () => generateRoundBlockReason(),
  getActiveRound: () => getActiveRound(),
  getState: () => state,
  importBackup: (event) => importBackup(event),
  isSupabaseReady: () => isSupabaseReady(),
  parsePlayerNames: (value) => parsePlayerNames(value),
  queueRemoteCupAdvance: () => queueRemoteCupAdvance(),
  queueRemoteRoundAdvance: () => queueRemoteRoundAdvance(),
  render: () => render(),
  requestConfirmation: (message) => requestConfirmation(message),
  saveManualCupTeams: (value) => saveManualCupTeams(value),
  saveState: (options) => saveState(options),
  showToast: (message, statusClass) => showToast(message, statusClass),
  startNextScheduledRound: () => startNextScheduledRound(),
  t: (key, values) => t(key, values),
  updateCourtsFromInput: (value) => updateCourtsFromInput(value),
  updateCourtNames: (names) => updateCourtNames(names),
  updateTournamentRules: (options) => updateTournamentRules(options),
});

function initializeApp() {
observability?.installGlobalHandlers();
window.PadelstarNavigation?.initialize({ showModule, translate: t });
applyTheme();
activateSupabaseClient();
window.addEventListener("padelstar-supabase-ready", activateSupabaseClient, { once: true });
syncLanguageOptions();
syncCreateFormDefaults();
syncJoinFormFromProfile();
syncJoinPreview();
renderProfile();
prefillInviteCodeFromUrl();
syncCopyrightYear();
registerServiceWorker();
window.PadelstarPwaInstall?.create({ documentRef: document, navigatorRef: navigator, windowRef: window, translate: (key, values) => t(key, values) }).initialize();
syncConnectionStatus();
accountAuth?.bind();
void accountAuth?.refresh();
  showRecoveryNotice();

elements.profileForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveLocalProfileFromForm();
});
const openAccountAuth = () => {
  showModule("account");
  window.requestAnimationFrame(() => elements.accountAuthEmail?.focus());
};
elements.createAccountAuthButton?.addEventListener("click", openAccountAuth);
elements.adminAccountAuthButton?.addEventListener("click", openAccountAuth);
elements.playerResultForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  submitPlayerResult(form.elements.matchId.value, Number(form.elements.teamOne.value), Number(form.elements.teamTwo.value));
});
elements.tvModeButton?.addEventListener("click", toggleTvMode);
elements.tvModeMenuButton?.addEventListener("click", () => {
  if (!hasActiveTournament()) return;
  showModule("tournament");
  toggleTvMode();
  window.PadelstarNavigation?.closeMenu();
});
elements.deleteProfileButton?.addEventListener("click", () => void requestProfileDeletion());
elements.cancelProfileDeletionButton?.addEventListener("click", cancelProfileDeletion);
elements.profileHistoryFilter?.addEventListener("change", renderProfile);
elements.adminMatchFilter?.addEventListener("change", (event) => {
  matchFilters.admin = event.currentTarget.value;
  render();
});
elements.playerMatchFilter?.addEventListener("change", (event) => {
  matchFilters.player = event.currentTarget.value;
  render();
});
elements.adminParticipatesInput.addEventListener("change", syncAdminPlayerChoice);
elements.createAdminSignInLinkButton?.addEventListener("click", async () => {
  const email = elements.createTournamentForm?.elements.adminEmail?.value.trim();
  if (!email) {
    showToast(t("admin.identityEmailRequired"), "status-message-error");
    elements.createTournamentForm?.elements.adminEmail?.focus();
    return;
  }
  const sent = await adminIdentity.sendSignInLink(email);
  showToast(sent ? t("admin.identityLinkSent") : t("admin.identityFailed"), sent ? "status-message-success" : "status-message-error");
});
elements.languageSelect.addEventListener("change", () => {
  state.settings.language = i18n?.normalizeLanguage(elements.languageSelect.value) ?? elements.languageSelect.value;
  localStorage.setItem(languageStorageKey, state.settings.language);
  if (profile) void accountAuth?.syncProfile(profile, state.settings.language);
  applyLanguage();
  syncJoinPreview();
  render();
});

tournamentEntry?.bind(elements);

adminFormEvents?.bind(elements);

elements.refreshRemoteButton?.addEventListener("click", async () => {
  elements.refreshRemoteButton.disabled = true;
  await refreshRemoteState("manual");
  elements.refreshRemoteButton.disabled = false;
  render();
});

elements.keepLocalBackupButton?.addEventListener("click", () => {
  exportBackup();
  setRemoteNotice(t("messages.localBackupKept"));
});

elements.endTournamentButton.addEventListener("click", async () => {
  if (!await requestConfirmation(t("messages.endTournamentConfirm"))) return;
  endTournament();
  saveState();
  render();
});

elements.resetTournamentButton.addEventListener("click", async () => {
  if (!await requestConfirmation(t("messages.resetTournamentConfirm"))) return;
  await deleteRemoteTournament();
  tournamentLibrary.remove(state.id);
  state = structuredClone(defaultTournament);
  localStorage.removeItem(storageKey);
  localStorage.removeItem(recoveryStorageKey);
  localStorage.removeItem(roleStorageKey);
  localStorage.removeItem(syncStorageKey);
  persistence.removeKeys([storageKey, recoveryStorageKey, roleStorageKey, syncStorageKey]);
  syncCreateFormDefaults();
  elements.joinTournamentForm.reset();
  syncJoinPreview();
  showStart();
  render();
});

window.PadelstarWorkspaceEvents?.bind({
  elements,
  callbacks: {
    sendAdminSignInLink,
    claimTournament: claimCurrentTournament,
    leaveSession: async () => {
      if (spectatorMode) leaveSpectatorView();
      else await leaveCurrentTournamentWithDialog();
    },
    toggleAvailability: () => toggleSelectedPlayerAvailability(),
    resumeTournament: () => {
      showWorkspace(isCurrentUserAdmin() ? "admin" : state.selectedPlayerId ? "player" : "spectator");
      render();
    },
    openSavedTournament: (tournamentId) => openSavedTournament(tournamentId),
    copyInviteCode: () => copyText(state.inviteCode, t("messages.inviteCopied")),
    copyJoinLink: () => copyText(createJoinLink(), t("messages.joinLinkCopied")),
    copySpectatorLink: () => copyText(createSpectatorLink(), t("messages.spectatorLinkCopied")),
    shareTournament: shareCurrentTournament,
    toggleNotifications,
    showExistingPlayers: showExistingPlayers,
  },
});

  window.PadelstarAppEvents?.bind({
    elements,
    documentRef: document,
    windowRef: window,
    callbacks: {
      activateAdminPanel,
      activatePlayerAction: (playerAction) => {
        if (playerAction === "spectate") showWorkspace("tournament");
        if (playerAction === "choose") showModule("setup-player");
        if (playerAction === "rejoin") {
          prefillJoinForm(state.inviteCode);
          showModule("setup-player");
        }
      },
      closeLargeScore,
      closeSetScoreDialog,
      handleOnline,
      handleOffline,
      render,
      setPendingSetScoreMatchId: (matchId) => { pendingSetScoreMatchId = matchId; },
      setLargeScoreMatchId: (matchId) => { largeScoreMatchId = matchId; },
      syncJoinPreview,
    },
  });

}

async function showExistingPlayers() {
  const inviteCode = elements.joinTournamentForm.elements.inviteCode.value.trim().toUpperCase();
  if (!inviteCode) {
    showToast(t("messages.inviteCodeRequired"), "status-message-error");
    elements.joinTournamentForm.elements.inviteCode.focus();
    return;
  }

  const loadedRemote = supabaseClient ? await loadRemoteTournamentByInvite(inviteCode) : false;
  if (!hasTournamentForInvite(inviteCode, loadedRemote)) {
    showToast(t("messages.tournamentNotFound", { code: inviteCode }), "status-message-error");
    return;
  }

  elements.existingPlayerList.classList.toggle("hidden");
  renderExistingPlayerList();
}

function activateSupabaseClient() {
  if (!supabaseClient && supabaseSettings.url && supabaseSettings.anonKey && window.supabase) {
    supabaseClient = window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  if (!supabaseClient || supabaseClientActivated) return;
  supabaseClientActivated = true;
  supabaseClient.auth.onAuthStateChange(() => {
    // Defer follow-up auth calls so Supabase can release its auth lock first.
    window.setTimeout(() => { void accountAuth?.refresh(); void renderAdminIdentity(); }, 0);
  });
  void accountAuth?.refresh();
  void syncProfileHistoryRemote();
  connectRealtimeForCurrentState();
}

function createTournament({ name, inviteCode, players, courtCount }) {
  return tournamentState.createTournament({ name, inviteCode, players, courtCount });
}

function createPlayer(name, index, avatarId = null) {
  return tournamentState.createPlayer(name, index, avatarId);
}

function loadLocalProfile() { return profileSession.loadLocalProfile(); }
function persistLocalProfile() { return profileSession.persistLocalProfile(); }
function syncProfileRemote() { return profileSession.syncProfileRemote(); }
function syncProfileHistoryRemote(entry) { return profileSession.syncProfileHistoryRemote(entry); }
function syncProfileHistoryRemoteRead() { return profileSession.syncProfileHistoryRemoteRead(); }
function purgeLocalProfile() { return profileSession.purgeLocalProfile(); }
function profileAvatarIdFromForm() { return profileSession.profileAvatarIdFromForm(); }
function saveLocalProfileFromForm() { return profileSession.saveLocalProfileFromForm(); }
function ensureProfileForJoin(displayName, avatarId) { return profileSession.ensureProfileForJoin(displayName, avatarId); }
function requestProfileDeletion() { return profileSession.requestProfileDeletion(); }
function cancelProfileDeletion() { return profileSession.cancelProfileDeletion(); }
function linkProfileToPlayer(player) { return profileSession.linkProfileToPlayer(player); }

function profileHistoryEntry() {
  if (!profile || state.status !== "Avsluttet") return null;
  const player = state.players.find((item) => item.profileId === profile.id) ?? getPlayerById(state.selectedPlayerId);
  if (!player || !window.PadelstarRetentionPolicy?.isRetainedParticipant(player)) return null;
  const matches = getAllMatches().filter((match) => match.state === "finished" && matchIncludesPlayer(match, player.id));
  const entry = leaderboardEntries(getAllMatches()).find((item) => item.player.id === player.id);
  const wins = matches.filter((match) => {
    const teamIndex = match.teamOne.players.some((item) => item.id === player.id) ? 0 : 1;
    return match.winnerTeamIndex === teamIndex;
  }).length;
  const sets = matches.reduce((total, match) => total + (match.completedSets ?? []).filter((set) => {
    const teamOne = match.teamOne.players.some((item) => item.id === player.id);
    return teamOne ? set.teamOne > set.teamTwo : set.teamTwo > set.teamOne;
  }).length, 0);
  const games = matches.reduce((total, match) => total + (match.completedSets ?? []).reduce((setsTotal, set) => {
    const teamOne = match.teamOne.players.some((item) => item.id === player.id);
    return setsTotal + (teamOne ? set.teamOne : set.teamTwo);
  }, 0), 0);
  const matchRecords = matches.map((match) => ({
    id: match.id,
    winnerTeamIndex: match.winnerTeamIndex,
    completedSets: (match.completedSets ?? []).map((set) => ({ teamOne: set.teamOne, teamTwo: set.teamTwo })),
    teamOne: { players: (match.teamOne?.players ?? []).filter((item) => item.profileId).map((item) => ({ profileId: item.profileId, name: item.name })) },
    teamTwo: { players: (match.teamTwo?.players ?? []).filter((item) => item.profileId).map((item) => ({ profileId: item.profileId, name: item.name })) },
  }));
  return {
    id: state.id,
    profileId: profile.id,
    tournamentName: state.name,
    inviteCode: state.inviteCode,
    endedAt: new Date().toISOString(),
    placement: entry ? leaderboardEntries(getAllMatches()).findIndex((item) => item.player.id === player.id) + 1 : null,
    points: entry?.points ?? 0,
    matches: matches.length,
    wins,
    sets,
    games,
    format: state.settings.format,
    matchRecords,
  };
}

function saveProfileHistory() {
  const entry = profileHistoryEntry();
  if (!entry) return;
  profileManager.recordHistory(localStorage, profileHistoryStorageKey, entry);
  persistence.mirrorKeys([profileHistoryStorageKey]);
  void syncProfileHistoryRemote(entry);
}

function requestRemoteProfileDeletion() { return profileSession.requestRemoteProfileDeletion(); }
function cancelRemoteProfileDeletion() { return profileSession.cancelRemoteProfileDeletion(); }

function renderProfile() {
  profileUi.renderProfile();
}

function loadUserLanguage(fallbackLanguage = "nb") {
  return i18nUi.loadUserLanguage({ storage: localStorage, storageKey: languageStorageKey, fallbackLanguage, i18n });
}

function loadState() { return stateBootstrap.loadState(); }
function loadSavedState(serializedState) { return stateBootstrap.loadSavedState(serializedState); }

function migrateState(nextState) {
  return stateManager.migrateState(nextState, defaultTournament, stateManagerDependencies());
}

function migrateMatch(match, tournamentId) {
  return stateManager.migrateMatch(match, tournamentId, stateManagerDependencies());
}

function stateManagerDependencies() {
  return {
    accents,
    defaultAvatarId,
    buildSchedule,
    createTeam,
    getPlayerById,
    normalizeAccent,
  };
}

function readSyncMetadata() {
  return stateManager.readSyncMetadata(localStorage, syncStorageKey);
}

function loadPendingAdminSync() {
  return stateManager.loadPendingAdminSync(localStorage, syncStorageKey);
}

function loadPendingPlayerScores() {
  return stateManager.loadPendingPlayerScores(localStorage, syncStorageKey);
}

function persistSyncMetadata() {
  stateManager.persistSyncMetadata(localStorage, syncStorageKey, pendingAdminSync, pendingPlayerScores, {
    lastAttemptAt: syncLastAttemptAt,
    lastError: syncLastError,
  });
  persistence.mirrorKeys([syncStorageKey]);
}

function hasPendingRemoteWrites() {
  return stateManager.hasPendingRemoteWrites(pendingAdminSync, pendingPlayerScores);
}

function markSyncAttempt() {
  syncLastAttemptAt = new Date().toISOString();
  syncLastError = null;
  persistSyncMetadata();
}

function markSyncError(error) {
  syncLastError = String(error?.message ?? error ?? "Unknown synchronization error").slice(0, 160);
  persistSyncMetadata();
}

function saveState(options = {}) {
  persistLocalState();
  recoveredFromLastGood = false;
  if (options.remote !== false && isCurrentUserAdmin()) {
    pendingAdminSync = true;
    persistSyncMetadata();
    remoteMutationSequence += 1;
    queueRemoteSave();
  }
}

function persistLocalState() {
  tournamentLibrary.upsert(state);
  persistence.writeTournamentState({
    state,
    stateKey: storageKey,
    recoveryKey: recoveryStorageKey,
    isValidState: isValidTournamentState,
  });
}

function openSavedTournament(tournamentId) {
  const savedState = tournamentLibrary.get(tournamentId);
  if (!savedState || savedState.id === state.id) {
    if (savedState) {
      showWorkspace(isCurrentUserAdmin() ? "admin" : state.selectedPlayerId ? "player" : "spectator");
      render();
    }
    return;
  }
  if (!isCurrentUserAdmin()) {
    showToast(t("admin.identitySignInRequired"), "status-message-error");
    return;
  }
  persistLocalState();
  removeRealtimeChannel();
  state = migrateState(savedState);
  state.settings.language = loadUserLanguage(state.settings?.language ?? "nb");
  pendingAdminSync = false;
  pendingPlayerScores = [];
  remoteConflict = false;
  setLocalRole("admin");
  saveState({ remote: false });
  connectRealtimeForCurrentState();
  showWorkspace("admin");
  render();
}

function mirrorOfflineStorage() {
  persistence.mirrorKeys([storageKey, recoveryStorageKey, roleStorageKey, syncStorageKey]);
}

function isSupabaseReady() {
  return remoteFeedback.isSupabaseReady();
}

function remoteErrorMessage(error, fallback) {
  return remoteFeedback.remoteErrorMessage(error, fallback);
}

function sanitizeSharedState(nextState) {
  return remoteFeedback.sanitizeSharedState(nextState);
}

function getTournamentByInviteRpc(inviteCode) {
  return remoteFeedback.getTournamentByInviteRpc(inviteCode);
}

function isConflictError(error) {
  return remoteFeedback.conflictError(error);
}

function isTransientRemoteError(error) {
  return remoteFeedback.transientRemoteError(error);
}

function setRemoteNotice(message) {
  remoteFeedback.setRemoteNotice(message);
}

function requestConfirmation(message) { return uiFeedback.requestConfirmation(message); }
function showToast(message, statusClass = "status-message-success") { return uiFeedback.showToast(message, statusClass); }

function showRecoveryNotice() {
  if (!recoveredFromLastGood) return;
  setRemoteNotice(t("messages.recoveredLocalTournament"));
}

function markRemoteConflict() {
  remoteConflict = true;
  pendingAdminSync = false;
  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = null;
  lastRemotePersistedSequence = Math.max(lastRemotePersistedSequence, remoteMutationSequence);
  persistSyncMetadata();
  setRemoteNotice(t("messages.remoteConflict"));
  render();
}

function handleRemoteError(error, fallback) {
  markSyncError(error);
  observability?.error("remote_error", error, { transient: isTransientRemoteError(error) });
  if (isConflictError(error)) {
    markRemoteConflict();
    return;
  }
  setRemoteNotice(remoteErrorMessage(error, fallback));
  if (isTransientRemoteError(error)) {
    scheduleRealtimeReconnect();
    scheduleRemoteRetry();
  }
  syncConnectionStatus();
}

function scheduleRemoteRetry() {
  if (!isSupabaseReady() || !navigator.onLine || !hasPendingRemoteWrites() || remoteRetryTimer) return;
  const delays = [2000, 5000, 15000, 30000];
  const delay = delays[Math.min(remoteRetryAttempt, delays.length - 1)];
  remoteRetryAttempt += 1;
  remoteRetryTimer = window.setTimeout(() => {
    remoteRetryTimer = null;
    flushPendingRemoteWrites();
  }, delay);
}

function applyRemoteState(remoteState, options = {}) {
  if (!remoteState) return false;
  const source = options.source ?? "remote";
  const sameTournament = state.id === remoteState.id;
  const remoteRevision = Number.isInteger(remoteState.revision) ? remoteState.revision : 0;
  const currentRevision = Number.isInteger(state.revision) ? state.revision : 0;

  if (sameTournament) {
    if (remoteRevision < currentRevision) return false;
    if (pendingPlayerScores.length > 0 && ["realtime", "refresh"].includes(source)) return false;
    if (pendingAdminSync && source !== "rpc" && remoteRevision === currentRevision) return false;
    if (pendingAdminSync && source !== "rpc" && remoteRevision > currentRevision) markRemoteConflict();
    if (source === "realtime" && remoteRevision === currentRevision) return false;
  } else {
    pendingAdminSync = false;
    pendingPlayerScores = [];
    persistSyncMetadata();
  }

  const selectedPlayerId = state.selectedPlayerId ?? null;
  const adminToken = state.id === remoteState.id ? state.adminToken ?? null : null;
  const playerToken = state.id === remoteState.id ? state.playerToken ?? null : null;
  const ownerUserId = state.id === remoteState.id ? state.ownerUserId ?? null : null;
  const previousTournamentId = state.id;
  isApplyingRemoteState = true;
  const nextState = migrateState({
    ...remoteState,
    selectedPlayerId,
  });
  nextState.adminToken = adminToken;
  nextState.playerToken = playerToken;
  nextState.ownerUserId = remoteState.ownerUserId ?? ownerUserId;
  state = nextState;
  state.settings.language = loadUserLanguage(state.settings?.language ?? "nb");
  saveState({ remote: false });
  if (options.clearConflict) {
    remoteConflict = false;
    setRemoteNotice(t("messages.remoteStateUpdated"));
  }
  if (previousTournamentId !== state.id || !realtimeConnection.hasChannel()) connectRealtimeForCurrentState();
  render();
  isApplyingRemoteState = false;
  return true;
}

async function createRemoteTournament() {
  return remoteTournament.createTournament();
}

async function loadRemoteTournamentByInvite(inviteCode) {
  return remoteTournament.loadByInvite(inviteCode);
}

async function joinRemoteTournament(playerName, avatarId) {
  return remoteTournament.join(playerName, avatarId);
}

function queueRemoteSave() {
  if (!isSupabaseReady() || isApplyingRemoteState || !state.adminToken || !state.id) return;
  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = window.setTimeout(() => {
    remoteSaveTimer = null;
    remoteWriteChain = remoteWriteChain.catch(() => {}).then(saveRemoteState);
  }, 350);
}

async function saveRemoteState() {
  return remoteStateWrite.saveRemoteState();
}

function queueRemoteMatchAction(match, action, teamIndex = null) {
  return remoteAdminActions.queueRemoteMatchAction(match, action, teamIndex);
}

function queueRemoteSetResult(match, teamOne, teamTwo) {
  return remoteAdminActions.queueRemoteSetResult(match, teamOne, teamTwo);
}

function queueRemoteRoundAdvance() {
  return remoteAdminActions.queueRemoteRoundAdvance();
}

function queueRemoteCupAdvance() {
  return remoteAdminActions.queueRemoteCupAdvance();
}

function queuePlayerScore(matchId, teamIndex) {
  return remotePlayerScore.queuePlayerScore(matchId, teamIndex);
}

async function processPlayerScoreQueue() {
  return remotePlayerScore.processPlayerScoreQueue();
}

async function deleteRemoteTournament() {
  if (!isSupabaseReady() || !state.adminToken || !state.id) return false;
  const { error } = await remoteRpc(supabaseClient, "delete_tournament", {
    p_tournament_id: state.id,
    p_admin_token: state.adminToken,
  });
  if (error) {
    console.warn("Supabase delete failed", error);
    elements.copyStatus.textContent = remoteErrorMessage(error, t("messages.deleteRemoteFailed"));
    return false;
  }
  removeRealtimeChannel();
  pendingAdminSync = false;
  pendingPlayerScores = [];
  persistSyncMetadata();
  return true;
}

function currentAuthUser() { return accountAuth?.currentUser() ?? adminIdentity.currentAuthUser(); }
function sendAdminSignInLink(event) { return adminIdentity.sendAdminSignInLink(event); }
function claimCurrentTournament() { return adminIdentity.claimCurrentTournament(); }
function renderAdminIdentity() { return adminIdentity.render(); }

function setRealtimeConnectionState(nextState) { return realtimeConnection.setConnectionState(nextState); }
function removeRealtimeChannel() { return realtimeConnection.removeChannel(); }
function scheduleRealtimeReconnect() { return realtimeConnection.scheduleReconnect(); }
function refreshRemoteState(reason = "reconnect") { return realtimeConnection.refresh(reason); }

function flushPendingRemoteWrites() {
  if (!isSupabaseReady() || !navigator.onLine) return;
  if (pendingAdminSync && isCurrentUserAdmin()) {
    if (remoteMutationSequence <= lastRemotePersistedSequence) {
      remoteMutationSequence = lastRemotePersistedSequence + 1;
    }
    remoteWriteChain = remoteWriteChain.catch(() => {}).then(saveRemoteState);
  }
  processPlayerScoreQueue();
}

function connectRealtimeForCurrentState() { return realtimeConnection.connect(); }

function handleOnline() { return realtimeConnection.handleOnline(); }

function handleOffline() { return realtimeConnection.handleOffline(); }

function exportBackup() {
  backupUi.exportBackup();
}

function importBackup(event) {
  backupUi.importBackup(event);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

function syncCopyrightYear() {
  if (!elements.copyrightYearRange) return;
  const startYear = 2026;
  const currentYear = new Date().getFullYear();
  elements.copyrightYearRange.textContent = currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`;
}

function isValidTournamentState(candidate) {
  return stateManager.isValidTournamentState(candidate);
}

function syncCreateFormDefaults() {
  elements.createTournamentForm.elements.tournamentName.value = defaultTournament.name;
  elements.createTournamentForm.elements.players.value = defaultTournament.players
    .map((player) => player.name)
    .join("\n");
  elements.createTournamentForm.elements.courts.value = defaultTournament.courts.length;
  elements.createTournamentForm.elements.adminParticipates.checked = false;
  elements.createTournamentForm.elements.adminPlayerName.value = profile?.displayName?.trim() || "Admin";
  syncAdminPlayerChoice();
}

function syncAdminPlayerChoice() {
  const adminParticipates = elements.createTournamentForm.elements.adminParticipates.checked;
  elements.adminPlayerNameField.classList.toggle("hidden", !adminParticipates);
  elements.createTournamentForm.elements.adminPlayerName.required = adminParticipates;
}

function syncAdminPlayerNameFromProfile() {
  const name = profile?.displayName?.trim();
  const field = elements.createTournamentForm?.elements.adminPlayerName;
  if (name && field && (!field.value.trim() || field.value.trim() === "Admin")) field.value = name;
}

function syncJoinPreview() {
  const inputName = elements.joinTournamentForm.elements.playerName.value.trim();
  const name = inputName || profile?.displayName || t("setup.yourName");
  const avatarId = profile?.avatarId || defaultAvatarId;
  elements.joinNamePreview.textContent = name;
  elements.joinAvatarPreview.src = avatarUrl({ name, avatarId });
  elements.joinAvatarPreviewFrame?.setAttribute("style", accentStyle(profile?.accent ?? "gold"));
}

function syncJoinFormFromProfile() {
  if (!profile || !elements.joinTournamentForm) return;
  if (!elements.joinTournamentForm.elements.playerName.value) {
    elements.joinTournamentForm.elements.playerName.value = profile.displayName;
  }
}

function prefillInviteCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const inviteCode = params.get("join") ?? params.get("code");
  if (inviteCode) prefillJoinForm(inviteCode);
}

function prefillJoinForm(inviteCode) {
  elements.joinTournamentForm.elements.inviteCode.value = inviteCode.trim().toUpperCase();
}

function showStart() {
  return workspaceNavigation.showStart();
}

function showWorkspace(view = "admin") {
  return workspaceNavigation.showWorkspace(view);
}

function showModule(moduleName) {
  return workspaceNavigation.showModule(moduleName);
}

function activateTab(view) {
  return workspaceNavigation.activateTab(view);
}

function normalizeWorkspaceModule(view) { return moduleRouting.normalizeWorkspaceModule(view); }
function normalizeModule(moduleName) { return moduleRouting.normalizeModule(moduleName); }
function fallbackTournamentModule() { return moduleRouting.fallbackTournamentModule(); }
function workspaceModuleFromActiveModule() { return moduleRouting.workspaceModuleFromActiveModule(); }

function hasActiveTournament() { return sessionPolicy.hasActiveTournament(); }
function isCurrentUserAdmin() { return sessionPolicy.isCurrentUserAdmin(); }
function hasTournamentForInvite(inviteCode, loadedRemote = false) { return sessionPolicy.hasTournamentForInvite(inviteCode, loadedRemote); }
function setLocalRole(role) { return sessionPolicy.setLocalRole(role); }
function currentLocalRole() { return sessionPolicy.currentLocalRole(); }

function renderRoleVisibility() {
  return workspaceNavigation.renderRoleVisibility();
}

function toggleTvMode() {
  if (!tvMode && !window.PADELSTAR_TEST_MODE) {
    const inviteCode = state?.inviteCode ? `?spectate=${encodeURIComponent(state.inviteCode)}` : "";
    window.location.href = `tv.html${inviteCode}`;
    return;
  }
  tvMode = !tvMode;
  if (tvMode) showModule("tournament");
  document.body.classList.toggle("tv-mode", tvMode);
  elements.tvModeButton?.setAttribute("aria-pressed", String(tvMode));
  elements.tvModeButton?.setAttribute("data-i18n", tvMode ? "actions.exitTvMode" : "actions.tvMode");
  if (elements.tvModeButton) elements.tvModeButton.textContent = t(tvMode ? "actions.exitTvMode" : "actions.tvMode");
}

function activateAdminPanel(panel) {
  return workspaceNavigation.activateAdminPanel(panel);
}

function render() {
  if (window.PADELSTAR_TEST_MODE) return;

  const matches = getAllMatches();
  applyLanguage();
  accountAuth?.render();
  renderProfile();
  renderStartResume();
  renderRoleVisibility();
  elements.tournamentTitle.textContent = state.name;
  elements.roundLabel.textContent = t("tournament.roundLabel", { round: Math.max(state.currentRound, 1) });
  elements.adminInviteCode.textContent = state.inviteCode;
  elements.joinLink.value = createJoinLink();
  if (elements.spectatorLink) elements.spectatorLink.value = createSpectatorLink();
  elements.joinQrCode.src = createQrCodeUrl(createJoinLink());
  renderNotificationControl();
  renderAdminIdentity();
  elements.tournamentStatus.textContent = tournamentStatusText(state.status);
  elements.playerCount.textContent = t("players.count", { count: state.players.length });
  elements.matchCount.textContent = t("matches.count", { count: matches.length });
  elements.courtSettingsForm.elements.courtList.value = courtsInputValue();
  renderCourtNames();
  elements.tournamentSettingsForm.elements.format.value = state.settings.format;
  elements.tournamentSettingsForm.elements.cupTeamSetupMode.value = state.settings.cupTeamSetupMode;
  elements.tournamentSettingsForm.elements.includesThirdPlaceMatch.checked = state.settings.includesThirdPlaceMatch;
  elements.tournamentSettingsForm.elements.pointMode.value = state.settings.pointMode;
  elements.tournamentSettingsForm.elements.gamesToWinSet.value = state.settings.gamesToWinSet;
  elements.tournamentSettingsForm.elements.setsToWinMatch.value = state.settings.setsToWinMatch;
  elements.generateRoundButton.disabled = Boolean(generateRoundBlockReason());
  elements.generateRoundButton.textContent = tournamentActionText();
  elements.completeRoundButton.textContent = t("finishTournament");
  elements.completeRoundButton.disabled = state.status === "Avsluttet" || getAllMatches().length === 0;
  elements.endTournamentButton.closest(".button-row").classList.add("hidden");
  elements.courtSettingsForm.elements.courtList.disabled = getActiveRound()?.status === "active" || state.status === "Avsluttet";
  elements.courtSettingsForm.querySelector("button").disabled = getActiveRound()?.status === "active" || state.status === "Avsluttet";
  elements.addPlayerForm.elements.playerName.disabled = state.rounds.length > 0;
  elements.addPlayerForm.querySelector("button").disabled = state.rounds.length > 0;
  elements.cupTeamSetupModeField.classList.toggle("hidden", state.settings.format !== "cup");
  elements.cupTeamSetupModeField.querySelector("select").disabled = state.rounds.length > 0;
  elements.cupThirdPlaceField.classList.toggle("hidden", state.settings.format !== "cup");
  elements.cupThirdPlaceField.querySelector("input").disabled = state.rounds.length > 0;

  renderLobbyStatus();
  renderPlayers();
  renderRoundSummary();
  renderCupBracket();
  renderMatches(matches);
  renderResultSubmissions(matches);
  renderStandings(matches);
  renderPlayerIdentity();
  renderLeaveTournamentControl();
  renderAvailabilityControl();
  renderPlayerNextMatch(matches);
  renderPlayerResultForm(matches);
  renderPlayerStatus(matches);
  renderAdminLiveOverview(matches);
  renderAssistant();
  courtQueue.render(matches);
  renderRules();
  renderExistingPlayerList();
  renderCupTeamBuilder();
  renderSyncControls();
}

function syncConnectionStatus() {
  adminStatus.syncConnectionStatus();
}

function applyTheme() {
  document.body.dataset.theme = "classic";
  const themeColor = document.querySelector('meta[name="theme-color"]');
  themeColor?.setAttribute("content", "#07101d");
}

function pendingRemoteWriteCount() {
  return Number(pendingAdminSync) + pendingPlayerScores.length;
}

function renderSyncControls() {
  adminStatus.renderSyncControls();
}

function applyLanguage() {
  localizeGeneratedCourtNames();
  i18nUi.applyLanguage({ state, elements, i18n, translate: t, applyTheme });
}

function localizeGeneratedCourtNames() {
  const courtPattern = /^(Bane|Court|Pista|Platz|Terrain|Bana)\s+\d+$/i;
  const courtName = (court) => `${t("common.court")} ${court.courtNumber}`;
  const previousNames = new Map(state.courts.map((court) => [court.id, court.name]));
  state.courts.forEach((court) => {
    if (courtPattern.test(String(court.name ?? ""))) court.name = courtName(court);
  });
  state.rounds.flatMap((round) => round.matches ?? []).forEach((match) => {
    if (courtPattern.test(String(match.courtName ?? ""))) {
      const court = state.courts.find((item) => item.courtNumber === match.plannedCourtIndex + 1 || previousNames.get(item.id) === match.courtName);
      if (court) match.courtName = courtName(court);
    }
  });
}

function syncLanguageOptions() {
  i18nUi.syncLanguageOptions({ select: elements.languageSelect, i18n });
}

function t(key, values = {}) {
  const language = state.settings?.language ?? "nb";
  return i18n?.translate(language, key, values) ?? key;
}

function renderStartResume() {
  adminStatus.renderStartResume();
}

function renderLobbyStatus() {
  adminStatus.renderLobbyStatus();
}

function renderPlayers() {
  playerList.renderPlayers();
}

function renderAdminLiveOverview(matches) {
  return workspaceOverview.renderAdminLiveOverview(matches);
}

function renderAssistant() {
  return workspaceOverview.renderAssistant();
}

function renderCupTeamBuilder() {
  return workspaceOverview.renderCupTeamBuilder();
}

function renderRoundSummary() {
  return workspaceOverview.renderRoundSummary();
}

function renderMatches(matches) {
  const selectedPlayer = getPlayerById(state.selectedPlayerId);
  const playerMatches = selectedPlayer
    ? matches.filter((match) => matchIncludesPlayer(match, selectedPlayer.id))
    : [];
  const filteredAdminMatches = matchList.filterMatches(matches, matchFilters.admin);
  const filteredPlayerMatches = matchList.filterMatches(playerMatches, matchFilters.player);
  matchList.renderGroupedMatches(
    elements.adminMatches,
    filteredAdminMatches,
    t("tournament.noMatches"),
    (match) => createMatchCard(match, isEditableAdminMatch(match)),
  );
  matchList.renderGroupedMatches(
    elements.playerMatches,
    filteredPlayerMatches,
    selectedPlayer ? t("tournament.noPlayerMatches") : t("tournament.choosePlayerForMatches"),
    (match) => createMatchCard(match, isEditablePlayerMatch(match, selectedPlayer), selectedPlayer?.id, true),
  );
  matchList.renderSpectatorMatches(matches);
  scheduleWrappedScorecardPlayers();
}

let wrappedScorecardPlayersFrame = 0;

function scheduleWrappedScorecardPlayers() {
  cancelAnimationFrame(wrappedScorecardPlayersFrame);
  wrappedScorecardPlayersFrame = requestAnimationFrame(() => {
    document.querySelectorAll(".scorecard-players .team-player").forEach((playerRow) => {
      const badge = playerRow.querySelector(".team-player-badge");
      if (!badge) return;
      const styles = getComputedStyle(badge);
      const lineHeight = Number.parseFloat(styles.lineHeight) || Number.parseFloat(styles.fontSize) * 1.2;
      playerRow.classList.toggle("name-wraps", badge.scrollHeight > lineHeight * 1.35);
    });
  });
}

window.addEventListener("resize", scheduleWrappedScorecardPlayers);

function createMatchCard(match, editable, highlightedPlayerId = null, scoreOnly = false) {
  return matchCard.createMatchCard(match, editable, highlightedPlayerId, scoreOnly);
}

function isEditablePlayerMatch(match, player) {
  return Boolean(player && match.state === "playing" && matchIncludesPlayer(match, player.id));
}

function renderStandings(matches) {
  standings.renderStandings(matches);
}

function renderPlayerIdentity() {
  playerControls.renderPlayerIdentity();
}

function renderLeaveTournamentControl() {
  playerControls.renderLeaveTournamentControl();
}

function renderAvailabilityControl() {
  playerControls.renderAvailabilityControl();
}

function playerStatusLabel(player) {
  if (player.availability === "away") return t("player.away");
  if (localLeftPlayerId === player.id && isCurrentUserAdmin()) return t("player.leftDevice");
  const currentRound = getActiveRound();
  if (currentRound?.matches.some((match) => match.state === "playing" && matchIncludesPlayer(match, player.id))) {
    return t("player.playingNow");
  }
  if (currentRound?.matches.some((match) => match.state === "waiting" && matchIncludesPlayer(match, player.id))) {
    return t("common.waiting");
  }
  return player.joinedFrom === "self" ? t("player.joinedSelf") : t("player.addedByAdmin");
}

function renderCupBracket() {
  cupBracket.renderCupBracket();
}

function renderExistingPlayerList() {
  playerList.renderExistingPlayerList();
}

function renderPlayerNextMatch(matches) {
  playerNextMatch.renderPlayerNextMatch(matches);
}

function renderPlayerResultForm(matches) {
  if (!elements.playerResultForm || !elements.playerResultPanel) return;
  const player = getPlayerById(state.selectedPlayerId);
  const ownMatches = player ? matches.filter((match) => matchIncludesPlayer(match, player.id) && !["cancelled"].includes(match.state)) : [];
  elements.playerResultPanel.classList.toggle("hidden", !player || ownMatches.length === 0 || state.status === "Avsluttet");
  if (!player || ownMatches.length === 0) return;
  const previousMatchId = elements.playerResultMatch.value;
  elements.playerResultMatch.replaceChildren(...ownMatches.map((match) => {
    const option = document.createElement("option");
    option.value = match.id;
    option.textContent = `${matchContextText(match)} · ${match.teamOne.displayName} vs ${match.teamTwo.displayName}`;
    return option;
  }));
  if (ownMatches.some((match) => match.id === previousMatchId)) elements.playerResultMatch.value = previousMatchId;
  const selectedMatch = getMatchById(elements.playerResultMatch.value) ?? ownMatches[0];
  elements.playerResultMatch.value = selectedMatch.id;
  elements.playerResultForm.elements.teamOne.value = selectedMatch.currentSet?.teamOne ?? "";
  elements.playerResultForm.elements.teamTwo.value = selectedMatch.currentSet?.teamTwo ?? "";
  const resultState = window.PadelstarScoreSubmissions?.forMatch(state, selectedMatch.id);
  elements.playerResultStatus.textContent = resultState?.status === "conflict" ? t("score.conflict") : resultState?.status === "confirmed" ? t("score.confirmed") : "";
  elements.playerResultStatus.className = `status-chip ${resultState?.status === "conflict" ? "error" : ""}`;
}

function renderResultSubmissions(matches) {
  const container = elements.adminResultSubmissions;
  if (!container) return;
  const submissions = (state.scoreSubmissions ?? []).filter((submission) => submission.status !== "rejected");
  if (submissions.length === 0) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `<div class="panel-heading"><h3>${t("score.submissionsTitle")}</h3><span>${submissions.length}</span></div>${submissions.map((submission) => {
    const match = matches.find((item) => item.id === submission.matchId);
    if (!match) return "";
    const player = getPlayerById(submission.submittedBy);
    return `<article class="result-submission ${submission.status === "conflict" ? "is-conflict" : ""}">
      <div><strong>${escapeHtml(matchContextText(match))}</strong><span>${escapeHtml(player?.name ?? t("common.player"))} · ${escapeHtml(new Date(submission.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}</span></div>
      <strong>${submission.teamOne}-${submission.teamTwo}</strong>
      <button class="secondary review-result-button" type="button" data-submission-id="${escapeAttribute(submission.id)}">${t("score.useSubmission")}</button>
    </article>`;
  }).join("")}`;
  container.querySelectorAll(".review-result-button").forEach((button) => {
    button.addEventListener("click", () => reviewPlayerSubmission(button.dataset.submissionId));
  });
}

function reviewPlayerSubmission(submissionId) {
  if (!isCurrentUserAdmin()) return;
  const submission = (state.scoreSubmissions ?? []).find((item) => item.id === submissionId);
  const match = getMatchById(submission?.matchId);
  if (!submission || !match) return;
  if (isSupabaseReady()) {
    window.PadelstarScoreSubmissions?.resolve(state, match.id, submission.teamOne, submission.teamTwo, "admin");
    eventLog.record("result_resolved", "match", match.id, { teamOne: submission.teamOne, teamTwo: submission.teamTwo, sourceSubmissionId: submission.id });
    saveState();
    queueRemoteSetResult(match, submission.teamOne, submission.teamTwo);
    render();
    return;
  }
  saveMatchResult(match, submission.teamOne, submission.teamTwo);
  render();
}

function submitPlayerResult(matchId, teamOne, teamTwo) {
  const player = getPlayerById(state.selectedPlayerId);
  const match = getMatchById(matchId);
  if (!player || !match || !matchIncludesPlayer(match, player.id) || !window.PadelstarScoreSubmissions) return;
  const validationError = scoring.validateSetScore(teamOne, teamTwo, state.settings);
  if (validationError) {
    showToast(validationError, "status-message-error");
    return;
  }
  const result = window.PadelstarScoreSubmissions.add(state, window.PadelstarScoreSubmissions.createSubmission({
    matchId, teamOne, teamTwo, submittedBy: player.id,
  }));
  eventLog.record("score_submitted", "match", matchId, { teamOne, teamTwo, status: result.status });
  saveState();
  render();
  showToast(result.status === "conflict" ? t("score.conflictHint") : t("score.submitted"), result.status === "conflict" ? "status-message-error" : "status-message-success");
  if (remotePlayerResult) void remotePlayerResult.submit(matchId, teamOne, teamTwo);
}

function notifyPlayerMatch(match, kind) {
  if (!notificationsEnabled() || !match?.id || !navigator.serviceWorker?.controller) return;
  const notificationKey = `${state.id}:${match.id}:${kind}`;
  const lastKey = localStorage.getItem("padelstar-last-notification");
  if (lastKey === notificationKey) return;
  localStorage.setItem("padelstar-last-notification", notificationKey);
  navigator.serviceWorker.controller.postMessage({
    type: "padelstar-show-notification",
    title: t("notifications.matchReadyTitle"),
    body: kind === "playing" ? t("notifications.matchPlayingBody") : t("notifications.matchReadyBody"),
    tag: `padelstar-match-${match.id}`,
  });
}

function renderPlayerStatus(matches) {
  playerStatus.renderPlayerStatus(matches);
}

function renderRules() {
  rules.renderRules();
}

function openLargeScore(matchId) {
  const match = getMatchById(matchId);
  if (!match || match.state !== "playing") return;
  largeScoreMatchId = matchId;
  elements.largeScoreDialog.showModal();
  renderLargeScore();
}

function openSetScoreDialog(matchId) {
  setScoreDialog.openSetScoreDialog(matchId);
}

function closeSetScoreDialog() {
  setScoreDialog.closeSetScoreDialog();
}

function closeLargeScore() {
  elements.largeScoreDialog.close();
}

function renderLargeScore() {
  largeScore.renderLargeScore(largeScoreMatchId);
}

function avatarUrl(player) {
  return playerVisuals.avatarUrl?.(player) ?? avatarSystem.url(player);
}

function avatarMarkup(player, className = "avatar", size = 34) {
  return playerVisuals.avatarMarkup(player, className, size);
}

function createJoinLink() {
  return linkUtils.createJoinLink({ location: window.location, inviteCode: state.inviteCode });
}

function createSpectatorLink() {
  return linkUtils.createSpectatorLink({ location: window.location, inviteCode: state.inviteCode });
}

function createQrCodeUrl(text) {
  return linkUtils.createQrCodeUrl(text);
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    elements.copyStatus.textContent = successMessage;
  } catch {
    elements.copyStatus.textContent = t("messages.copyFallback");
    if (text === createJoinLink()) elements.joinLink.select();
  }
}

async function shareCurrentTournament() {
  const shareData = {
    title: state.name,
    text: t("share.shareText", { code: state.inviteCode }),
    url: createJoinLink(),
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      observability?.emit("share_completed", { method: "native" });
      elements.copyStatus.textContent = t("share.shared");
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
    observability?.error("share_failed", error, { method: "native" });
  }
  await copyText(createJoinLink(), t("share.shareFallback"));
  observability?.emit("share_completed", { method: "copy" });
}

async function sendPushNotification(kind, matchId = null) {
  return notificationSystem.sendPushNotification(kind, matchId);
}

function notificationsSupported() {
  return notificationSystem.notificationsSupported();
}

function notificationsEnabled() {
  return notificationSystem.notificationsEnabled();
}

function renderNotificationControl() {
  return notificationSystem.renderNotificationControl();
}

async function toggleNotifications() {
  return notificationSystem.toggleNotifications();
}

function base64ToUint8Array(value) {
  return notificationSystem.base64ToUint8Array(value);
}

async function subscribeToPush() {
  return notificationSystem.subscribeToPush();
}

async function unsubscribeFromPush() {
  return notificationSystem.unsubscribeFromPush();
}

function joinTournament(name, avatarId) {
  const existingPlayer = findPlayerByName(name);
  if (existingPlayer) return existingPlayer;
  const player = linkProfileToPlayer(addPlayer(name, "self", avatarId));
  player.guest = true;
  player.participantType = "guest";
  return player;
}

function parsePlayerNames(value) {
  return playerState.parsePlayerNames(value);
}

function addPlayers(names, joinedFrom) {
  playerState.addPlayers(names, joinedFrom);
}

function addPlayer(name, joinedFrom, avatarId) {
  return playerState.addPlayer(name, joinedFrom, avatarId);
}

function replacePlayer(playerId, name) {
  return playerState.replacePlayer(playerId, name);
}

function updatePlayer(playerId, updates) {
  playerState.updatePlayer(playerId, updates);
}

function removePlayer(playerId) {
  playerState.removePlayer(playerId);
}

function leaveCurrentTournament(options = {}) {
  const selectedPlayer = getPlayerById(state.selectedPlayerId);
  if (!selectedPlayer) return false;

  const wasAdmin = isCurrentUserAdmin();

  const shouldConfirm = options.confirm !== false;
  const pendingScoreText = pendingPlayerScores.length > 0
    ? t("player.leavePendingScores")
    : "";
  if (shouldConfirm && !confirm(t("player.leaveConfirm", {
    name: selectedPlayer.name,
    pendingScoreText,
  }))) {
    return false;
  }

  state.selectedPlayerId = null;
  localLeftPlayerId = selectedPlayer.id;
  state.playerToken = null;
  pendingPlayerScores = [];

  if (wasAdmin) {
    persistSyncMetadata();
    setLocalRole("admin");
    saveState({ remote: false });
  } else {
    removeRealtimeChannel();
    tournamentLibrary.remove(state.id);
    const language = state.settings?.language ?? "nb";
    state = structuredClone(defaultTournament);
    state.settings.language = language;
    state.adminToken = null;
    state.playerToken = null;
    pendingAdminSync = false;
    remoteConflict = false;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(recoveryStorageKey);
    localStorage.removeItem(roleStorageKey);
    localStorage.removeItem(syncStorageKey);
  persistence.removeKeys([storageKey, recoveryStorageKey, roleStorageKey, syncStorageKey]);
    if (!window.PADELSTAR_TEST_MODE) {
      elements.joinTournamentForm.reset();
      syncCreateFormDefaults();
      syncJoinPreview();
    }
    spectatorMode = false;
  }

  if (!window.PADELSTAR_TEST_MODE) {
    if (wasAdmin) showWorkspace("admin");
    else showStart();
    render();
  }
  return true;
}

function leaveSpectatorView() {
  const previousRole = spectatorPreviousRole;
  const shouldClearLocalView = previousRole === "spectator";
  spectatorMode = false;

  const url = new URL(window.location.href ?? window.location.origin);
  url.searchParams.delete(spectatorQueryKey);
  window.history?.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);

  if (shouldClearLocalView) {
    removeRealtimeChannel();
    tournamentLibrary.remove(state.id);
    const language = state.settings?.language ?? "nb";
    state = structuredClone(defaultTournament);
    state.settings.language = language;
    state.adminToken = null;
    state.playerToken = null;
    pendingAdminSync = false;
    pendingPlayerScores = [];
    remoteConflict = false;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(recoveryStorageKey);
    localStorage.removeItem(roleStorageKey);
    localStorage.removeItem(syncStorageKey);
    persistence.removeKeys([storageKey, recoveryStorageKey, roleStorageKey, syncStorageKey]);
    if (!window.PADELSTAR_TEST_MODE) {
      elements.joinTournamentForm.reset();
      syncCreateFormDefaults();
      syncJoinPreview();
    }
  } else {
    setLocalRole(previousRole);
  }

  spectatorPreviousRole = "spectator";
  if (!window.PADELSTAR_TEST_MODE) {
    showStart();
    render();
  }
}

async function leaveCurrentTournamentWithDialog() {
  const selectedPlayer = getPlayerById(state.selectedPlayerId);
  if (!selectedPlayer) return false;
  const pendingScoreText = pendingPlayerScores.length > 0
    ? t("player.leavePendingScores")
    : "";
  const accepted = await requestConfirmation(t("player.leaveConfirm", {
    name: selectedPlayer.name,
    pendingScoreText,
  }));
  return accepted ? leaveCurrentTournament({ confirm: false }) : false;
}

async function toggleSelectedPlayerAvailability() {
  return playerActions.toggleSelectedPlayerAvailability();
}

function updateTournamentRules(options) {
  return adminActions.updateTournamentRules(options);
}

function saveManualCupTeams(value) {
  return adminActions.saveManualCupTeams(value);
}

function endTournament() {
  const activeRound = getActiveRound();
  if (activeRound && !["finished", "completed"].includes(activeRound.status)) {
    activeRound.status = "completed";
    activeRound.matches.forEach((match) => {
      if (match.state !== "finished") {
        match.state = "cancelled";
        match.status = "cancelled";
      }
    });
  }
  state.status = "Avsluttet";
  if (window.PadelstarHistoricalRecords) {
    window.PadelstarHistoricalRecords.record(localStorage, tournamentHistoryStorageKey,
      window.PadelstarHistoricalRecords.create(state, window.PadelstarRetentionPolicy));
  }
  saveProfileHistory();
  if (window.PadelstarRetentionPolicy) {
    state = window.PadelstarRetentionPolicy.sanitizeEndedTournamentState(state);
  }
}

function updateCourtsFromInput(value) {
  return adminActions.updateCourtsFromInput(value);
}

function updateCourtNames(names) {
  return adminActions.updateCourtNames(names);
}

function renderCourtNames() {
  if (!elements.courtNamesList) return;
  const locked = state.rounds.length > 0 || state.status === "Avsluttet";
  elements.courtNamesList.innerHTML = state.courts.map((court) => `
    <label class="court-name-row">
      <span>${escapeHtml(t("common.court"))} ${court.courtNumber}</span>
      <input name="courtName" type="text" maxlength="80" value="${escapeAttribute(court.name ?? "")}" placeholder="${escapeAttribute(t("common.court"))} ${court.courtNumber}" ${locked ? "disabled" : ""}>
    </label>`).join("");
  const submitButton = elements.courtNamesForm?.querySelector("button");
  if (submitButton) submitButton.disabled = locked;
}

function parseCourtNumbers(value) {
  const numbers = String(value)
    .split(/[\s,;]+/)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isInteger(item) && item > 0 && item <= 99);
  return [...new Set(numbers)].slice(0, 12).sort((left, right) => left - right).length
    ? [...new Set(numbers)].slice(0, 12).sort((left, right) => left - right)
    : [1];
}

function courtsInputValue() {
  return state.courts.map((court) => court.courtNumber).join(", ");
}

function canGenerateRound() {
  return tournamentStatus.canGenerateRound();
}

function tournamentActionText() {
  return tournamentStatus.tournamentActionText();
}

function generateRoundBlockReason() {
  return tournamentStatus.generateRoundBlockReason();
}

function canCompleteRound(round) {
  return tournamentStatus.canCompleteRound(round);
}

function roundProgress(round) {
  return tournamentStatus.roundProgress(round);
}

function isEditableAdminMatch(match) {
  const activeRound = getActiveRound();
  return Boolean(state.status !== "Avsluttet" && activeRound && activeRound.matches.some((roundMatch) => roundMatch.id === match.id));
}

function teamDisplay(team, variant = "default") {
  return playerVisuals.teamDisplay(team, variant);
}

function accentStyle(accent) {
  return accentSystem.accentStyle(accent);
}

function teamAccentStyle(team) {
  return playerVisuals.teamAccentStyle(team);
}

function normalizeAccent(accent, fallbackIndex = 0) {
  return accentSystem.normalizeAccent(accent, fallbackIndex);
}

function activateRound(round) {
  state.rounds.forEach((item) => {
    if (item.status === "active") item.status = "completed";
  });
  round.status = "active";
  round.startedAt = round.startedAt ?? new Date().toISOString();
  let startedMatches = 0;
  const occupiedPlayerIds = new Set();
  state.courts.forEach((court) => {
    const nextMatch = window.PadelstarTournamentScheduler?.assignNextCourt(round.matches, court, occupiedPlayerIds)
      ?? round.matches.find((match) => match.state === "waiting" && !match.courtId);
    if (!nextMatch || startedMatches >= state.courts.length) return;
    nextMatch.state = "playing";
    nextMatch.status = "active";
    nextMatch.queuePosition = null;
    nextMatch.courtId = court.id;
    nextMatch.courtName = court.name;
    (matchPlayers(nextMatch) ?? []).forEach((player) => occupiedPlayerIds.add(player.id));
    startedMatches += 1;
  });
  state.currentRound = round.roundNumber;
  state.status = "Runde pågår";
}

function getNextScheduledRound() {
  return state.rounds.find((round) => round.status === "scheduled");
}

function generateFullTournamentSchedule() {
  return tournamentRuntime.generateFullTournamentSchedule();
}

function generateCupTournament() {
  return tournamentRuntime.generateCupTournament();
}

function createNextCupRound() {
  return tournamentRuntime.createNextCupRound();
}

function cupCanAdvance() {
  return tournamentRuntime.cupCanAdvance();
}

function cupCanFinalize() {
  return tournamentRuntime.cupCanFinalize();
}

function startNextScheduledRound() {
  return tournamentRuntime.startNextScheduledRound();
}

function buildSchedule(players, format = "roundRobin") {
  return tournamentEngine.buildSchedule(players, format);
}

function generateSinglesRounds(players) {
  return tournamentEngine.generateSinglesRounds(players);
}

function generatePartnerRounds(players) {
  return tournamentEngine.generatePartnerRounds(players);
}

function generateRoundMatches(teams, rotationNumber, sittingOut) {
  return tournamentEngine.generateRoundMatches(teams, rotationNumber, sittingOut, state.id);
}

function rotateRoundParticipants(participants) {
  return tournamentEngine.rotateRoundParticipants(participants);
}

function createTeam(players) {
  return tournamentEngine.createTeam(players);
}

function finishMatch(match) {
  return tournamentRuntime.finishMatch(match);
}

function activateNextWaitingMatch(match) {
  return tournamentRuntime.activateNextWaitingMatch(match);
}

function captureMatchUndoState(match) {
  return matchActions.captureMatchUndoState(match);
}

function undoMatch(match) {
  return matchActions.undoMatch(match);
}

function markCupCompleteIfDone() {
  return tournamentRuntime.markCupCompleteIfDone();
}

function saveMatchResult(match, teamOne, teamTwo) {
  return scoreActions.saveMatchResult(match, teamOne, teamTwo);
}

function saveSetResult(match, teamOne, teamTwo) {
  return scoreActions.saveSetResult(match, teamOne, teamTwo);
}

function validateSetScore(teamOne, teamTwo) {
  return scoreActions.validateSetScore(teamOne, teamTwo);
}

function awardTennisPoint(match, teamIndex) {
  return scoreActions.awardTennisPoint(match, teamIndex);
}

function isSetComplete(teamOne, teamTwo) {
  return scoreActions.isSetComplete(teamOne, teamTwo);
}

function hasMatchWinner(match) {
  return scoreActions.hasMatchWinner(match);
}

function setsWonByTeam(match, teamIndex) {
  return scoreActions.setsWonByTeam(match, teamIndex);
}

function startMatch(match) {
  return matchActions.startMatch(match);
}

function reopenMatch(match) {
  return matchActions.reopenMatch(match);
}

async function cancelMatch(match) {
  return matchActions.cancelMatch(match);
}

async function setWalkover(match, teamIndex) {
  return matchActions.setWalkover(match, teamIndex);
}

function updateMatchCourt(match, courtName) {
  return matchActions.updateMatchCourt(match, courtName);
}

function leaderboardEntries(matches) {
  return scoring.leaderboardEntries(state.players, matches, state.settings.pointMode);
}

function pointsByPlayer(matches, pointMode) {
  return scoring.pointsByPlayer(matches, pointMode);
}

function statsForPlayer(player, matches) {
  return scoring.statsForPlayer(player, matches);
}

function applyGamePoints(match, points) {
  return scoring.applyGamePoints(match, points);
}

function applySetPoints(match, points) {
  return scoring.applySetPoints(match, points);
}

function applyMatchPoints(match, points) {
  return scoring.applyMatchPoints(match, points);
}

function award(value, team, points) {
  return scoring.award(value, team, points);
}

function playerTeamIndex(player, match) {
  return scoring.playerTeamIndex(player, match);
}

function matchPlayers(match) {
  return scoring.matchPlayers(match);
}

function uniquePlayers(players) {
  return scoring.uniquePlayers(players);
}

function matchIncludesPlayer(match, playerId) {
  return scoring.matchIncludesPlayer(match, playerId);
}

function playerTournamentState(player, matches) {
  return scoring.playerTournamentState(player, matches, getActiveRound());
}

function playerPlacement(player, matches) {
  const index = leaderboardEntries(matches).findIndex((entry) => entry.player.id === player.id);
  return index >= 0 ? index + 1 : null;
}

function getActiveRound() {
  return state.rounds.find((round) => round.status === "active") ?? state.rounds.at(-1);
}

function getRoundForMatch(match) {
  return state.rounds.find((round) => round.matches.some((roundMatch) => roundMatch.id === match.id));
}

function getAllMatches() {
  return state.rounds.flatMap((round) => round.matches);
}

function getMatchById(matchId) {
  return getAllMatches().find((match) => match.id === matchId);
}

function getPlayerById(id) {
  return state.players.find((player) => player.id === id);
}

function findPlayerByName(name) {
  return state.players.find((player) => player.name.localeCompare(name, "nb", { sensitivity: "accent" }) === 0);
}

function matchStateText(stateName) {
  return {
    waiting: t("common.waiting"),
    playing: t("common.playing"),
    finished: t("common.finished"),
    cancelled: t("common.cancelled"),
  }[stateName] ?? stateName;
}

function tournamentStatusText(status) {
  return {
    "Klar": t("common.ready"),
    "Runde pågår": t("common.playing"),
    "Runde fullført": t("common.completed"),
    "Avsluttet": t("common.finished"),
    "Cup ferdig": t("tournament.cupFinished"),
  }[status] ?? status;
}

function matchContextText(match) {
  return rendering.matchContextText(match);
}

function globalMatchNumber(match) {
  const index = getAllMatches().findIndex((item) => item.id === match.id);
  return index >= 0 ? index + 1 : null;
}

function primaryMatchHeadline(match) {
  return rendering.primaryMatchHeadline(match);
}

function startingTeamText(match) {
  return match.startingTeamIndex === 0 ? t("common.teamOne") : t("common.teamTwo");
}

function scoreSummary(match) {
  return rendering.scoreSummary(match);
}

function setScoreText(match) {
  return `${match.currentSet.teamOne}-${match.currentSet.teamTwo}`;
}

function gameScoreText(match) {
  const currentGame = match.currentGame ?? { teamOne: 0, teamTwo: 0 };
  return `${tennisPointLabel(currentGame.teamOne)}-${tennisPointLabel(currentGame.teamTwo)}`;
}

function tennisPointLabel(value) {
  return tennisPointLabels[value] ?? "0";
}

function sittingOutSummary(match) {
  return rendering.sittingOutSummary(match);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function appendEmptyText(container, emptyText) {
  const empty = document.createElement("p");
  empty.className = "hint";
  empty.textContent = emptyText;
  container.append(empty);
}

function createInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "padelstar";
}

function migrateLegacyLocalStorage() {
  if (!localStorage.getItem(storageKey) && localStorage.getItem(legacyStorageKey)) {
    localStorage.setItem(storageKey, localStorage.getItem(legacyStorageKey));
  }
  if (!localStorage.getItem(roleStorageKey) && localStorage.getItem(legacyRoleStorageKey)) {
    localStorage.setItem(roleStorageKey, localStorage.getItem(legacyRoleStorageKey));
  }
}

function restoreInitialView() {
  return initialView.restore({
    windowRef: window,
    storage: localStorage,
    keys: { storageKey, spectatorQueryKey },
    callbacks: {
      currentLocalRole: () => currentLocalRole(),
      hasSelectedPlayer: () => Boolean(state.selectedPlayerId),
      hasSupabaseClient: () => Boolean(supabaseClient),
      hasTournamentForInvite: (inviteCode) => hasTournamentForInvite(inviteCode),
      isCurrentUserAdmin: () => isCurrentUserAdmin(),
      loadRemoteTournamentByInvite: (inviteCode) => loadRemoteTournamentByInvite(inviteCode),
      render: () => render(),
      setLocalRole: (role) => setLocalRole(role),
      setSpectatorMode: (enabled) => { spectatorMode = enabled; },
      setSpectatorPreviousRole: (role) => { spectatorPreviousRole = role; },
      showModule: (moduleName) => showModule(moduleName),
      showWorkspace: (view) => showWorkspace(view),
    },
  });
}

if (window.PADELSTAR_TEST_MODE) {
  window.PadelstarTest = {
    createTournament,
    createPlayer,
    createTeam,
    buildSchedule,
    generateSinglesRounds,
    generatePartnerRounds,
    generateRoundMatches,
    generateFullTournamentSchedule,
    generateCupTournament,
    createNextCupRound,
    startNextScheduledRound,
    activateRound,
    saveSetResult,
    validateSetScore,
    awardTennisPoint,
    leaderboardEntries,
    pointsByPlayer,
    statsForPlayer,
    playerTournamentState,
    leaveCurrentTournament,
    leaveSpectatorView,
    createJoinLink,
    createSpectatorLink,
    normalizeModule,
    setLocalRole,
    currentLocalRole,
    isCurrentUserAdmin,
    hasTournamentForInvite,
    sanitizeSharedState,
    saveState,
    t,
    i18n,
    nextPowerOfTwo: tournamentRounds.nextPowerOfTwo,
    wasRecoveredFromLastGood: () => recoveredFromLastGood,
    getState: () => state,
    setState: (nextState) => {
      state = migrateState(nextState);
      return state;
    },
  };
} else {
  initializeApp();
  restoreInitialView();
  render();
}
