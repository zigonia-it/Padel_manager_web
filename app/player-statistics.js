window.PadelstarPlayerStatistics = (() => {
  function participantId(player) { return player?.profileId ?? player?.id ?? null; }

  function finishedMatches(matches = []) { return matches.filter((match) => match?.state === "finished" || match?.status === "completed"); }

  function teamPlayers(match, index) { return match?.[index === 0 ? "teamOne" : "teamTwo"]?.players ?? []; }

  function statsForPlayer(playerId, matches) {
    return finishedMatches(matches).reduce((stats, match) => {
      const teamIndex = [0, 1].find((index) => teamPlayers(match, index).some((player) => participantId(player) === playerId));
      if (teamIndex === undefined) return stats;
      stats.matches += 1;
      if (match.winnerTeamIndex === teamIndex) stats.wins += 1;
      for (const set of match.completedSets ?? []) {
        const won = teamIndex === 0 ? set.teamOne > set.teamTwo : set.teamTwo > set.teamOne;
        stats.sets += Number(won);
        stats.games += teamIndex === 0 ? Number(set.teamOne) : Number(set.teamTwo);
      }
      return stats;
    }, { matches: 0, wins: 0, sets: 0, games: 0 });
  }

  function aggregate(players, matches) {
    return players.map((player) => ({ playerId: participantId(player), name: player.name, ...statsForPlayer(participantId(player), matches) }))
      .sort((left, right) => right.wins - left.wins || right.sets - left.sets || right.games - left.games || left.name.localeCompare(right.name, "nb"));
  }

  function partnerStats(playerId, matches) {
    const result = new Map();
    for (const match of finishedMatches(matches)) {
      for (const index of [0, 1]) {
        const players = teamPlayers(match, index);
        if (!players.some((player) => participantId(player) === playerId)) continue;
        for (const partner of players.filter((player) => participantId(player) !== playerId)) {
          const id = participantId(partner);
          if (!id) continue;
          const current = result.get(id) ?? { playerId: id, name: partner.name, matches: 0, wins: 0 };
          current.matches += 1;
          current.wins += Number(match.winnerTeamIndex === index);
          result.set(id, current);
        }
      }
    }
    return [...result.values()].sort((left, right) => right.wins - left.wins || right.matches - left.matches || left.name.localeCompare(right.name, "nb"));
  }

  function headToHead(firstId, secondId, matches) {
    return finishedMatches(matches).reduce((result, match) => {
      const firstTeam = [0, 1].find((index) => teamPlayers(match, index).some((player) => participantId(player) === firstId));
      const secondTeam = [0, 1].find((index) => teamPlayers(match, index).some((player) => participantId(player) === secondId));
      if (firstTeam === undefined || secondTeam === undefined || firstTeam === secondTeam) return result;
      result.matches += 1;
      result.firstWins += Number(match.winnerTeamIndex === firstTeam);
      result.secondWins += Number(match.winnerTeamIndex === secondTeam);
      return result;
    }, { matches: 0, firstWins: 0, secondWins: 0 });
  }

  return { aggregate, finishedMatches, headToHead, partnerStats, participantId, statsForPlayer };
})();
