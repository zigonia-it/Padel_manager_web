window.PadelstarTournamentModes = (() => {
  const supportedFormats = [
    "roundRobin", "americano", "teamAmericano", "mexicano", "teamMexicano",
    "kingOfCourt", "cup", "groupsPlayoffs",
  ];

  function activePlayers(players) {
    return players.filter((player) => player.active !== false && player.availability !== "away");
  }

  function team(players) {
    return { id: crypto.randomUUID(), players, accent: players[0]?.accent ?? "silver", displayName: players.map((player) => player.name).join(" & ") };
  }

  function pairings(players, format = "americano") {
    const roster = activePlayers(players);
    if (roster.length < 2) return [];
    const rotation = [...roster];
    if (rotation.length % 2) rotation.push(null);
    const rounds = [];
    for (let round = 0; round < rotation.length - 1; round += 1) {
      const teams = [];
      const sittingOut = [];
      for (let index = 0; index < rotation.length / 2; index += 1) {
        const first = rotation[index];
        const second = rotation[rotation.length - 1 - index];
        if (first && second) teams.push(team(format === "teamAmericano" || format === "teamMexicano" ? [first, second] : [first, second]));
        else if (first || second) sittingOut.push(first ?? second);
      }
      rounds.push({ format, teams, sittingOut, matchups: matchups(teams), roundNumber: round + 1 });
      const fixed = rotation[0];
      const rotating = rotation.slice(1);
      rotation.splice(0, rotation.length, fixed, rotating.at(-1), ...rotating.slice(0, -1));
    }
    return rounds;
  }

  function matchups(teams) {
    const result = [];
    for (let first = 0; first < teams.length - 1; first += 1) {
      for (let second = first + 1; second < teams.length; second += 1) result.push({ teamOne: teams[first], teamTwo: teams[second] });
    }
    return result;
  }

  function fixedTeamRounds(players, format) {
    const roster = activePlayers(players);
    const teams = [];
    for (let index = 0; index < roster.length; index += 2) teams.push(team(roster.slice(index, index + 2)));
    return teams.length < 2 ? [] : [{ format, teams, sittingOut: [], matchups: matchups(teams), roundNumber: 1 }];
  }

  function rankedRounds(players, format, standings = [], history = {}) {
    const rank = new Map(standings.map((entry, index) => [entry.playerId ?? entry.id, entry.rank ?? index]));
    const roster = activePlayers(players).sort((left, right) => (rank.get(left.id) ?? 999) - (rank.get(right.id) ?? 999));
    const rounds = [];
    for (let index = 0; index < roster.length; index += 2) {
      const first = roster[index]; const second = roster[index + 1];
      if (first && second) rounds.push([first, second]);
    }
    const teams = rounds.map((pair) => team(pair));
    return teams.length < 2 ? [] : [{ format, teams, sittingOut: roster.length % 2 ? [roster.at(-1)] : [], matchups: matchups(teams), ranked: true, history }];
  }

  function advanceKingOfCourt(round, results = []) {
    const ordered = [...(round?.teams ?? [])];
    const winners = new Set(results.filter((result) => result.winnerTeamIndex !== undefined).map((result) => result.winnerTeamIndex === 0 ? result.teamOneId : result.teamTwoId));
    ordered.sort((left, right) => Number(winners.has(right.id)) - Number(winners.has(left.id)));
    return ordered;
  }

  function groupsPlayoffSchedule(players, groupSize = 4) {
    const roster = activePlayers(players);
    const groups = [];
    for (let index = 0; index < roster.length; index += groupSize) groups.push(roster.slice(index, index + groupSize));
    const rounds = groups.flatMap((group, index) => pairings(group, "groupsPlayoffs").map((round) => ({ ...round, groupIndex: index + 1 })));
    return { rounds, groups: groups.map((group, index) => ({ id: index + 1, playerIds: group.map((player) => player.id) })), playoff: { bracketSize: Math.max(2, 2 ** Math.ceil(Math.log2(groups.length || 1))) } };
  }

  function build(players, format = "roundRobin", helpers = {}) {
    if (format === "cup") return [];
    if (format === "groupsPlayoffs") return groupsPlayoffSchedule(players).rounds;
    if (format === "teamAmericano" || format === "teamMexicano") return fixedTeamRounds(players, format);
    if (format === "mexicano" || format === "kingOfCourt") return rankedRounds(players, format, helpers.standings, helpers.history);
    if (format === "americano") return pairings(players, format);
    return helpers.roundRobin ? helpers.roundRobin(players) : [];
  }

  return { supportedFormats, activePlayers, advanceKingOfCourt, build, fixedTeamRounds, groupsPlayoffSchedule, matchups, pairings, rankedRounds, team };
})();
