window.PadelstarScoring = (() => {
  function validateSetScore(teamOne, teamTwo, settings) {
    const gamesToWinSet = settings.gamesToWinSet ?? 6;
    if (!Number.isInteger(teamOne) || !Number.isInteger(teamTwo)) return "messages.invalidScoreInteger";
    if (teamOne < 0 || teamTwo < 0) return "messages.invalidScoreNegative";
    if (teamOne === teamTwo) return "messages.invalidScoreDraw";
    if (!isSetComplete(teamOne, teamTwo, settings)) {
      return "messages.invalidScoreShape";
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


  // ---- Point-by-point engine (Phase 14) -------------------------------------------------------
  // The same rules are implemented in SQL (save_player_point_impl); supabase/tests/scoring-rules.pglite.mjs
  // and test/scoring-rules.test.js run both against test/fixtures/scoring-scenarios.json.

  const TIEBREAK_TARGET = 7;
  const GAME_MODES = ["advantage", "goldenPoint"];

  // The rule profile a match is played by. Tournament rules are locked once round 1 exists,
  // and the profile is snapshotted onto the match on its first point.
  function matchRules(match, settings = {}) {
    const source = match?.rules ?? {};
    return {
      gamesToWinSet: source.gamesToWinSet ?? settings.gamesToWinSet ?? 6,
      setsToWinMatch: source.setsToWinMatch ?? settings.setsToWinMatch ?? 1,
      gameMode: GAME_MODES.includes(source.gameMode ?? settings.gameMode) ? (source.gameMode ?? settings.gameMode) : "advantage",
      setTiebreak: Boolean(source.setTiebreak ?? settings.setTiebreak ?? false),
    };
  }

  function snapshotRules(match, settings) {
    if (!match.rules) match.rules = matchRules(match, settings);
    return match.rules;
  }

  // Applies one point to the match. Returns { gameWon, setWon, matchWon }; the caller finishes the match.
  function awardPoint(match, teamIndex, settings) {
    const rules = snapshotRules(match, settings);
    const scoringTeam = teamIndex === 0 ? "teamOne" : "teamTwo";
    const otherTeam = teamIndex === 0 ? "teamTwo" : "teamOne";
    const game = match.currentGame;
    const scoring = game[scoringTeam] ?? 0;
    const other = game[otherTeam] ?? 0;
    let gameWon = false;
    let tiebreakWon = false;
    if (match.inTiebreak) {
      game[scoringTeam] = scoring + 1;
      if (scoring + 1 >= TIEBREAK_TARGET && scoring + 1 - other >= 2) {
        gameWon = true;
        tiebreakWon = true;
      }
    } else if (scoring === 4 || (scoring === 3 && (other < 3 || rules.gameMode === "goldenPoint"))) {
      gameWon = true;
    } else if (scoring === 3 && other === 3) {
      game[scoringTeam] = 4;
    } else if (other === 4) {
      game[otherTeam] = 3;
    } else {
      game[scoringTeam] = scoring + 1;
    }
    if (!gameWon) return { gameWon: false, setWon: false, matchWon: false };

    const tiebreakPoints = tiebreakWon ? { teamOne: game.teamOne, teamTwo: game.teamTwo } : null;
    match.currentGame = { teamOne: 0, teamTwo: 0 };
    if (tiebreakWon) {
      match.currentSet[scoringTeam] = rules.gamesToWinSet + 1;
      match.currentSet[otherTeam] = rules.gamesToWinSet;
      match.inTiebreak = false;
    } else {
      match.currentSet[scoringTeam] += 1;
      if (rules.setTiebreak
        && match.currentSet.teamOne === rules.gamesToWinSet
        && match.currentSet.teamTwo === rules.gamesToWinSet) {
        match.inTiebreak = true;
        return { gameWon: true, setWon: false, matchWon: false };
      }
    }
    if (!isSetComplete(match.currentSet.teamOne, match.currentSet.teamTwo, rules)) {
      return { gameWon: true, setWon: false, matchWon: false };
    }
    match.completedSets.push({ ...match.currentSet, ...(tiebreakPoints ? { tiebreak: tiebreakPoints } : {}) });
    if (hasMatchWinner(match, rules)) return { gameWon: true, setWon: true, matchWon: true };
    match.currentSet = { teamOne: 0, teamTwo: 0 };
    return { gameWon: true, setWon: true, matchWon: false };
  }

  // Display label for one side's points in the current game (tiebreak points are plain numbers).
  const POINT_LABELS = ["0", "15", "30", "40", "A"];
  function pointLabel(match, value) {
    if (match?.inTiebreak) return String(value ?? 0);
    return POINT_LABELS[value] ?? "0";
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
    TIEBREAK_TARGET,
    GAME_MODES,
    matchRules,
    snapshotRules,
    awardPoint,
    pointLabel,
  };
})();
