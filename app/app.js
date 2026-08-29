const legacyStorageKey = "padel-manager-demo";
const legacyRoleStorageKey = "padel-manager-role";
const storageKey = "padelstar-demo";
const roleStorageKey = "padelstar-role";
const profileStorageKey = "padelstar-profile";
const profileHistoryStorageKey = "padelstar-profile-history";
const notificationPreferenceKey = "padelstar-notifications";
const pushSubscriptionStorageKey = "padelstar-push-subscription";
const syncStorageKey = `${storageKey}-sync`;
const recoveryStorageKey = `${storageKey}-last-good`;
const publicAppUrl = "https://padelstar.app/";
const spectatorQueryKey = "spectate";
const playerAccentPalette = {
  blue: "#1a59f2",
  orange: "#e67a0a",
  mint: "#148f42",
  pink: "#d12e52",
  indigo: "#7030d1",
  teal: "#0a8080",
  red: "#c70a33",
  yellow: "#b88c00",
  gold: "#f0b52e",
  silver: "#616b7a",
  bronze: "#9e560f",
  sapphire: "#052e9e",
  emerald: "#0a7538",
  garnet: "#991020",
  amethyst: "#8524b8",
  onyx: "#1f2126",
};
const legacyAccentMap = {
  green: "mint",
  clay: "bronze",
  navy: "sapphire",
  coral: "orange",
};
const accents = Object.keys(playerAccentPalette);
const defaultAvatarId = "smash";
const tennisPointLabels = ["0", "15", "30", "40", "A"];
const avatarOptions = [
  { id: "smash", labelKey: "avatar.smash" },
  { id: "serve", labelKey: "avatar.serve" },
  { id: "wall", labelKey: "avatar.wall" },
  { id: "lob", labelKey: "avatar.lob" },
];
const i18n = window.PadelstarI18n;
const tournamentEngine = window.PadelstarTournamentEngine;
const scoring = window.PadelstarScoring;
const stateManager = window.PadelstarState;
const realtimeSync = window.PadelstarRealtime;
const offlineStorage = window.PadelstarOfflineStorage;
const profileManager = window.PadelstarProfiles;
const observability = window.PadelstarObservability;
let profile = null;

const defaultTournament = createTournament({
  name: "Risløkka Padel",
  inviteCode: "P4K7D",
  players: [],
  courtCount: 1,
});

let recoveredFromLastGood = false;
migrateLegacyLocalStorage();

let state = loadState();
profile = loadLocalProfile();
let largeScoreMatchId = null;
let activeModule = "landing";
let spectatorMode = false;
let localLeftPlayerId = null;
const supabaseSettings = window.PADELSTAR_SUPABASE ?? window.PADEL_MANAGER_SUPABASE ?? {};
let supabaseClient = supabaseSettings.url && supabaseSettings.anonKey && window.supabase
  ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  : null;
let supabaseClientActivated = false;
let realtimeChannel = null;
let realtimeTournamentId = null;
let realtimeReconnectTimer = null;
let realtimeReconnectAttempt = 0;
let realtimeConnectionState = "disconnected";
let realtimeConnectionGeneration = 0;
let realtimeRefreshPromise = null;
let remoteSaveTimer = null;
let remoteWriteChain = Promise.resolve();
let lastRemotePersistedSequence = 0;
let isApplyingRemoteState = false;
let remoteMutationSequence = 0;
let remoteConflict = false;
let moduleTransitionFrame = null;
let pendingAdminSync = loadPendingAdminSync();
let pendingPlayerScores = loadPendingPlayerScores();
if (pendingAdminSync) remoteMutationSequence = 1;
let playerScoreQueueRunning = false;
mirrorOfflineStorage();

const elements = {
  startView: document.querySelector("#startView"),
  setupAdminView: document.querySelector("#setupAdminView"),
  setupPlayerView: document.querySelector("#setupPlayerView"),
  workspaceView: document.querySelector("#workspaceView"),
  connectionStatus: document.querySelector("#connectionStatus"),
  resumePanel: document.querySelector("#resumePanel"),
  resumeTitle: document.querySelector("#resumeTitle"),
  resumeSummary: document.querySelector("#resumeSummary"),
  resumeTournamentButton: document.querySelector("#resumeTournamentButton"),
  createTournamentForm: document.querySelector("#createTournamentForm"),
  adminParticipatesInput: document.querySelector("#adminParticipatesInput"),
  adminPlayerNameField: document.querySelector("#adminPlayerNameField"),
  joinTournamentForm: document.querySelector("#joinTournamentForm"),
  joinAvatarPreview: document.querySelector("#joinAvatarPreview"),
  joinNamePreview: document.querySelector("#joinNamePreview"),
  avatarPicker: document.querySelector("#avatarPicker"),
  languageSelect: document.querySelector("#languageSelect"),
  copyrightYearRange: document.querySelector("#copyrightYearRange"),
  showExistingPlayersButton: document.querySelector("#showExistingPlayersButton"),
  existingPlayerList: document.querySelector("#existingPlayerList"),
  adminTab: document.querySelector('[data-view="admin"]'),
  playerTab: document.querySelector('[data-view="player"]'),
  tournamentTab: document.querySelector('[data-view="tournament"]'),
  headerShareBox: document.querySelector(".workspace-header .share-box"),
  addPlayerForm: document.querySelector("#addPlayerForm"),
  courtSettingsForm: document.querySelector("#courtSettingsForm"),
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
  inviteCode: document.querySelector("#inviteCode"),
  adminInviteCode: document.querySelector("#adminInviteCode"),
  joinQrCode: document.querySelector("#joinQrCode"),
  joinLink: document.querySelector("#joinLink"),
  spectatorLink: document.querySelector("#spectatorLink"),
  copyInviteCodeButton: document.querySelector("#copyInviteCodeButton"),
  copyJoinLinkButton: document.querySelector("#copyJoinLinkButton"),
  copySpectatorLinkButton: document.querySelector("#copySpectatorLinkButton"),
  shareTournamentButton: document.querySelector("#shareTournamentButton"),
  copyStatus: document.querySelector("#copyStatus"),
  refreshRemoteButton: document.querySelector("#refreshRemoteButton"),
  tournamentStatus: document.querySelector("#tournamentStatus"),
  adminLiveOverview: document.querySelector("#adminLiveOverview"),
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
  leaveTournamentButton: document.querySelector("#leaveTournamentButton"),
  toggleNotificationsButton: document.querySelector("#toggleNotificationsButton"),
  toggleAvailabilityButton: document.querySelector("#toggleAvailabilityButton"),
  playerNextMatch: document.querySelector("#playerNextMatch"),
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
  landingMenuToggle: document.querySelector(".landing-menu-toggle"),
  landingLinks: document.querySelector("#landingLinks"),
  workspaceMenuToggle: document.querySelector(".workspace-menu-toggle"),
  workspaceTabs: document.querySelector("#workspaceTabs"),
  profileForm: document.querySelector("#profileForm"),
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

let pendingSetScoreMatchId = null;
const matchFilters = { admin: "all", player: "all" };

function initializeApp() {
observability?.installGlobalHandlers();
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
syncConnectionStatus();
showRecoveryNotice();

window.addEventListener("online", handleOnline);
window.addEventListener("offline", handleOffline);

elements.joinTournamentForm.elements.playerName.addEventListener("input", syncJoinPreview);
elements.avatarPicker.addEventListener("change", syncJoinPreview);
elements.profileForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveLocalProfileFromForm();
});
elements.deleteProfileButton?.addEventListener("click", requestProfileDeletion);
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
elements.languageSelect.addEventListener("change", () => {
  state.settings.language = i18n?.normalizeLanguage(elements.languageSelect.value) ?? elements.languageSelect.value;
  saveState();
  applyLanguage();
  syncJoinPreview();
  render();
});

elements.createTournamentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const adminParticipates = formData.get("adminParticipates") === "on";
  const adminPlayerName = formData.get("adminPlayerName").trim();
  const playerNames = parsePlayerNames(formData.get("players"));

  if (adminParticipates && !adminPlayerName) {
    alert(t("messages.adminNameRequired"));
    form.elements.adminPlayerName.focus();
    return;
  }

  const tournamentPlayers = adminParticipates
    ? [adminPlayerName, ...playerNames.filter((name) => name.toLowerCase() !== adminPlayerName.toLowerCase())]
    : playerNames;

  state = createTournament({
    name: formData.get("tournamentName").trim(),
    inviteCode: createInviteCode(),
    players: tournamentPlayers,
    courtCount: Number(formData.get("courts")),
  });

  if (adminParticipates) {
    state.players[0].joinedFrom = "admin-self";
    state.players[0].participantType = "admin-player";
    linkProfileToPlayer(state.players[0]);
    state.selectedPlayerId = state.players[0].id;
  }

  setLocalRole("admin");
  saveState({ remote: false });
  await createRemoteTournament();
  showWorkspace();
  render();
});

elements.joinTournamentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const inviteCode = formData.get("inviteCode").trim().toUpperCase();
  const playerName = formData.get("playerName").trim();
  const avatarId = formData.get("avatarId") || defaultAvatarId;

  const loadedRemote = supabaseClient ? await loadRemoteTournamentByInvite(inviteCode) : false;

  if (!hasTournamentForInvite(inviteCode, loadedRemote)) {
    alert(t("messages.tournamentNotFound", { code: inviteCode }));
    return;
  }

  if (!playerName) return;
  ensureProfileForJoin(playerName, avatarId);

  let player;
  if (supabaseClient) {
    const joined = await joinRemoteTournament(playerName, avatarId);
    if (!joined) return;
    player = findPlayerByName(playerName);
  } else {
    const existingPlayer = findPlayerByName(playerName);
    if (!existingPlayer && state.rounds.length > 0) {
      alert(t("messages.tournamentStartedAskAdmin"));
      return;
    }
    player = existingPlayer ?? joinTournament(playerName, avatarId);
  }

  if (!player) return;
  state.selectedPlayerId = player.id;
  setLocalRole("player");
  saveState({ remote: false });

  showWorkspace("player");
  form.reset();
  syncJoinPreview();
  saveState({ remote: !supabaseClient });
  render();
});

elements.addPlayerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.rounds.length > 0) {
    alert(t("messages.playersLocked"));
    return;
  }
  const formData = new FormData(event.currentTarget);
  const names = parsePlayerNames(formData.get("playerName"));
  if (names.length === 0) return;

  addPlayers(names, "admin");
  event.currentTarget.reset();
  saveState();
  render();
});

elements.courtSettingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (getActiveRound()?.status === "active" || state.status === "Avsluttet") {
    alert(t("messages.courtsLocked"));
    return;
  }
  const courtList = new FormData(event.currentTarget).get("courtList");
  updateCourtsFromInput(courtList);
  saveState();
  render();
});

elements.tournamentSettingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  updateTournamentRules({
    format: formData.get("format"),
    cupTeamSetupMode: formData.get("cupTeamSetupMode"),
    includesThirdPlaceMatch: formData.get("includesThirdPlaceMatch") === "on",
    pointMode: formData.get("pointMode"),
    gamesToWinSet: Number(formData.get("gamesToWinSet")),
    setsToWinMatch: Number(formData.get("setsToWinMatch")),
  });
  saveState();
  render();
});

elements.cupTeamForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveManualCupTeams(new FormData(event.currentTarget).get("teamLines"));
});

elements.generateRoundButton.addEventListener("click", () => {
  const activeRound = getActiveRound();
  const completingActiveRound = activeRound?.status === "active" && canCompleteRound(activeRound);
  if (!completingActiveRound) {
    const blockReason = generateRoundBlockReason();
    if (blockReason) {
      alert(blockReason);
      return;
    }
  }
  if (state.rounds.length === 0) {
    generateFullTournamentSchedule();
  } else if (isSupabaseReady() && completingActiveRound) {
    if (state.settings.format === "roundRobin") queueRemoteRoundAdvance();
    if (state.settings.format === "cup") queueRemoteCupAdvance();
    return;
  } else {
    if (completingActiveRound) {
      activeRound.status = "finished";
      state.status = "Runde fullført";
    }
    startNextScheduledRound();
  }
  saveState();
  render();
});

elements.completeRoundButton.addEventListener("click", () => {
  if (!confirm(t("messages.finishTournamentConfirm"))) return;
  endTournament();
  saveState();
  render();
});

elements.exportBackupButton.addEventListener("click", exportBackup);

elements.importBackupButton.addEventListener("click", () => {
  elements.backupFileInput.click();
});

elements.backupFileInput.addEventListener("change", importBackup);

elements.refreshRemoteButton?.addEventListener("click", async () => {
  elements.refreshRemoteButton.disabled = true;
  await refreshRemoteState("manual");
  elements.refreshRemoteButton.disabled = false;
  render();
});

elements.endTournamentButton.addEventListener("click", () => {
  if (!confirm(t("messages.endTournamentConfirm"))) return;
  endTournament();
  saveState();
  render();
});

elements.resetTournamentButton.addEventListener("click", async () => {
  if (!confirm(t("messages.resetTournamentConfirm"))) return;
  await deleteRemoteTournament();
  state = structuredClone(defaultTournament);
  localStorage.removeItem(storageKey);
  localStorage.removeItem(recoveryStorageKey);
  localStorage.removeItem(roleStorageKey);
  localStorage.removeItem(syncStorageKey);
  removeOfflineStorageKeys([storageKey, recoveryStorageKey, roleStorageKey, syncStorageKey]);
  syncCreateFormDefaults();
  elements.joinTournamentForm.reset();
  syncJoinPreview();
  showStart();
  render();
});

elements.adminIdentityForm?.addEventListener("submit", sendAdminSignInLink);
elements.claimTournamentButton?.addEventListener("click", claimCurrentTournament);

elements.leaveTournamentButton?.addEventListener("click", () => leaveCurrentTournament());
elements.toggleAvailabilityButton?.addEventListener("click", () => toggleSelectedPlayerAvailability());

elements.resumeTournamentButton.addEventListener("click", () => {
  showWorkspace(isCurrentUserAdmin() ? "admin" : state.selectedPlayerId ? "player" : "spectator");
  render();
});

elements.copyInviteCodeButton.addEventListener("click", () => {
  copyText(state.inviteCode, t("messages.inviteCopied"));
});

elements.copyJoinLinkButton.addEventListener("click", () => {
  copyText(createJoinLink(), t("messages.joinLinkCopied"));
});

elements.copySpectatorLinkButton?.addEventListener("click", () => {
  copyText(createSpectatorLink(), t("messages.spectatorLinkCopied"));
});

elements.shareTournamentButton?.addEventListener("click", shareCurrentTournament);
elements.toggleNotificationsButton?.addEventListener("click", toggleNotifications);

elements.showExistingPlayersButton.addEventListener("click", async () => {
  const inviteCode = elements.joinTournamentForm.elements.inviteCode.value.trim().toUpperCase();
  if (!inviteCode) {
    alert(t("messages.inviteCodeRequired"));
    elements.joinTournamentForm.elements.inviteCode.focus();
    return;
  }

  const loadedRemote = supabaseClient ? await loadRemoteTournamentByInvite(inviteCode) : false;

  if (!hasTournamentForInvite(inviteCode, loadedRemote)) {
    alert(t("messages.tournamentNotFound", { code: inviteCode }));
    return;
  }

  elements.existingPlayerList.classList.toggle("hidden");
  renderExistingPlayerList();
});

elements.closeLargeScoreButton.addEventListener("click", closeLargeScore);
elements.largeScoreDialog.addEventListener("click", (event) => {
  if (event.target === elements.largeScoreDialog) closeLargeScore();
});
elements.largeScoreDialog.addEventListener("close", () => {
  largeScoreMatchId = null;
});
elements.closeSetScoreButton.addEventListener("click", closeSetScoreDialog);
elements.setScoreDialog.addEventListener("click", (event) => {
  if (event.target === elements.setScoreDialog) closeSetScoreDialog();
});
elements.setScoreDialog.addEventListener("close", () => {
  pendingSetScoreMatchId = null;
});

document.querySelectorAll(".subtab").forEach((tab) => {
  tab.addEventListener("click", () => activateAdminPanel(tab.dataset.adminPanel));
});

document.querySelectorAll("[data-module-link]").forEach((link) => {
  link.addEventListener("click", () => showModule(link.dataset.moduleLink));
});

document.addEventListener("click", (event) => {
  const clickTarget = event.target instanceof Element ? event.target : null;
  if (!clickTarget) return;

  const playerAction = clickTarget.closest("[data-player-action]")?.dataset.playerAction;
  if (playerAction) {
    if (playerAction === "spectate") showWorkspace("tournament");
    if (playerAction === "choose") showModule("setup-player");
    if (playerAction === "rejoin") {
      prefillJoinForm(state.inviteCode);
      showModule("setup-player");
    }
    render();
    return;
  }

  const landingToggle = clickTarget.closest(".landing-menu-toggle");
  if (landingToggle) {
    event.preventDefault();
    const isOpen = !document.body.classList.contains("landing-menu-open");
    setLandingMenuOpen(isOpen);
    return;
  }

  const workspaceToggle = clickTarget.closest(".workspace-menu-toggle");
  if (workspaceToggle) {
    event.preventDefault();
    const isOpen = !document.body.classList.contains("workspace-menu-open");
    setWorkspaceMenuOpen(isOpen);
    return;
  }

  if (!clickTarget.closest(".landing-links") && !clickTarget.closest(".landing-menu-toggle")) closeLandingMenu();
  if (!clickTarget.closest(".tabs")) closeWorkspaceMenu();
});

window.addEventListener("hashchange", () => {
  closeLandingMenu();
  closeWorkspaceMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLandingMenu();
    closeWorkspaceMenu();
  }
});
}

function activateSupabaseClient() {
  if (!supabaseClient && supabaseSettings.url && supabaseSettings.anonKey && window.supabase) {
    supabaseClient = window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  if (!supabaseClient || supabaseClientActivated) return;
  supabaseClientActivated = true;
  supabaseClient.auth.onAuthStateChange(() => renderAdminIdentity());
  void syncProfileHistoryRemote();
  connectRealtimeForCurrentState();
}

function closeLandingMenu() {
  setLandingMenuOpen(false);
}

function closeWorkspaceMenu() {
  setWorkspaceMenuOpen(false);
}

function setLandingMenuOpen(isOpen) {
  document.body.classList.toggle("landing-menu-open", isOpen);
  document.querySelectorAll(".landing-menu-toggle").forEach((toggle) => {
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? t("nav.closeMenu") : t("nav.openMenu"));
  });
}

function setWorkspaceMenuOpen(isOpen) {
  document.body.classList.toggle("workspace-menu-open", isOpen);
  document.querySelectorAll(".workspace-menu-toggle").forEach((toggle) => {
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? t("nav.closeViewMenu") : t("nav.openViewMenu"));
  });
}

function createTournament({ name, inviteCode, players, courtCount }) {
  const tournamentPlayers = players.map((playerName, index) => createPlayer(playerName, index, defaultAvatarId));
  return {
    id: crypto.randomUUID(),
    adminToken: crypto.randomUUID(),
    name,
    inviteCode,
    status: "Klar",
    currentRound: 0,
    settings: {
      gamesToWinSet: 6,
      setsToWinMatch: 1,
      pointMode: "matches",
      format: "roundRobin",
      cupTeamSetupMode: "auto",
      includesThirdPlaceMatch: false,
      language: "nb",
    },
    courts: Array.from({ length: courtCount }, (_, index) => ({
      id: crypto.randomUUID(),
      name: `Bane ${index + 1}`,
      courtNumber: index + 1,
      active: true,
    })),
    players: tournamentPlayers,
    schedule: buildSchedule(tournamentPlayers, "roundRobin"),
    rounds: [],
    cup: null,
    cupTeams: [],
    revision: 0,
    selectedPlayerId: null,
    playerToken: null,
  };
}

function createPlayer(name, index, avatarId = defaultAvatarId) {
  return {
    id: crypto.randomUUID(),
    name,
    avatarId,
    accent: accents[index % accents.length],
    active: true,
    availability: "active",
    participantType: "player",
    joinStatus: "joined",
    joinedFrom: "manual",
    createdAt: new Date().toISOString(),
  };
}

function loadLocalProfile() {
  const saved = profileManager?.loadProfile(localStorage, profileStorageKey);
  if (saved && profileManager?.shouldDelete(saved)) {
    purgeLocalProfile();
    return null;
  }
  return saved;
}

function persistLocalProfile() {
  if (!profile) {
    localStorage.removeItem(profileStorageKey);
    removeOfflineStorageKeys([profileStorageKey, profileHistoryStorageKey]);
    return;
  }
  localStorage.setItem(profileStorageKey, JSON.stringify(profile));
  mirrorStorageKeys([profileStorageKey, profileHistoryStorageKey]);
}

async function syncProfileRemote() {
  if (!supabaseClient || !profile?.accessToken) return false;
  const { data, error } = await supabaseClient.rpc("upsert_player_profile", {
    p_profile_id: profile.id,
    p_profile_token: profile.accessToken,
    p_display_name: profile.displayName,
    p_avatar_id: profile.avatarId,
  });
  if (error) {
    console.warn("Profile sync failed", error);
    return false;
  }
  if (data?.profile) {
    profile = profileManager.normalizeProfile({ ...profile, ...data.profile });
    persistLocalProfile();
  }
  return true;
}

async function syncProfileHistoryRemote(entry) {
  if (!supabaseClient || !profile?.accessToken) return false;
  if (!entry) return syncProfileHistoryRemoteRead();
  const { error } = await supabaseClient.rpc("save_player_profile_history", {
    p_profile_id: profile.id,
    p_profile_token: profile.accessToken,
    p_history: entry,
  });
  if (error) {
    console.warn("Profile history sync failed", error);
    return false;
  }
  return true;
}

async function syncProfileHistoryRemoteRead() {
  const { data, error } = await supabaseClient.rpc("get_player_profile_history", {
    p_profile_id: profile.id,
    p_profile_token: profile.accessToken,
  });
  if (error) {
    observability?.error("profile_history_read_failed", error);
    return false;
  }
  let entries = Array.isArray(data) ? data : [];
  if (typeof data === "string") {
    try {
      entries = JSON.parse(data);
    } catch {
      entries = [];
    }
  }
  if (!Array.isArray(entries)) entries = [];
  entries.forEach((entry) => profileManager.recordHistory(localStorage, profileHistoryStorageKey, entry));
  mirrorStorageKeys([profileHistoryStorageKey]);
  renderProfile();
  return true;
}

function purgeLocalProfile() {
  profile = null;
  localStorage.removeItem(profileStorageKey);
  localStorage.removeItem(profileHistoryStorageKey);
  removeOfflineStorageKeys([profileStorageKey, profileHistoryStorageKey]);
}

function profileAvatarIdFromForm() {
  return new FormData(elements.profileForm).get("profileAvatarId") || defaultAvatarId;
}

function saveLocalProfileFromForm() {
  const displayName = elements.profileNameInput.value.trim();
  if (!displayName) {
    elements.profileNameInput.focus();
    return;
  }
  profile = profile
    ? profileManager.normalizeProfile({ ...profile, displayName, avatarId: profileAvatarIdFromForm(), deletionRequestedAt: null, deletionScheduledFor: null })
    : profileManager.createProfile(displayName, profileAvatarIdFromForm());
  persistLocalProfile();
  void syncProfileRemote();
  const selectedPlayer = getPlayerById(state.selectedPlayerId);
  if (selectedPlayer) {
    selectedPlayer.profileId = profile.id;
    if (state.rounds.length === 0) {
      selectedPlayer.name = profile.displayName;
      selectedPlayer.avatarId = profile.avatarId;
    }
    saveState({ remote: isCurrentUserAdmin() });
  }
  saveProfileHistory();
  renderProfile();
  syncJoinPreview();
  render();
}

function ensureProfileForJoin(displayName, avatarId) {
  if (!profile) profile = profileManager.createProfile(displayName, avatarId);
  else if (!profile.displayName || profile.displayName === displayName) {
    profile = profileManager.normalizeProfile({ ...profile, displayName, avatarId, deletionRequestedAt: null, deletionScheduledFor: null });
  }
  persistLocalProfile();
  void syncProfileRemote();
}

function requestProfileDeletion() {
  if (!profile || !confirm(t("profile.deleteConfirm"))) return;
  profile = profileManager.requestDeletion(profile);
  persistLocalProfile();
  void requestRemoteProfileDeletion();
  renderProfile();
}

function cancelProfileDeletion() {
  if (!profile) return;
  profile = profileManager.cancelDeletion(profile);
  persistLocalProfile();
  void cancelRemoteProfileDeletion();
  renderProfile();
}

function linkProfileToPlayer(player) {
  if (player && profile) player.profileId = profile.id;
  return player;
}

function profileHistoryEntry() {
  if (!profile || state.status !== "Avsluttet") return null;
  const player = state.players.find((item) => item.profileId === profile.id) ?? getPlayerById(state.selectedPlayerId);
  if (!player) return null;
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
  };
}

function saveProfileHistory() {
  const entry = profileHistoryEntry();
  if (!entry) return;
  profileManager.recordHistory(localStorage, profileHistoryStorageKey, entry);
  mirrorStorageKeys([profileHistoryStorageKey]);
  void syncProfileHistoryRemote(entry);
}

async function requestRemoteProfileDeletion() {
  if (!supabaseClient || !profile?.accessToken) return;
  await supabaseClient.rpc("request_player_profile_deletion", {
    p_profile_id: profile.id,
    p_profile_token: profile.accessToken,
  });
}

async function cancelRemoteProfileDeletion() {
  if (!supabaseClient || !profile?.accessToken) return;
  await supabaseClient.rpc("cancel_player_profile_deletion", {
    p_profile_id: profile.id,
    p_profile_token: profile.accessToken,
  });
}

function renderProfile() {
  if (!elements.profileForm || !profileManager) return;
  elements.profileNameInput.value = profile?.displayName ?? "";
  elements.profileAvatarPicker.querySelectorAll("input[name=profileAvatarId]").forEach((input) => {
    input.checked = input.value === (profile?.avatarId ?? defaultAvatarId);
  });
  const pendingDeletion = Boolean(profile?.deletionScheduledFor);
  elements.profileDeletionStatus.textContent = pendingDeletion
    ? t("profile.deletePending", { date: new Date(profile.deletionScheduledFor).toLocaleDateString(document.documentElement.lang || "nb-NO") })
    : "";
  elements.profileDeletionStatus.classList.toggle("hidden", !pendingDeletion);
  elements.deleteProfileButton.classList.toggle("hidden", !profile || pendingDeletion);
  elements.cancelProfileDeletionButton.classList.toggle("hidden", !pendingDeletion);
  const history = profileManager.historyForProfile(profileManager.loadHistory(localStorage, profileHistoryStorageKey), profile?.id);
  const summary = profileManager.summarizeHistory(history);
  elements.profileStats.innerHTML = profile ? [
    [t("profile.tournaments"), summary.tournaments],
    [t("profile.matches"), summary.matches],
    [t("profile.wins"), summary.wins],
    [t("profile.points"), summary.points],
  ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("") : `<p class="hint">${t("profile.empty")}</p>`;
  const filter = elements.profileHistoryFilter?.value ?? "all";
  const cutoff = filter === "month" ? Date.now() - 30 * 86400000 : filter === "year" ? Date.now() - 365 * 86400000 : 0;
  const filteredHistory = history.filter((entry) => !cutoff || new Date(entry.endedAt ?? entry.recordedAt).getTime() >= cutoff);
  elements.profileHistoryList.innerHTML = filteredHistory.length === 0
    ? `<p class="hint">${t("profile.noHistory")}</p>`
    : `<h4>${t("profile.historyTitle")}</h4><ul class="profile-history-list">${filteredHistory.map((entry) => `<li><div><strong>${escapeHtml(entry.tournamentName)}</strong><small>${entry.endedAt ? new Date(entry.endedAt).toLocaleDateString(document.documentElement.lang || "nb-NO") : ""}</small></div><span>${t("profile.historyDetail", { placement: entry.placement ?? "-", points: entry.points, wins: entry.wins, matches: entry.matches })}</span></li>`).join("")}</ul>`;
}

function loadState() {
  const stored = localStorage.getItem(storageKey);
  const recovered = loadSavedState(stored);
  if (recovered) return recovered;
  const recoveryState = loadSavedState(localStorage.getItem(recoveryStorageKey));
  if (recoveryState) {
    recoveredFromLastGood = true;
    return recoveryState;
  }
  return structuredClone(defaultTournament);
}

function loadSavedState(serializedState) {
  if (!serializedState) return null;
  try {
    return migrateState(JSON.parse(serializedState));
  } catch {
    return null;
  }
}

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
  stateManager.persistSyncMetadata(localStorage, syncStorageKey, pendingAdminSync, pendingPlayerScores);
  mirrorStorageKeys([syncStorageKey]);
}

function hasPendingRemoteWrites() {
  return stateManager.hasPendingRemoteWrites(pendingAdminSync, pendingPlayerScores);
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
  const serializedState = JSON.stringify(state);
  localStorage.setItem(storageKey, serializedState);
  if (isValidTournamentState(state)) localStorage.setItem(recoveryStorageKey, serializedState);
  mirrorStorageKeys([storageKey, recoveryStorageKey]);
}

function mirrorOfflineStorage() {
  mirrorStorageKeys([storageKey, recoveryStorageKey, roleStorageKey, syncStorageKey]);
}

function mirrorStorageKeys(keys) {
  if (!offlineStorage?.isSupported()) return;
  offlineStorage.mirrorFromLocalStorage(keys, localStorage).catch((error) => {
    console.warn("IndexedDB mirror failed", error);
  });
}

function removeOfflineStorageKeys(keys) {
  if (!offlineStorage?.isSupported()) return;
  Promise.all(keys.map((key) => offlineStorage.removeRecord(key))).catch((error) => {
    console.warn("IndexedDB cleanup failed", error);
  });
}

function isSupabaseReady() {
  return Boolean(supabaseClient);
}

function remoteErrorMessage(error, fallback) {
  return stateManager.remoteErrorMessage(error, fallback);
}

function sanitizeSharedState(nextState) {
  return stateManager.sanitizeSharedState(nextState);
}

function isConflictError(error) {
  return stateManager.isConflictError(error);
}

function isTransientRemoteError(error) {
  return stateManager.isTransientRemoteError(error, navigator.onLine);
}

function setRemoteNotice(message) {
  if (elements.copyStatus) elements.copyStatus.textContent = message;
  renderSyncControls();
}

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
  observability?.error("remote_error", error, { transient: isTransientRemoteError(error) });
  if (isConflictError(error)) {
    markRemoteConflict();
    return;
  }
  setRemoteNotice(remoteErrorMessage(error, fallback));
  if (isTransientRemoteError(error)) scheduleRealtimeReconnect();
  syncConnectionStatus();
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
  const previousTournamentId = state.id;
  isApplyingRemoteState = true;
  const nextState = migrateState({
    ...remoteState,
    selectedPlayerId,
  });
  nextState.adminToken = adminToken;
  nextState.playerToken = playerToken;
  state = nextState;
  saveState({ remote: false });
  if (options.clearConflict) {
    remoteConflict = false;
    setRemoteNotice(t("messages.remoteStateUpdated"));
  }
  if (previousTournamentId !== state.id || !realtimeChannel) connectRealtimeForCurrentState();
  render();
  isApplyingRemoteState = false;
  return true;
}

async function createRemoteTournament() {
  if (!isSupabaseReady()) return false;
  const { data, error } = await supabaseClient.rpc("create_tournament", {
    p_state: sanitizeSharedState(state),
    p_admin_token: state.adminToken,
  });
  if (error) {
    alert(remoteErrorMessage(error, t("messages.remoteSaveFailed")));
    return false;
  }
  applyRemoteState({
    ...data,
    adminToken: state.adminToken,
    selectedPlayerId: state.selectedPlayerId,
  }, { source: "rpc", clearConflict: true });
  return true;
}

async function loadRemoteTournamentByInvite(inviteCode) {
  if (!isSupabaseReady() || !inviteCode) return false;
  const { data, error } = await supabaseClient.rpc("get_tournament_by_code", {
    p_invite_code: inviteCode,
  });
  if (error || !data) return false;
  applyRemoteState(data, { source: "refresh" });
  return true;
}

async function joinRemoteTournament(playerName, avatarId) {
  if (!isSupabaseReady()) return false;
  const player = linkProfileToPlayer(createPlayer(playerName, state.players.length, avatarId));
  player.joinedFrom = "self";
  const { data, error } = await supabaseClient.rpc("join_tournament", {
    p_invite_code: state.inviteCode,
    p_player: player,
  });
  if (error) {
    alert(remoteErrorMessage(error, t("messages.joinFailed")));
    return false;
  }
  if (!data?.state || !data.playerToken || !data.playerId) {
    alert(t("messages.securePlayerFailed"));
    return false;
  }
  applyRemoteState(data.state);
  state.playerToken = data.playerToken;
  state.selectedPlayerId = data.playerId;
  saveState({ remote: false });
  return true;
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
  if (!isSupabaseReady() || !state.adminToken || !state.id) return false;
  if (!navigator.onLine) {
    syncConnectionStatus();
    return false;
  }
  const requestSequence = remoteMutationSequence;
  const expectedRevision = state.revision;
  const { data, error } = await supabaseClient.rpc("save_tournament_state", {
    p_tournament_id: state.id,
    p_admin_token: state.adminToken,
    p_state: sanitizeSharedState(state),
    p_expected_revision: expectedRevision,
  });
  if (error) {
    console.warn("Supabase sync failed", error);
    if (isConflictError(error) && requestSequence === remoteMutationSequence) markRemoteConflict();
    else handleRemoteError(error, t("messages.syncFailed"));
    return false;
  }

  if (!data) return false;
  lastRemotePersistedSequence = Math.max(lastRemotePersistedSequence, requestSequence);
  if (requestSequence === remoteMutationSequence) {
    pendingAdminSync = false;
    persistSyncMetadata();
    applyRemoteState(data, { source: "rpc", clearConflict: true });
  } else if (state.id === data.id && Number.isInteger(data.revision)) {
    state.revision = data.revision;
    saveState({ remote: false });
  }
  return true;
}

function queueRemoteMatchAction(match, action, teamIndex = null) {
  if (!isSupabaseReady() || !isCurrentUserAdmin() || !state.adminToken || !state.id) return;
  if (!navigator.onLine) {
    setRemoteNotice(t("messages.offlineAdminChange"));
    syncConnectionStatus();
    return;
  }

  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = null;
  remoteWriteChain = remoteWriteChain
    .catch(() => {})
    .then(async () => {
      if (remoteMutationSequence > lastRemotePersistedSequence) {
        const saved = await saveRemoteState();
        if (!saved) return;
      }

      const requestSequence = remoteMutationSequence;
      const expectedRevision = state.revision;
      const rpcName = action === "undo" ? "admin_undo_match" : "admin_match_action";
      const rpcPayload = action === "undo"
        ? {
          p_tournament_id: state.id,
          p_admin_token: state.adminToken,
          p_match_id: match.id,
          p_expected_revision: expectedRevision,
        }
        : {
          p_tournament_id: state.id,
          p_admin_token: state.adminToken,
          p_match_id: match.id,
          p_action: action,
          p_team_index: teamIndex,
          p_expected_revision: expectedRevision,
        };
      const { data, error } = await supabaseClient.rpc(rpcName, rpcPayload);

      if (error) {
        console.warn("Supabase admin match action failed", error);
        handleRemoteError(error, t("messages.matchUpdateFailed"));
        return;
      }

      if (!data) return;
      lastRemotePersistedSequence = Math.max(lastRemotePersistedSequence, requestSequence);
      if (requestSequence === remoteMutationSequence) {
        pendingAdminSync = false;
        persistSyncMetadata();
        applyRemoteState(data, { source: "rpc", clearConflict: true });
        if (action === "start") void sendPushNotification("match_started", match.id);
      } else if (state.id === data.id && Number.isInteger(data.revision)) {
        state.revision = data.revision;
        saveState({ remote: false });
      }
    });
}

function queueRemoteSetResult(match, teamOne, teamTwo) {
  if (!isSupabaseReady() || !isCurrentUserAdmin() || !state.adminToken || !state.id) return;
  if (!navigator.onLine) {
    setRemoteNotice(t("messages.offlineSetResult"));
    syncConnectionStatus();
    return;
  }

  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = null;
  remoteWriteChain = remoteWriteChain
    .catch(() => {})
    .then(async () => {
      if (remoteMutationSequence > lastRemotePersistedSequence) {
        const saved = await saveRemoteState();
        if (!saved) return;
      }

      const requestSequence = remoteMutationSequence;
      const expectedRevision = state.revision;
      const { data, error } = await supabaseClient.rpc("admin_set_result", {
        p_tournament_id: state.id,
        p_admin_token: state.adminToken,
        p_match_id: match.id,
        p_team_one_score: teamOne,
        p_team_two_score: teamTwo,
        p_expected_revision: expectedRevision,
      });

      if (error) {
        console.warn("Supabase set result failed", error);
        handleRemoteError(error, t("messages.setResultFailed"));
        return;
      }

      if (!data) return;
      lastRemotePersistedSequence = Math.max(lastRemotePersistedSequence, requestSequence);
      if (requestSequence === remoteMutationSequence) {
        pendingAdminSync = false;
        persistSyncMetadata();
        applyRemoteState(data, { source: "rpc", clearConflict: true });
      } else if (state.id === data.id && Number.isInteger(data.revision)) {
        state.revision = data.revision;
        saveState({ remote: false });
      }
    });
}

function queueRemoteRoundAdvance() {
  if (!isSupabaseReady() || !isCurrentUserAdmin() || !state.adminToken || !state.id) return;
  if (!navigator.onLine) {
    setRemoteNotice(t("messages.offlineNextRound"));
    syncConnectionStatus();
    return;
  }

  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = null;
  remoteWriteChain = remoteWriteChain
    .catch(() => {})
    .then(async () => {
      if (remoteMutationSequence > lastRemotePersistedSequence) {
        const saved = await saveRemoteState();
        if (!saved) return;
      }

      const requestSequence = remoteMutationSequence;
      const { data, error } = await supabaseClient.rpc("admin_advance_round", {
        p_tournament_id: state.id,
        p_admin_token: state.adminToken,
        p_expected_revision: state.revision,
      });

      if (error) {
        console.warn("Supabase round advance failed", error);
        handleRemoteError(error, t("messages.nextRoundFailed"));
        return;
      }

      if (!data) return;
      lastRemotePersistedSequence = Math.max(lastRemotePersistedSequence, requestSequence);
      if (requestSequence === remoteMutationSequence) {
        pendingAdminSync = false;
        persistSyncMetadata();
        applyRemoteState(data, { source: "rpc", clearConflict: true });
        void sendPushNotification("round_ready");
      } else if (state.id === data.id && Number.isInteger(data.revision)) {
        state.revision = data.revision;
        saveState({ remote: false });
      }
    });
}

function queueRemoteCupAdvance() {
  if (!isSupabaseReady() || !isCurrentUserAdmin() || !state.adminToken || !state.id) return;
  if (!navigator.onLine) {
    setRemoteNotice(t("messages.offlineNextCupRound"));
    syncConnectionStatus();
    return;
  }

  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = null;
  remoteWriteChain = remoteWriteChain
    .catch(() => {})
    .then(async () => {
      if (remoteMutationSequence > lastRemotePersistedSequence) {
        const saved = await saveRemoteState();
        if (!saved) return;
      }

      const requestSequence = remoteMutationSequence;
      const { data, error } = await supabaseClient.rpc("admin_advance_cup", {
        p_tournament_id: state.id,
        p_admin_token: state.adminToken,
        p_expected_revision: state.revision,
      });

      if (error) {
        console.warn("Supabase cup advance failed", error);
        handleRemoteError(error, t("messages.nextCupRoundFailed"));
        return;
      }

      if (!data) return;
      lastRemotePersistedSequence = Math.max(lastRemotePersistedSequence, requestSequence);
      if (requestSequence === remoteMutationSequence) {
        pendingAdminSync = false;
        persistSyncMetadata();
        applyRemoteState(data, { source: "rpc", clearConflict: true });
        void sendPushNotification("round_ready");
      } else if (state.id === data.id && Number.isInteger(data.revision)) {
        state.revision = data.revision;
        saveState({ remote: false });
      }
    });
}

function queuePlayerScore(matchId, teamIndex) {
  if (!isSupabaseReady() || !state.id || !state.inviteCode || !state.selectedPlayerId || !state.playerToken) return;
  pendingPlayerScores.push({ matchId, teamIndex });
  persistSyncMetadata();
  syncConnectionStatus();
  processPlayerScoreQueue();
}

async function processPlayerScoreQueue() {
  if (playerScoreQueueRunning || !navigator.onLine || !isSupabaseReady()) return;
  if (!state.id || !state.inviteCode || !state.selectedPlayerId || !state.playerToken) return;

  playerScoreQueueRunning = true;
  try {
    while (pendingPlayerScores.length > 0 && navigator.onLine) {
      const pendingScore = pendingPlayerScores[0];
      const { data, error } = await supabaseClient.rpc("save_player_point", {
        p_tournament_id: state.id,
        p_invite_code: state.inviteCode,
        p_player_id: state.selectedPlayerId,
        p_match_id: pendingScore.matchId,
        p_team_index: pendingScore.teamIndex,
        p_player_token: state.playerToken,
      });

      if (error) {
        console.warn("Supabase player score sync failed", error);
        handleRemoteError(error, t("messages.pointSyncFailed"));
        break;
      }

      pendingPlayerScores.shift();
      persistSyncMetadata();
      if (data && pendingPlayerScores.length === 0) {
        applyRemoteState(data, { source: "rpc", clearConflict: true });
      }
    }
  } finally {
    playerScoreQueueRunning = false;
    syncConnectionStatus();
    render();
  }
}

async function deleteRemoteTournament() {
  if (!isSupabaseReady() || !state.adminToken || !state.id) return false;
  const { error } = await supabaseClient.rpc("delete_tournament", {
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

async function currentAuthUser() {
  if (!supabaseClient) return null;
  try {
    const { data } = await supabaseClient.auth.getUser();
    return data?.user ?? null;
  } catch (error) {
    observability?.error("auth_session_read_failed", error);
    return null;
  }
}

async function sendAdminSignInLink(event) {
  event.preventDefault();
  if (!supabaseClient) {
    elements.adminIdentityNotice.textContent = t("admin.identityUnavailable");
    return;
  }
  const email = elements.adminIdentityEmail.value.trim();
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  elements.adminIdentityNotice.textContent = error
    ? remoteErrorMessage(error, t("admin.identityFailed"))
    : t("admin.identityLinkSent");
  if (!error) observability?.emit("admin_signin_link_requested");
}

async function claimCurrentTournament() {
  if (!supabaseClient || !state.id || !state.adminToken) return;
  const user = await currentAuthUser();
  if (!user) {
    elements.adminIdentityNotice.textContent = t("admin.identitySignInFirst");
    return;
  }
  const { data, error } = await supabaseClient.rpc("claim_tournament", {
    p_tournament_id: state.id,
    p_admin_token: state.adminToken,
  });
  if (error) {
    elements.adminIdentityNotice.textContent = remoteErrorMessage(error, t("admin.identityFailed"));
    observability?.error("admin_claim_failed", error);
    return;
  }
  state.ownerUserId = data?.ownerUserId ?? user.id;
  state.claimedAt = data?.claimedAt ?? new Date().toISOString();
  saveState({ remote: false });
  elements.adminIdentityNotice.textContent = t("admin.identityClaimed");
  observability?.emit("admin_tournament_claimed");
  renderAdminIdentity();
}

async function renderAdminIdentity() {
  if (!elements.adminIdentityPanel) return;
  const admin = isCurrentUserAdmin();
  elements.adminIdentityPanel.classList.toggle("hidden", !admin);
  if (!admin) return;
  const user = await currentAuthUser();
  const claimed = Boolean(state.ownerUserId && user?.id === state.ownerUserId);
  elements.adminIdentityStatus.textContent = claimed ? t("admin.identityClaimedShort") : user ? t("admin.identitySignedIn") : t("admin.identityToken");
  elements.adminIdentityForm.classList.toggle("hidden", claimed);
  elements.claimTournamentButton.classList.toggle("hidden", claimed || !user);
  if (claimed) elements.adminIdentityNotice.textContent = user.email ?? "";
}

function setRealtimeConnectionState(nextState) {
  realtimeConnectionState = nextState;
  syncConnectionStatus();
}

function removeRealtimeChannel() {
  window.clearTimeout(realtimeReconnectTimer);
  realtimeReconnectTimer = null;
  realtimeConnectionGeneration += 1;
  if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
  realtimeChannel = null;
  realtimeTournamentId = null;
}

function scheduleRealtimeReconnect() {
  if (!isSupabaseReady() || !state.id || !hasActiveTournament() || !navigator.onLine) {
    setRealtimeConnectionState("disconnected");
    return;
  }
  if (realtimeReconnectTimer) return;

  if (realtimeChannel) {
    const staleChannel = realtimeChannel;
    realtimeChannel = null;
    realtimeTournamentId = null;
    realtimeConnectionGeneration += 1;
    supabaseClient.removeChannel(staleChannel);
  }

  const backoff = realtimeSync.backoffForAttempt(realtimeReconnectAttempt);
  realtimeReconnectAttempt += 1;
  setRealtimeConnectionState("reconnecting");
  realtimeReconnectTimer = window.setTimeout(() => {
    realtimeReconnectTimer = null;
    connectRealtimeForCurrentState();
  }, backoff);
}

async function refreshRemoteState(reason = "reconnect") {
  if (!isSupabaseReady() || !state.id || !state.inviteCode || !navigator.onLine) return false;
  if (realtimeRefreshPromise) return realtimeRefreshPromise;

  const tournamentId = state.id;
  realtimeRefreshPromise = supabaseClient.rpc("get_tournament_by_code", {
    p_invite_code: state.inviteCode,
  }).then(({ data, error }) => {
    if (error || !data || data.id !== tournamentId) {
      if (error) handleRemoteError(error, t("messages.fetchRemoteFailed"));
      return false;
    }
    return applyRemoteState(data, {
      source: "refresh",
      clearConflict: reason === "manual",
    });
  }).catch((error) => {
    handleRemoteError(error, t("messages.fetchRemoteFailed"));
    return false;
  }).finally(() => {
    realtimeRefreshPromise = null;
  });

  return realtimeRefreshPromise;
}

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

function connectRealtimeForCurrentState() {
  if (!isSupabaseReady() || !state.id || !hasActiveTournament()) {
    setRealtimeConnectionState("connected");
    return;
  }
  if (realtimeChannel && realtimeTournamentId === state.id) return;
  removeRealtimeChannel();

  const tournamentId = state.id;
  const generation = ++realtimeConnectionGeneration;
  realtimeTournamentId = tournamentId;
  setRealtimeConnectionState(realtimeSync.connectionStateForAttempt(realtimeReconnectAttempt));
  let channel;
  channel = supabaseClient
    .channel(realtimeSync.channelName(tournamentId))
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "tournaments",
        filter: `id=eq.${tournamentId}`,
      },
      (payload) => {
        if (generation !== realtimeConnectionGeneration || channel !== realtimeChannel) return;
        if (payload.new?.state) {
          applyRemoteState({
            ...payload.new.state,
            revision: payload.new.revision ?? payload.new.state.revision,
          }, { source: "realtime" });
        }
      },
    );
  realtimeChannel = channel;
    channel.subscribe((status, error) => {
    if (generation !== realtimeConnectionGeneration || channel !== realtimeChannel) return;
    if (realtimeSync.isSubscribed(status)) {
      realtimeReconnectAttempt = 0;
      setRealtimeConnectionState("connected");
      refreshRemoteState("reconnect").finally(flushPendingRemoteWrites);
    } else if (realtimeSync.shouldReconnect(status)) {
      if (status !== "CLOSED") console.warn("Supabase realtime channel failed", error);
      if (error) observability?.error("realtime_error", error, { status });
      setRealtimeConnectionState(status === "CLOSED" ? "disconnected" : "error");
      scheduleRealtimeReconnect();
    }
  });
}

function handleOnline() {
  syncConnectionStatus();
  if (!isSupabaseReady() || !state.id || !hasActiveTournament()) return;
  window.clearTimeout(realtimeReconnectTimer);
  realtimeReconnectTimer = null;
  connectRealtimeForCurrentState();
  flushPendingRemoteWrites();
}

function handleOffline() {
  removeRealtimeChannel();
  setRealtimeConnectionState("disconnected");
}

function exportBackup() {
  const exportedState = structuredClone(state);
  delete exportedState.playerToken;
  const backup = {
    exportedAt: new Date().toISOString(),
    app: "Padelstar",
    version: 1,
    tournament: exportedState,
  };
  const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `${slugify(state.name)}-${state.inviteCode}-backup.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importBackup(event) {
  const [file] = event.currentTarget.files;
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedState = parsed.tournament ?? parsed;
      if (!isValidTournamentState(importedState)) throw new Error("Invalid backup");
      state = migrateState(importedState);
      setLocalRole("admin");
      saveState();
      showWorkspace("admin");
      render();
      elements.copyStatus.textContent = t("messages.backupImported");
    } catch {
      alert(t("messages.importBackupFailed"));
    } finally {
      event.currentTarget.value = "";
    }
  });
  reader.readAsText(file);
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
  elements.createTournamentForm.elements.adminPlayerName.value = "Admin";
  syncAdminPlayerChoice();
}

function syncAdminPlayerChoice() {
  const adminParticipates = elements.createTournamentForm.elements.adminParticipates.checked;
  elements.adminPlayerNameField.classList.toggle("hidden", !adminParticipates);
  elements.createTournamentForm.elements.adminPlayerName.required = adminParticipates;
}

function syncJoinPreview() {
  const inputName = elements.joinTournamentForm.elements.playerName.value.trim();
  const name = inputName || profile?.displayName || t("setup.yourName");
  const avatarId = new FormData(elements.joinTournamentForm).get("avatarId") || profile?.avatarId || defaultAvatarId;
  elements.joinNamePreview.textContent = name;
  elements.joinAvatarPreview.src = avatarUrl({ name, avatarId });
}

function syncJoinFormFromProfile() {
  if (!profile || !elements.joinTournamentForm) return;
  if (!elements.joinTournamentForm.elements.playerName.value) {
    elements.joinTournamentForm.elements.playerName.value = profile.displayName;
  }
  const avatarInput = elements.joinTournamentForm.querySelector(`input[name="avatarId"][value="${profile.avatarId}"]`);
  if (avatarInput) avatarInput.checked = true;
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
  showModule("landing");
}

function showWorkspace(view = "admin") {
  showModule(normalizeWorkspaceModule(view));
}

function showModule(moduleName) {
  const requestedModule = normalizeModule(moduleName);
  activeModule = requestedModule;
  const workspaceModule = workspaceModuleFromActiveModule();
  const isWorkspaceActive = Boolean(workspaceModule);
  if (requestedModule === "setup-player" && hasActiveTournament() && !elements.joinTournamentForm.elements.inviteCode.value) {
    prefillJoinForm(state.inviteCode);
  }
  if (requestedModule === "setup-player") syncJoinPreview();

  document.body.classList.toggle("workspace-active", isWorkspaceActive);
  document.body.classList.toggle("setup-active", requestedModule === "setup-admin" || requestedModule === "setup-player");
  closeLandingMenu();
  closeWorkspaceMenu();

  const activeSections = [];
  document.querySelectorAll(".app-module").forEach((section) => {
    const sectionModule = section.dataset.module;
    const isActive = sectionModule === requestedModule || (sectionModule === "workspace" && isWorkspaceActive);
    section.classList.toggle("hidden", !isActive);
    section.classList.remove("module-entering");
    if (isActive) activeSections.push(section);
  });

  if (!window.PADELSTAR_TEST_MODE) {
    window.cancelAnimationFrame?.(moduleTransitionFrame);
    activeSections.forEach((section) => section.classList.add("module-entering"));
    moduleTransitionFrame = window.requestAnimationFrame(() => {
      moduleTransitionFrame = window.requestAnimationFrame(() => {
        activeSections.forEach((section) => section.classList.remove("module-entering"));
      });
    });
  }

  document.querySelectorAll("[data-section]").forEach((section) => {
    section.classList.toggle("hidden", section.dataset.section !== workspaceModule);
  });

  document.querySelectorAll("[data-module-link]").forEach((link) => {
    link.classList.toggle("active", link.dataset.moduleLink === requestedModule);
  });

  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  renderRoleVisibility();
}

function activateTab(view) {
  showModule(normalizeWorkspaceModule(view));
}

function normalizeWorkspaceModule(view) {
  if (view === "spectator") return "tournament";
  return view;
}

function normalizeModule(moduleName) {
  const requestedModule = normalizeWorkspaceModule(moduleName);
  const tournamentIsActive = hasActiveTournament();

  if (!tournamentIsActive) {
    return ["setup-admin", "setup-player"].includes(requestedModule) ? requestedModule : "landing";
  }

  if (requestedModule === "admin") return isCurrentUserAdmin() ? "admin" : fallbackTournamentModule();
  if (requestedModule === "player") return state.selectedPlayerId ? "player" : fallbackTournamentModule();
  if (requestedModule === "landing") return "landing";
  if (requestedModule === "setup-player") return "setup-player";
  if (requestedModule === "tournament") return "tournament";

  return fallbackTournamentModule();
}

function fallbackTournamentModule() {
  if (isCurrentUserAdmin()) return "admin";
  if (state.selectedPlayerId) return "player";
  return "tournament";
}

function workspaceModuleFromActiveModule() {
  return ["admin", "player", "tournament"].includes(activeModule) ? activeModule : null;
}

function hasActiveTournament() {
  return Boolean(localStorage.getItem(storageKey));
}

function isCurrentUserAdmin() {
  return Boolean(state.adminToken && localStorage.getItem(storageKey) && currentLocalRole() === "admin");
}

function hasTournamentForInvite(inviteCode, loadedRemote = false) {
  return Boolean(inviteCode && inviteCode === state.inviteCode && (loadedRemote || localStorage.getItem(storageKey)));
}

function setLocalRole(role) {
  localStorage.setItem(roleStorageKey, role);
  mirrorStorageKeys([roleStorageKey]);
}

function currentLocalRole() {
  const storedRole = localStorage.getItem(roleStorageKey);
  if (storedRole) return storedRole;
  if (state.adminToken) return "admin";
  if (state.selectedPlayerId) return "player";
  return "spectator";
}

function renderRoleVisibility() {
  const isAdmin = isCurrentUserAdmin() && !spectatorMode;
  const tournamentIsActive = hasActiveTournament();
  const canShowPlayer = Boolean(state.selectedPlayerId);
  const visibleModules = new Set(tournamentIsActive
    ? ["landing", "tournament", "setup-player", ...(isAdmin ? ["admin"] : []), ...(canShowPlayer ? ["player"] : [])]
    : ["landing", "setup-admin", "setup-player"]);
  const workspaceModule = workspaceModuleFromActiveModule();

  elements.adminTab.classList.toggle("hidden", !isAdmin);
  elements.playerTab.classList.toggle("hidden", !canShowPlayer);
  elements.tournamentTab.classList.toggle("hidden", !tournamentIsActive);
  elements.headerShareBox.classList.toggle("hidden", !isAdmin || activeModule !== "admin");
  if (elements.roleIndicator) {
    const role = isAdmin ? "admin" : state.selectedPlayerId && !spectatorMode ? "player" : "spectator";
    elements.roleIndicator.textContent = t(`role.${role}`);
  }

  document.querySelectorAll("[data-module-link]").forEach((link) => {
    const moduleName = normalizeWorkspaceModule(link.dataset.moduleLink);
    link.classList.toggle("hidden", !visibleModules.has(moduleName));
    link.classList.toggle("active", moduleName === activeModule);
  });

  document.querySelectorAll("[data-section]").forEach((section) => {
    section.classList.toggle("hidden", section.dataset.section !== workspaceModule);
  });
}

function activateAdminPanel(panel) {
  document.querySelectorAll(".subtab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.adminPanel === panel);
  });
  document.querySelectorAll("[data-admin-panel-section]").forEach((section) => {
    section.classList.toggle("hidden", section.dataset.adminPanelSection !== panel);
  });
}

function render() {
  if (window.PADELSTAR_TEST_MODE) return;

  const matches = getAllMatches();
  applyLanguage();
  renderProfile();
  renderStartResume();
  renderRoleVisibility();
  elements.tournamentTitle.textContent = state.name;
  elements.roundLabel.textContent = t("tournament.roundLabel", { round: Math.max(state.currentRound, 1) });
  elements.inviteCode.textContent = state.inviteCode;
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
  renderStandings(matches);
  renderPlayerIdentity();
  renderLeaveTournamentControl();
  renderAvailabilityControl();
  renderPlayerNextMatch(matches);
  renderPlayerStatus(matches);
  renderAdminLiveOverview(matches);
  renderRules();
  renderExistingPlayerList();
  renderCupTeamBuilder();
  renderSyncControls();
}

function syncConnectionStatus() {
  let statusKey = "realtimeConnected";
  let statusClass = "connected";
  if (!navigator.onLine) {
    statusKey = "offline";
    statusClass = "offline";
  } else if (!isSupabaseReady()) {
    statusKey = "localPwa";
    statusClass = "local";
  } else if (state.id && hasActiveTournament()) {
    statusKey = `realtime${realtimeConnectionState.charAt(0).toUpperCase()}${realtimeConnectionState.slice(1)}`;
    statusClass = realtimeConnectionState;
  }
  elements.connectionStatus.textContent = t(statusKey);
  if (navigator.onLine && isSupabaseReady() && hasPendingRemoteWrites()) {
    elements.connectionStatus.textContent += ` · ${t("syncPending")}`;
  }
  elements.connectionStatus.dataset.status = statusClass;
  elements.connectionStatus.setAttribute("aria-label", t("status.connectionAria", {
    status: elements.connectionStatus.textContent,
  }));
  elements.connectionStatus.classList.toggle("offline", statusClass === "offline");
}

function renderSyncControls() {
  if (!elements.refreshRemoteButton) return;
  const canRefresh = remoteConflict && isCurrentUserAdmin();
  elements.refreshRemoteButton.classList.toggle("hidden", !canRefresh);
  elements.refreshRemoteButton.textContent = t("refreshRemoteState");
}

function applyLanguage() {
  const language = i18n?.normalizeLanguage(state.settings.language) ?? state.settings.language ?? "nb";
  state.settings.language = language;
  document.documentElement.lang = i18n?.htmlLang(language) ?? (language === "en" ? "en" : "no");
  if (elements.languageSelect) elements.languageSelect.value = language;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((node) => {
    node.setAttribute("alt", t(node.dataset.i18nAlt));
  });
  document.querySelectorAll("[data-i18n-content]").forEach((node) => {
    node.setAttribute("content", t(node.dataset.i18nContent));
  });
}

function syncLanguageOptions() {
  if (!elements.languageSelect || !i18n?.supportedLanguages) return;
  elements.languageSelect.innerHTML = "";
  i18n.supportedLanguages().forEach((language) => {
    const option = document.createElement("option");
    option.value = language.code;
    option.textContent = language.label;
    elements.languageSelect.append(option);
  });
}

function t(key, values = {}) {
  const language = state.settings?.language ?? "nb";
  return i18n?.translate(language, key, values) ?? key;
}

function renderStartResume() {
  const hasSavedTournament = Boolean(localStorage.getItem(storageKey));
  elements.resumePanel.classList.toggle("hidden", !hasSavedTournament);
  if (!hasSavedTournament) return;

  const isAdmin = isCurrentUserAdmin();
  elements.resumeTitle.textContent = t("resume.title", { name: state.name });
  elements.resumeSummary.textContent = isAdmin
    ? t("resume.adminSummary", { players: state.players.length, courts: state.courts.length, code: state.inviteCode })
    : t("resume.summary", { players: state.players.length, courts: state.courts.length });
  elements.resumeTournamentButton.textContent = isAdmin ? t("resume.continueAdmin") : t("resume.continueTournament");
}

function renderLobbyStatus() {
  const minimumPlayersReady = state.players.length >= 2;
  const hasCourts = state.courts.length >= 1;
  const hasStarted = state.rounds.length > 0;
  const activeRound = getActiveRound();
  const isFinished = state.status === "Avsluttet";
  const blockReason = generateRoundBlockReason();
  const nextRoundLabel = blockReason || (state.currentRound > 0
    ? t("tournament.nextRoundLabel", { round: state.currentRound + 1 })
    : t("tournament.firstRoundReady"));
  const playerMode = state.settings.format === "cup"
    ? "Cup"
    : state.players.length >= 4 ? t("common.double") : state.players.length >= 2 ? t("common.single") : t("common.waiting");
  const progress = activeRound?.status === "active" ? roundProgress(activeRound) : null;
  const statusText = isFinished ? t("common.finished") : activeRound?.status === "active" ? t("common.playing") : hasStarted ? t("common.betweenRounds") : t("common.lobby");

  elements.lobbyStatus.innerHTML = `
    <div class="${minimumPlayersReady ? "ready" : "waiting"}">
      <span>${t("admin.players")}</span>
      <strong>${state.players.length}</strong>
      <small>${minimumPlayersReady ? playerMode : t("common.minimumTwo")}</small>
    </div>
    <div class="${hasCourts ? "ready" : "waiting"}">
      <span>${t("admin.courtsInUse")}</span>
      <strong>${state.courts.length}</strong>
      <small>${hasCourts ? t("common.ready") : t("common.missing")}</small>
    </div>
    <div class="${canGenerateRound() ? "ready" : "waiting"}">
      <span>${t("common.status")}</span>
      <strong>${statusText}</strong>
      <small>${progress ? t("tournament.matchesFinished", { finished: progress.finished, total: progress.total }) : nextRoundLabel}</small>
    </div>
  `;
}

function renderAdminLiveOverview(matches) {
  if (!elements.adminLiveOverview) return;

  const activeRound = getActiveRound();
  const liveMatches = activeRound?.status === "active" ? activeRound.matches : matches;
  const playingMatches = liveMatches.filter((match) => match.state === "playing");
  const waitingMatches = liveMatches.filter((match) => match.state === "waiting");
  const finishedMatches = matches.filter((match) => match.state === "finished");
  const progress = activeRound ? roundProgress(activeRound) : { total: matches.length, finished: finishedMatches.length };
  const progressPercent = progress.total ? Math.round((progress.finished / progress.total) * 100) : 0;
  const spotlightMatch = playingMatches[0] ?? waitingMatches[0] ?? matches.at(-1);

  if (!spotlightMatch) {
    elements.adminLiveOverview.innerHTML = `
      <div class="overview-main">
        <span class="status-chip waiting">${t("common.lobby")}</span>
        <strong>${t("tournament.lobbyHeadline")}</strong>
        <small>${t("tournament.playersReady", { players: state.players.length, courts: state.courts.length })}</small>
      </div>
      <div class="progress-track" aria-label="${t("tournament.progressAria")}">
        <span style="width: 0%"></span>
      </div>
    `;
    return;
  }

  elements.adminLiveOverview.innerHTML = `
    <div class="overview-main">
      <span class="status-chip ${spotlightMatch.state}">${matchStateText(spotlightMatch.state)}</span>
      <strong>${escapeHtml(primaryMatchHeadline(spotlightMatch))}</strong>
      <small>${escapeHtml(matchContextText(spotlightMatch))} · ${escapeHtml(setScoreText(spotlightMatch))} ${t("common.games")} · ${escapeHtml(gameScoreText(spotlightMatch))}</small>
    </div>
    <div class="overview-stats">
      <div>
        <span>${t("common.active")}</span>
        <strong>${playingMatches.length}</strong>
      </div>
      <div>
        <span>${t("common.next")}</span>
        <strong>${waitingMatches.length}</strong>
      </div>
      <div>
        <span>${t("common.finished")}</span>
        <strong>${finishedMatches.length}</strong>
      </div>
    </div>
    <div class="progress-track" aria-label="${t("tournament.progressAria")}">
      <span style="width: ${progressPercent}%"></span>
    </div>
  `;
}

function renderPlayers() {
  const standings = leaderboardEntries(getAllMatches());
  const lobbyLocked = state.rounds.length > 0;
  elements.playersList.innerHTML = "";
  if (state.players.length === 0) {
    const item = document.createElement("li");
    item.className = "empty-list-item";
    item.innerHTML = `
      <span>
        ${t("tournament.noPlayers", { code: state.inviteCode })}
      </span>
    `;
    elements.playersList.append(item);
    return;
  }
  state.players.forEach((player) => {
    const entry = standings.find((item) => item.player.id === player.id);
    const item = document.createElement("li");
    item.className = lobbyLocked ? "" : "editable-player";
    item.setAttribute("style", accentStyle(player.accent));
    item.innerHTML = `
      <span class="player-list-name">
        <img class="avatar" src="${avatarUrl(player)}" alt="" width="34" height="34">
        <span class="player-name-badge">${escapeHtml(player.name)}</span>
        <small class="join-source-chip">${playerStatusLabel(player)}</small>
      </span>
      <span class="player-actions">
        <strong>${t("standings.pointsShort", { points: entry?.points ?? 0 })}</strong>
        <button class="icon-button danger-button" type="button" aria-label="${t("actions.removePlayerAria", { name: escapeHtml(player.name) })}" ${lobbyLocked ? "disabled" : ""}>${t("actions.remove")}</button>
      </span>
    `;
    if (!lobbyLocked) {
      const editor = document.createElement("form");
      editor.className = "player-edit-grid";
      editor.innerHTML = `
        <input name="playerName" type="text" value="${escapeAttribute(player.name)}" aria-label="${t("actions.editPlayerNameAria", { name: escapeAttribute(player.name) })}" required>
        <select name="avatarId" aria-label="${t("actions.playerAvatarAria", { name: escapeAttribute(player.name) })}">
          ${avatarOptions.map((avatar) => `
            <option value="${avatar.id}" ${player.avatarId === avatar.id ? "selected" : ""}>${t(avatar.labelKey)}</option>
          `).join("")}
        </select>
        <button class="secondary icon-button" type="submit">${t("actions.save")}</button>
      `;
      editor.addEventListener("submit", (event) => {
        event.preventDefault();
        updatePlayer(player.id, {
          name: new FormData(event.currentTarget).get("playerName").trim(),
          avatarId: new FormData(event.currentTarget).get("avatarId"),
        });
      });
      item.append(editor);
    }
    item.querySelector(".danger-button").addEventListener("click", () => removePlayer(player.id));
    elements.playersList.append(item);
  });
}

function renderCupTeamBuilder() {
  if (!elements.cupTeamBuilder) return;
  const isCup = state.settings.format === "cup";
  const isManual = state.settings.cupTeamSetupMode === "manual";
  const isLocked = state.rounds.length > 0 || state.status === "Avsluttet";
  elements.cupTeamBuilder.classList.toggle("hidden", !isCup || !isManual);
  elements.cupTeamSummary.textContent = t("common.teamCount", { count: state.cupTeams.length });
  const teamLines = state.cupTeams
    .map((team) => team.players.map((player) => player.name).join(" + "))
    .join("\n");
  elements.cupTeamForm.elements.teamLines.value = teamLines;
  elements.cupTeamForm.elements.teamLines.disabled = isLocked;
  elements.cupTeamForm.querySelector("button").disabled = isLocked;
}

function renderRoundSummary() {
  const activeRound = getActiveRound();
  elements.roundSummary.innerHTML = "";
  if (!activeRound || activeRound.matches.length === 0) {
    appendEmptyText(elements.roundSummary, t("tournament.noRound"));
    return;
  }

  const progress = roundProgress(activeRound);
  const summaryItems = [
    {
      label: t("common.round"),
      value: activeRound.roundNumber,
      detail: activeRound.status === "active" ? t("common.playing") : t("common.completed"),
    },
    {
      label: t("common.matches"),
      value: activeRound.matches.length,
      detail: t("tournament.matchesFinishedShort", { finished: progress.finished, total: progress.total }),
    },
    {
      label: t("common.resting"),
      value: activeRound.sittingOut?.length ?? 0,
      detail: activeRound.sittingOut?.length ? activeRound.sittingOut.map((player) => player.name).join(", ") : t("common.none"),
    },
  ];

  elements.roundSummary.innerHTML = summaryItems.map((item) => `
    <div>
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      <small>${escapeHtml(item.detail)}</small>
    </div>
  `).join("");
}

function renderMatches(matches) {
  const selectedPlayer = getPlayerById(state.selectedPlayerId);
  const playerMatches = selectedPlayer
    ? matches.filter((match) => matchIncludesPlayer(match, selectedPlayer.id))
    : [];
  const filteredAdminMatches = filterMatches(matches, matchFilters.admin);
  const filteredPlayerMatches = filterMatches(playerMatches, matchFilters.player);
  renderGroupedMatches(
    elements.adminMatches,
    filteredAdminMatches,
    t("tournament.noMatches"),
    (match) => createMatchCard(match, isEditableAdminMatch(match)),
  );
  renderGroupedMatches(
    elements.playerMatches,
    filteredPlayerMatches,
    selectedPlayer ? t("tournament.noPlayerMatches") : t("tournament.choosePlayerForMatches"),
    (match) => createMatchCard(match, isEditablePlayerMatch(match, selectedPlayer), selectedPlayer?.id, true),
  );
  renderSpectatorMatches(matches);
}

function filterMatches(matches, filter) {
  if (filter === "active") return matches.filter((match) => match.state === "playing");
  if (filter === "next") return matches.filter((match) => match.state === "waiting");
  if (filter === "finished") return matches.filter((match) => ["finished", "cancelled"].includes(match.state));
  return matches;
}

function renderGroupedMatches(container, matches, emptyText, cardFactory) {
  container.innerHTML = "";
  if (matches.length === 0) {
    appendEmptyText(container, emptyText);
    return;
  }

  const groups = [
    { title: t("common.playing"), matches: matches.filter((match) => match.state === "playing") },
    { title: t("common.waiting"), matches: matches.filter((match) => match.state === "waiting") },
    { title: t("common.finished"), matches: matches.filter((match) => ["finished", "cancelled"].includes(match.state)) },
  ].filter((group) => group.matches.length > 0);

  groups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "match-group";
    section.innerHTML = `<h4>${group.title}</h4>`;
    section.append(...group.matches.map(cardFactory));
    container.append(section);
  });
}

function renderSpectatorMatches(matches) {
  elements.spectatorMatches.innerHTML = "";
  const playingMatches = matches.filter((match) => match.state === "playing");
  if (playingMatches.length === 0) {
    const waitingMatches = matches.filter((match) => match.state === "waiting");
    if (waitingMatches.length === 0) {
      appendEmptyText(elements.spectatorMatches, t("tournament.noLiveMatches"));
      return;
    }
    appendEmptyText(elements.spectatorMatches, t("tournament.noMatchesPlaying"));
    return;
  }

  const section = document.createElement("section");
  section.className = "match-group spectator-live-group";
  section.innerHTML = `<h4>${t("common.playingMatches")}</h4>`;
  section.append(...playingMatches.map(createSpectatorMatchCard));
  elements.spectatorMatches.append(section);
}

function createSpectatorMatchCard(match) {
  const card = document.createElement("article");
  card.className = "spectator-score-card";
  card.setAttribute("style", teamAccentStyle(match.teamOne));
  card.innerHTML = `
    <div class="spectator-score-top">
      <span>${escapeHtml(matchContextText(match))}</span>
      <strong>${match.courtName ?? t("tournament.courtComing")}</strong>
    </div>
    <div class="spectator-score-teams">
      <div style="${teamAccentStyle(match.teamOne)}">
        <span>${teamDisplay(match.teamOne)}</span>
        <strong>${match.currentSet.teamOne}</strong>
      </div>
      <div style="${teamAccentStyle(match.teamTwo)}">
        <span>${teamDisplay(match.teamTwo)}</span>
        <strong>${match.currentSet.teamTwo}</strong>
      </div>
    </div>
    <div class="spectator-score-bottom">
      <span>${t("common.points")} ${escapeHtml(gameScoreText(match))}</span>
      <span>${t("common.games")} ${escapeHtml(setScoreText(match))}</span>
    </div>
  `;
  return card;
}

function createMatchCard(match, editable, highlightedPlayerId = null, scoreOnly = false) {
  const card = document.createElement("article");
  card.className = `match-card match-${match.state} ${highlightedPlayerId && matchIncludesPlayer(match, highlightedPlayerId) ? "highlight-match" : ""}`;
  card.setAttribute("style", teamAccentStyle(match.teamOne));
  const teamOneName = escapeHtml(match.teamOne.displayName);
  const teamTwoName = escapeHtml(match.teamTwo.displayName);
  const winner = match.winnerTeamIndex === 0 ? match.teamOne : match.winnerTeamIndex === 1 ? match.teamTwo : null;
  card.innerHTML = `
    <div class="match-top">
      <div class="match-meta">
        <span>${escapeHtml(matchContextText(match))}</span>
        ${match.state === "playing" ? `<span class="now-chip">${t("common.now")}</span>` : ""}
      </div>
      <div class="match-top-actions">
        <span class="match-court">${match.courtName ?? t("tournament.noCourtAssigned")}</span>
        <span class="match-status ${match.state}">${matchStateText(match.state)}</span>
      </div>
    </div>
    <div class="match-headline">
      <span>${escapeHtml(primaryMatchHeadline(match))}</span>
    </div>
    <div class="teams">
      <div class="team">
        <small>${t("common.teamOne")}</small>
        <strong style="${teamAccentStyle(match.teamOne)}">${teamDisplay(match.teamOne)}</strong>
      </div>
      <div class="versus">${t("common.against")}</div>
      <div class="team">
        <small>${t("common.teamTwo")}</small>
        <strong style="${teamAccentStyle(match.teamTwo)}">${teamDisplay(match.teamTwo)}</strong>
      </div>
    </div>
    <div class="tennis-scoreboard" aria-label="${t("score.scoreboardAria")}">
      <div>
        <small>${t("common.games")}</small>
        <strong>${setScoreText(match)}</strong>
      </div>
      <div>
        <small>${t("common.points")}</small>
        <strong>${gameScoreText(match)}</strong>
      </div>
      <div>
        <small>${t("common.server")}</small>
        <strong>${escapeHtml(startingTeamText(match))}</strong>
      </div>
    </div>
    <div class="match-note">
      <p class="hint">${scoreSummary(match)}${sittingOutSummary(match)}</p>
      ${winner ? `<p class="winner-note">${t("score.winnerNote", { winner: escapeHtml(winner.displayName) })}</p>` : ""}
    </div>
  `;

  if (editable && match.state !== "cancelled") {
    const controls = document.createElement("div");
    controls.className = "match-controls";
    controls.innerHTML = `
      <div class="point-controls">
        <button class="secondary point-button" type="button" data-point-team="0" ${match.state === "finished" ? "disabled" : ""}>${t("score.pointsLabel", { team: teamOneName })}</button>
        <button class="secondary point-button" type="button" data-point-team="1" ${match.state === "finished" ? "disabled" : ""}>${t("score.pointsLabel", { team: teamTwoName })}</button>
      </div>
      ${scoreOnly ? "" : `<div class="court-edit-row">
        <label>${t("common.court")} <input class="court-name-input" type="text" value="${escapeAttribute(match.courtName ?? "")}" placeholder="${t("common.court")}" aria-label="${t("score.courtForMatch", { teamOne: teamOneName, teamTwo: teamTwoName })}"></label>
        <button class="secondary save-court-button" type="button">${t("actions.saveCourt")}</button>
      </div>
      <div class="score-row">
        <label>${teamOneName} <input type="number" min="0" max="99" value="${match.currentSet.teamOne}" aria-label="Games ${teamOneName}"></label>
        <label>${teamTwoName} <input type="number" min="0" max="99" value="${match.currentSet.teamTwo}" aria-label="Games ${teamTwoName}"></label>
        <button class="secondary save-score-button" type="button">${match.state === "finished" ? t("actions.updateResult") : t("actions.save")}</button>
      </div>
      <div class="button-row">
        <button class="secondary set-score-button" type="button">${t("actions.setResult")}</button>
        <button class="secondary start-match-button" type="button" ${match.state !== "waiting" ? "disabled" : ""}>${t("actions.startMatch")}</button>
        <button class="secondary large-score-button" type="button" ${match.state !== "playing" ? "disabled" : ""}>${t("actions.largeScore")}</button>
        <button class="secondary reopen-match-button" type="button" ${["cancelled"].includes(match.state) || !match.lastScoredMatchState ? "disabled" : ""}>${match.state === "finished" ? t("actions.undoResult") : t("actions.undoLast")}</button>
        <button class="ghost cancel-match-button" type="button" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>${t("actions.cancelMatch")}</button>
        <div class="walkover-row">
          <span>${t("score.walkover")}</span>
          <button class="ghost walkover-button" type="button" data-walkover-team="0" aria-label="${t("score.walkoverForAria", { team: teamOneName })}" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>${teamOneName}</button>
          <button class="ghost walkover-button" type="button" data-walkover-team="1" aria-label="${t("score.walkoverForAria", { team: teamTwoName })}" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>${teamTwoName}</button>
        </div>
      </div>`}
    `;

    if (!scoreOnly) {
      const courtInput = controls.querySelector(".court-name-input");
      const [teamOneInput, teamTwoInput] = controls.querySelectorAll(".score-row input");
      controls.querySelector(".save-court-button").addEventListener("click", () => {
        updateMatchCourt(match, courtInput.value);
      });
      controls.querySelector(".save-score-button").addEventListener("click", () => {
        saveMatchResult(match, Number(teamOneInput.value), Number(teamTwoInput.value));
      });
    }
    controls.querySelectorAll("[data-point-team]").forEach((button) => {
      button.addEventListener("click", () => awardTennisPoint(match, Number(button.dataset.pointTeam)));
    });
    if (!scoreOnly) {
      controls.querySelector(".set-score-button").addEventListener("click", () => openSetScoreDialog(match.id));
      controls.querySelector(".start-match-button").addEventListener("click", () => startMatch(match));
      controls.querySelector(".large-score-button").addEventListener("click", () => openLargeScore(match.id));
      controls.querySelector(".reopen-match-button").addEventListener("click", () => reopenMatch(match));
      controls.querySelector(".cancel-match-button").addEventListener("click", () => cancelMatch(match));
      controls.querySelectorAll(".walkover-button").forEach((button) => {
        button.addEventListener("click", () => setWalkover(match, Number(button.dataset.walkoverTeam)));
      });
    }
    card.append(controls);
  }

  return card;
}

function isEditablePlayerMatch(match, player) {
  return Boolean(player && match.state === "playing" && matchIncludesPlayer(match, player.id));
}

function renderStandings(matches) {
  renderStandingsList(elements.standingsList, matches);
  renderStandingsList(elements.playerStandingsList, matches);
}

function renderStandingsList(container, matches) {
  container.innerHTML = "";
  const entries = leaderboardEntries(matches);
  if (entries.length === 0) {
    appendEmptyText(container, t("tournament.standingsEmpty"));
    return;
  }
  entries.forEach((entry, index) => {
    const item = document.createElement("li");
    item.setAttribute("style", accentStyle(entry.player.accent));
    item.innerHTML = `
      <span class="player-list-name">
        <span class="placement-badge">${index + 1}</span>
        <img class="avatar" src="${avatarUrl(entry.player)}" alt="" width="34" height="34">
        <span class="player-name-badge">${escapeHtml(entry.player.name)}</span>
      </span>
      <span class="standing-stats">
        <strong>${t("standings.pointsShort", { points: entry.points })}</strong>
        <small>${t("standings.detail", { played: entry.matchesPlayed, wins: entry.matchWins, sets: entry.setsWon, games: entry.gamesWon })}</small>
      </span>
    `;
    container.append(item);
  });
}

function renderPlayerIdentity() {
  const player = getPlayerById(state.selectedPlayerId);
  if (!player) {
    elements.playerIdentityCard.removeAttribute("style");
    elements.playerIdentityCard.innerHTML = `
      <div class="empty-list-item">
        ${t("player.identityEmpty")}
      </div>
    `;
    return;
  }

  const joinSourceLabel = player.joinedFrom === "admin-self"
    ? t("player.adminPlays")
    : player.joinedFrom === "self"
      ? t("player.registeredSelf")
      : t("player.addedByAdmin");
  elements.playerIdentityCard.setAttribute("style", accentStyle(player.accent));
  elements.playerIdentityCard.innerHTML = `
    <div class="player-identity-main">
      <img class="avatar" src="${avatarUrl(player)}" alt="" width="44" height="44">
      <div>
        <span>${t("player.currentPlayer")}</span>
        <strong>${escapeHtml(player.name)}</strong>
      </div>
    </div>
    <span class="join-source-chip">${joinSourceLabel}</span>
  `;
}

function renderLeaveTournamentControl() {
  if (!elements.leaveTournamentButton) return;
  const hasSelectedPlayer = Boolean(getPlayerById(state.selectedPlayerId));
  elements.leaveTournamentButton.classList.toggle("hidden", !hasSelectedPlayer);
  elements.leaveTournamentButton.disabled = !hasSelectedPlayer;
  elements.leaveTournamentButton.textContent = t("actions.leaveTournament");
}

function renderAvailabilityControl() {
  if (!elements.toggleAvailabilityButton) return;
  const player = getPlayerById(state.selectedPlayerId);
  const isAway = player?.availability === "away";
  elements.toggleAvailabilityButton.classList.toggle("hidden", !player);
  elements.toggleAvailabilityButton.disabled = !player;
  elements.toggleAvailabilityButton.textContent = isAway
    ? t("actions.returnToTournament")
    : t("actions.markAway");
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
  if (!elements.cupBracket) return;
  const bracket = state.settings.format === "cup" ? state.cup?.bracket : null;
  elements.cupBracket.classList.toggle("hidden", !bracket?.rounds?.length);
  if (!bracket?.rounds?.length) {
    elements.cupBracket.innerHTML = "";
    return;
  }

  elements.cupBracket.innerHTML = `
    <div class="panel-heading">
      <h3>${t("cup.bracket")}</h3>
      <span>${t("cup.teamSlots", { count: bracket.bracketSize })}</span>
    </div>
    <div class="cup-bracket-rounds">
      ${bracket.rounds.map((round, index) => `
        <section class="cup-bracket-round">
          <div class="cup-bracket-round-heading">
            <strong>${cupRoundTitle(round, index, bracket.rounds.length)}</strong>
            <span>${round.byeTeams?.length ? `${round.byeTeams.length} bye` : ""}</span>
          </div>
          <div class="cup-bracket-slots">
            ${round.slots.map((slot) => renderCupBracketSlot(slot)).join("")}
            ${round.thirdPlaceSlot ? renderCupBracketSlot(round.thirdPlaceSlot, true) : ""}
          </div>
          ${round.byeTeams?.length ? `<p class="cup-bracket-byes">${t("cup.bye", { teams: round.byeTeams.map((team) => escapeHtml(team.displayName)).join(", ") })}</p>` : ""}
        </section>
      `).join("")}
    </div>
  `;
}

function cupRoundTitle(round, index, totalRounds) {
  if (totalRounds === 1) return t("cup.final");
  if (index === 0) return t("cup.firstRound");
  if (index === totalRounds - 1) return t("cup.final");
  if (index === totalRounds - 2) return t("cup.semiFinal");
  return t("tournament.roundLabel", { round: round.roundNumber });
}

function renderCupBracketSlot(slot, isThirdPlace = false) {
  if (!slot || slot.type === "pending") {
    return `<div class="cup-bracket-slot pending"><span>${isThirdPlace ? t("cup.thirdPlaceMatch") : t("cup.waitingForWinners")}</span></div>`;
  }
  const match = getMatchById(slot.matchId);
  if (!match) return `<div class="cup-bracket-slot pending"><span>${t("cup.waitingForMatch")}</span></div>`;
  const winner = match.winnerTeamIndex === 0 ? match.teamOne : match.winnerTeamIndex === 1 ? match.teamTwo : null;
  return `
    <div class="cup-bracket-slot ${match.state}">
      <span class="cup-bracket-slot-label">${isThirdPlace ? t("cup.thirdPlaceMatch") : matchStateText(match.state)}</span>
      <strong>${escapeHtml(match.teamOne.displayName)}</strong>
      <strong>${escapeHtml(match.teamTwo.displayName)}</strong>
      ${winner ? `<small>${t("score.winnerNote", { winner: escapeHtml(winner.displayName) })}</small>` : ""}
    </div>
  `;
}

function renderExistingPlayerList() {
  if (!elements.existingPlayerList || elements.existingPlayerList.classList.contains("hidden")) return;
  elements.existingPlayerList.innerHTML = "";
  if (state.players.length === 0) {
    appendEmptyText(elements.existingPlayerList, t("players.noneAddedYet"));
    return;
  }
  state.players.forEach((player) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "existing-player-button";
    button.setAttribute("style", accentStyle(player.accent));
    button.innerHTML = `<img class="avatar" src="${avatarUrl(player)}" alt="" width="30" height="30"><span>${escapeHtml(player.name)}</span>`;
    button.addEventListener("click", async () => {
      if (supabaseClient) {
        const joined = await joinRemoteTournament(player.name, player.avatarId);
        if (!joined) return;
      } else {
        state.selectedPlayerId = player.id;
      }
      setLocalRole("player");
      saveState({ remote: false });
      showWorkspace("player");
      render();
    });
    elements.existingPlayerList.append(button);
  });
}

function renderPlayerNextMatch(matches) {
  const player = getPlayerById(state.selectedPlayerId);
  if (!player) {
    elements.playerNextMatch.removeAttribute("style");
    elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">${t("player.nextMatch")}</p>
      <h3>${t("player.chooseProfile")}</h3>
      <p>${t("player.chooseProfileHint")}</p>
      <div class="button-row player-empty-actions">
        <button class="secondary" type="button" data-player-action="spectate">${t("actions.viewAsSpectator")}</button>
        <button class="secondary" type="button" data-player-action="choose">${t("actions.choosePlayer")}</button>
        <button class="ghost" type="button" data-player-action="rejoin">${t("actions.joinAgain")}</button>
      </div>
    `;
    return;
  }

  if (state.status === "Avsluttet") {
    const placement = playerPlacement(player, matches);
    elements.playerNextMatch.setAttribute("style", accentStyle(player.accent));
    elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">${t("player.tournamentFinished")}</p>
      <h3>${placement ? t("player.finishedWithPlacement", { name: escapeHtml(player.name), placement }) : t("player.finishedWithoutPlacement", { name: escapeHtml(player.name) })}</h3>
      <p>${t("player.checkFinalStandings")}</p>
    `;
    return;
  }

  const playerState = playerTournamentState(player, matches);
  elements.playerNextMatch.setAttribute("style", accentStyle(player.accent));

  if (playerState.kind === "resting") {
    const activeRound = getActiveRound();
    elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">${t("player.restingThisRound")}</p>
      <h3>${t("player.restingTitle", { name: escapeHtml(player.name) })}</h3>
      <div class="player-now-grid">
        <div>
          <span>${t("common.round")}</span>
          <strong>${activeRound?.roundNumber ?? "-"}</strong>
        </div>
        <div>
          <span>${t("common.status")}</span>
          <strong>${t("common.resting")}</strong>
        </div>
      </div>
      <p>${t("player.restingHint")}</p>
    `;
    return;
  }

  if (!playerState.match) {
    elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">${t("common.waiting")}</p>
      <h3>${t("player.waitingTitle", { name: escapeHtml(player.name) })}</h3>
      <div class="player-now-grid">
        <div>
          <span>${t("common.status")}</span>
          <strong>${t("common.waiting")}</strong>
        </div>
        <div>
          <span>${t("common.round")}</span>
          <strong>${Math.max(state.currentRound, 1)}</strong>
        </div>
      </div>
      <p>${t("player.waitingHint")}</p>
    `;
    return;
  }

  const match = playerState.match;
  notifyPlayerMatch(match, playerState.kind);
  const isTeamOne = match.teamOne.players.some((item) => item.id === player.id);
  const ownTeam = isTeamOne ? match.teamOne : match.teamTwo;
  const opponents = isTeamOne ? match.teamTwo : match.teamOne;
  const teammate = ownTeam.players.find((item) => item.id !== player.id);
  const opponentNames = opponents.players.map((opponent) => escapeHtml(opponent.name)).join(" & ");
  const statusLabel = playerState.kind === "playing" ? t("player.playingNow") : t("player.nextMatch");
  const ownScore = isTeamOne ? match.currentSet.teamOne : match.currentSet.teamTwo;
  const opponentScore = isTeamOne ? match.currentSet.teamTwo : match.currentSet.teamOne;

  elements.playerNextMatch.innerHTML = `
    <p class="eyebrow">${statusLabel}</p>
    <h3>${match.courtName ?? t("tournament.courtComing")}</h3>
    <div class="player-now-grid">
      <div>
        <span>${t("player.teammate")}</span>
        <strong>${teammate ? escapeHtml(teammate.name) : t("common.single")}</strong>
      </div>
      <div>
        <span>${t("player.opponents")}</span>
        <strong>${opponentNames}</strong>
      </div>
      <div>
        <span>${t("common.games")}</span>
        <strong>${ownScore}-${opponentScore}</strong>
      </div>
      <div>
        <span>${t("common.points")}</span>
        <strong>${gameScoreText(match)}</strong>
      </div>
    </div>
    <div class="next-match-summary">
      <span>${escapeHtml(matchContextText(match))}</span>
      <span>${scoreSummary(match)}</span>
    </div>
  `;
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
  const player = getPlayerById(state.selectedPlayerId);
  if (!player) {
    elements.playerStatusGrid.innerHTML = `
      <div class="waiting">
        <span>${t("common.status")}</span>
        <strong>${t("common.select")}</strong>
        <small>${t("common.player")}</small>
      </div>
    `;
    return;
  }

  const playerMatches = matches.filter((match) => matchIncludesPlayer(match, player.id));
  const stats = statsForPlayer(player, matches);
  const nextState = playerTournamentState(player, matches);
  const statusText = {
    playing: t("common.playing"),
    waiting: t("common.next"),
    resting: t("common.resting"),
    idle: t("common.waiting"),
  }[nextState.kind] ?? t("common.waiting");

  elements.playerStatusGrid.innerHTML = `
    <div class="${nextState.kind === "playing" ? "ready" : "waiting"}">
      <span>${t("common.status")}</span>
      <strong>${state.status === "Avsluttet" ? t("common.finished") : statusText}</strong>
      <small>${nextState.match?.courtName ?? (nextState.kind === "resting" ? t("tournament.thisRound") : t("tournament.noCourt"))}</small>
    </div>
    <div class="ready">
      <span>${t("common.points")}</span>
      <strong>${pointsByPlayer(matches, state.settings.pointMode)[player.id] ?? 0}</strong>
      <small>${t("standings.wins", { wins: stats.matchWins })}</small>
    </div>
    <div class="ready">
      <span>${t("common.matches")}</span>
      <strong>${playerMatches.length}</strong>
      <small>${t("standings.played", { played: stats.matchesPlayed })}</small>
    </div>
  `;
}

function renderRules() {
  if (!elements.rulesList) return;
  const pointModeText = {
    matches: t("rules.rankingMatches"),
    sets: t("rules.rankingSets"),
    games: t("rules.rankingGames"),
  }[state.settings.pointMode] ?? t("rules.rankingFallback");

  const rules = [
    {
      title: t("rules.tennisPointsTitle"),
      text: t("rules.tennisPointsText"),
    },
    {
      title: t("rules.setsTitle"),
      text: t("rules.setsText", { sets: state.settings.setsToWinMatch, games: state.settings.gamesToWinSet }),
    },
    {
      title: t("rules.rankingTitle"),
      text: t("rules.rankingText", { pointModeText }),
    },
    {
      title: t("rules.restTitle"),
      text: t("rules.restText"),
    },
  ];

  elements.rulesList.innerHTML = rules.map((rule) => `
    <div>
      <strong>${escapeHtml(rule.title)}</strong>
      <p>${escapeHtml(rule.text)}</p>
    </div>
  `).join("");
}

function openLargeScore(matchId) {
  const match = getMatchById(matchId);
  if (!match || match.state !== "playing") return;
  largeScoreMatchId = matchId;
  elements.largeScoreDialog.showModal();
  renderLargeScore();
}

function openSetScoreDialog(matchId) {
  const match = getMatchById(matchId);
  if (!match || ["finished", "cancelled"].includes(match.state)) return;
  pendingSetScoreMatchId = matchId;
  elements.setScoreTitle.textContent = t("score.setResultTitle");
  elements.setScoreContext.textContent = t("score.matchup", { teamOne: match.teamOne.displayName, teamTwo: match.teamTwo.displayName });
  elements.setScoreOptions.innerHTML = quickScoreButtons(match.teamOne.displayName, match.teamTwo.displayName);
  elements.setScoreOptions.querySelectorAll("[data-score]").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedMatch = getMatchById(pendingSetScoreMatchId);
      if (!selectedMatch) return;
      const [teamOne, teamTwo] = button.dataset.score.split("-").map(Number);
      saveSetResult(selectedMatch, teamOne, teamTwo);
      closeSetScoreDialog();
    });
  });
  elements.setScoreDialog.showModal();
}

function closeSetScoreDialog() {
  pendingSetScoreMatchId = null;
  elements.setScoreDialog.close();
}

function closeLargeScore() {
  elements.largeScoreDialog.close();
}

function renderLargeScore() {
  if (!largeScoreMatchId || !elements.largeScoreDialog.open) return;
  const match = getMatchById(largeScoreMatchId);
  if (!match || match.state !== "playing") {
    closeLargeScore();
    return;
  }

  elements.largeScoreSurface.setAttribute("style", teamAccentStyle(match.teamOne));
  elements.largeScoreContext.textContent = `${matchContextText(match)} · ${match.courtName ?? t("tournament.noCourtAssigned")}`;
  elements.largeScoreTitle.textContent = t("score.matchup", { teamOne: match.teamOne.displayName, teamTwo: match.teamTwo.displayName });
  elements.largeScoreBoard.innerHTML = [match.teamOne, match.teamTwo].map((team, index) => {
    const teamKey = index === 0 ? "teamOne" : "teamTwo";
    return `
      <button class="large-score-team" type="button" data-large-score-team="${index}" style="${teamAccentStyle(team)}">
        <span>${teamDisplay(team)}</span>
        <strong>${match.currentSet[teamKey]}</strong>
        <small>${tennisPointLabel(match.currentGame[teamKey])}</small>
      </button>
    `;
  }).join("");
  elements.largeScoreActions.innerHTML = `
    <div>
      <span>${t("common.games")}</span>
      <strong>${setScoreText(match)}</strong>
    </div>
    <div>
      <span>${t("common.points")}</span>
      <strong>${gameScoreText(match)}</strong>
    </div>
    <div>
      <span>${t("common.server")}</span>
      <strong>${escapeHtml(startingTeamText(match))}</strong>
    </div>
  `;
  elements.largeScoreBoard.querySelectorAll("[data-large-score-team]").forEach((button) => {
    button.addEventListener("click", () => awardTennisPoint(match, Number(button.dataset.largeScoreTeam)));
  });
}

function avatarUrl(player) {
  const seed = encodeURIComponent(`${player.avatarId ?? defaultAvatarId}-${player.name ?? "Padel"}`);
  return `https://api.dicebear.com/10.x/thumbs/svg?seed=${seed}&size=64&borderRadius=50&backgroundColor=cc9414,616b7a,ebc761`;
}

function createJoinLink() {
  const isLocalDevelopment = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  const url = new URL(isLocalDevelopment ? window.location.origin : publicAppUrl);
  url.searchParams.set("join", state.inviteCode);
  url.hash = "";
  return url.toString();
}

function createSpectatorLink() {
  const isLocalDevelopment = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  const url = new URL(isLocalDevelopment ? window.location.origin : publicAppUrl);
  url.searchParams.set(spectatorQueryKey, state.inviteCode);
  url.hash = "";
  return url.toString();
}

function createQrCodeUrl(text) {
  const params = new URLSearchParams({
    text,
    size: "360",
    margin: "2",
    format: "svg",
    dark: "16130e",
    light: "fbf5e6",
    ecLevel: "Q",
  });
  return `https://quickchart.io/qr?${params.toString()}`;
}

function quickScoreButtons(teamOneName, teamTwoName) {
  const gamesToWinSet = state.settings.gamesToWinSet ?? 6;
  const scores = [
    ...Array.from({ length: Math.max(1, gamesToWinSet - 1) }, (_, index) => [gamesToWinSet, index]),
    [gamesToWinSet + 1, gamesToWinSet - 1],
    [gamesToWinSet + 1, gamesToWinSet],
  ];

  return [
    ...scores.map(([teamOne, teamTwo]) => quickScoreButton(teamOne, teamTwo, teamOneName)),
    ...scores.map(([teamOne, teamTwo]) => quickScoreButton(teamTwo, teamOne, teamTwoName)),
  ].join("");
}

function quickScoreButton(teamOne, teamTwo, winnerName) {
  return `<button class="quick-score-button" type="button" data-score="${teamOne}-${teamTwo}">${teamOne}-${teamTwo} ${escapeHtml(winnerName)}</button>`;
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
  if (!supabaseClient || !state.id || !state.adminToken || !supabaseClient.functions) return;
  const copy = kind === "match_started"
    ? {
      title: t("notifications.matchReadyTitle"),
      body: t("notifications.matchPlayingBody"),
    }
    : {
      title: t("notifications.matchReadyTitle"),
      body: t("notifications.matchReadyBody"),
    };
  try {
    const { error } = await supabaseClient.functions.invoke("push-send", {
      body: {
        tournamentId: state.id,
        title: copy.title,
        body: copy.body,
        tag: `padelstar-${kind}-${matchId ?? state.currentRound}`,
      },
      headers: { "x-padelstar-admin-token": state.adminToken },
    });
    if (error) throw error;
    observability?.emit("push_notification_sent", { kind });
  } catch (error) {
    observability?.error("push_notification_failed", error, { kind });
  }
}

function notificationsSupported() {
  return "Notification" in window && "serviceWorker" in navigator;
}

function notificationsEnabled() {
  return localStorage.getItem(notificationPreferenceKey) === "enabled" && Notification.permission === "granted";
}

function renderNotificationControl() {
  const button = elements.toggleNotificationsButton;
  if (!button) return;
  button.classList.toggle("hidden", !state.selectedPlayerId || spectatorMode || !notificationsSupported());
  button.textContent = notificationsEnabled() ? t("actions.disableNotifications") : t("actions.enableNotifications");
}

async function toggleNotifications() {
  if (!notificationsSupported()) return;
  if (notificationsEnabled()) {
    await unsubscribeFromPush();
    localStorage.removeItem(notificationPreferenceKey);
    renderNotificationControl();
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    elements.copyStatus.textContent = t("messages.notificationsDenied");
    return;
  }
  await subscribeToPush();
  localStorage.setItem(notificationPreferenceKey, "enabled");
  renderNotificationControl();
  observability?.emit("notifications_enabled");
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({
    type: "padelstar-show-notification",
    title: t("notifications.enabledTitle"),
    body: t("notifications.enabledBody"),
    tag: "padelstar-notifications-enabled",
  });
}

function base64ToUint8Array(value) {
  const padded = `${value}${"=".repeat((4 - value.length % 4) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function subscribeToPush() {
  const publicKey = String(supabaseSettings.vapidPublicKey ?? "").trim();
  if (!publicKey || !navigator.serviceWorker?.ready) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) return null;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(publicKey) });
    const json = subscription.toJSON();
    localStorage.setItem(pushSubscriptionStorageKey, JSON.stringify(json));
    if (supabaseClient && state.playerToken && state.selectedPlayerId) {
      const { error } = await supabaseClient.rpc("upsert_push_subscription", {
        p_tournament_id: state.id,
        p_invite_code: state.inviteCode,
        p_player_id: state.selectedPlayerId,
        p_player_token: state.playerToken,
        p_subscription: json,
      });
      if (error) throw error;
    }
    observability?.emit("push_subscription_enabled");
    return subscription;
  } catch (error) {
    observability?.error("push_subscription_failed", error);
    localStorage.removeItem(pushSubscriptionStorageKey);
    return null;
  }
}

async function unsubscribeFromPush() {
  const serialized = localStorage.getItem(pushSubscriptionStorageKey);
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    if (serialized && supabaseClient && state.playerToken && state.selectedPlayerId) {
      await supabaseClient.rpc("delete_push_subscription", {
        p_tournament_id: state.id,
        p_player_id: state.selectedPlayerId,
        p_player_token: state.playerToken,
        p_endpoint: JSON.parse(serialized).endpoint,
      });
    }
  } catch (error) {
    observability?.error("push_subscription_delete_failed", error);
  } finally {
    localStorage.removeItem(pushSubscriptionStorageKey);
  }
}

function joinTournament(name, avatarId) {
  const existingPlayer = findPlayerByName(name);
  if (existingPlayer) return existingPlayer;
  return linkProfileToPlayer(addPlayer(name, "self", avatarId));
}

function parsePlayerNames(value) {
  return String(value)
    .split(/[\n,;]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function addPlayers(names, joinedFrom) {
  names.forEach((name) => {
    if (!findPlayerByName(name)) addPlayer(name, joinedFrom, defaultAvatarId);
  });
}

function addPlayer(name, joinedFrom, avatarId) {
  const player = {
    ...createPlayer(name, state.players.length, avatarId),
    joinedFrom,
  };
  state.players.push(player);
  state.schedule = buildSchedule(state.players, state.settings.format);
  return player;
}

function updatePlayer(playerId, updates) {
  const player = getPlayerById(playerId);
  if (!player || state.rounds.length > 0) return;

  const nextName = updates.name?.trim();
  if (!nextName) return;

  const duplicate = state.players.find((item) => item.id !== playerId && item.name.localeCompare(nextName, "nb", { sensitivity: "accent" }) === 0);
  if (duplicate) {
    alert(t("messages.duplicatePlayer", { name: nextName }));
    return;
  }

  player.name = nextName;
  player.avatarId = updates.avatarId || player.avatarId || defaultAvatarId;
  state.cupTeams = state.cupTeams.map((team) => createTeam(
    team.players.map((teamPlayer) => teamPlayer.id === playerId ? player : teamPlayer),
  ));
  state.schedule = buildSchedule(state.players, state.settings.format);
  saveState();
  render();
}

function removePlayer(playerId) {
  if (state.rounds.length > 0) {
    alert(t("messages.removePlayersLocked"));
    return;
  }
  state.players = state.players.filter((player) => player.id !== playerId);
  if (state.selectedPlayerId === playerId) state.selectedPlayerId = null;
  state.cupTeams = state.cupTeams
    .map((team) => createTeam(team.players.filter((teamPlayer) => teamPlayer.id !== playerId)))
    .filter((team) => team.players.length > 0);
  state.schedule = buildSchedule(state.players, state.settings.format);
  saveState();
  render();
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
    removeOfflineStorageKeys([storageKey, recoveryStorageKey, roleStorageKey, syncStorageKey]);
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

async function toggleSelectedPlayerAvailability() {
  const player = getPlayerById(state.selectedPlayerId);
  if (!player) return false;
  const isAway = player.availability === "away";
  const message = isAway
    ? t("messages.returnToTournamentConfirm", { name: player.name })
    : t("messages.markAwayConfirm", { name: player.name });
  if (!confirm(message)) return false;
  const nextAvailability = isAway ? "active" : "away";
  if (isSupabaseReady() && state.playerToken && state.id) {
    const { data, error } = await supabaseClient.rpc("set_player_availability", {
      p_tournament_id: state.id,
      p_invite_code: state.inviteCode,
      p_player_id: player.id,
      p_availability: nextAvailability,
      p_player_token: state.playerToken,
    });
    if (error || !data) {
      handleRemoteError(error, t("messages.availabilityUpdateFailed"));
      return false;
    }
    applyRemoteState(data, { source: "rpc", clearConflict: true });
    return true;
  }
  player.availability = nextAvailability;
  saveState({ remote: isCurrentUserAdmin() });
  render();
  return true;
}

function updateTournamentRules({ format, cupTeamSetupMode, includesThirdPlaceMatch, pointMode, gamesToWinSet, setsToWinMatch }) {
  if (state.rounds.length > 0) {
    alert(t("messages.rulesLocked"));
    return;
  }
  if (!["roundRobin", "cup"].includes(format)) return;
  if (!["auto", "manual"].includes(cupTeamSetupMode)) return;
  if (!["matches", "sets", "games"].includes(pointMode)) return;
  state.settings.format = format;
  state.settings.cupTeamSetupMode = cupTeamSetupMode;
  state.settings.includesThirdPlaceMatch = includesThirdPlaceMatch;
  state.settings.pointMode = pointMode;
  state.settings.gamesToWinSet = Math.max(1, Math.min(12, gamesToWinSet || 6));
  state.settings.setsToWinMatch = Math.max(1, Math.min(5, setsToWinMatch || 1));
  if (state.rounds.length === 0) {
    state.cup = null;
    state.schedule = buildSchedule(state.players, state.settings.format);
  }
}

function saveManualCupTeams(value) {
  if (state.rounds.length > 0 || state.status === "Avsluttet") {
    alert(t("messages.cupTeamsLocked"));
    return;
  }

  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    alert(t("messages.minimumCupTeams"));
    return;
  }

  const usedPlayerIds = new Set();
  const teams = [];
  for (const [index, line] of lines.entries()) {
    const playerNames = line.split("+").map((name) => name.trim()).filter(Boolean);
    if (playerNames.length < 1 || playerNames.length > 2) {
      alert(t("messages.invalidCupTeamSize", { team: index + 1 }));
      return;
    }

    const teamPlayers = [];
    for (const playerName of playerNames) {
      const player = findPlayerByName(playerName);
      if (!player || !player.active || player.availability === "away") {
        alert(t("messages.cupPlayerNotFound", { name: playerName }));
        return;
      }
      if (usedPlayerIds.has(player.id)) {
        alert(t("messages.cupPlayerDuplicate", { name: player.name }));
        return;
      }
      usedPlayerIds.add(player.id);
      teamPlayers.push(player);
    }
    teams.push(createTeam(teamPlayers));
  }

  state.cupTeams = teams;
  saveState();
  render();
}

function endTournament() {
  const activeRound = getActiveRound();
  if (activeRound && activeRound.status !== "finished") {
    activeRound.status = "finished";
    activeRound.matches.forEach((match) => {
      if (match.state !== "finished") match.state = "cancelled";
    });
  }
  state.status = "Avsluttet";
  saveProfileHistory();
}

function updateCourtsFromInput(value) {
  const courtNumbers = parseCourtNumbers(value);
  const existingByNumber = new Map(state.courts.map((court) => [court.courtNumber, court]));
  state.courts = courtNumbers.map((courtNumber) => {
    return existingByNumber.get(courtNumber) ?? {
      id: crypto.randomUUID(),
      name: `Bane ${courtNumber}`,
      courtNumber,
      active: true,
    };
  });
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
  return !generateRoundBlockReason();
}

function tournamentActionText() {
  if (state.rounds.length === 0) return t("startTournament");
  const activeRound = getActiveRound();
  if (activeRound?.status === "active" && !canCompleteRound(activeRound)) return t("score.playAllMatchesFirst");
  if (getNextScheduledRound()) return t("startNextRound");
  if (cupCanAdvance() || cupCanFinalize()) return t("startNextRound");
  if (state.settings.format === "cup" && state.status === "Cup ferdig") return t("tournament.cupFinished");
  return t("tournament.allGenerated");
}

function generateRoundBlockReason() {
  const activeRound = getActiveRound();
  if (state.status === "Avsluttet") return t("tournament.finished");
  if (state.players.length < 2) return t("messages.needTwoPlayersStart");
  if (state.settings.format === "cup") {
    if (state.settings.cupTeamSetupMode === "manual" && state.cupTeams.length < 2) {
      return t("messages.defineManualCupTeams");
    }
    if (state.settings.cupTeamSetupMode === "auto" && state.players.filter((player) => player.active && player.availability !== "away").length < 4) {
      return t("messages.autoCupNeedsActivePlayers");
    }
  }
  if (state.courts.length < 1) return t("messages.needCourt");
  if (activeRound?.status === "active" && !canCompleteRound(activeRound)) return t("messages.finishMatchesBeforeNext");
  if (state.rounds.length > 0 && !getNextScheduledRound() && !cupCanAdvance() && !cupCanFinalize()) {
    return state.settings.format === "cup" && state.status === "Cup ferdig"
      ? t("tournament.cupFinishedReason")
      : t("tournament.allGenerated");
  }
  return "";
}

function canCompleteRound(round) {
  if (!round || round.status === "finished") return false;
  return round.matches.length > 0 && round.matches.every((match) => ["finished", "cancelled"].includes(match.state));
}

function roundProgress(round) {
  if (!round) return null;
  return {
    total: round.matches.length,
    finished: round.matches.filter((match) => ["finished", "cancelled"].includes(match.state)).length,
  };
}

function isEditableAdminMatch(match) {
  const activeRound = getActiveRound();
  return Boolean(state.status !== "Avsluttet" && activeRound && activeRound.matches.some((roundMatch) => roundMatch.id === match.id));
}

function teamDisplay(team) {
  return team.players
    .map((player) => `
      <span class="team-player" style="${accentStyle(player.accent)}">
        <img class="avatar small-avatar" src="${avatarUrl(player)}" alt="" width="28" height="28">
        <span class="team-player-badge">${escapeHtml(player.name)}</span>
      </span>
    `)
    .join("");
}

function accentStyle(accent) {
  const base = playerAccentPalette[normalizeAccent(accent)] ?? playerAccentPalette.gold;
  const light = mixHex(base, "#ffffff", 0.28);
  const dark = mixHex(base, "#000000", 0.18);
  const [r, g, b] = hexToRgb(base);
  return `--player-accent: ${base}; --player-accent-light: ${light}; --player-accent-dark: ${dark}; --player-accent-rgb: ${r}, ${g}, ${b};`;
}

function teamAccentStyle(team) {
  return accentStyle(team.accent ?? team.players[0]?.accent);
}

function normalizeAccent(accent, fallbackIndex = 0) {
  if (playerAccentPalette[accent]) return accent;
  if (legacyAccentMap[accent]) return legacyAccentMap[accent];
  return accents[fallbackIndex % accents.length];
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(hex, targetHex, amount) {
  const source = hexToRgb(hex);
  const target = hexToRgb(targetHex);
  return rgbToHex(source.map((value, index) => value + (target[index] - value) * amount));
}

function generateFullTournamentSchedule() {
  if (state.settings.format === "cup") {
    generateCupTournament();
    return;
  }

  const schedule = state.schedule.length ? state.schedule : buildSchedule(state.players, state.settings.format);
  if (!schedule.length) {
    alert(t("messages.needTwoPlayers"));
    return;
  }

  state.rounds = schedule
    .map((roundPlan, index) => createScheduledRound(roundPlan, index + 1))
    .filter((round) => round.matches.length > 0);

  if (!state.rounds.length) {
    alert(t("messages.noValidMatches"));
    return;
  }

  activateRound(state.rounds[0]);
  state.status = "Runde pågår";
}

function generateCupTournament() {
  const activePlayers = state.players.filter((player) => player.active && player.availability !== "away");
  const teams = cupTeamsForStart();
  if (teams.length < 2) {
    alert(state.settings.cupTeamSetupMode === "manual"
      ? t("messages.manualCupNeedsTeams")
      : t("messages.autoCupNeedsPlayers"));
    return;
  }

  const bracketSize = nextPowerOfTwo(teams.length);
  const seededTeams = shuffleItems(teams);
  const byeCount = bracketSize - seededTeams.length;
  const byeTeams = seededTeams.slice(0, byeCount);
  const teamPlayerIds = new Set(teams.flatMap((team) => team.players.map((player) => player.id)));
  const firstRound = createScheduledRound({
    teams: seededTeams.slice(byeCount),
    sittingOut: [
      ...activePlayers.filter((player) => !teamPlayerIds.has(player.id)),
      ...byeTeams.flatMap((team) => team.players),
    ],
  }, 1);

  state.cup = {
    teamSetupMode: "auto",
    includesThirdPlaceMatch: state.settings.includesThirdPlaceMatch,
    bracketSize,
    byeTeams,
    bracket: createCupBracket({
      bracketSize,
      firstRound,
      byeTeams,
      includesThirdPlaceMatch: state.settings.includesThirdPlaceMatch,
    }),
  };
  state.rounds = firstRound.matches.length ? [firstRound] : [];

  if (!state.rounds.length) {
    state.status = "Cup ferdig";
    return;
  }

  activateRound(state.rounds[0]);
  state.status = "Runde pågår";
}

function createAutoCupTeams(players) {
  return Array.from({ length: Math.floor(players.length / 2) }, (_, index) => {
    return createTeam([players[index * 2], players[index * 2 + 1]]);
  });
}

function cupTeamsForStart() {
  if (state.settings.cupTeamSetupMode === "manual") return state.cupTeams;
  const activePlayers = state.players.filter((player) => player.active && player.availability !== "away");
  const pairedPlayers = activePlayers.slice(0, activePlayers.length - (activePlayers.length % 2));
  return createAutoCupTeams(pairedPlayers);
}

function createCupBracket({ bracketSize, firstRound, byeTeams, includesThirdPlaceMatch }) {
  const totalRounds = Math.max(1, Math.log2(bracketSize));
  const rounds = [{
    roundNumber: 1,
    slots: firstRound.matches.map((match) => ({ type: "match", matchId: match.id })),
    byeTeams,
    thirdPlaceSlot: null,
  }];

  for (let roundNumber = 2; roundNumber <= totalRounds; roundNumber += 1) {
    rounds.push({
      roundNumber,
      slots: Array.from({ length: Math.max(1, bracketSize / 2 ** roundNumber) }, () => ({ type: "pending" })),
      byeTeams: [],
      thirdPlaceSlot: roundNumber === totalRounds && includesThirdPlaceMatch ? { type: "pending" } : null,
    });
  }

  return {
    bracketSize,
    includesThirdPlaceMatch,
    rounds,
    finalMatchId: null,
    thirdPlaceMatchId: null,
  };
}

function createNextCupRound() {
  const previousRound = state.rounds.at(-1);
  if (!previousRound || previousRound.status !== "finished") return null;

  const previousBracketRound = getCupBracketRound(previousRound.roundNumber);
  const regularMatches = previousRound.matches.filter((match) => !match.isThirdPlaceMatch);
  const advancingTeams = [
    ...(previousBracketRound?.byeTeams ?? state.cup?.byeTeams ?? []),
    ...regularMatches
      .filter((match) => match.state === "finished" && match.winnerTeamIndex !== null)
      .map((match) => match.winnerTeamIndex === 0 ? match.teamOne : match.teamTwo),
  ];
  const losingTeams = regularMatches
    .filter((match) => match.state === "finished" && match.winnerTeamIndex !== null)
    .map((match) => match.winnerTeamIndex === 0 ? match.teamTwo : match.teamOne);
  state.cup.byeTeams = [];
  if (advancingTeams.length < 2) {
    state.cup.winnerTeam = advancingTeams[0] ?? null;
    return null;
  }

  const nextBracketRound = state.cup.bracket?.rounds?.find((round) => round.roundNumber > previousRound.roundNumber);
  const nextRoundNumber = nextBracketRound?.roundNumber ?? previousRound.roundNumber + 1;
  const nextRound = createScheduledRound({ teams: advancingTeams, sittingOut: [] }, nextRoundNumber);
  const isFinalRound = nextBracketRound
    ? nextRoundNumber === state.cup.bracket.rounds.at(-1)?.roundNumber
    : advancingTeams.length === 2;
  let thirdPlaceMatch = null;

  if (isFinalRound && state.cup.includesThirdPlaceMatch && losingTeams.length >= 2) {
    thirdPlaceMatch = createScheduledMatch(
      losingTeams[0],
      losingTeams[1],
      nextRoundNumber,
      nextRound.matches.length,
      true,
    );
    nextRound.matches.push(thirdPlaceMatch);
  }

  if (nextBracketRound) {
    nextBracketRound.slots = nextRound.matches
      .filter((match) => !match.isThirdPlaceMatch)
      .map((match) => ({ type: "match", matchId: match.id }));
    nextBracketRound.byeTeams = [];
    nextBracketRound.thirdPlaceSlot = thirdPlaceMatch
      ? { type: "match", matchId: thirdPlaceMatch.id }
      : nextBracketRound.thirdPlaceSlot && nextBracketRound.thirdPlaceSlot.type === "pending"
        ? null
        : nextBracketRound.thirdPlaceSlot;
    if (isFinalRound) {
      state.cup.bracket.finalMatchId = nextRound.matches.find((match) => !match.isThirdPlaceMatch)?.id ?? null;
      state.cup.bracket.thirdPlaceMatchId = thirdPlaceMatch?.id ?? null;
    }
  }

  return nextRound;
}

function cupCanAdvance() {
  if (state.settings.format !== "cup") return false;
  const round = state.rounds.at(-1);
  if (!round || (round.status !== "finished" && !(round.status === "active" && canCompleteRound(round)))) return false;
  const bracketRound = getCupBracketRound(round.roundNumber);
  const advancingTeams = [
    ...(bracketRound?.byeTeams ?? state.cup?.byeTeams ?? []),
    ...round.matches
      .filter((match) => !match.isThirdPlaceMatch)
      .filter((match) => match.state === "finished" && match.winnerTeamIndex !== null)
      .map((match) => match.winnerTeamIndex === 0 ? match.teamOne : match.teamTwo),
  ];
  return advancingTeams.length > 1;
}

function cupCanFinalize() {
  if (state.settings.format !== "cup") return false;
  const round = state.rounds.at(-1);
  if (!round || round.status !== "active" || !canCompleteRound(round)) return false;
  const finalRoundNumber = state.cup?.bracket?.rounds?.at(-1)?.roundNumber;
  return finalRoundNumber ? round.roundNumber === finalRoundNumber : true;
}

function getCupBracketRound(roundNumber) {
  return state.cup?.bracket?.rounds?.find((round) => round.roundNumber === roundNumber) ?? null;
}

function nextPowerOfTwo(value) {
  return 2 ** Math.ceil(Math.log2(value));
}

function shuffleItems(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function createScheduledRound(roundPlan, roundNumber) {
  const matchPlan = generateRoundMatches(roundPlan.teams, roundNumber, roundPlan.sittingOut);
  const matches = matchPlan.map((match, index) => ({
    ...match,
    isThirdPlaceMatch: false,
    courtId: state.courts[index % state.courts.length]?.id ?? null,
    courtName: state.courts[index % state.courts.length]?.name ?? null,
    state: "waiting",
  }));
  const playingPlayerIds = new Set(matches.flatMap((match) => matchPlayers(match).map((player) => player.id)));
  const sittingOut = uniquePlayers([
    ...roundPlan.sittingOut,
    ...roundPlan.teams.flatMap((team) => team.players).filter((player) => !playingPlayerIds.has(player.id)),
  ]);
  matches.forEach((match) => {
    match.sittingOut = sittingOut;
  });

  return {
    id: crypto.randomUUID(),
    roundNumber,
    status: "scheduled",
    createdAt: new Date().toISOString(),
    sittingOut,
    matches,
  };
}

function createScheduledMatch(teamOne, teamTwo, roundNumber, matchIndex, isThirdPlaceMatch = false) {
  const match = generateRoundMatches([teamOne, teamTwo], roundNumber, [])[0];
  return {
    ...match,
    isThirdPlaceMatch,
    courtId: state.courts[matchIndex % state.courts.length]?.id ?? null,
    courtName: state.courts[matchIndex % state.courts.length]?.name ?? null,
    state: "waiting",
  };
}

function activateRound(round) {
  state.rounds.forEach((item) => {
    if (item.status === "active") item.status = "finished";
  });
  round.status = "active";
  round.startedAt = round.startedAt ?? new Date().toISOString();
  let startedMatches = 0;
  round.matches.forEach((match) => {
    if (match.state === "waiting" && startedMatches < state.courts.length) {
      match.state = "playing";
      startedMatches += 1;
    }
  });
  state.currentRound = round.roundNumber;
  state.status = "Runde pågår";
}

function getNextScheduledRound() {
  return state.rounds.find((round) => round.status === "scheduled");
}

function startNextScheduledRound() {
  const nextRound = getNextScheduledRound();
  if (nextRound) {
    activateRound(nextRound);
    return;
  }
  if (state.settings.format !== "cup") return;

  const nextCupRound = createNextCupRound();
  if (!nextCupRound) {
    state.status = "Cup ferdig";
    return;
  }
  state.rounds.push(nextCupRound);
  activateRound(nextCupRound);
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
  match.state = "finished";
  match.currentGame = { teamOne: 0, teamTwo: 0 };
  match.winnerTeamIndex = setsWonByTeam(match, 0) > setsWonByTeam(match, 1) ? 0 : 1;
  match.isWalkover = false;
  match.completedAt = new Date().toISOString();

  activateNextWaitingMatch(match);
  markCupCompleteIfDone();
}

function activateNextWaitingMatch(match) {
  const activeRound = getActiveRound();
  const nextWaitingMatch = activeRound?.matches.find((item) => item.state === "waiting");
  if (!nextWaitingMatch) return null;
  nextWaitingMatch.state = "playing";
  nextWaitingMatch.courtId = match.courtId;
  nextWaitingMatch.courtName = match.courtName;
  return nextWaitingMatch;
}

function captureMatchUndoState(match) {
  const activeRound = getRoundForMatch(match);
  const matchSnapshot = structuredClone(match);
  delete matchSnapshot.lastScoredMatchState;
  const nextWaitingMatch = activeRound?.matches.find((item) => item.id !== match.id && item.state === "waiting");
  return {
    match: matchSnapshot,
    nextWaitingMatch: nextWaitingMatch ? structuredClone(nextWaitingMatch) : null,
    roundId: activeRound?.id ?? null,
    roundStatus: activeRound?.status ?? null,
    tournamentStatus: state.status,
    revision: state.revision,
    cupWinnerTeam: state.cup?.winnerTeam ? structuredClone(state.cup.winnerTeam) : null,
  };
}

function undoMatch(match) {
  const undoState = match.lastScoredMatchState;
  if (!undoState?.match) {
    alert(t("messages.noUndo"));
    return;
  }

  const restoredMatch = structuredClone(undoState.match);
  delete match.lastScoredMatchState;
  Object.assign(match, restoredMatch);

  if (undoState.nextWaitingMatch) {
    const nextMatch = getMatchById(undoState.nextWaitingMatch.id);
    if (nextMatch) Object.assign(nextMatch, structuredClone(undoState.nextWaitingMatch));
  }

  const round = state.rounds.find((item) => item.id === undoState.roundId);
  if (round && undoState.roundStatus) round.status = undoState.roundStatus;
  if (undoState.tournamentStatus) state.status = undoState.tournamentStatus;
  if (state.cup) state.cup.winnerTeam = undoState.cupWinnerTeam ? structuredClone(undoState.cupWinnerTeam) : null;
  saveState();
  render();
  renderLargeScore();
}

function markCupCompleteIfDone() {
  if (state.settings.format !== "cup") return;
  const activeRound = getActiveRound();
  if (!activeRound || !canCompleteRound(activeRound)) return;

  const finalRoundNumber = state.cup?.bracket?.rounds?.at(-1)?.roundNumber;
  const isFinalRound = finalRoundNumber
    ? activeRound.roundNumber === finalRoundNumber
    : !cupCanAdvance();
  if (!isFinalRound) return;

  const finalMatch = activeRound.matches.find((match) => !match.isThirdPlaceMatch);
  activeRound.status = "finished";
  state.status = "Cup ferdig";
  state.cup.winnerTeam = finalMatch?.winnerTeamIndex === 0
    ? finalMatch.teamOne
    : finalMatch?.winnerTeamIndex === 1
      ? finalMatch.teamTwo
      : null;
}

function saveMatchResult(match, teamOne, teamTwo) {
  saveSetResult(match, teamOne, teamTwo);
}

function saveSetResult(match, teamOne, teamTwo) {
  const validationError = validateSetScore(teamOne, teamTwo);
  if (validationError) {
    alert(translateScoreValidationError(validationError, teamOne, teamTwo));
    return;
  }

  if (isSupabaseReady()) {
    queueRemoteSetResult(match, teamOne, teamTwo);
    return;
  }

  match.lastScoredMatchState = captureMatchUndoState(match);
  match.currentSet = { teamOne, teamTwo };
  match.currentGame = { teamOne: 0, teamTwo: 0 };
  match.completedSets.push({ teamOne, teamTwo });
  if (hasMatchWinner(match)) {
    finishMatch(match);
  } else {
    match.currentSet = { teamOne: 0, teamTwo: 0 };
    match.state = "playing";
  }
  saveState();
  render();
  renderLargeScore();
}

function validateSetScore(teamOne, teamTwo) {
  return scoring.validateSetScore(teamOne, teamTwo, state.settings);
}

function translateScoreValidationError(message, teamOne, teamTwo) {
  if (!message) return "";
  if (message.includes("hele tall")) return t("messages.invalidScoreInteger");
  if (message.includes("negativt")) return t("messages.invalidScoreNegative");
  if (message.includes("uavgjort")) return t("messages.invalidScoreDraw");
  if (message.includes("Sett må vinnes")) {
    const gamesToWinSet = state.settings.gamesToWinSet ?? 6;
    return t("messages.invalidScoreShape", {
      gamesToWinSet,
      tieBreakOne: gamesToWinSet + 1,
      tieBreakTwo: gamesToWinSet - 1,
      teamOne,
      teamTwo,
    });
  }
  return message;
}

function awardTennisPoint(match, teamIndex) {
  if (["finished", "cancelled"].includes(match.state)) return;
  match.lastScoredMatchState = captureMatchUndoState(match);
  if (match.state === "waiting") match.state = "playing";

  const scoringTeam = teamIndex === 0 ? "teamOne" : "teamTwo";
  const otherTeam = teamIndex === 0 ? "teamTwo" : "teamOne";
  const scoringPoints = match.currentGame[scoringTeam] ?? 0;
  const otherPoints = match.currentGame[otherTeam] ?? 0;

  if (scoringPoints === 4 || (scoringPoints === 3 && otherPoints < 3)) {
    awardGame(match, scoringTeam);
  } else if (scoringPoints === 3 && otherPoints === 3) {
    match.currentGame[scoringTeam] = 4;
  } else if (otherPoints === 4) {
    match.currentGame[otherTeam] = 3;
  } else {
    match.currentGame[scoringTeam] = scoringPoints + 1;
  }

  saveState();
  if (currentLocalRole() === "player" && matchIncludesPlayer(match, state.selectedPlayerId)) {
    queuePlayerScore(match.id, teamIndex);
  }
  render();
  renderLargeScore();
}

function awardGame(match, scoringTeam) {
  match.currentSet[scoringTeam] += 1;
  match.currentGame = { teamOne: 0, teamTwo: 0 };

  if (isSetComplete(match.currentSet.teamOne, match.currentSet.teamTwo)) {
    match.completedSets.push({ ...match.currentSet });
    if (hasMatchWinner(match)) {
      finishMatch(match);
    } else {
      match.currentSet = { teamOne: 0, teamTwo: 0 };
    }
  }
}

function isSetComplete(teamOne, teamTwo) {
  return scoring.isSetComplete(teamOne, teamTwo, state.settings);
}

function hasMatchWinner(match) {
  return scoring.hasMatchWinner(match, state.settings);
}

function setsWonByTeam(match, teamIndex) {
  return scoring.setsWonByTeam(match, teamIndex);
}

function startMatch(match) {
  const activeRound = getActiveRound();
  if (!activeRound || activeRound.status !== "active") return;
  if (isSupabaseReady()) {
    queueRemoteMatchAction(match, "start");
    return;
  }
  match.state = "playing";
  saveState();
  render();
  renderLargeScore();
}

function reopenMatch(match) {
  if (isSupabaseReady()) {
    queueRemoteMatchAction(match, "undo");
    return;
  }

  if (match.lastScoredMatchState) {
    undoMatch(match);
    return;
  }

  match.state = "playing";
  match.completedSets = [];
  match.currentSet = { teamOne: 0, teamTwo: 0 };
  match.currentGame = { teamOne: 0, teamTwo: 0 };
  match.winnerTeamIndex = null;
  match.isWalkover = false;
  match.lastScoredMatchState = null;
  match.completedAt = null;
  saveState();
  render();
  renderLargeScore();
}

function cancelMatch(match) {
  if (!confirm(t("messages.cancelMatchConfirm"))) return;
  if (isSupabaseReady()) {
    queueRemoteMatchAction(match, "cancel");
    return;
  }
  match.state = "cancelled";
  match.completedSets = [];
  match.winnerTeamIndex = null;
  match.isWalkover = false;
  match.completedAt = new Date().toISOString();
  activateNextWaitingMatch(match);
  saveState();
  render();
  renderLargeScore();
}

function setWalkover(match, teamIndex) {
  if (![0, 1].includes(teamIndex) || ["finished", "cancelled"].includes(match.state)) return;
  const winningTeam = teamIndex === 0 ? match.teamOne : match.teamTwo;
  if (!confirm(t("messages.walkoverConfirm", { team: winningTeam.displayName }))) return;

  if (isSupabaseReady()) {
    queueRemoteMatchAction(match, "walkover", teamIndex);
    return;
  }

  match.lastScoredMatchState = captureMatchUndoState(match);
  match.state = "finished";
  match.completedSets = [];
  match.currentSet = { teamOne: 0, teamTwo: 0 };
  match.currentGame = { teamOne: 0, teamTwo: 0 };
  match.winnerTeamIndex = teamIndex;
  match.isWalkover = true;
  match.completedAt = new Date().toISOString();
  activateNextWaitingMatch(match);
  markCupCompleteIfDone();
  saveState();
  render();
  renderLargeScore();
}

function updateMatchCourt(match, courtName) {
  const nextCourtName = courtName.trim();
  match.courtName = nextCourtName || null;
  const matchingCourt = state.courts.find((court) => court.name.localeCompare(nextCourtName, "nb", { sensitivity: "accent" }) === 0);
  match.courtId = matchingCourt?.id ?? match.courtId ?? null;
  saveState();
  render();
  renderLargeScore();
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
  const matchIndex = globalMatchNumber(match);
  const sitOutCount = match.sittingOut?.length ?? 0;
  const parts = [
    t("tournament.roundLabel", { round: match.rotationNumber }),
    matchIndex ? t("matches.matchNumber", { match: matchIndex }) : "",
    sitOutCount ? t("matches.restingCount", { count: sitOutCount }) : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function globalMatchNumber(match) {
  const index = getAllMatches().findIndex((item) => item.id === match.id);
  return index >= 0 ? index + 1 : null;
}

function primaryMatchHeadline(match) {
  if (match.state === "finished" && match.winnerTeamIndex !== null) {
    const winner = match.winnerTeamIndex === 0 ? match.teamOne : match.teamTwo;
    if (match.isWalkover) return t("score.walkoverWinner", { winner: winner.displayName });
    return t("score.matchWinner", { winner: winner.displayName, score: setScoreText(match) });
  }
  if (match.state === "cancelled") return t("score.matchCancelled");
  return t("score.matchup", { teamOne: match.teamOne.displayName, teamTwo: match.teamTwo.displayName });
}

function startingTeamText(match) {
  return match.startingTeamIndex === 0 ? t("common.teamOne") : t("common.teamTwo");
}

function scoreSummary(match) {
  if (match.isWalkover) return t("score.walkover");
  if (match.completedSets.length) {
    const sets = match.completedSets.map((set) => `${set.teamOne}-${set.teamTwo}`).join(", ");
    return match.state === "finished" ? t("score.finishedPrefix", { sets }) : t("score.setsPrefix", { sets });
  }
  return t("score.currentSummary", { sets: setScoreText(match), game: gameScoreText(match) });
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
  if (!match.sittingOut?.length) return "";
  return ` · ${t("matches.restingPlayers", { players: match.sittingOut.map((player) => escapeHtml(player.name)).join(", ") })}`;
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
  return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
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
  const hasSavedTournament = Boolean(localStorage.getItem(storageKey));
  const params = new URLSearchParams(window.location.search);
  const spectatorInviteCode = params.get(spectatorQueryKey);
  if (spectatorInviteCode) {
    spectatorMode = true;
    setLocalRole("spectator");
    if (hasTournamentForInvite(spectatorInviteCode.toUpperCase())) {
      showWorkspace("tournament");
      return;
    }
    if (supabaseClient) {
      loadRemoteTournamentByInvite(spectatorInviteCode.toUpperCase()).then((loaded) => {
        if (loaded) showWorkspace("tournament");
        else showModule("setup-player");
        render();
      });
      showWorkspace("tournament");
      return;
    }
    showModule("setup-player");
    return;
  }
  const hasInviteUrl = params.has("join") || params.has("code");
  if (hasInviteUrl) {
    showModule("setup-player");
    return;
  }
  if (!hasSavedTournament) return;

  if (isCurrentUserAdmin()) {
    showWorkspace("admin");
    return;
  }

  showWorkspace(state.selectedPlayerId ? "player" : "spectator");
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
    nextPowerOfTwo,
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
