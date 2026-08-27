const legacyStorageKey = "padel-manager-demo";
const legacyRoleStorageKey = "padel-manager-role";
const storageKey = "padelstar-demo";
const roleStorageKey = "padelstar-role";
const syncStorageKey = `${storageKey}-sync`;
const publicAppUrl = "https://padelstar.app/";
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
  { id: "smash", label: "Smash" },
  { id: "serve", label: "Serve" },
  { id: "wall", label: "Vegg" },
  { id: "lob", label: "Lob" },
];
const translations = {
  nb: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Språk",
    localPwa: "Lokal",
    offline: "Offline",
    startTournament: "Start turnering",
    startNextRound: "Start neste runde",
    finishTournament: "Fullfør turnering",
    realtimeConnecting: "Kobler til",
    realtimeConnected: "Online",
    realtimeDisconnected: "Frakoblet",
    realtimeReconnecting: "Kobler til på nytt",
    realtimeError: "Tilkoblingsfeil",
    refreshRemoteState: "Last inn siste state",
    syncPending: "synkroniserer",
  },
  nn: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Språk",
    localPwa: "Lokal",
    offline: "Fråkopla",
    startTournament: "Start turnering",
    startNextRound: "Start neste runde",
    finishTournament: "Fullfør turnering",
    realtimeConnecting: "Koplar til",
    realtimeConnected: "Online",
    realtimeDisconnected: "Fråkopla",
    realtimeReconnecting: "Koplar til på nytt",
    realtimeError: "Tilkoblinsfeil",
    refreshRemoteState: "Last inn siste state",
    syncPending: "synkroniserer",
  },
  en: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Language",
    localPwa: "Local",
    offline: "Offline",
    startTournament: "Start tournament",
    startNextRound: "Start next round",
    finishTournament: "Finish tournament",
    realtimeConnecting: "Connecting",
    realtimeConnected: "Online",
    realtimeDisconnected: "Disconnected",
    realtimeReconnecting: "Reconnecting",
    realtimeError: "Connection error",
    refreshRemoteState: "Load latest state",
    syncPending: "syncing",
  },
};

const defaultTournament = createTournament({
  name: "Risløkka Padel",
  inviteCode: "P4K7D",
  players: [],
  courtCount: 1,
});

migrateLegacyLocalStorage();

let state = loadState();
let largeScoreMatchId = null;
let activeModule = "landing";
const supabaseSettings = window.PADELSTAR_SUPABASE ?? window.PADEL_MANAGER_SUPABASE ?? {};
const supabaseClient = supabaseSettings.url && supabaseSettings.anonKey && window.supabase
  ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  : null;
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
let pendingAdminSync = loadPendingAdminSync();
let pendingPlayerScores = loadPendingPlayerScores();
if (pendingAdminSync) remoteMutationSequence = 1;
let playerScoreQueueRunning = false;

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
  roundLabel: document.querySelector("#roundLabel"),
  inviteCode: document.querySelector("#inviteCode"),
  adminInviteCode: document.querySelector("#adminInviteCode"),
  joinQrCode: document.querySelector("#joinQrCode"),
  joinLink: document.querySelector("#joinLink"),
  copyInviteCodeButton: document.querySelector("#copyInviteCodeButton"),
  copyJoinLinkButton: document.querySelector("#copyJoinLinkButton"),
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
  playerNextMatch: document.querySelector("#playerNextMatch"),
  playerStatusGrid: document.querySelector("#playerStatusGrid"),
  generateRoundButton: document.querySelector("#generateRoundButton"),
  completeRoundButton: document.querySelector("#completeRoundButton"),
  exportBackupButton: document.querySelector("#exportBackupButton"),
  importBackupButton: document.querySelector("#importBackupButton"),
  backupFileInput: document.querySelector("#backupFileInput"),
  endTournamentButton: document.querySelector("#endTournamentButton"),
  resetTournamentButton: document.querySelector("#resetTournamentButton"),
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
};

let pendingSetScoreMatchId = null;

syncCreateFormDefaults();
syncJoinPreview();
prefillInviteCodeFromUrl();
syncCopyrightYear();
registerServiceWorker();
syncConnectionStatus();
connectRealtimeForCurrentState();

window.addEventListener("online", handleOnline);
window.addEventListener("offline", handleOffline);

elements.joinTournamentForm.elements.playerName.addEventListener("input", syncJoinPreview);
elements.avatarPicker.addEventListener("change", syncJoinPreview);
elements.adminParticipatesInput.addEventListener("change", syncAdminPlayerChoice);
elements.languageSelect.addEventListener("change", () => {
  state.settings.language = elements.languageSelect.value;
  saveState();
  applyLanguage();
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
    alert("Skriv inn spillernavn for admin.");
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
    alert(`Fant ikke turnering med kode ${inviteCode}.`);
    return;
  }

  if (!playerName) return;

  let player;
  if (supabaseClient) {
    const joined = await joinRemoteTournament(playerName, avatarId);
    if (!joined) return;
    player = findPlayerByName(playerName);
  } else {
    const existingPlayer = findPlayerByName(playerName);
    if (!existingPlayer && state.rounds.length > 0) {
      alert("Turneringen er startet. Be administrator legge deg til i neste turnering.");
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
    alert("Spillere kan bare legges til før første runde i denne turneringen.");
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
    alert("Baner kan ikke endres mens en runde pågår eller etter at turneringen er avsluttet.");
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
  if (!confirm("Fullføre turneringen? Pågående kamper som ikke er ferdige blir avbrutt.")) return;
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
  if (!confirm("Avslutte turneringen? Du kan fortsatt se resultater og laste ned backup etterpå.")) return;
  endTournament();
  saveState();
  render();
});

elements.resetTournamentButton.addEventListener("click", async () => {
  if (!confirm("Nullstille turneringen? Turneringens lokale og nettlagrede data blir slettet.")) return;
  await deleteRemoteTournament();
  state = structuredClone(defaultTournament);
  localStorage.removeItem(storageKey);
  localStorage.removeItem(roleStorageKey);
  syncCreateFormDefaults();
  elements.joinTournamentForm.reset();
  syncJoinPreview();
  showStart();
  render();
});

elements.resumeTournamentButton.addEventListener("click", () => {
  showWorkspace(isCurrentUserAdmin() ? "admin" : state.selectedPlayerId ? "player" : "spectator");
  render();
});

elements.copyInviteCodeButton.addEventListener("click", () => {
  copyText(state.inviteCode, "Invitasjonskoden er kopiert.");
});

elements.copyJoinLinkButton.addEventListener("click", () => {
  copyText(createJoinLink(), "Join-lenken er kopiert.");
});

elements.showExistingPlayersButton.addEventListener("click", async () => {
  const inviteCode = elements.joinTournamentForm.elements.inviteCode.value.trim().toUpperCase();
  if (!inviteCode) {
    alert("Skriv inn invitasjonskoden først.");
    elements.joinTournamentForm.elements.inviteCode.focus();
    return;
  }

  const loadedRemote = supabaseClient ? await loadRemoteTournamentByInvite(inviteCode) : false;

  if (!hasTournamentForInvite(inviteCode, loadedRemote)) {
    alert(`Fant ikke turnering med kode ${inviteCode}.`);
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
    toggle.setAttribute("aria-label", isOpen ? "Lukk meny" : "Åpne meny");
  });
}

function setWorkspaceMenuOpen(isOpen) {
  document.body.classList.toggle("workspace-menu-open", isOpen);
  document.querySelectorAll(".workspace-menu-toggle").forEach((toggle) => {
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Lukk visningsmeny" : "Åpne visningsmeny");
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
    participantType: "player",
    joinStatus: "joined",
    joinedFrom: "manual",
    createdAt: new Date().toISOString(),
  };
}

function loadState() {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return structuredClone(defaultTournament);

  try {
    return migrateState(JSON.parse(stored));
  } catch {
    return structuredClone(defaultTournament);
  }
}

function migrateState(nextState) {
  nextState.settings = {
    ...defaultTournament.settings,
    ...(nextState.settings ?? {}),
  };
  if (!["roundRobin", "cup"].includes(nextState.settings.format)) nextState.settings.format = "roundRobin";
  if (!["auto", "manual"].includes(nextState.settings.cupTeamSetupMode)) nextState.settings.cupTeamSetupMode = "auto";
  nextState.settings.includesThirdPlaceMatch = Boolean(nextState.settings.includesThirdPlaceMatch);
  nextState.adminToken ??= null;
  nextState.playerToken ??= null;
  nextState.revision = Number.isInteger(nextState.revision) && nextState.revision >= 0 ? nextState.revision : 0;
  nextState.selectedPlayerId ??= null;
  nextState.players ??= [];
  nextState.courts ??= structuredClone(defaultTournament.courts);
  nextState.schedule ??= buildSchedule(nextState.players, nextState.settings.format);
  nextState.rounds ??= [];
  nextState.cup ??= null;
  nextState.cupTeams = Array.isArray(nextState.cupTeams) ? nextState.cupTeams : [];
  nextState.players = nextState.players.map((player, index) => ({
    active: true,
    participantType: "player",
    accent: accents[index % accents.length],
    avatarId: defaultAvatarId,
    joinStatus: "joined",
    joinedFrom: "manual",
    createdAt: new Date().toISOString(),
    ...player,
  })).map((player, index) => ({
    ...player,
    accent: normalizeAccent(player.accent, index),
  }));
  nextState.rounds = nextState.rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => migrateMatch(match, nextState.id)),
  }));
  return nextState;
}

function migrateMatch(match, tournamentId) {
  if (match.teamOne && match.teamTwo) {
    return {
      currentGame: { teamOne: 0, teamTwo: 0 },
      completedSets: [],
      sittingOut: [],
      isThirdPlaceMatch: false,
      lastScoredMatchState: null,
      ...match,
    };
  }
  return {
    id: match.id,
    tournamentId,
    rotationNumber: match.roundNumber ?? 1,
    courtId: match.courtId,
    courtName: match.courtName,
    teamOne: createTeam(match.team1.map(getPlayerById).filter(Boolean)),
    teamTwo: createTeam(match.team2.map(getPlayerById).filter(Boolean)),
    sittingOut: [],
    state: match.status === "Completed" ? "finished" : match.status === "Active" ? "playing" : "waiting",
    completedSets: [],
    currentSet: {
      teamOne: match.scoreTeam1 ?? 0,
      teamTwo: match.scoreTeam2 ?? 0,
    },
    currentGame: { teamOne: 0, teamTwo: 0 },
    startingTeamIndex: 0,
    winnerTeamIndex: match.scoreTeam1 > match.scoreTeam2 ? 0 : match.scoreTeam2 > match.scoreTeam1 ? 1 : null,
    isWalkover: false,
    isThirdPlaceMatch: false,
    lastScoredMatchState: null,
    completedAt: match.completedAt,
  };
}

function readSyncMetadata() {
  try {
    const parsed = JSON.parse(localStorage.getItem(syncStorageKey) ?? "null");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadPendingAdminSync() {
  return Boolean(readSyncMetadata().admin);
}

function loadPendingPlayerScores() {
  const metadata = readSyncMetadata();
  if (!Array.isArray(metadata.playerScores)) return [];
  return metadata.playerScores
    .filter((item) => item && typeof item.matchId === "string" && [0, 1].includes(item.teamIndex))
    .map((item) => ({ matchId: item.matchId, teamIndex: item.teamIndex }));
}

function persistSyncMetadata() {
  if (!pendingAdminSync && pendingPlayerScores.length === 0) {
    localStorage.removeItem(syncStorageKey);
    return;
  }
  localStorage.setItem(syncStorageKey, JSON.stringify({
    admin: pendingAdminSync,
    playerScores: pendingPlayerScores,
  }));
}

function hasPendingRemoteWrites() {
  return pendingAdminSync || pendingPlayerScores.length > 0;
}

function saveState(options = {}) {
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (options.remote !== false && isCurrentUserAdmin()) {
    pendingAdminSync = true;
    persistSyncMetadata();
    remoteMutationSequence += 1;
    queueRemoteSave();
  }
}

function isSupabaseReady() {
  return Boolean(supabaseClient);
}

function remoteErrorMessage(error, fallback) {
  const message = String(error?.message ?? "");
  if (/rate limit exceeded/i.test(message)) {
    return "For mange forespørsler akkurat nå. Vent litt og prøv igjen.";
  }
  if (/invalid (?:invite code|player|tournament|.*payload)/i.test(message)) {
    return "Kontroller opplysningene og prøv igjen.";
  }
  return fallback;
}

function sanitizeSharedState(nextState) {
  const sharedState = structuredClone(nextState);
  delete sharedState.adminToken;
  delete sharedState.playerToken;
  delete sharedState.selectedPlayerId;
  return sharedState;
}

function isConflictError(error) {
  return /tournament state changed|revision|conflict/i.test(String(error?.message ?? ""));
}

function isTransientRemoteError(error) {
  return !navigator.onLine || /network|fetch|timeout|timed out|closed|aborted|connection/i.test(String(error?.message ?? ""));
}

function setRemoteNotice(message) {
  if (elements.copyStatus) elements.copyStatus.textContent = message;
  renderSyncControls();
}

function markRemoteConflict() {
  remoteConflict = true;
  pendingAdminSync = false;
  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = null;
  lastRemotePersistedSequence = Math.max(lastRemotePersistedSequence, remoteMutationSequence);
  persistSyncMetadata();
  setRemoteNotice("Turneringen ble endret fra en annen admin. Last inn siste state før du fortsetter.");
  render();
}

function handleRemoteError(error, fallback) {
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
    setRemoteNotice("Live state er oppdatert.");
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
    alert(remoteErrorMessage(error, "Turneringen kunne ikke lagres live akkurat nå. Den lokale kopien er beholdt."));
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
  const player = createPlayer(playerName, state.players.length, avatarId);
  player.joinedFrom = "self";
  const { data, error } = await supabaseClient.rpc("join_tournament", {
    p_invite_code: state.inviteCode,
    p_player: player,
  });
  if (error) {
    alert(remoteErrorMessage(error, "Kunne ikke melde deg på akkurat nå. Prøv igjen."));
    return false;
  }
  if (!data?.state || !data.playerToken || !data.playerId) {
    alert("Kunne ikke opprette en sikker spillerøkt.");
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
    else handleRemoteError(error, "Kunne ikke synkronisere live akkurat nå. Lokal kopi er lagret.");
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
    setRemoteNotice("Du er offline. Koble til igjen før admin-endringen sendes.");
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
        handleRemoteError(error, "Kunne ikke oppdatere kampen live akkurat nå. Prøv igjen når forbindelsen er tilbake.");
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

function queueRemoteSetResult(match, teamOne, teamTwo) {
  if (!isSupabaseReady() || !isCurrentUserAdmin() || !state.adminToken || !state.id) return;
  if (!navigator.onLine) {
    setRemoteNotice("Du er offline. Koble til igjen før settresultatet sendes.");
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
        handleRemoteError(error, "Kunne ikke lagre settresultatet live akkurat nå. Prøv igjen når forbindelsen er tilbake.");
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
    setRemoteNotice("Du er offline. Koble til igjen før neste runde sendes.");
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
        handleRemoteError(error, "Kunne ikke starte neste runde live akkurat nå. Prøv igjen når forbindelsen er tilbake.");
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

function queueRemoteCupAdvance() {
  if (!isSupabaseReady() || !isCurrentUserAdmin() || !state.adminToken || !state.id) return;
  if (!navigator.onLine) {
    setRemoteNotice("Du er offline. Koble til igjen før neste cup-runde sendes.");
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
        handleRemoteError(error, "Kunne ikke starte neste cup-runde live akkurat nå. Prøv igjen når forbindelsen er tilbake.");
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
        handleRemoteError(error, "Kunne ikke synkronisere poenget live akkurat nå. Lokal kopi er lagret.");
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
    elements.copyStatus.textContent = remoteErrorMessage(error, "Kunne ikke slette live-turneringen. Lokal kopi nullstilles.");
    return false;
  }
  removeRealtimeChannel();
  pendingAdminSync = false;
  pendingPlayerScores = [];
  persistSyncMetadata();
  return true;
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

  const backoff = [1000, 2000, 5000, 10000, 30000][Math.min(realtimeReconnectAttempt, 4)];
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
      if (error) handleRemoteError(error, "Kunne ikke hente siste live state akkurat nå.");
      return false;
    }
    return applyRemoteState(data, {
      source: "refresh",
      clearConflict: reason === "manual",
    });
  }).catch((error) => {
    handleRemoteError(error, "Kunne ikke hente siste live state akkurat nå.");
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
  setRealtimeConnectionState(realtimeReconnectAttempt > 0 ? "reconnecting" : "connecting");
  let channel;
  channel = supabaseClient
    .channel(`tournament:${tournamentId}`)
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
    if (status === "SUBSCRIBED") {
      realtimeReconnectAttempt = 0;
      setRealtimeConnectionState("connected");
      refreshRemoteState("reconnect").finally(flushPendingRemoteWrites);
    } else if (["CHANNEL_ERROR", "TIMED_OUT"].includes(status)) {
      console.warn("Supabase realtime channel failed", error);
      setRealtimeConnectionState("error");
      scheduleRealtimeReconnect();
    } else if (status === "CLOSED") {
      setRealtimeConnectionState("disconnected");
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
      elements.copyStatus.textContent = "Backup er importert.";
    } catch {
      alert("Kunne ikke importere backup. Velg en gyldig Padelstar JSON-fil.");
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
  return Boolean(
    candidate &&
      typeof candidate.name === "string" &&
      typeof candidate.inviteCode === "string" &&
      Array.isArray(candidate.players) &&
      Array.isArray(candidate.rounds),
  );
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
  const name = elements.joinTournamentForm.elements.playerName.value.trim() || "Navnet ditt";
  const avatarId = new FormData(elements.joinTournamentForm).get("avatarId") || defaultAvatarId;
  elements.joinNamePreview.textContent = name;
  elements.joinAvatarPreview.src = avatarUrl({ name, avatarId });
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

  document.body.classList.toggle("workspace-active", isWorkspaceActive);
  document.body.classList.toggle("setup-active", requestedModule === "setup-admin" || requestedModule === "setup-player");
  closeLandingMenu();
  closeWorkspaceMenu();

  document.querySelectorAll(".app-module").forEach((section) => {
    const sectionModule = section.dataset.module;
    const isActive = sectionModule === requestedModule || (sectionModule === "workspace" && isWorkspaceActive);
    section.classList.toggle("hidden", !isActive);
  });

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
}

function currentLocalRole() {
  const storedRole = localStorage.getItem(roleStorageKey);
  if (storedRole) return storedRole;
  if (state.adminToken) return "admin";
  if (state.selectedPlayerId) return "player";
  return "spectator";
}

function renderRoleVisibility() {
  const isAdmin = isCurrentUserAdmin();
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
  const matches = getAllMatches();
  applyLanguage();
  renderStartResume();
  renderRoleVisibility();
  elements.tournamentTitle.textContent = state.name;
  elements.roundLabel.textContent = `Runde ${Math.max(state.currentRound, 1)}`;
  elements.inviteCode.textContent = state.inviteCode;
  elements.adminInviteCode.textContent = state.inviteCode;
  elements.joinLink.value = createJoinLink();
  elements.joinQrCode.src = createQrCodeUrl(createJoinLink());
  elements.tournamentStatus.textContent = state.status;
  elements.playerCount.textContent = `${state.players.length} spillere`;
  elements.matchCount.textContent = `${matches.length} kamper`;
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
  elements.connectionStatus.setAttribute("aria-label", `Tilkoblingsstatus: ${elements.connectionStatus.textContent}`);
  elements.connectionStatus.classList.toggle("offline", statusClass === "offline");
}

function renderSyncControls() {
  if (!elements.refreshRemoteButton) return;
  const canRefresh = remoteConflict && isCurrentUserAdmin();
  elements.refreshRemoteButton.classList.toggle("hidden", !canRefresh);
  elements.refreshRemoteButton.textContent = t("refreshRemoteState");
}

function applyLanguage() {
  const language = state.settings.language ?? "nb";
  document.documentElement.lang = language === "en" ? "en" : "no";
  elements.languageSelect.value = language;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
}

function t(key) {
  const language = state.settings?.language ?? "nb";
  return translations[language]?.[key] ?? translations.nb[key] ?? key;
}

function renderStartResume() {
  const hasSavedTournament = Boolean(localStorage.getItem(storageKey));
  elements.resumePanel.classList.toggle("hidden", !hasSavedTournament);
  if (!hasSavedTournament) return;

  const isAdmin = isCurrentUserAdmin();
  elements.resumeTitle.textContent = `Fortsett ${state.name}`;
  elements.resumeSummary.textContent = isAdmin
    ? `${state.players.length} spillere · ${state.courts.length} baner · kode ${state.inviteCode}`
    : `${state.players.length} spillere · ${state.courts.length} baner`;
  elements.resumeTournamentButton.textContent = isAdmin ? "Fortsett som admin" : "Fortsett turnering";
}

function renderLobbyStatus() {
  const minimumPlayersReady = state.players.length >= 2;
  const hasCourts = state.courts.length >= 1;
  const hasStarted = state.rounds.length > 0;
  const activeRound = getActiveRound();
  const isFinished = state.status === "Avsluttet";
  const blockReason = generateRoundBlockReason();
  const nextRoundLabel = blockReason || (state.currentRound > 0 ? `Neste blir runde ${state.currentRound + 1}` : "Klar for første runde");
  const playerMode = state.settings.format === "cup"
    ? "Cup"
    : state.players.length >= 4 ? "Double" : state.players.length >= 2 ? "Single" : "Venter";
  const progress = activeRound?.status === "active" ? roundProgress(activeRound) : null;
  const statusText = isFinished ? "Ferdig" : activeRound?.status === "active" ? "I gang" : hasStarted ? "Mellom" : "Lobby";

  elements.lobbyStatus.innerHTML = `
    <div class="${minimumPlayersReady ? "ready" : "waiting"}">
      <span>Spillere</span>
      <strong>${state.players.length}</strong>
      <small>${minimumPlayersReady ? playerMode : "Minst 2"}</small>
    </div>
    <div class="${hasCourts ? "ready" : "waiting"}">
      <span>Baner</span>
      <strong>${state.courts.length}</strong>
      <small>${hasCourts ? "Klar" : "Mangler"}</small>
    </div>
    <div class="${canGenerateRound() ? "ready" : "waiting"}">
      <span>Status</span>
      <strong>${statusText}</strong>
      <small>${progress ? `${progress.finished}/${progress.total} kamper ferdig` : nextRoundLabel}</small>
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
        <span class="status-chip waiting">Lobby</span>
        <strong>Del koden og fyll spillerlisten.</strong>
        <small>${state.players.length} spillere klare · ${state.courts.length} baner</small>
      </div>
      <div class="progress-track" aria-label="Turneringsfremdrift">
        <span style="width: 0%"></span>
      </div>
    `;
    return;
  }

  elements.adminLiveOverview.innerHTML = `
    <div class="overview-main">
      <span class="status-chip ${spotlightMatch.state}">${matchStateText(spotlightMatch.state)}</span>
      <strong>${escapeHtml(primaryMatchHeadline(spotlightMatch))}</strong>
      <small>${escapeHtml(matchContextText(spotlightMatch))} · ${escapeHtml(setScoreText(spotlightMatch))} games · ${escapeHtml(gameScoreText(spotlightMatch))}</small>
    </div>
    <div class="overview-stats">
      <div>
        <span>Aktive</span>
        <strong>${playingMatches.length}</strong>
      </div>
      <div>
        <span>Neste</span>
        <strong>${waitingMatches.length}</strong>
      </div>
      <div>
        <span>Ferdig</span>
        <strong>${finishedMatches.length}</strong>
      </div>
    </div>
    <div class="progress-track" aria-label="Turneringsfremdrift">
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
        Ingen spillere ennå. Del koden ${state.inviteCode}, eller legg til spillere manuelt.
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
        <small class="join-source-chip">${player.joinedFrom === "self" ? "Påmeldt selv" : "Lagt til av admin"}</small>
      </span>
      <span class="player-actions">
        <strong>${entry?.points ?? 0} p</strong>
        <button class="icon-button danger-button" type="button" aria-label="Fjern ${escapeHtml(player.name)}" ${lobbyLocked ? "disabled" : ""}>Fjern</button>
      </span>
    `;
    if (!lobbyLocked) {
      const editor = document.createElement("form");
      editor.className = "player-edit-grid";
      editor.innerHTML = `
        <input name="playerName" type="text" value="${escapeAttribute(player.name)}" aria-label="Endre navn for ${escapeAttribute(player.name)}" required>
        <select name="avatarId" aria-label="Avatar for ${escapeAttribute(player.name)}">
          ${avatarOptions.map((avatar) => `
            <option value="${avatar.id}" ${player.avatarId === avatar.id ? "selected" : ""}>${avatar.label}</option>
          `).join("")}
        </select>
        <button class="secondary icon-button" type="submit">Lagre</button>
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
  elements.cupTeamSummary.textContent = `${state.cupTeams.length} lag`;
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
    appendEmptyText(elements.roundSummary, "Rundeoppsett vises her når kampene er generert.");
    return;
  }

  const progress = roundProgress(activeRound);
  const summaryItems = [
    {
      label: "Runde",
      value: activeRound.roundNumber,
      detail: activeRound.status === "active" ? "Pågår" : "Fullført",
    },
    {
      label: "Kamper",
      value: activeRound.matches.length,
      detail: `${progress.finished}/${progress.total} ferdig`,
    },
    {
      label: "Pause",
      value: activeRound.sittingOut?.length ?? 0,
      detail: activeRound.sittingOut?.length ? activeRound.sittingOut.map((player) => player.name).join(", ") : "Ingen",
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
  renderGroupedMatches(
    elements.adminMatches,
    matches,
    "Ingen kamper ennå. Generer første runde.",
    (match) => createMatchCard(match, isEditableAdminMatch(match)),
  );
  renderGroupedMatches(
    elements.playerMatches,
    playerMatches,
    selectedPlayer ? "Du har ingen kamper ennå." : "Velg spillerprofil for å se dine kamper.",
    (match) => createMatchCard(match, isEditablePlayerMatch(match, selectedPlayer), selectedPlayer?.id, true),
  );
  renderSpectatorMatches(matches);
}

function renderGroupedMatches(container, matches, emptyText, cardFactory) {
  container.innerHTML = "";
  if (matches.length === 0) {
    appendEmptyText(container, emptyText);
    return;
  }

  const groups = [
    { title: "Pågår", matches: matches.filter((match) => match.state === "playing") },
    { title: "Venter", matches: matches.filter((match) => match.state === "waiting") },
    { title: "Ferdig", matches: matches.filter((match) => ["finished", "cancelled"].includes(match.state)) },
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
      appendEmptyText(elements.spectatorMatches, "Ingen pågående kamper ennå.");
      return;
    }
    appendEmptyText(elements.spectatorMatches, "Ingen kamper pågår akkurat nå. Neste kampoppsett er klart i spillerfanen.");
    return;
  }

  const section = document.createElement("section");
  section.className = "match-group spectator-live-group";
  section.innerHTML = `<h4>Pågående kamper</h4>`;
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
      <strong>${match.courtName ?? "Bane kommer"}</strong>
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
      <span>Poeng ${escapeHtml(gameScoreText(match))}</span>
      <span>Games ${escapeHtml(setScoreText(match))}</span>
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
        ${match.state === "playing" ? "<span class=\"now-chip\">Nå</span>" : ""}
      </div>
      <div class="match-top-actions">
        <span class="match-court">${match.courtName ?? "Ikke tildelt bane"}</span>
        <span class="match-status ${match.state}">${matchStateText(match.state)}</span>
      </div>
    </div>
    <div class="match-headline">
      <span>${escapeHtml(primaryMatchHeadline(match))}</span>
    </div>
    <div class="teams">
      <div class="team">
        <small>Lag 1</small>
        <strong style="${teamAccentStyle(match.teamOne)}">${teamDisplay(match.teamOne)}</strong>
      </div>
      <div class="versus">mot</div>
      <div class="team">
        <small>Lag 2</small>
        <strong style="${teamAccentStyle(match.teamTwo)}">${teamDisplay(match.teamTwo)}</strong>
      </div>
    </div>
    <div class="tennis-scoreboard" aria-label="Poengstilling">
      <div>
        <small>Games</small>
        <strong>${setScoreText(match)}</strong>
      </div>
      <div>
        <small>Poeng</small>
        <strong>${gameScoreText(match)}</strong>
      </div>
      <div>
        <small>Server</small>
        <strong>${escapeHtml(startingTeamText(match))}</strong>
      </div>
    </div>
    <div class="match-note">
      <p class="hint">${scoreSummary(match)}${sittingOutSummary(match)}</p>
      ${winner ? `<p class="winner-note">Vinner: ${escapeHtml(winner.displayName)}</p>` : ""}
    </div>
  `;

  if (editable && match.state !== "cancelled") {
    const controls = document.createElement("div");
    controls.className = "match-controls";
    controls.innerHTML = `
      <div class="point-controls">
        <button class="secondary point-button" type="button" data-point-team="0" ${match.state === "finished" ? "disabled" : ""}>Poeng ${teamOneName}</button>
        <button class="secondary point-button" type="button" data-point-team="1" ${match.state === "finished" ? "disabled" : ""}>Poeng ${teamTwoName}</button>
      </div>
      ${scoreOnly ? "" : `<div class="court-edit-row">
        <label>Bane <input class="court-name-input" type="text" value="${escapeAttribute(match.courtName ?? "")}" placeholder="Bane" aria-label="Bane for ${teamOneName} mot ${teamTwoName}"></label>
        <button class="secondary save-court-button" type="button">Lagre bane</button>
      </div>
      <div class="score-row">
        <label>${teamOneName} <input type="number" min="0" max="99" value="${match.currentSet.teamOne}" aria-label="Games ${teamOneName}"></label>
        <label>${teamTwoName} <input type="number" min="0" max="99" value="${match.currentSet.teamTwo}" aria-label="Games ${teamTwoName}"></label>
        <button class="secondary save-score-button" type="button">${match.state === "finished" ? "Oppdater" : "Lagre"}</button>
      </div>
      <div class="button-row">
        <button class="secondary set-score-button" type="button">Set resultat</button>
        <button class="secondary start-match-button" type="button" ${match.state !== "waiting" ? "disabled" : ""}>Start kamp</button>
        <button class="secondary large-score-button" type="button" ${match.state !== "playing" ? "disabled" : ""}>Stor score</button>
        <button class="secondary reopen-match-button" type="button" ${["cancelled"].includes(match.state) || !match.lastScoredMatchState ? "disabled" : ""}>${match.state === "finished" ? "Angre resultat" : "Angre siste"}</button>
        <button class="ghost cancel-match-button" type="button" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>Avbryt kamp</button>
        <div class="walkover-row">
          <span>Walkover</span>
          <button class="ghost walkover-button" type="button" data-walkover-team="0" aria-label="Registrer walkover for ${teamOneName}" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>${teamOneName}</button>
          <button class="ghost walkover-button" type="button" data-walkover-team="1" aria-label="Registrer walkover for ${teamTwoName}" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>${teamTwoName}</button>
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
    appendEmptyText(container, "Tabellen vises når spillere er lagt til.");
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
        <strong>${entry.points} p</strong>
        <small>${entry.matchesPlayed} spilt · ${entry.matchWins} seire · ${entry.setsWon} sett · ${entry.gamesWon} games</small>
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
        Åpne invitasjonslenken, scan QR-koden eller velg "Admin har lagt meg til" fra startsiden.
      </div>
    `;
    return;
  }

  const joinSourceLabel = player.joinedFrom === "admin-self"
    ? "Admin spiller"
    : player.joinedFrom === "self"
      ? "Registrert selv"
      : "Lagt til av admin";
  elements.playerIdentityCard.setAttribute("style", accentStyle(player.accent));
  elements.playerIdentityCard.innerHTML = `
    <div class="player-identity-main">
      <img class="avatar" src="${avatarUrl(player)}" alt="" width="44" height="44">
      <div>
        <span>Aktuell spiller</span>
        <strong>${escapeHtml(player.name)}</strong>
      </div>
    </div>
    <span class="join-source-chip">${joinSourceLabel}</span>
  `;
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
      <h3>Cup-bracket</h3>
      <span>${bracket.bracketSize} lagplasser</span>
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
          ${round.byeTeams?.length ? `<p class="cup-bracket-byes">Bye: ${round.byeTeams.map((team) => escapeHtml(team.displayName)).join(", ")}</p>` : ""}
        </section>
      `).join("")}
    </div>
  `;
}

function cupRoundTitle(round, index, totalRounds) {
  if (totalRounds === 1) return "Finale";
  if (index === 0) return "Første runde";
  if (index === totalRounds - 1) return "Finale";
  if (index === totalRounds - 2) return "Semifinale";
  return `Runde ${round.roundNumber}`;
}

function renderCupBracketSlot(slot, isThirdPlace = false) {
  if (!slot || slot.type === "pending") {
    return `<div class="cup-bracket-slot pending"><span>${isThirdPlace ? "Bronsefinale" : "Venter på vinnere"}</span></div>`;
  }
  const match = getMatchById(slot.matchId);
  if (!match) return `<div class="cup-bracket-slot pending"><span>Venter på kamp</span></div>`;
  const winner = match.winnerTeamIndex === 0 ? match.teamOne : match.winnerTeamIndex === 1 ? match.teamTwo : null;
  return `
    <div class="cup-bracket-slot ${match.state}">
      <span class="cup-bracket-slot-label">${isThirdPlace ? "Bronsefinale" : matchStateText(match.state)}</span>
      <strong>${escapeHtml(match.teamOne.displayName)}</strong>
      <strong>${escapeHtml(match.teamTwo.displayName)}</strong>
      ${winner ? `<small>Vinner: ${escapeHtml(winner.displayName)}</small>` : ""}
    </div>
  `;
}

function renderExistingPlayerList() {
  if (!elements.existingPlayerList || elements.existingPlayerList.classList.contains("hidden")) return;
  elements.existingPlayerList.innerHTML = "";
  if (state.players.length === 0) {
    appendEmptyText(elements.existingPlayerList, "Ingen spillere er lagt til ennå.");
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
      <p class="eyebrow">Din neste kamp</p>
      <h3>Velg spillerprofil</h3>
      <p>Da viser appen bane, makker og motstandere for akkurat deg.</p>
    `;
    return;
  }

  if (state.status === "Avsluttet") {
    const placement = playerPlacement(player, matches);
    elements.playerNextMatch.setAttribute("style", accentStyle(player.accent));
    elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">Turneringen er ferdig</p>
      <h3>${escapeHtml(player.name)}${placement ? `, du endte på ${placement}. plass.` : ""}</h3>
      <p>Sjekk tabellen under for endelige resultater.</p>
    `;
    return;
  }

  const playerState = playerTournamentState(player, matches);
  elements.playerNextMatch.setAttribute("style", accentStyle(player.accent));

  if (playerState.kind === "resting") {
    const activeRound = getActiveRound();
    elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">Pause denne runden</p>
      <h3>${escapeHtml(player.name)}, du sitter over nå.</h3>
      <div class="player-now-grid">
        <div>
          <span>Runde</span>
          <strong>${activeRound?.roundNumber ?? "-"}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>Pause</strong>
        </div>
      </div>
      <p>Følg med på neste runde. Du vises her igjen når du har kamp.</p>
    `;
    return;
  }

  if (!playerState.match) {
    elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">Venter</p>
      <h3>${escapeHtml(player.name)}, du har ingen aktiv kamp akkurat nå.</h3>
      <div class="player-now-grid">
        <div>
          <span>Status</span>
          <strong>Venter</strong>
        </div>
        <div>
          <span>Runde</span>
          <strong>${Math.max(state.currentRound, 1)}</strong>
        </div>
      </div>
      <p>Når administrator genererer neste runde, vises bane, makker og motstandere her.</p>
    `;
    return;
  }

  const match = playerState.match;
  const isTeamOne = match.teamOne.players.some((item) => item.id === player.id);
  const ownTeam = isTeamOne ? match.teamOne : match.teamTwo;
  const opponents = isTeamOne ? match.teamTwo : match.teamOne;
  const teammate = ownTeam.players.find((item) => item.id !== player.id);
  const opponentNames = opponents.players.map((opponent) => escapeHtml(opponent.name)).join(" & ");
  const statusLabel = playerState.kind === "playing" ? "Du spiller nå" : "Din neste kamp";
  const ownScore = isTeamOne ? match.currentSet.teamOne : match.currentSet.teamTwo;
  const opponentScore = isTeamOne ? match.currentSet.teamTwo : match.currentSet.teamOne;

  elements.playerNextMatch.innerHTML = `
    <p class="eyebrow">${statusLabel}</p>
    <h3>${match.courtName ?? "Bane kommer"}</h3>
    <div class="player-now-grid">
      <div>
        <span>Makker</span>
        <strong>${teammate ? escapeHtml(teammate.name) : "Single"}</strong>
      </div>
      <div>
        <span>Mot</span>
        <strong>${opponentNames}</strong>
      </div>
      <div>
        <span>Games</span>
        <strong>${ownScore}-${opponentScore}</strong>
      </div>
      <div>
        <span>Poeng</span>
        <strong>${gameScoreText(match)}</strong>
      </div>
    </div>
    <div class="next-match-summary">
      <span>${escapeHtml(matchContextText(match))}</span>
      <span>${scoreSummary(match)}</span>
    </div>
  `;
}

function renderPlayerStatus(matches) {
  const player = getPlayerById(state.selectedPlayerId);
  if (!player) {
    elements.playerStatusGrid.innerHTML = `
      <div class="waiting">
        <span>Status</span>
        <strong>Velg</strong>
        <small>Spiller</small>
      </div>
    `;
    return;
  }

  const playerMatches = matches.filter((match) => matchIncludesPlayer(match, player.id));
  const stats = statsForPlayer(player, matches);
  const nextState = playerTournamentState(player, matches);
  const statusText = {
    playing: "Pågår",
    waiting: "Neste",
    resting: "Pause",
    idle: "Venter",
  }[nextState.kind] ?? "Venter";

  elements.playerStatusGrid.innerHTML = `
    <div class="${nextState.kind === "playing" ? "ready" : "waiting"}">
      <span>Status</span>
      <strong>${state.status === "Avsluttet" ? "Ferdig" : statusText}</strong>
      <small>${nextState.match?.courtName ?? (nextState.kind === "resting" ? "Denne runden" : "Ingen bane")}</small>
    </div>
    <div class="ready">
      <span>Poeng</span>
      <strong>${pointsByPlayer(matches, state.settings.pointMode)[player.id] ?? 0}</strong>
      <small>${stats.matchWins} seire</small>
    </div>
    <div class="ready">
      <span>Kamper</span>
      <strong>${playerMatches.length}</strong>
      <small>${stats.matchesPlayed} spilt</small>
    </div>
  `;
}

function renderRules() {
  if (!elements.rulesList) return;
  const pointModeText = {
    matches: "Tabellen gir 3 poeng for kampseier.",
    sets: "Tabellen gir poeng for vunnet sett.",
    games: "Tabellen teller hvert vunnet game.",
  }[state.settings.pointMode] ?? "Tabellpoeng følger valgt regelsett.";

  const rules = [
    {
      title: "Tennispoeng",
      text: "Poeng føres som 0, 15, 30, 40 og A. Ved 40-40 må laget vinne to poeng på rad.",
    },
    {
      title: "Sett",
      text: `Kampen spilles best av ${state.settings.setsToWinMatch} sett. Et sett vinnes normalt til ${state.settings.gamesToWinSet} games med to games margin.`,
    },
    {
      title: "Rangering",
      text: `${pointModeText} Ved likhet sorteres spillerne på kampseire, sett og navn.`,
    },
    {
      title: "Pause",
      text: "Ved oddetall eller for mange lag til antall baner får noen pause i runden og kommer tilbake i neste rotasjon.",
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
  elements.setScoreTitle.textContent = "Set resultat";
  elements.setScoreContext.textContent = `${match.teamOne.displayName} mot ${match.teamTwo.displayName}`;
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
  elements.largeScoreContext.textContent = `${matchContextText(match)} · ${match.courtName ?? "Ikke tildelt bane"}`;
  elements.largeScoreTitle.textContent = `${match.teamOne.displayName} mot ${match.teamTwo.displayName}`;
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
      <span>Games</span>
      <strong>${setScoreText(match)}</strong>
    </div>
    <div>
      <span>Poeng</span>
      <strong>${gameScoreText(match)}</strong>
    </div>
    <div>
      <span>Server</span>
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
    elements.copyStatus.textContent = "Kunne ikke kopiere automatisk. Marker teksten og kopier manuelt.";
    if (text === createJoinLink()) elements.joinLink.select();
  }
}

function joinTournament(name, avatarId) {
  const existingPlayer = findPlayerByName(name);
  if (existingPlayer) return existingPlayer;
  return addPlayer(name, "self", avatarId);
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
    alert(`${nextName} finnes allerede i spillerlisten.`);
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
    alert("Spillere kan ikke fjernes etter at kampoppsettet er startet i denne turneringen.");
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

function updateTournamentRules({ format, cupTeamSetupMode, includesThirdPlaceMatch, pointMode, gamesToWinSet, setsToWinMatch }) {
  if (state.rounds.length > 0) {
    alert("Turneringsreglene kan bare endres før første runde.");
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
    alert("Cup-lag kan bare endres før første runde.");
    return;
  }

  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    alert("Legg inn minst to cup-lag.");
    return;
  }

  const usedPlayerIds = new Set();
  const teams = [];
  for (const [index, line] of lines.entries()) {
    const playerNames = line.split("+").map((name) => name.trim()).filter(Boolean);
    if (playerNames.length < 1 || playerNames.length > 2) {
      alert(`Lag ${index + 1} må ha én eller to spillere.`);
      return;
    }

    const teamPlayers = [];
    for (const playerName of playerNames) {
      const player = findPlayerByName(playerName);
      if (!player || !player.active) {
        alert(`Fant ikke aktiv spiller «${playerName}» i spillerlisten.`);
        return;
      }
      if (usedPlayerIds.has(player.id)) {
        alert(`${player.name} er lagt inn på mer enn ett lag.`);
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
  if (activeRound?.status === "active" && !canCompleteRound(activeRound)) return "Fullfør kampene";
  if (getNextScheduledRound()) return t("startNextRound");
  if (cupCanAdvance() || cupCanFinalize()) return t("startNextRound");
  if (state.settings.format === "cup" && state.status === "Cup ferdig") return "Cup ferdig";
  return "Hele turneringen er generert";
}

function generateRoundBlockReason() {
  const activeRound = getActiveRound();
  if (state.status === "Avsluttet") return "Turneringen er avsluttet.";
  if (state.players.length < 2) return "Legg til minst to spillere før du starter runden.";
  if (state.settings.format === "cup") {
    if (state.settings.cupTeamSetupMode === "manual" && state.cupTeams.length < 2) {
      return "Definer minst to manuelle cup-lag før du starter turneringen.";
    }
    if (state.settings.cupTeamSetupMode === "auto" && state.players.filter((player) => player.active).length < 4) {
      return "Cup med automatisk lagoppsett krever minst fire aktive spillere.";
    }
  }
  if (state.courts.length < 1) return "Legg til minst én bane før du starter runden.";
  if (activeRound?.status === "active" && !canCompleteRound(activeRound)) return "Alle kamper må være ferdige før neste runde.";
  if (state.rounds.length > 0 && !getNextScheduledRound() && !cupCanAdvance() && !cupCanFinalize()) {
    return state.settings.format === "cup" && state.status === "Cup ferdig"
      ? "Cupen er ferdig."
      : "Hele turneringen er generert.";
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
    alert("Legg til minst to spillere før du genererer kamper.");
    return;
  }

  state.rounds = schedule
    .map((roundPlan, index) => createScheduledRound(roundPlan, index + 1))
    .filter((round) => round.matches.length > 0);

  if (!state.rounds.length) {
    alert("Fant ingen gyldige kamper med spillerlisten.");
    return;
  }

  activateRound(state.rounds[0]);
  state.status = "Runde pågår";
}

function generateCupTournament() {
  const activePlayers = state.players.filter((player) => player.active);
  const teams = cupTeamsForStart();
  if (teams.length < 2) {
    alert(state.settings.cupTeamSetupMode === "manual"
      ? "Manuell cup krever minst to lag."
      : "Cup krever minst to lag, altså minst fire spillere i automatisk lagoppsett.");
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
  const activePlayers = state.players.filter((player) => player.active);
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
  const activePlayers = players.filter((player) => player.active);
  if (format === "cup") return [];
  return activePlayers.length < 4
    ? generateSinglesRounds(activePlayers)
    : generatePartnerRounds(activePlayers);
}

function generateSinglesRounds(players) {
  if (players.length < 2) return [];
  const rounds = [];

  for (let homeIndex = 0; homeIndex < players.length; homeIndex += 1) {
    for (let awayIndex = homeIndex + 1; awayIndex < players.length; awayIndex += 1) {
      const activePlayers = [players[homeIndex], players[awayIndex]];
      rounds.push({
        teams: [createTeam([players[homeIndex]]), createTeam([players[awayIndex]])],
        sittingOut: players.filter((player) => !activePlayers.some((active) => active.id === player.id)),
      });
    }
  }

  return rounds;
}

function generatePartnerRounds(players) {
  let rotation = players.map((player) => player);
  if (rotation.length % 2 !== 0) rotation.push(null);

  const rounds = [];
  for (let roundIndex = 0; roundIndex < rotation.length - 1; roundIndex += 1) {
    const teams = [];
    const sittingOut = [];

    for (let index = 0; index < rotation.length / 2; index += 1) {
      const home = rotation[index];
      const away = rotation[rotation.length - 1 - index];

      if (home && away) teams.push(createTeam([home, away]));
      else if (home || away) sittingOut.push(home ?? away);
    }

    rounds.push({ teams, sittingOut });
    rotation = rotateRoundParticipants(rotation);
  }

  return rounds;
}

function generateRoundMatches(teams, rotationNumber, sittingOut) {
  const matches = [];
  for (let teamIndex = 0; teamIndex < teams.length - 1; teamIndex += 2) {
    matches.push({
      id: crypto.randomUUID(),
      tournamentId: state.id,
      rotationNumber,
      teamOne: teams[teamIndex],
      teamTwo: teams[teamIndex + 1],
      sittingOut,
      state: "waiting",
      completedSets: [],
      currentSet: { teamOne: 0, teamTwo: 0 },
      currentGame: { teamOne: 0, teamTwo: 0 },
      startingTeamIndex: Math.round(Math.random()),
      winnerTeamIndex: null,
      isWalkover: false,
      isThirdPlaceMatch: false,
      lastScoredMatchState: null,
      courtId: null,
      courtName: null,
      completedAt: null,
    });
  }
  return matches;
}

function rotateRoundParticipants(participants) {
  if (participants.length <= 2) return participants;
  const [fixed, ...rotating] = participants;
  const last = rotating.at(-1);
  return [fixed, last, ...rotating.slice(0, -1)];
}

function createTeam(players) {
  return {
    id: crypto.randomUUID(),
    players,
    accent: players[0]?.accent ?? "silver",
    displayName: players.map((player) => player.name).join(" & "),
  };
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
    alert("Det finnes ingen siste handling å angre for denne kampen.");
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
    alert(validationError);
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
  if (!Number.isInteger(teamOne) || !Number.isInteger(teamTwo)) return "Resultatet må være hele tall.";
  if (teamOne < 0 || teamTwo < 0) return "Resultatet kan ikke være negativt.";
  if (teamOne === teamTwo) return "Resultatet kan ikke være uavgjort.";
  if (!isSetComplete(teamOne, teamTwo)) {
    return `Sett må vinnes ${state.settings.gamesToWinSet}-x med to games margin, eller ${state.settings.gamesToWinSet + 1}-${state.settings.gamesToWinSet - 1} / ${state.settings.gamesToWinSet + 1}-${state.settings.gamesToWinSet}.`;
  }
  return "";
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
  const gamesToWinSet = state.settings.gamesToWinSet ?? 6;
  const winnerGames = Math.max(teamOne, teamTwo);
  const loserGames = Math.min(teamOne, teamTwo);
  if (winnerGames === gamesToWinSet && winnerGames - loserGames >= 2) return true;
  if (winnerGames === gamesToWinSet + 1 && [gamesToWinSet - 1, gamesToWinSet].includes(loserGames)) return true;
  return false;
}

function hasMatchWinner(match) {
  return setsWonByTeam(match, 0) >= (state.settings.setsToWinMatch ?? 1) ||
    setsWonByTeam(match, 1) >= (state.settings.setsToWinMatch ?? 1);
}

function setsWonByTeam(match, teamIndex) {
  return match.completedSets.filter((set) => teamIndex === 0 ? set.teamOne > set.teamTwo : set.teamTwo > set.teamOne).length;
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
  if (!confirm("Avbryte denne kampen? Den teller ikke i tabellen.")) return;
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
  if (!confirm(`Registrere walkover til ${winningTeam.displayName}?`)) return;

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
  const points = pointsByPlayer(matches, state.settings.pointMode);
  return state.players
    .map((player) => {
      const stats = statsForPlayer(player, matches);
      return {
        player,
        points: points[player.id] ?? 0,
        matchesPlayed: stats.matchesPlayed,
        matchWins: stats.matchWins,
        setsWon: stats.setsWon,
        gamesWon: stats.gamesWon,
      };
    })
    .sort((left, right) => {
      return (
        right.points - left.points ||
        right.matchWins - left.matchWins ||
        right.setsWon - left.setsWon ||
        left.player.name.localeCompare(right.player.name, "nb")
      );
    });
}

function pointsByPlayer(matches, pointMode) {
  const points = {};
  matches.forEach((match) => {
    if (pointMode === "games") applyGamePoints(match, points);
    if (pointMode === "sets") applySetPoints(match, points);
    if (pointMode === "matches") applyMatchPoints(match, points);
  });
  return points;
}

function statsForPlayer(player, matches) {
  return matches.reduce(
    (stats, match) => {
      const teamIndex = playerTeamIndex(player, match);
      if (teamIndex === null) return stats;

      stats.matchesPlayed += match.state === "finished" ? 1 : 0;
      stats.matchWins += match.winnerTeamIndex === teamIndex ? 1 : 0;
      match.completedSets.forEach((set) => {
        stats.setsWon += teamIndex === 0 ? Number(set.teamOne > set.teamTwo) : Number(set.teamTwo > set.teamOne);
        stats.gamesWon += teamIndex === 0 ? set.teamOne : set.teamTwo;
      });

      if (match.state === "playing") {
        stats.gamesWon += teamIndex === 0 ? match.currentSet.teamOne : match.currentSet.teamTwo;
      }

      return stats;
    },
    { matchesPlayed: 0, matchWins: 0, setsWon: 0, gamesWon: 0 },
  );
}

function applyGamePoints(match, points) {
  match.completedSets.forEach((set) => {
    award(set.teamOne, match.teamOne, points);
    award(set.teamTwo, match.teamTwo, points);
  });
  if (match.state !== "finished") {
    if (match.state !== "playing") return;
    award(match.currentSet.teamOne, match.teamOne, points);
    award(match.currentSet.teamTwo, match.teamTwo, points);
  }
}

function applySetPoints(match, points) {
  match.completedSets.forEach((set) => {
    if (set.teamOne > set.teamTwo) award(1, match.teamOne, points);
    if (set.teamTwo > set.teamOne) award(1, match.teamTwo, points);
  });
}

function applyMatchPoints(match, points) {
  if (match.winnerTeamIndex === null) return;
  award(3, match.winnerTeamIndex === 0 ? match.teamOne : match.teamTwo, points);
}

function award(value, team, points) {
  if (value <= 0) return;
  team.players.forEach((player) => {
    points[player.id] = (points[player.id] ?? 0) + value;
  });
}

function playerTeamIndex(player, match) {
  if (match.teamOne.players.some((item) => item.id === player.id)) return 0;
  if (match.teamTwo.players.some((item) => item.id === player.id)) return 1;
  return null;
}

function matchPlayers(match) {
  return [...match.teamOne.players, ...match.teamTwo.players];
}

function uniquePlayers(players) {
  const seen = new Set();
  return players.filter((player) => {
    if (seen.has(player.id)) return false;
    seen.add(player.id);
    return true;
  });
}

function matchIncludesPlayer(match, playerId) {
  return matchPlayers(match).some((player) => player.id === playerId);
}

function playerTournamentState(player, matches) {
  const activeRound = getActiveRound();
  const playingMatch = matches.find((match) => match.state === "playing" && matchIncludesPlayer(match, player.id));
  if (playingMatch) return { kind: "playing", match: playingMatch };

  const waitingMatch = matches.find((match) => match.state === "waiting" && matchIncludesPlayer(match, player.id));
  if (waitingMatch) return { kind: "waiting", match: waitingMatch };

  const sittingOut = activeRound?.sittingOut?.some((sittingPlayer) => sittingPlayer.id === player.id);
  if (activeRound?.status === "active" && sittingOut) return { kind: "resting", match: null };

  return { kind: "idle", match: null };
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
    waiting: "Venter",
    playing: "Pågår",
    finished: "Ferdig",
    cancelled: "Avbrutt",
  }[stateName] ?? stateName;
}

function matchContextText(match) {
  const matchIndex = globalMatchNumber(match);
  const sitOutCount = match.sittingOut?.length ?? 0;
  const parts = [
    `Runde ${match.rotationNumber}`,
    matchIndex ? `Kamp ${matchIndex}` : "",
    sitOutCount ? `${sitOutCount} pause` : "",
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
    if (match.isWalkover) return `${winner.displayName} vant på walkover`;
    return `${winner.displayName} vant ${setScoreText(match)}`;
  }
  if (match.state === "cancelled") return "Kampen er avbrutt";
  return `${match.teamOne.displayName} mot ${match.teamTwo.displayName}`;
}

function startingTeamText(match) {
  return match.startingTeamIndex === 0 ? "Lag 1" : "Lag 2";
}

function scoreSummary(match) {
  if (match.isWalkover) return "Walkover";
  if (match.completedSets.length) {
    const label = match.state === "finished" ? "Ferdig" : "Sett";
    return `${label}: ${match.completedSets.map((set) => `${set.teamOne}-${set.teamTwo}`).join(", ")}`;
  }
  return `Sett: ${setScoreText(match)} · Game: ${gameScoreText(match)}`;
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
  return ` · Pause: ${match.sittingOut.map((player) => escapeHtml(player.name)).join(", ")}`;
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

restoreInitialView();
render();
