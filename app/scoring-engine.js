window.PadelstarScoring = (() => {
  // ---- The rules: three levels, each "first to N, win by M" (Phase 14, developer's decision 2026-09-24) -----------------
  //   game  (points):  gameToWin, gameWinBy      tennis default 4 points, win by 2 (15/30/40/game); golden point = win by 1
  //   set   (games):   gamesToWinSet, setWinBy   tennis default 6 games, win by 2, with a decider at 6-6 (see below)
  //   match (sets):    setsToWinMatch, matchWinBy   first to N sets, no margin by default
  // Every number is 1..999. Tennis/padel is just the default set of numbers; "Points" (first to 21, win by 2, best of 3
  // games) is the same engine with the game level set to 1 point (every point wins a game), so the "games" of a set are
  // the points. What is shown (15/30/40 or plain numbers) is decided by the UI from the rules.
  //   setDecider: what happens when the set is level at the target ("nextGame" = the next game wins, 7-6; "tiebreak" =
  //   a tiebreak to 7 win by 2; "continue" = play on until someone leads by setWinBy, no cap). Tennis rules only make
  //   sense with setWinBy 2, so any other margin plays on ("continue"). The SQL twin (_scoring_rules) does the same.
  // Older tournaments carry only gamesToWinSet, setsToWinMatch, gameMode and setTiebreak: they map onto these rules exactly.
  const MAX_LEVEL = 999;
  const GAME_MODES = ["advantage", "goldenPoint"];
  const SET_DECIDERS = ["nextGame", "tiebreak", "continue"];

  function clampLevel(value, fallback) {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) ? Math.max(1, Math.min(MAX_LEVEL, number)) : fallback;
  }

  function normalizeRules(source = {}, fallback = {}) {
    const pick = (key) => source?.[key] ?? fallback?.[key];
    const gameMode = GAME_MODES.includes(pick("gameMode")) ? pick("gameMode") : "advantage";
    const setWinBy = clampLevel(pick("setWinBy"), 2);
    let setDecider = SET_DECIDERS.includes(pick("setDecider")) ? pick("setDecider") : (pick("setTiebreak") ? "tiebreak" : "nextGame");
    if (setWinBy !== 2) setDecider = "continue";
    const gameWinBy = clampLevel(pick("gameWinBy"), gameMode === "goldenPoint" ? 1 : 2);
    return {
      scoringMode: pick("scoringMode") === "points" ? "points" : "tennis",
      gamesToWinSet: clampLevel(pick("gamesToWinSet"), 6),
      setsToWinMatch: clampLevel(pick("setsToWinMatch"), 1),
      gameToWin: clampLevel(pick("gameToWin"), 4),
      gameWinBy,
      setWinBy,
      matchWinBy: clampLevel(pick("matchWinBy"), 1),
      setDecider,
      gameMode: gameWinBy === 1 ? "goldenPoint" : "advantage", // kept for older readers; gameWinBy is the rule
      setTiebreak: setDecider === "tiebreak",
      timedMinutes: Math.max(0, Math.floor(Number(pick("timedMinutes") ?? 0)) || 0),
    };
  }

  // Rules from the raw values of a form (create wizard or Styring): "tennis" shows all the numbers, "points" shows
  // only "first to N, win by M, first to G games" and maps them onto the same three levels (a point is a game).
  function rulesFromInput(raw = {}) {
    const number = (value) => (value === undefined || value === null || value === "" ? undefined : Number(value));
    const timedMinutes = Math.max(0, Math.min(180, Math.floor(Number(raw.timedMinutes)) || 0));
    if (raw.scoringMode === "points") {
      return normalizeRules({
        scoringMode: "points",
        gameToWin: 1,
        gameWinBy: 1,
        gamesToWinSet: number(raw.pointsToWin) ?? 21,
        setWinBy: number(raw.pointsWinBy) ?? 2,
        setDecider: "continue",
        setsToWinMatch: number(raw.pointsMatchGames) ?? 1,
        matchWinBy: 1,
        timedMinutes,
      });
    }
    return normalizeRules({
      scoringMode: "tennis",
      gamesToWinSet: number(raw.gamesToWinSet),
      setsToWinMatch: number(raw.setsToWinMatch),
      gameToWin: number(raw.gameToWin),
      gameWinBy: number(raw.gameWinBy),
      setWinBy: number(raw.setWinBy),
      matchWinBy: number(raw.matchWinBy),
      gameMode: raw.gameMode,
      setTiebreak: Boolean(raw.setTiebreak),
      timedMinutes,
    });
  }

  const RULE_FIELDS = ["scoringMode", "gamesToWinSet", "setsToWinMatch", "gameToWin", "gameWinBy", "setWinBy", "matchWinBy", "gameMode", "timedMinutes", "pointsToWin", "pointsWinBy", "pointsMatchGames"];
  function rulesInputFromFormData(formData) {
    const raw = Object.fromEntries(RULE_FIELDS.map((key) => [key, formData.get(key)]));
    raw.setTiebreak = formData.get("setTiebreak") === "on";
    return raw;
  }

  // The form values for a tournament's settings (the reverse of rulesFromInput).
  function formValuesFromRules(settings = {}) {
    const rules = normalizeRules(settings);
    return {
      scoringMode: rules.scoringMode,
      gamesToWinSet: rules.gamesToWinSet,
      setsToWinMatch: rules.setsToWinMatch,
      gameToWin: rules.gameToWin,
      gameWinBy: rules.gameWinBy,
      setWinBy: rules.setWinBy,
      matchWinBy: rules.matchWinBy,
      setTiebreak: rules.setDecider === "tiebreak",
      timedMinutes: rules.timedMinutes,
      pointsToWin: rules.gamesToWinSet,
      pointsWinBy: rules.setWinBy,
      pointsMatchGames: rules.setsToWinMatch,
    };
  }

  function validateSetScore(teamOne, teamTwo, settings) {
    if (!Number.isInteger(teamOne) || !Number.isInteger(teamTwo)) return "messages.invalidScoreInteger";
    if (teamOne < 0 || teamTwo < 0) return "messages.invalidScoreNegative";
    if (teamOne === teamTwo) return "messages.invalidScoreDraw";
    if (!isSetComplete(teamOne, teamTwo, settings)) {
      return "messages.invalidScoreShape";
    }
    return "";
  }

  // A typed match result (the list of finished sets): every set finished by the set rule, the match undecided before
  // the last set and decided by it. Returns { winner: 0|1 } or { error: "invalid" }. The SQL twin is _approval_validate_proposal.
  function validateMatchSets(sets, settings) {
    const rules = normalizeRules(settings);
    if (!Array.isArray(sets) || sets.length < 1) return { error: "invalid" };
    if (rules.matchWinBy === 1 && sets.length > 2 * rules.setsToWinMatch - 1) return { error: "invalid" };
    let one = 0;
    let two = 0;
    for (const [index, set] of sets.entries()) {
      if (!Number.isInteger(set?.teamOne) || !Number.isInteger(set?.teamTwo)) return { error: "invalid" };
      if (set.teamOne < 0 || set.teamTwo < 0 || set.teamOne === set.teamTwo) return { error: "invalid" };
      if (!isSetComplete(set.teamOne, set.teamTwo, rules)) return { error: "invalid" };
      if (set.teamOne > set.teamTwo) one += 1; else two += 1;
      const decided = (one >= rules.setsToWinMatch && one - two >= rules.matchWinBy) || (two >= rules.setsToWinMatch && two - one >= rules.matchWinBy);
      if (decided && index < sets.length - 1) return { error: "invalid" };
      if (!decided && index === sets.length - 1) return { error: "invalid" };
    }
    return { winner: one > two ? 0 : 1 };
  }

  // The finished scores of one set as [winnerGames, loserGames] pairs, for quick-pick buttons (the caller falls back
  // to two number fields when the list is long).
  function finishedSetScores(settings) {
    const rules = normalizeRules(settings);
    const target = rules.gamesToWinSet;
    const margin = rules.setDecider === "continue" ? rules.setWinBy : 2;
    const scores = [];
    for (let loser = 0; loser <= target - margin; loser += 1) scores.push([target, loser]);
    if (rules.setDecider === "continue") {
      if (margin >= 2) for (let over = 1; over <= 2; over += 1) scores.push([target + over, target + over - margin]);
    } else {
      scores.push([target + 1, target - 1], [target + 1, target]);
    }
    return scores.filter(([winner, loser]) => winner >= 0 && loser >= 0 && isSetComplete(winner, loser, rules));
  }

  function isSetComplete(teamOne, teamTwo, settings) {
    const rules = normalizeRules(settings);
    const gamesToWinSet = rules.gamesToWinSet;
    const winnerGames = Math.max(teamOne, teamTwo);
    const loserGames = Math.min(teamOne, teamTwo);
    // Only scores that play can reach: at the target with the margin, or beyond it with exactly the margin.
    if (rules.setDecider === "continue") {
      return (winnerGames === gamesToWinSet && winnerGames - loserGames >= rules.setWinBy)
        || (winnerGames > gamesToWinSet && winnerGames - loserGames === rules.setWinBy && rules.setWinBy >= 2);
    }
    if (winnerGames === gamesToWinSet && winnerGames - loserGames >= 2) return true;
    if (winnerGames === gamesToWinSet + 1 && [gamesToWinSet - 1, gamesToWinSet].includes(loserGames)) return true;
    return false;
  }

  function hasMatchWinner(match, settings) {
    const rules = normalizeRules(settings);
    const one = setsWonByTeam(match, 0);
    const two = setsWonByTeam(match, 1);
    return (one >= rules.setsToWinMatch && one - two >= rules.matchWinBy)
      || (two >= rules.setsToWinMatch && two - one >= rules.matchWinBy);
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

  // The rule profile a match is played by. Tournament rules are locked once round 1 exists,
  // and the profile is snapshotted onto the match on its first point.
  function matchRules(match, settings = {}) {
    return normalizeRules(match?.rules ?? {}, settings);
  }

  // Points scoring shows "games won" and running points; tennis scoring shows sets, games and 15/30/40.
  function isPointsMatch(match, settings = {}) {
    return (match?.rules?.scoringMode ?? settings?.scoringMode) === "points";
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
    const gameWinBy = match.decidingGame ? 1 : rules.gameWinBy; // the deciding game of a timed match: the next point wins
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
    } else if (scoring + 1 >= rules.gameToWin && scoring + 1 - other >= gameWinBy) {
      gameWon = true;
    } else {
      game[scoringTeam] = scoring + 1;
      // Keep the counts small when the game is in its "deuce" zone (both one short of the target or more): only the
      // difference matters, so 4-4 is stored as 3-3 (the same as the 40-40 / advantage model this replaces).
      const floor = rules.gameToWin - 1;
      const lowest = Math.min(game.teamOne, game.teamTwo);
      if (lowest > floor) { game.teamOne -= lowest - floor; game.teamTwo -= lowest - floor; }
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
      if (rules.setDecider === "tiebreak"
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
  // Only the classic four-point game is shown as 15/30/40/A; any other game rule shows plain numbers.
  const POINT_LABELS = ["0", "15", "30", "40", "A"];
  function pointLabel(match, value) {
    if (match?.inTiebreak) return String(value ?? 0);
    if ((match?.rules?.gameToWin ?? 4) !== 4) return String(value ?? 0);
    return POINT_LABELS[value] ?? "0";
  }

  return {
    validateSetScore,
    isSetComplete,
    validateMatchSets,
    finishedSetScores,
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
    MAX_LEVEL,
    normalizeRules,
    rulesFromInput,
    rulesInputFromFormData,
    formValuesFromRules,
    matchRules,
    isPointsMatch,
    GAME_MODES,
    snapshotRules,
    awardPoint,
    remainingSeconds,
    pointLabel,
  };
})();
