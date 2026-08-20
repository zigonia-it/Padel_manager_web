const storageKey = "padel-manager-demo";
const accents = ["silver", "green", "blue", "clay", "yellow", "navy", "mint", "coral"];
const defaultAvatarId = "smash";

const defaultTournament = createTournament({
  name: "Risløkka Padel",
  inviteCode: "P4K7D",
  players: [],
  courtCount: 1,
});

let state = loadState();

const elements = {
  startView: document.querySelector("#startView"),
  workspaceView: document.querySelector("#workspaceView"),
  resumePanel: document.querySelector("#resumePanel"),
  resumeTitle: document.querySelector("#resumeTitle"),
  resumeSummary: document.querySelector("#resumeSummary"),
  resumeTournamentButton: document.querySelector("#resumeTournamentButton"),
  createTournamentForm: document.querySelector("#createTournamentForm"),
  joinTournamentForm: document.querySelector("#joinTournamentForm"),
  joinAvatarPreview: document.querySelector("#joinAvatarPreview"),
  joinNamePreview: document.querySelector("#joinNamePreview"),
  avatarPicker: document.querySelector("#avatarPicker"),
  addPlayerForm: document.querySelector("#addPlayerForm"),
  courtSettingsForm: document.querySelector("#courtSettingsForm"),
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
  lobbyStatus: document.querySelector("#lobbyStatus"),
  playerCount: document.querySelector("#playerCount"),
  matchCount: document.querySelector("#matchCount"),
  playersList: document.querySelector("#playersList"),
  adminMatches: document.querySelector("#adminMatches"),
  playerMatches: document.querySelector("#playerMatches"),
  spectatorMatches: document.querySelector("#spectatorMatches"),
  standingsList: document.querySelector("#standingsList"),
  playerStandingsList: document.querySelector("#playerStandingsList"),
  playerButtons: document.querySelector("#playerButtons"),
  playerNextMatch: document.querySelector("#playerNextMatch"),
  playerStatusGrid: document.querySelector("#playerStatusGrid"),
  generateRoundButton: document.querySelector("#generateRoundButton"),
  completeRoundButton: document.querySelector("#completeRoundButton"),
  exportBackupButton: document.querySelector("#exportBackupButton"),
  importBackupButton: document.querySelector("#importBackupButton"),
  backupFileInput: document.querySelector("#backupFileInput"),
  endTournamentButton: document.querySelector("#endTournamentButton"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
};

syncCreateFormDefaults();
syncJoinPreview();
prefillInviteCodeFromUrl();

elements.joinTournamentForm.elements.playerName.addEventListener("input", syncJoinPreview);
elements.avatarPicker.addEventListener("change", syncJoinPreview);

elements.createTournamentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const playerNames = formData
    .get("players")
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);

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

  const player = joinTournament(playerName, avatarId);
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
  const name = formData.get("playerName").trim();
  if (!name) return;

  addPlayer(name, "admin", defaultAvatarId);
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
  const courtCount = Number(new FormData(event.currentTarget).get("courtCount"));
  updateCourtCount(courtCount);
  saveState();
  render();
});

elements.generateRoundButton.addEventListener("click", () => {
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
  const activeRound = getActiveRound();
  if (!activeRound) return;

  activeRound.matches.forEach((match, index) => {
    if (match.state !== "finished") {
      match.currentSet = {
        teamOne: index % 2 === 0 ? state.settings.gamesToWinSet : state.settings.gamesToWinSet - 1,
        teamTwo: index % 2 === 0 ? state.settings.gamesToWinSet - 1 : state.settings.gamesToWinSet,
      };
      finishMatch(match);
    }
  });

  activeRound.status = "finished";
  state.status = "Runde fullført";
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
  nextState.settings ??= defaultTournament.settings;
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
  }));
  nextState.rounds = nextState.rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => migrateMatch(match, nextState.id)),
  }));
  return nextState;
}

function migrateMatch(match, tournamentId) {
  if (match.teamOne && match.teamTwo) return match;
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

function render() {
  const matches = getAllMatches();
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
  elements.courtSettingsForm.elements.courtCount.value = state.courts.length;
  elements.generateRoundButton.disabled = Boolean(generateRoundBlockReason());
  elements.generateRoundButton.textContent = state.currentRound > 0 ? "Generer neste runde" : "Start første runde";
  elements.completeRoundButton.disabled = !getActiveRound() || getActiveRound().status === "finished" || state.status === "Avsluttet";
  elements.endTournamentButton.disabled = state.status === "Avsluttet";
  elements.courtSettingsForm.elements.courtCount.disabled = getActiveRound()?.status === "active" || state.status === "Avsluttet";
  elements.courtSettingsForm.querySelector("button").disabled = getActiveRound()?.status === "active" || state.status === "Avsluttet";
  elements.addPlayerForm.elements.playerName.disabled = state.rounds.length > 0;
  elements.addPlayerForm.querySelector("button").disabled = state.rounds.length > 0;

  renderLobbyStatus();
  renderPlayers();
  renderMatches(matches);
  renderStandings(matches);
  renderPlayerSelector();
  renderPlayerNextMatch(matches);
  renderPlayerStatus(matches);
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
  const isFinished = state.status === "Avsluttet";
  const blockReason = generateRoundBlockReason();
  const nextRoundLabel = blockReason || (state.currentRound > 0 ? `Neste blir runde ${state.currentRound + 1}` : "Klar for første runde");
  const playerMode = state.players.length >= 4 ? "Double" : state.players.length >= 2 ? "Single" : "Venter";

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
      <strong>${isFinished ? "Ferdig" : hasStarted ? "I gang" : "Lobby"}</strong>
      <small>${nextRoundLabel}</small>
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
    item.innerHTML = `
      <span class="player-list-name">
        <img class="avatar" src="${avatarUrl(player)}" alt="" width="34" height="34">
        <span>
          ${escapeHtml(player.name)}
          <small>${player.joinedFrom === "self" ? "Påmeldt selv" : "Lagt til av admin"}</small>
        </span>
      </span>
      <span class="player-actions">
        <strong>${entry?.points ?? 0} p</strong>
        <button class="icon-button danger-button" type="button" aria-label="Fjern ${escapeHtml(player.name)}" ${lobbyLocked ? "disabled" : ""}>Fjern</button>
      </span>
    `;
    item.querySelector("button").addEventListener("click", () => removePlayer(player.id));
    elements.playersList.append(item);
  });
}

function renderMatches(matches) {
  const selectedPlayer = getPlayerById(state.selectedPlayerId);
  const playerMatches = selectedPlayer
    ? matches.filter((match) => matchIncludesPlayer(match, selectedPlayer.id))
    : [];
  replaceChildren(
    elements.adminMatches,
    matches.map((match) => createMatchCard(match, true)),
    "Ingen kamper ennå. Generer første runde.",
  );
  replaceChildren(
    elements.playerMatches,
    playerMatches.map((match) => createMatchCard(match, false, selectedPlayer?.id)),
    selectedPlayer ? "Du har ingen kamper ennå." : "Velg spillerprofil for å se dine kamper.",
  );
  replaceChildren(
    elements.spectatorMatches,
    matches.map((match) => createMatchCard(match, false)),
    "Ingen kamper er generert ennå.",
  );
}

function createMatchCard(match, editable, highlightedPlayerId = null) {
  const card = document.createElement("article");
  card.className = `match-card ${highlightedPlayerId && matchIncludesPlayer(match, highlightedPlayerId) ? "highlight-match" : ""}`;
  card.innerHTML = `
    <div class="match-top">
      <span class="match-court">${match.courtName ?? "Ikke tildelt bane"}</span>
      <span class="match-status">${matchStateText(match.state)}</span>
    </div>
    <div class="teams">
      <div class="team">
        <small>Lag 1</small>
        <strong>${teamDisplay(match.teamOne)}</strong>
      </div>
      <div class="versus">mot</div>
      <div class="team">
        <small>Lag 2</small>
        <strong>${teamDisplay(match.teamTwo)}</strong>
      </div>
    </div>
    <p class="hint">${scoreSummary(match)}${sittingOutSummary(match)}</p>
  `;

  if (editable) {
    const scoreRow = document.createElement("div");
    scoreRow.className = "score-row";
    scoreRow.innerHTML = `
      <label>Lag 1 <input type="number" min="0" value="${match.currentSet.teamOne}" aria-label="Games lag 1"></label>
      <label>Lag 2 <input type="number" min="0" value="${match.currentSet.teamTwo}" aria-label="Games lag 2"></label>
      <button class="secondary" type="button">Lagre resultat</button>
    `;
    const [teamOneInput, teamTwoInput] = scoreRow.querySelectorAll("input");
    scoreRow.querySelector("button").addEventListener("click", () => {
      match.currentSet = {
        teamOne: Number(teamOneInput.value),
        teamTwo: Number(teamTwoInput.value),
      };
      finishMatch(match);
      saveState();
      render();
    });
    card.append(scoreRow);
  }

  return card;
}

function renderStandings(matches) {
  renderStandingsList(elements.standingsList, matches);
  renderStandingsList(elements.playerStandingsList, matches);
}

function renderStandingsList(container, matches) {
  container.innerHTML = "";
  leaderboardEntries(matches).forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="player-list-name">
        <img class="avatar" src="${avatarUrl(entry.player)}" alt="" width="34" height="34">
        ${escapeHtml(entry.player.name)}
      </span>
      <strong>${entry.points} p · ${entry.matchWins} seire · ${entry.gamesWon} games</strong>
    `;
    container.append(item);
  });
}

function renderPlayerSelector() {
  elements.playerButtons.innerHTML = "";
  state.players.forEach((player) => {
    const button = document.createElement("button");
    button.type = "button";
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

function renderPlayerNextMatch(matches) {
  const player = getPlayerById(state.selectedPlayerId);
  if (!player) {
    elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">Din neste kamp</p>
      <h3>Velg spillerprofil</h3>
      <p>Da viser appen bane, makker og motstandere for akkurat deg.</p>
    `;
    return;
  }

  if (state.status === "Avsluttet") {
    const placement = playerPlacement(player, matches);
    elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">Turneringen er ferdig</p>
      <h3>${escapeHtml(player.name)}${placement ? `, du endte på ${placement}. plass.` : ""}</h3>
      <p>Sjekk tabellen under for endelige resultater.</p>
    `;
    return;
  }

  const playerState = playerTournamentState(player, matches);

  if (playerState.kind === "resting") {
    elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">Pause denne runden</p>
      <h3>${escapeHtml(player.name)}, du sitter over nå.</h3>
      <p>Følg med på neste runde. Du vises her igjen når du har kamp.</p>
    `;
    return;
  }

  if (!playerState.match) {
    elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">Venter</p>
      <h3>${escapeHtml(player.name)}, du har ingen aktiv kamp akkurat nå.</h3>
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

  elements.playerNextMatch.innerHTML = `
    <p class="eyebrow">${statusLabel}</p>
    <h3>${match.courtName ?? "Bane kommer"}</h3>
    <p>${teammate ? `Du spiller med ${escapeHtml(teammate.name)}.` : "Du spiller single."}</p>
    <p>Mot ${opponentNames}.</p>
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
  const existingPlayer = state.players.find((player) => player.name.localeCompare(name, "nb", { sensitivity: "accent" }) === 0);
  if (existingPlayer) return existingPlayer;
  return addPlayer(name, "self", avatarId);
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

function updateCourtCount(courtCount) {
  const safeCourtCount = Math.max(1, Math.min(12, courtCount || 1));
  const existingCourts = state.courts.slice(0, safeCourtCount);
  const nextCourts = Array.from({ length: safeCourtCount }, (_, index) => {
    return existingCourts[index] ?? {
      id: crypto.randomUUID(),
      name: `Bane ${index + 1}`,
      courtNumber: index + 1,
      active: true,
    };
  });
  state.courts = nextCourts.map((court, index) => ({
    ...court,
    name: `Bane ${index + 1}`,
    courtNumber: index + 1,
    active: true,
  }));
}

function canGenerateRound() {
  return !generateRoundBlockReason();
}

function generateRoundBlockReason() {
  const activeRound = getActiveRound();
  if (state.status === "Avsluttet") return "Turneringen er avsluttet.";
  if (state.players.length < 2) return "Legg til minst to spillere før du starter runden.";
  if (state.courts.length < 1) return "Legg til minst én bane før du starter runden.";
  if (activeRound && activeRound.status !== "finished") return "Fullfør pågående runde før du genererer neste.";
  return "";
}

function teamDisplay(team) {
  return team.players
    .map((player) => `
      <span class="team-player">
        <img class="avatar small-avatar" src="${avatarUrl(player)}" alt="" width="28" height="28">
        ${escapeHtml(player.name)}
      </span>
    `)
    .join("");
}

function generateNextRound() {
  const schedule = state.schedule.length ? state.schedule : buildSchedule(state.players);
  if (!schedule.length) {
    alert("Legg til minst to spillere før du genererer kamper.");
    return;
  }

  const scheduleIndex = state.currentRound % schedule.length;
  const roundPlan = schedule[scheduleIndex];
  const matches = generateRoundRobinMatches(roundPlan.teams, state.currentRound + 1, roundPlan.sittingOut)
    .slice(0, state.courts.length)
    .map((match, index) => ({
      ...match,
      courtId: state.courts[index]?.id ?? null,
      courtName: state.courts[index]?.name ?? null,
      state: index === 0 ? "playing" : "waiting",
    }));

  state.currentRound += 1;
  state.status = "Runde pågår";
  state.rounds.push({
    id: crypto.randomUUID(),
    roundNumber: state.currentRound,
    status: "active",
    createdAt: new Date().toISOString(),
    sittingOut: roundPlan.sittingOut,
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

function generateRoundRobinMatches(teams, rotationNumber, sittingOut) {
  const matches = [];
  for (let homeIndex = 0; homeIndex < teams.length; homeIndex += 1) {
    for (let awayIndex = homeIndex + 1; awayIndex < teams.length; awayIndex += 1) {
      matches.push({
        id: crypto.randomUUID(),
        tournamentId: state.id,
        rotationNumber,
        teamOne: teams[homeIndex],
        teamTwo: teams[awayIndex],
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
  if (match.currentSet.teamOne === match.currentSet.teamTwo) {
    alert("Resultatet kan ikke være uavgjort i dette utkastet.");
    return;
  }

  match.state = "finished";
  match.completedSets = [match.currentSet];
  match.winnerTeamIndex = match.currentSet.teamOne > match.currentSet.teamTwo ? 0 : 1;
  match.completedAt = new Date().toISOString();

  const activeRound = getActiveRound();
  const nextWaitingMatch = activeRound?.matches.find((item) => item.state === "waiting");
  if (nextWaitingMatch) nextWaitingMatch.state = "playing";
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

      if (match.state !== "finished") {
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

function getAllMatches() {
  return state.rounds.flatMap((round) => round.matches);
}

function getPlayerById(id) {
  return state.players.find((player) => player.id === id);
}

function matchStateText(stateName) {
  return {
    waiting: "Venter",
    playing: "Pågår",
    finished: "Ferdig",
    cancelled: "Avbrutt",
  }[stateName] ?? stateName;
}

function scoreSummary(match) {
  if (match.completedSets.length) {
    return match.completedSets.map((set) => `${set.teamOne}-${set.teamTwo}`).join(", ");
  }
  return `${match.currentSet.teamOne}-${match.currentSet.teamTwo}`;
}

function sittingOutSummary(match) {
  if (!match.sittingOut.length) return "";
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

function replaceChildren(container, children, emptyText) {
  container.innerHTML = "";
  if (children.length === 0) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }
  container.append(...children);
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
