window.PadelstarScoring = (() => {
  function validateSetScore(teamOne, teamTwo, settings) {
    const gamesToWinSet = settings.gamesToWinSet ?? 6;
    if (!Number.isInteger(teamOne) || !Number.isInteger(teamTwo)) return "Resultatet må være hele tall.";
    if (teamOne < 0 || teamTwo < 0) return "Resultatet kan ikke være negativt.";
    if (teamOne === teamTwo) return "Resultatet kan ikke være uavgjort.";
    if (!isSetComplete(teamOne, teamTwo, settings)) {
      return `Sett må vinnes ${gamesToWinSet}-x med to games margin, eller ${gamesToWinSet + 1}-${gamesToWinSet - 1} / ${gamesToWinSet + 1}-${gamesToWinSet}.`;
    }
    return "";
  }

  function isSetComplete(teamOne, teamTwo, settings) {
    const gamesToWinSet = settings.gamesToWinSet ?? 6;
    const winnerGames = Math.max(teamOne, teamTwo);
    const loserGames = Math.min(teamOne, teamTwo);
    if (winnerGames === gamesToWinSet && winnerGames - loserGames >= 2) return true;
    if (winnerGames === gamesToWinSet + 1 && [gamesToWinSet - 1, gamesToWinSet].includes(loserGames)) return true;
    return false;
  }

  function hasMatchWinner(match, settings) {
    return setsWonByTeam(match, 0) >= (settings.setsToWinMatch ?? 1) ||
      setsWonByTeam(match, 1) >= (settings.setsToWinMatch ?? 1);
  }

  function setsWonByTeam(match, teamIndex) {
    return match.completedSets.filter((set) => teamIndex === 0 ? set.teamOne > set.teamTwo : set.teamTwo > set.teamOne).length;
  }

  function leaderboardEntries(players, matches, pointMode) {
    const points = pointsByPlayer(matches, pointMode);
    return players
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
      award(valueOrZero(set.teamOne), match.teamOne, points);
      award(valueOrZero(set.teamTwo), match.teamTwo, points);
    });
    if (match.state !== "finished") {
      if (match.state !== "playing") return;
      award(valueOrZero(match.currentSet.teamOne), match.teamOne, points);
      award(valueOrZero(match.currentSet.teamTwo), match.teamTwo, points);
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

  function valueOrZero(value) {
    return Number.isFinite(value) ? value : 0;
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

  function playerTournamentState(player, matches, activeRound) {
    const playingMatch = matches.find((match) => match.state === "playing" && matchIncludesPlayer(match, player.id));
    if (playingMatch) return { kind: "playing", match: playingMatch };

    const waitingMatch = matches.find((match) => match.state === "waiting" && matchIncludesPlayer(match, player.id));
    if (waitingMatch) return { kind: "waiting", match: waitingMatch };

    const sittingOut = activeRound?.sittingOut?.some((sittingPlayer) => sittingPlayer.id === player.id);
    if (activeRound?.status === "active" && sittingOut) return { kind: "resting", match: null };

    return { kind: "idle", match: null };
  }

  return {
    validateSetScore,
    isSetComplete,
    hasMatchWinner,
    setsWonByTeam,
    leaderboardEntries,
    pointsByPlayer,
    statsForPlayer,
    applyGamePoints,
    applySetPoints,
    applyMatchPoints,
    award,
    playerTeamIndex,
    matchPlayers,
    uniquePlayers,
    matchIncludesPlayer,
    playerTournamentState,
  };
})();
