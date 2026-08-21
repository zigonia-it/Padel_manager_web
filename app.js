const storageKey = "padel-manager-demo";
const playerAccentPalette = {
  blue: "#1a59f2",
  orange: "#e67a0a",
  mint: "#148f42",
  pink: "#d12e52",
  indigo: "#7030d1",
  teal: "#0a8080",
  red: "#c70a33",
  yellow: "#b88c00",
  gold: "#cc9414",
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
const demoPlayerNames = ["Sigurd", "Elin", "Elisabeth", "Hanne", "Ruben", "Karoline", "Lars", "Tina"];
const avatarOptions = [
  { id: "smash", label: "Smash" },
  { id: "serve", label: "Serve" },
  { id: "wall", label: "Vegg" },
  { id: "lob", label: "Lob" },
];
const translations = {
  nb: {
    brandEyebrow: "Turneringsverktøy",
    languageLabel: "Språk",
    localPwa: "Lokal PWA",
    offline: "Offline",
    startTournament: "Start turnering",
    startNextRound: "Start neste runde",
    finishTournament: "Fullfør turnering",
  },
  nn: {
    brandEyebrow: "Turneringsverktøy",
    languageLabel: "Språk",
    localPwa: "Lokal PWA",
    offline: "Fråkopla",
    startTournament: "Start turnering",
    startNextRound: "Start neste runde",
    finishTournament: "Fullfør turnering",
  },
  en: {
    brandEyebrow: "Tournament tool",
    languageLabel: "Language",
    localPwa: "Local PWA",
    offline: "Offline",
    startTournament: "Start tournament",
    startNextRound: "Start next round",
    finishTournament: "Finish tournament",
  },
};

const defaultTournament = createTournament({
  name: "Risløkka Padel",
  inviteCode: "P4K7D",
  players: [],
  courtCount: 1,
});

let state = loadState();
let largeScoreMatchId = null;

const elements = {
  startView: document.querySelector("#startView"),
  workspaceView: document.querySelector("#workspaceView"),
  connectionStatus: document.querySelector("#connectionStatus"),
  resumePanel: document.querySelector("#resumePanel"),
  resumeTitle: document.querySelector("#resumeTitle"),
  resumeSummary: document.querySelector("#resumeSummary"),
  resumeTournamentButton: document.querySelector("#resumeTournamentButton"),
  createTournamentForm: document.querySelector("#createTournamentForm"),
  joinTournamentForm: document.querySelector("#joinTournamentForm"),
  joinAvatarPreview: document.querySelector("#joinAvatarPreview"),
  joinNamePreview: document.querySelector("#joinNamePreview"),
  avatarPicker: document.querySelector("#avatarPicker"),
  languageSelect: document.querySelector("#languageSelect"),
  showExistingPlayersButton: document.querySelector("#showExistingPlayersButton"),
  existingPlayerList: document.querySelector("#existingPlayerList"),
  addPlayerForm: document.querySelector("#addPlayerForm"),
  courtSettingsForm: document.querySelector("#courtSettingsForm"),
  tournamentSettingsForm: document.querySelector("#tournamentSettingsForm"),
  tournamentTitle: document.querySelector("#tournamentTitle"),
  roundLabel: document.querySelector("#roundLabel"),
  inviteCode: document.querySelector("#inviteCode"),
  adminInviteCode: document.querySelector("#adminInviteCode"),
  joinQrCode: document.querySelector("#joinQrCode"),
  joinLink: document.querySelector("#joinLink"),
  copyInviteCodeButton: document.querySelector("#copyInviteCodeButton"),
  copyJoinLinkButton: document.querySelector("#copyJoinLinkButton"),
  showStartButton: document.querySelector("#showStartButton"),
  copyStatus: document.querySelector("#copyStatus"),
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
  playerButtons: document.querySelector("#playerButtons"),
  playerNextMatch: document.querySelector("#playerNextMatch"),
  playerStatusGrid: document.querySelector("#playerStatusGrid"),
  generateRoundButton: document.querySelector("#generateRoundButton"),
  completeRoundButton: document.querySelector("#completeRoundButton"),
  exportBackupButton: document.querySelector("#exportBackupButton"),
  importBackupButton: document.querySelector("#importBackupButton"),
  backupFileInput: document.querySelector("#backupFileInput"),
  seedPlayersButton: document.querySelector("#seedPlayersButton"),
  endTournamentButton: document.querySelector("#endTournamentButton"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
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
};

let pendingSetScoreMatchId = null;

syncCreateFormDefaults();
syncJoinPreview();
prefillInviteCodeFromUrl();
registerServiceWorker();
syncConnectionStatus();

window.addEventListener("online", syncConnectionStatus);
window.addEventListener("offline", syncConnectionStatus);

elements.joinTournamentForm.elements.playerName.addEventListener("input", syncJoinPreview);
elements.avatarPicker.addEventListener("change", syncJoinPreview);
elements.languageSelect.addEventListener("change", () => {
  state.settings.language = elements.languageSelect.value;
  saveState();
  applyLanguage();
  render();
});

elements.createTournamentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const playerNames = parsePlayerNames(formData.get("players"));

  state = createTournament({
    name: formData.get("tournamentName").trim(),
    inviteCode: createInviteCode(),
    players: playerNames,
    courtCount: Number(formData.get("courts")),
  });

  saveState();
  showWorkspace();
  render();
});

elements.joinTournamentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const inviteCode = formData.get("inviteCode").trim().toUpperCase();
  const playerName = formData.get("playerName").trim();
  const avatarId = formData.get("avatarId") || defaultAvatarId;

  if (inviteCode !== state.inviteCode) {
    alert(`Fant ikke turnering med kode ${inviteCode}. Prøv ${state.inviteCode} i demoen.`);
    return;
  }

  if (!playerName) return;

  const existingPlayer = findPlayerByName(playerName);
  if (!existingPlayer && state.rounds.length > 0) {
    alert("Turneringen er startet. Be administrator legge deg til i neste turnering.");
    return;
  }

  const player = existingPlayer ?? joinTournament(playerName, avatarId);
  state.selectedPlayerId = player.id;

  showWorkspace("player");
  event.currentTarget.reset();
  syncJoinPreview();
  saveState();
  render();
});

elements.addPlayerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.rounds.length > 0) {
    alert("Spillere kan bare legges til før første runde i denne demoen.");
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
    pointMode: formData.get("pointMode"),
    gamesToWinSet: Number(formData.get("gamesToWinSet")),
    setsToWinMatch: Number(formData.get("setsToWinMatch")),
  });
  saveState();
  render();
});

elements.seedPlayersButton.addEventListener("click", () => {
  if (state.rounds.length > 0) {
    alert("Demospillere kan bare fylles før første runde.");
    return;
  }
  addPlayers(demoPlayerNames, "admin");
  saveState();
  render();
});

elements.generateRoundButton.addEventListener("click", () => {
  const activeRound = getActiveRound();
  if (activeRound && activeRound.status === "active" && canCompleteRound(activeRound)) {
    activeRound.status = "finished";
    state.status = "Runde fullført";
  }
  const blockReason = generateRoundBlockReason();
  if (blockReason) {
    alert(blockReason);
    return;
  }
  generateNextRound();
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

elements.endTournamentButton.addEventListener("click", () => {
  if (!confirm("Avslutte turneringen? Du kan fortsatt se resultater og laste ned backup etterpå.")) return;
  endTournament();
  saveState();
  render();
});

elements.resetDemoButton.addEventListener("click", () => {
  state = structuredClone(defaultTournament);
  localStorage.removeItem(storageKey);
  syncCreateFormDefaults();
  elements.joinTournamentForm.reset();
  syncJoinPreview();
  showStart();
  render();
});

elements.resumeTournamentButton.addEventListener("click", () => {
  showWorkspace("admin");
  render();
});

elements.showStartButton.addEventListener("click", () => {
  prefillJoinForm(state.inviteCode);
  showStart();
});

elements.copyInviteCodeButton.addEventListener("click", () => {
  copyText(state.inviteCode, "Invitasjonskoden er kopiert.");
});

elements.copyJoinLinkButton.addEventListener("click", () => {
  copyText(createJoinLink(), "Join-lenken er kopiert.");
});

elements.showExistingPlayersButton.addEventListener("click", () => {
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

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => activateTab(tab.dataset.view));
});

function createTournament({ name, inviteCode, players, courtCount }) {
  const tournamentPlayers = players.map((playerName, index) => createPlayer(playerName, index, defaultAvatarId));
  return {
    id: crypto.randomUUID(),
    name,
    inviteCode,
    status: "Klar",
    currentRound: 0,
    settings: {
      gamesToWinSet: 6,
      setsToWinMatch: 1,
      pointMode: "matches",
      format: "roundRobin",
      language: "nb",
    },
    courts: Array.from({ length: courtCount }, (_, index) => ({
      id: crypto.randomUUID(),
      name: `Bane ${index + 1}`,
      courtNumber: index + 1,
      active: true,
    })),
    players: tournamentPlayers,
    schedule: buildSchedule(tournamentPlayers),
    rounds: [],
    selectedPlayerId: null,
  };
}

function createPlayer(name, index, avatarId = defaultAvatarId) {
  return {
    id: crypto.randomUUID(),
    name,
    avatarId,
    accent: accents[index % accents.length],
    active: true,
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
  nextState.players ??= [];
  nextState.courts ??= structuredClone(defaultTournament.courts);
  nextState.schedule ??= buildSchedule(nextState.players);
  nextState.rounds ??= [];
  nextState.players = nextState.players.map((player, index) => ({
    active: true,
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
    completedAt: match.completedAt,
  };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function exportBackup() {
  const backup = {
    exportedAt: new Date().toISOString(),
    app: "Padel Manager Web",
    version: 1,
    tournament: state,
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
      saveState();
      showWorkspace("admin");
      render();
      elements.copyStatus.textContent = "Backup er importert.";
    } catch {
      alert("Kunne ikke importere backup. Velg en gyldig Padel Manager JSON-fil.");
    } finally {
      event.currentTarget.value = "";
    }
  });
  reader.readAsText(file);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      elements.connectionStatus.textContent = "Lokal demo";
    });
  });
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
  elements.startView.classList.remove("hidden");
  elements.workspaceView.classList.add("hidden");
}

function showWorkspace(tab = "admin") {
  elements.startView.classList.add("hidden");
  elements.workspaceView.classList.remove("hidden");
  activateTab(tab);
}

function activateTab(view) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
  document.querySelectorAll("[data-section]").forEach((section) => {
    section.classList.toggle("hidden", section.dataset.section !== view);
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
  elements.tournamentSettingsForm.elements.pointMode.value = state.settings.pointMode;
  elements.tournamentSettingsForm.elements.gamesToWinSet.value = state.settings.gamesToWinSet;
  elements.tournamentSettingsForm.elements.setsToWinMatch.value = state.settings.setsToWinMatch;
  elements.generateRoundButton.disabled = Boolean(generateRoundBlockReason());
  elements.generateRoundButton.textContent = state.currentRound > 0 ? t("startNextRound") : t("startTournament");
  elements.completeRoundButton.textContent = t("finishTournament");
  elements.completeRoundButton.disabled = state.status === "Avsluttet" || getAllMatches().length === 0;
  elements.endTournamentButton.closest(".button-row").classList.add("hidden");
  elements.courtSettingsForm.elements.courtList.disabled = getActiveRound()?.status === "active" || state.status === "Avsluttet";
  elements.courtSettingsForm.querySelector("button").disabled = getActiveRound()?.status === "active" || state.status === "Avsluttet";
  elements.addPlayerForm.elements.playerName.disabled = state.rounds.length > 0;
  elements.addPlayerForm.querySelector("button").disabled = state.rounds.length > 0;
  elements.seedPlayersButton.disabled = state.rounds.length > 0 || demoPlayerNames.every((name) => findPlayerByName(name));

  renderLobbyStatus();
  renderPlayers();
  renderRoundSummary();
  renderMatches(matches);
  renderStandings(matches);
  renderPlayerSelector();
  renderPlayerNextMatch(matches);
  renderPlayerStatus(matches);
  renderAdminLiveOverview(matches);
  renderRules();
  renderExistingPlayerList();
}

function syncConnectionStatus() {
  elements.connectionStatus.textContent = navigator.onLine ? t("localPwa") : t("offline");
  elements.connectionStatus.classList.toggle("offline", !navigator.onLine);
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

  elements.resumeTitle.textContent = `Fortsett ${state.name}`;
  elements.resumeSummary.textContent = `${state.players.length} spillere · ${state.courts.length} baner · kode ${state.inviteCode}`;
}

function renderLobbyStatus() {
  const minimumPlayersReady = state.players.length >= 2;
  const hasCourts = state.courts.length >= 1;
  const hasStarted = state.rounds.length > 0;
  const activeRound = getActiveRound();
  const isFinished = state.status === "Avsluttet";
  const blockReason = generateRoundBlockReason();
  const nextRoundLabel = blockReason || (state.currentRound > 0 ? `Neste blir runde ${state.currentRound + 1}` : "Klar for første runde");
  const playerMode = state.players.length >= 4 ? "Double" : state.players.length >= 2 ? "Single" : "Venter";
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
  const playingMatches = matches.filter((match) => match.state === "playing");
  const waitingMatches = matches.filter((match) => match.state === "waiting");
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
    (match) => createMatchCard(match, false, selectedPlayer?.id),
  );
  renderGroupedMatches(
    elements.spectatorMatches,
    matches,
    "Ingen kamper ennå. Generer første runde.",
    (match) => createMatchCard(match, false),
  );
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

function createMatchCard(match, editable, highlightedPlayerId = null) {
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
      <div class="court-edit-row">
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
        <button class="secondary reopen-match-button" type="button" ${match.state !== "finished" || getActiveRound()?.status !== "active" ? "disabled" : ""}>Angre resultat</button>
        <button class="ghost cancel-match-button" type="button" ${["finished", "cancelled"].includes(match.state) ? "disabled" : ""}>Avbryt kamp</button>
      </div>
    `;

    const courtInput = controls.querySelector(".court-name-input");
    const [teamOneInput, teamTwoInput] = controls.querySelectorAll(".score-row input");
    controls.querySelector(".save-court-button").addEventListener("click", () => {
      updateMatchCourt(match, courtInput.value);
    });
    controls.querySelector(".save-score-button").addEventListener("click", () => {
      saveMatchResult(match, Number(teamOneInput.value), Number(teamTwoInput.value));
    });
    controls.querySelectorAll("[data-point-team]").forEach((button) => {
      button.addEventListener("click", () => awardTennisPoint(match, Number(button.dataset.pointTeam)));
    });
    controls.querySelector(".set-score-button").addEventListener("click", () => openSetScoreDialog(match.id));
    controls.querySelector(".start-match-button").addEventListener("click", () => startMatch(match));
    controls.querySelector(".large-score-button").addEventListener("click", () => openLargeScore(match.id));
    controls.querySelector(".reopen-match-button").addEventListener("click", () => reopenMatch(match));
    controls.querySelector(".cancel-match-button").addEventListener("click", () => cancelMatch(match));
    card.append(controls);
  }

  return card;
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

function renderPlayerSelector() {
  elements.playerButtons.innerHTML = "";
  if (state.players.length === 0) {
    appendEmptyText(elements.playerButtons, "Spillere vises her når admin har lagt dem til.");
    return;
  }
  state.players.forEach((player) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("style", accentStyle(player.accent));
    button.innerHTML = `<img class="avatar" src="${avatarUrl(player)}" alt="" width="30" height="30"><span>${escapeHtml(player.name)}</span>`;
    button.classList.toggle("active", state.selectedPlayerId === player.id);
    button.addEventListener("click", () => {
      state.selectedPlayerId = player.id;
      saveState();
      render();
    });
    elements.playerButtons.append(button);
  });
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
    button.addEventListener("click", () => {
      state.selectedPlayerId = player.id;
      saveState();
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
  const url = new URL(window.location.href);
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
  state.schedule = buildSchedule(state.players);
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
  state.schedule = buildSchedule(state.players);
  saveState();
  render();
}

function removePlayer(playerId) {
  if (state.rounds.length > 0) {
    alert("Spillere kan ikke fjernes etter at kampoppsettet er startet i denne demoen.");
    return;
  }
  state.players = state.players.filter((player) => player.id !== playerId);
  if (state.selectedPlayerId === playerId) state.selectedPlayerId = null;
  state.schedule = buildSchedule(state.players);
  saveState();
  render();
}

function updateTournamentRules({ pointMode, gamesToWinSet, setsToWinMatch }) {
  if (!["matches", "sets", "games"].includes(pointMode)) return;
  state.settings.pointMode = pointMode;
  state.settings.gamesToWinSet = Math.max(1, Math.min(12, gamesToWinSet || 6));
  state.settings.setsToWinMatch = Math.max(1, Math.min(5, setsToWinMatch || 1));
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

function generateRoundBlockReason() {
  const activeRound = getActiveRound();
  if (state.status === "Avsluttet") return "Turneringen er avsluttet.";
  if (state.players.length < 2) return "Legg til minst to spillere før du starter runden.";
  if (state.courts.length < 1) return "Legg til minst én bane før du starter runden.";
  if (activeRound && activeRound.status !== "finished" && !canCompleteRound(activeRound)) return "Alle kamper må være ferdige før neste runde.";
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

function generateNextRound() {
  const schedule = state.schedule.length ? state.schedule : buildSchedule(state.players);
  if (!schedule.length) {
    alert("Legg til minst to spillere før du genererer kamper.");
    return;
  }

  const scheduleIndex = state.currentRound % schedule.length;
  const roundPlan = schedule[scheduleIndex];
  const matchPlan = generateRoundMatches(roundPlan.teams, state.currentRound + 1, roundPlan.sittingOut);
  const matches = matchPlan
    .slice(0, state.courts.length)
    .map((match, index) => ({
      ...match,
      courtId: state.courts[index]?.id ?? null,
      courtName: state.courts[index]?.name ?? null,
      state: "playing",
    }));
  const playingPlayerIds = new Set(matches.flatMap((match) => matchPlayers(match).map((player) => player.id)));
  const sittingOut = uniquePlayers([
    ...roundPlan.sittingOut,
    ...roundPlan.teams.flatMap((team) => team.players).filter((player) => !playingPlayerIds.has(player.id)),
  ]);
  matches.forEach((match) => {
    match.sittingOut = sittingOut;
  });

  state.currentRound += 1;
  state.status = "Runde pågår";
  state.rounds.push({
    id: crypto.randomUUID(),
    roundNumber: state.currentRound,
    status: "active",
    createdAt: new Date().toISOString(),
    sittingOut,
    matches,
  });
}

function buildSchedule(players) {
  const activePlayers = players.filter((player) => player.active);
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
  match.completedAt = new Date().toISOString();

  const activeRound = getActiveRound();
  const nextWaitingMatch = activeRound?.matches.find((item) => item.state === "waiting");
  if (nextWaitingMatch) nextWaitingMatch.state = "playing";
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
  if (match.state === "waiting") match.state = "playing";
  if (["finished", "cancelled"].includes(match.state)) return;

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
  match.state = "playing";
  saveState();
  render();
  renderLargeScore();
}

function reopenMatch(match) {
  match.state = "playing";
  match.completedSets = [];
  match.currentGame = { teamOne: 0, teamTwo: 0 };
  match.winnerTeamIndex = null;
  match.completedAt = null;
  saveState();
  render();
  renderLargeScore();
}

function cancelMatch(match) {
  if (!confirm("Avbryte denne kampen? Den teller ikke i tabellen.")) return;
  match.state = "cancelled";
  match.completedSets = [];
  match.winnerTeamIndex = null;
  match.completedAt = new Date().toISOString();
  const activeRound = getActiveRound();
  const nextWaitingMatch = activeRound?.matches.find((item) => item.state === "waiting");
  if (nextWaitingMatch) nextWaitingMatch.state = "playing";
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

      stats.matchesPlayed += ["waiting", "cancelled"].includes(match.state) ? 0 : 1;
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
  return state.rounds[state.rounds.length - 1];
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
  const round = getRoundForMatch(match);
  const matchIndex = round ? round.matches.findIndex((item) => item.id === match.id) + 1 : null;
  const sitOutCount = match.sittingOut?.length ?? 0;
  const parts = [
    `Runde ${match.rotationNumber}`,
    matchIndex ? `Kamp ${matchIndex}` : "",
    sitOutCount ? `${sitOutCount} pause` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function primaryMatchHeadline(match) {
  if (match.state === "finished" && match.winnerTeamIndex !== null) {
    const winner = match.winnerTeamIndex === 0 ? match.teamOne : match.teamTwo;
    return `${winner.displayName} vant ${setScoreText(match)}`;
  }
  if (match.state === "cancelled") return "Kampen er avbrutt";
  return `${match.teamOne.displayName} mot ${match.teamTwo.displayName}`;
}

function startingTeamText(match) {
  return match.startingTeamIndex === 0 ? "Lag 1" : "Lag 2";
}

function scoreSummary(match) {
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
    .slice(0, 48) || "padel-manager";
}

render();
