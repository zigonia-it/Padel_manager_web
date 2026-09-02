window.PadelstarTournamentEngine = (() => {
  function buildSchedule(players, format = "roundRobin", options = {}) {
    const activePlayers = players.filter((player) => player.active && player.availability !== "away");
    if (format === "cup") return [];
    if (window.PadelstarTournamentModes && format !== "roundRobin") {
      return window.PadelstarTournamentModes.build(players, format, { roundRobin: (roster) => roster.length < 4 ? generateSinglesRounds(roster) : generatePartnerRounds(roster), standings: options.standings ?? [], history: options.history ?? {} });
    }
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
          matchups: [],
        });
        rounds.at(-1).matchups = createTeamMatchups(rounds.at(-1).teams);
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

      rounds.push({ teams, sittingOut, matchups: createTeamMatchups(teams) });
      rotation = rotateRoundParticipants(rotation);
    }

    return rounds;
  }

  function createTeamMatchups(teams) {
    const matchups = [];
    for (let first = 0; first < teams.length - 1; first += 1) {
      for (let second = first + 1; second < teams.length; second += 1) {
        matchups.push({ teamOne: teams[first], teamTwo: teams[second] });
      }
    }
    return matchups;
  }

  function generateRoundMatches(teams, rotationNumber, sittingOut, tournamentId = null) {
    const matches = [];
    for (let teamIndex = 0; teamIndex < teams.length - 1; teamIndex += 2) {
      matches.push({
        id: crypto.randomUUID(),
        tournamentId,
        rotationNumber,
        teamOne: teams[teamIndex],
        teamTwo: teams[teamIndex + 1],
        sittingOut,
        state: "waiting",
        status: "scheduled",
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

  return {
    buildSchedule,
    generateSinglesRounds,
    generatePartnerRounds,
    generateRoundMatches,
    createTeamMatchups,
    rotateRoundParticipants,
    createTeam,
  };
})();
