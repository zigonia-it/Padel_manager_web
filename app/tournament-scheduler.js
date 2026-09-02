window.PadelstarTournamentScheduler = (() => {
  function pairKey(first, second) {
    return [first.id, second.id].sort().join(":");
  }

  function playerStats(players, history = {}) {
    const stats = new Map(players.map((player) => [player.id, {
      matchesPlayed: 0,
      byeCount: 0,
      lastPlayedRound: -1,
      consecutiveMatches: 0,
    }]));
    (history.matches ?? []).forEach((match) => {
      const ids = [...(match.teamOne?.players ?? []), ...(match.teamTwo?.players ?? [])].map((player) => player.id);
      ids.forEach((id) => {
        const stat = stats.get(id);
        if (stat) stat.matchesPlayed += 1;
      });
    });
    (history.byes ?? []).forEach((ids) => ids.forEach((id) => {
      const stat = stats.get(id);
      if (stat) stat.byeCount += 1;
    }));
    return stats;
  }

  function partnerCount(history, first, second) {
    return (history.partners ?? {})[pairKey(first, second)] ?? 0;
  }

  function opponentCount(history, first, second) {
    return (history.opponents ?? {})[pairKey(first, second)] ?? 0;
  }

  function choosePartnering(players, history = {}, random = Math.random) {
    const remaining = [...players];
    const teams = [];
    let sittingOut = [];
    const stats = playerStats(players, history);
    if (remaining.length % 2 === 1) {
      const byeIndex = remaining
        .map((player, index) => ({ player, index, stat: stats.get(player.id) }))
        .sort((a, b) => (a.stat?.byeCount ?? 0) - (b.stat?.byeCount ?? 0)
          || (b.stat?.matchesPlayed ?? 0) - (a.stat?.matchesPlayed ?? 0)
          || random() - 0.5)[0]?.index;
      if (byeIndex !== undefined) sittingOut = remaining.splice(byeIndex, 1);
    }
    while (remaining.length > 1) {
      const first = remaining.shift();
      let bestIndex = 0;
      let bestScore = Infinity;
      remaining.forEach((candidate, index) => {
        const score = partnerCount(history, first, candidate) * 100
          + (stats.get(candidate.id)?.matchesPlayed ?? 0)
          + random() * 0.01;
        if (score < bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      });
      teams.push({ id: `team-${teams.length + 1}`, players: [first, remaining.splice(bestIndex, 1)[0]] });
    }
    return { teams, sittingOut };
  }

  function orderMatchups(teams, history = {}) {
    const matches = [];
    for (let first = 0; first < teams.length - 1; first += 1) {
      for (let second = first + 1; second < teams.length; second += 1) {
        const opponents = teams[first].players.flatMap((a) => teams[second].players.map((b) => opponentCount(history, a, b))).reduce((sum, value) => sum + value, 0);
        matches.push({ teamOne: teams[first], teamTwo: teams[second], opponentScore: opponents });
      }
    }
    return matches.sort((a, b) => a.opponentScore - b.opponentScore);
  }

  function createQueue(matchups, courtCount) {
    const queue = [];
    const remaining = [...matchups];
    let queuePosition = 1;
    let waveIndex = 0;
    while (remaining.length) {
      const wave = [];
      const wavePlayers = new Set();
      for (let index = 0; index < remaining.length && wave.length < courtCount;) {
        const matchup = remaining[index];
        const ids = new Set([...matchup.teamOne.players, ...matchup.teamTwo.players].map((player) => player.id));
        if ([...ids].some((id) => wavePlayers.has(id))) {
          index += 1;
          continue;
        }
        wave.push({ ...matchup, queuePosition, queueWave: waveIndex, plannedCourtIndex: wave.length });
        queuePosition += 1;
        ids.forEach((id) => wavePlayers.add(id));
        remaining.splice(index, 1);
      }
      if (!wave.length) wave.push({ ...remaining.shift(), queuePosition: queuePosition++, queueWave: waveIndex, plannedCourtIndex: 0 });
      queue.push(wave);
      waveIndex += 1;
    }
    return queue;
  }

  function matchPlayerIds(match) {
    return [...(match.teamOne?.players ?? []), ...(match.teamTwo?.players ?? [])].map((player) => player.id);
  }

  function findNextPlayableMatch(matches, occupiedPlayerIds = new Set()) {
    return (matches ?? []).find((match) => {
      if (!match || !["scheduled", "ready"].includes(match.status ?? "scheduled")) return false;
      return !matchPlayerIds(match).some((id) => occupiedPlayerIds.has(id));
    }) ?? null;
  }

  function assignNextCourt(matches, court, occupiedPlayerIds = new Set()) {
    const nextMatch = findNextPlayableMatch(matches, occupiedPlayerIds);
    if (!nextMatch || !court) return null;
    nextMatch.courtId = court.id ?? null;
    nextMatch.courtName = court.name ?? null;
    nextMatch.status = "ready";
    nextMatch.queuePosition = null;
    return nextMatch;
  }

  function recordMatchHistory(history = {}, match) {
    const next = {
      partners: { ...(history.partners ?? {}) },
      opponents: { ...(history.opponents ?? {}) },
      matches: [...(history.matches ?? []), match],
      byes: [...(history.byes ?? [])],
    };
    [match.teamOne, match.teamTwo].forEach((team) => {
      const teamPlayers = team?.players ?? [];
      for (let index = 0; index < teamPlayers.length - 1; index += 1) {
        const key = pairKey(teamPlayers[index], teamPlayers[index + 1]);
        next.partners[key] = (next.partners[key] ?? 0) + 1;
      }
    });
    (match.teamOne?.players ?? []).forEach((first) => (match.teamTwo?.players ?? []).forEach((second) => {
      next.opponents[pairKey(first, second)] = (next.opponents[pairKey(first, second)] ?? 0) + 1;
    }));
    return next;
  }

  function buildRoundRobinRound(players, history = {}, { courtCount = 1, random = Math.random } = {}) {
    const activePlayers = players.filter((player) => player.active !== false && player.availability !== "away");
    const { teams, sittingOut } = choosePartnering(activePlayers, history, random);
    const matchups = orderMatchups(teams, history);
    const waves = createQueue(matchups, Math.max(1, courtCount));
    return { teams, sittingOut, matchups, waves, queue: waves.flat() };
  }

  return { assignNextCourt, buildRoundRobinRound, choosePartnering, createQueue, findNextPlayableMatch, matchPlayerIds, orderMatchups, playerStats, recordMatchHistory };
})();
