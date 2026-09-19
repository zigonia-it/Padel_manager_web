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
          gamesLost: stats.gamesLost,
          gameDifference: stats.gamesWon - stats.gamesLost,
        };
      })
      .map((entry, _index, all) => ({ ...entry, headToHead: headToHeadScore(entry, all, matches) }))
      .sort(compareEntries);
  }

  // Ranking: points, then head-to-head among the players tied on points, then match wins, sets won,
  // game difference, games won and finally the name.
  function compareEntries(left, right) {
    return (
      right.points - left.points ||
      right.headToHead - left.headToHead ||
      right.matchWins - left.matchWins ||
      right.setsWon - left.setsWon ||
      right.gameDifference - left.gameDifference ||
      right.gamesWon - left.gamesWon ||
      left.player.name.localeCompare(right.player.name, "nb")
    );
  }

  // Mini-league among the players with the same points: +1 for each finished match this player won against
  // another player of the group (as opponents), -1 for each lost. Partners never count against each other.
  function headToHeadScore(entry, allEntries, matches) {
    const tied = new Set(allEntries.filter((other) => other.points === entry.points && other.player.id !== entry.player.id).map((other) => other.player.id));
    if (tied.size === 0) return 0;
    let score = 0;
    matches.forEach((match) => {
      if (match.state !== "finished" || match.winnerTeamIndex === null || match.winnerTeamIndex === undefined) return;
      const teamIndex = playerTeamIndex(entry.player, match);
      if (teamIndex === null) return;
      const opponents = (teamIndex === 0 ? match.teamTwo : match.teamOne).players.filter((opponent) => tied.has(opponent.id)).length;
      if (opponents === 0) return;
      score += (match.winnerTeamIndex === teamIndex ? 1 : -1) * opponents;
    });
    return score;
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
          stats.gamesLost += teamIndex === 0 ? set.teamTwo : set.teamOne;
        });

        if (match.state === "playing") {
          stats.gamesWon += teamIndex === 0 ? match.currentSet.teamOne : match.currentSet.teamTwo;
          stats.gamesLost += teamIndex === 0 ? match.currentSet.teamTwo : match.currentSet.teamOne;
        }

        return stats;
      },
      { matchesPlayed: 0, matchWins: 0, setsWon: 0, gamesWon: 0, gamesLost: 0 },
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
      timedMinutes: Math.max(0, Math.floor(Number(source.timedMinutes ?? settings.timedMinutes ?? 0)) || 0),
    };
  }

  function snapshotRules(match, settings) {
    if (!match.rules) match.rules = matchRules(match, settings);
    return match.rules;
  }

  // A timed match ends when the clock has run out and the game in progress is finished.
  function timeExpired(match, rules, nowMs) {
    if (!rules.timedMinutes || !match.startedAt) return false;
    return nowMs >= Date.parse(match.startedAt) + rules.timedMinutes * 60000;
  }

  function remainingSeconds(match, nowMs = Date.now()) {
    const minutes = match?.rules?.timedMinutes;
    if (!minutes || !match.startedAt) return null;
    return Math.max(0, Math.ceil((Date.parse(match.startedAt) + minutes * 60000 - nowMs) / 1000));
  }

  function totalGames(match, teamIndex) {
    const key = teamIndex === 0 ? "teamOne" : "teamTwo";
    return match.completedSets.reduce((sum, set) => sum + (set[key] ?? 0), 0) + (match.currentSet?.[key] ?? 0);
  }

  // Applies one point to the match. Returns { gameWon, setWon, matchWon }; the caller finishes the match.
  // Timed matches: a game won after the clock ran out ends the match. The leader on sets, then on games, wins;
  // when level, one deciding golden-point game (or tiebreak, if one is due) decides. The winner is stored in
  // timeWinnerTeamIndex because the set count alone cannot always express it.
  function awardPoint(match, teamIndex, settings, nowMs = Date.now()) {
    const rules = snapshotRules(match, settings);
    if (!match.startedAt) match.startedAt = new Date(nowMs).toISOString();
    const result = applyPoint(match, teamIndex, rules);
    if (!result.gameWon || result.matchWon) return result;
    if (!match.decidingGame && !timeExpired(match, rules, nowMs)) return result;

    let winner;
    if (match.decidingGame) {
      winner = teamIndex;
    } else {
      const sets = [setsWonByTeam(match, 0), setsWonByTeam(match, 1)];
      const games = [totalGames(match, 0), totalGames(match, 1)];
      if (sets[0] !== sets[1]) winner = sets[0] > sets[1] ? 0 : 1;
      else if (games[0] !== games[1]) winner = games[0] > games[1] ? 0 : 1;
      else {
        match.decidingGame = true;
        return result;
      }
    }
    // Keep the unfinished set in the record when it points the same way as the result (for the statistics).
    const partial = { teamOne: match.currentSet.teamOne, teamTwo: match.currentSet.teamTwo };
    if (partial.teamOne !== partial.teamTwo && (partial.teamOne > partial.teamTwo ? 0 : 1) === winner) {
      match.completedSets.push(partial);
    }
    match.timeWinnerTeamIndex = winner;
    match.endReason = "timeExpired";
    match.decidingGame = false;
    return { gameWon: true, setWon: true, matchWon: true };
  }

  function applyPoint(match, teamIndex, rules) {
    const gameMode = match.decidingGame ? "goldenPoint" : rules.gameMode;
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
    } else if (scoring === 4 || (scoring === 3 && (other < 3 || gameMode === "goldenPoint"))) {
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
    remainingSeconds,
    pointLabel,
  };
})();
