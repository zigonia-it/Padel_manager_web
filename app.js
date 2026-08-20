const storageKey = "padel-manager-demo";
const accents = ["silver", "green", "blue", "clay", "yellow", "navy", "mint", "coral"];

const defaultTournament = createTournament({
  name: "Risløkka Padel",
  inviteCode: "P4K7D",
  players: ["Sigurd", "Elin", "Elisabeth", "Hanne", "Ruben", "Karoline", "Lars", "Tina"],
  courtCount: 1,
});

let state = loadState();

const elements = {
  startView: document.querySelector("#startView"),
  workspaceView: document.querySelector("#workspaceView"),
  createTournamentForm: document.querySelector("#createTournamentForm"),
  joinTournamentForm: document.querySelector("#joinTournamentForm"),
  addPlayerForm: document.querySelector("#addPlayerForm"),
  tournamentTitle: document.querySelector("#tournamentTitle"),
  roundLabel: document.querySelector("#roundLabel"),
  inviteCode: document.querySelector("#inviteCode"),
  tournamentStatus: document.querySelector("#tournamentStatus"),
  playerCount: document.querySelector("#playerCount"),
  matchCount: document.querySelector("#matchCount"),
  playersList: document.querySelector("#playersList"),
  adminMatches: document.querySelector("#adminMatches"),
  playerMatches: document.querySelector("#playerMatches"),
  spectatorMatches: document.querySelector("#spectatorMatches"),
  standingsList: document.querySelector("#standingsList"),
  playerButtons: document.querySelector("#playerButtons"),
  playerNextMatch: document.querySelector("#playerNextMatch"),
  generateRoundButton: document.querySelector("#generateRoundButton"),
  completeRoundButton: document.querySelector("#completeRoundButton"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
};

syncCreateFormDefaults();

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

  if (inviteCode !== state.inviteCode) {
    alert(`Fant ikke turnering med kode ${inviteCode}. Prøv ${state.inviteCode} i demoen.`);
    return;
  }

  showWorkspace("player");
  render();
});

elements.addPlayerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const name = formData.get("playerName").trim();
  if (!name) return;

  state.players.push(createPlayer(name, state.players.length));
  state.schedule = buildSchedule(state.players);
  event.currentTarget.reset();
  saveState();
  render();
});

elements.generateRoundButton.addEventListener("click", () => {
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

elements.resetDemoButton.addEventListener("click", () => {
  state = structuredClone(defaultTournament);
  saveState();
  showStart();
  render();
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => activateTab(tab.dataset.view));
});

function createTournament({ name, inviteCode, players, courtCount }) {
  const tournamentPlayers = players.map(createPlayer);
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

function createPlayer(name, index) {
  return {
    id: crypto.randomUUID(),
    name,
    avatarId: name,
    accent: accents[index % accents.length],
    active: true,
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
  nextState.schedule ??= buildSchedule(nextState.players);
  nextState.players = nextState.players.map((player, index) => ({
    active: true,
    accent: accents[index % accents.length],
    avatarId: player.name,
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

function syncCreateFormDefaults() {
  elements.createTournamentForm.elements.tournamentName.value = defaultTournament.name;
  elements.createTournamentForm.elements.players.value = defaultTournament.players
    .map((player) => player.name)
    .join("\n");
  elements.createTournamentForm.elements.courts.value = defaultTournament.courts.length;
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
  elements.tournamentTitle.textContent = state.name;
  elements.roundLabel.textContent = `Runde ${Math.max(state.currentRound, 1)}`;
  elements.inviteCode.textContent = state.inviteCode;
  elements.tournamentStatus.textContent = state.status;
  elements.playerCount.textContent = `${state.players.length} spillere`;
  elements.matchCount.textContent = `${matches.length} kamper`;

  renderPlayers();
  renderMatches(matches);
  renderStandings(matches);
  renderPlayerSelector();
  renderPlayerNextMatch(matches);
}

function renderPlayers() {
  const standings = leaderboardEntries(getAllMatches());
  elements.playersList.innerHTML = "";
  state.players.forEach((player) => {
    const entry = standings.find((item) => item.player.id === player.id);
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="player-list-name">
        <img class="avatar" src="${avatarUrl(player)}" alt="" width="34" height="34">
        ${player.name}
      </span>
      <strong>${entry?.points ?? 0} p</strong>
    `;
    elements.playersList.append(item);
  });
}

function renderMatches(matches) {
  replaceChildren(
    elements.adminMatches,
    matches.map((match) => createMatchCard(match, true)),
    "Ingen kamper ennå. Generer første runde.",
  );
  replaceChildren(
    elements.playerMatches,
    matches.map((match) => createMatchCard(match, false)),
    "Ingen kamper er generert ennå.",
  );
  replaceChildren(
    elements.spectatorMatches,
    matches.map((match) => createMatchCard(match, false)),
    "Ingen kamper er generert ennå.",
  );
}

function createMatchCard(match, editable) {
  const card = document.createElement("article");
  card.className = "match-card";
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
  elements.standingsList.innerHTML = "";
  leaderboardEntries(matches).forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="player-list-name">
        <img class="avatar" src="${avatarUrl(entry.player)}" alt="" width="34" height="34">
        ${entry.player.name}
      </span>
      <strong>${entry.points} p · ${entry.matchWins} seire · ${entry.gamesWon} games</strong>
    `;
    elements.standingsList.append(item);
  });
}

function renderPlayerSelector() {
  elements.playerButtons.innerHTML = "";
  state.players.forEach((player) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<img class="avatar" src="${avatarUrl(player)}" alt="" width="30" height="30"><span>${player.name}</span>`;
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

  const match = matches.find((item) => {
    return item.state !== "finished" && matchPlayers(item).some((matchPlayer) => matchPlayer.id === player.id);
  });

  if (!match) {
    elements.playerNextMatch.innerHTML = `
      <p class="eyebrow">Pause</p>
      <h3>${player.name}, du har ingen aktiv kamp akkurat nå.</h3>
      <p>Når neste runde genereres, vises kampinformasjonen her.</p>
    `;
    return;
  }

  const isTeamOne = match.teamOne.players.some((item) => item.id === player.id);
  const ownTeam = isTeamOne ? match.teamOne : match.teamTwo;
  const opponents = isTeamOne ? match.teamTwo : match.teamOne;
  const teammate = ownTeam.players.find((item) => item.id !== player.id);

  elements.playerNextMatch.innerHTML = `
    <p class="eyebrow">Din neste kamp</p>
    <h3>${match.courtName ?? "Bane kommer"}</h3>
    <p>${teammate ? `Du spiller med ${teammate.name}.` : "Du spiller single."}</p>
    <p>Mot ${opponents.displayName}.</p>
  `;
}

function avatarUrl(player) {
  const seed = encodeURIComponent(player.avatarId ?? player.name ?? "Padel");
  return `https://api.dicebear.com/10.x/thumbs/svg?seed=${seed}&size=64&borderRadius=50&backgroundColor=cc9414,616b7a,ebc761`;
}

function teamDisplay(team) {
  return team.players
    .map((player) => `
      <span class="team-player">
        <img class="avatar small-avatar" src="${avatarUrl(player)}" alt="" width="28" height="28">
        ${player.name}
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

      stats.matchesPlayed += match.state === "waiting" ? 0 : 1;
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
  return ` · Pause: ${match.sittingOut.map((player) => player.name).join(", ")}`;
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

render();
