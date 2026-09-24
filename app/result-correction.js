(function (global) {
  "use strict";

  const REASONS = ["entryError", "wrongTeam", "playersAgreed", "refereeDecision", "restore", "other"];

  function allMatches(state) {
    return (state.rounds ?? []).flatMap((round) => round.matches ?? []);
  }

  function locate(state, matchId) {
    for (const [roundIndex, round] of (state.rounds ?? []).entries()) {
      const match = (round.matches ?? []).find((item) => item.id === matchId);
      if (match) return { match, roundIndex };
    }
    return null;
  }

  // The rules the match was played by (the snapshot taken on its first point, else the tournament rules).
  function rulesFor(match, settings = {}, scoring = global.PadelstarScoring) {
    return scoring.matchRules(match, settings);
  }

  // Same validation as the server (admin_correct_result): only complete, valid sets, one winner.
  function validateSets(sets, rules, scoring) {
    return scoring.validateMatchSets(sets, rules);
  }

  function sameSets(left, right) {
    return JSON.stringify((left ?? []).map((set) => [set.teamOne, set.teamTwo])) === JSON.stringify((right ?? []).map((set) => [set.teamOne, set.teamTwo]));
  }

  function rankMap(entries) {
    return new Map(entries.map((entry, index) => [entry.player.id, { rank: index + 1, points: entry.points, name: entry.player.name }]));
  }

  // Runs the consequences of a correction WITHOUT changing anything (works on a copy) and classifies them:
  //   green  - the standings do not change
  //   yellow - the winner stays the same but ranking positions change
  //   orange - the winner changes, tournament points move
  //   red    - later matches already depend on the result: the correction is blocked
  function simulate(state, matchId, sets, scoring) {
    const found = locate(state, matchId);
    if (!found) return { ok: false, error: "notFound" };
    const { match, roundIndex } = found;
    // A finished tournament can still be corrected (the statistics follow); a cancelled one stays closed.
    if (state.status === "Avsluttet" && state.lifecycleStatus === "cancelled") return { ok: false, error: "closed" };
    if (match.state !== "finished") return { ok: false, error: "notFinished" };
    const rules = rulesFor(match, state.settings, scoring);
    const checked = validateSets(sets, rules, scoring);
    if (checked.error) return { ok: false, error: checked.error };
    const oldWinner = match.winnerTeamIndex;
    const newWinner = checked.winner;
    if (sameSets(match.completedSets, sets) && oldWinner === newWinner) return { ok: false, error: "same" };

    const pointMode = state.settings?.pointMode ?? "matches";
    const before = scoring.leaderboardEntries(state.players ?? [], allMatches(state), pointMode);
    const copy = structuredClone(allMatches(state));
    const target = copy.find((item) => item.id === matchId);
    target.completedSets = sets.map((set) => ({ teamOne: set.teamOne, teamTwo: set.teamTwo }));
    target.winnerTeamIndex = newWinner;
    delete target.timeWinnerTeamIndex;
    const after = scoring.leaderboardEntries(state.players ?? [], copy, pointMode);

    const beforeRanks = rankMap(before);
    const afterRanks = rankMap(after);
    const changes = [];
    for (const [id, now] of afterRanks) {
      const was = beforeRanks.get(id);
      if (!was) continue;
      if (was.rank !== now.rank || was.points !== now.points) {
        changes.push({ playerId: id, name: now.name, rankBefore: was.rank, rankAfter: now.rank, pointsBefore: was.points, pointsAfter: now.points });
      }
    }
    const winnerChanged = newWinner !== oldWinner;
    const blocked = winnerChanged
      && state.settings?.format === "cup"
      && (state.rounds ?? []).some((round, index) => index > roundIndex && (round.matches ?? []).length > 0);
    const rankChanged = changes.some((change) => change.rankBefore !== change.rankAfter);
    const level = blocked ? "red" : winnerChanged ? "orange" : rankChanged ? "yellow" : "green";
    return {
      ok: true,
      level,
      blocked,
      winnerChanged,
      oldWinnerTeam: oldWinner === 0 ? match.teamOne : match.teamTwo,
      newWinnerTeam: newWinner === 0 ? match.teamOne : match.teamTwo,
      changes: changes.sort((left, right) => left.rankAfter - right.rankAfter),
      sets: sets.map((set) => ({ teamOne: set.teamOne, teamTwo: set.teamTwo })),
      winner: newWinner,
    };
  }

  // Local-only tournaments (no server): the same change the server function makes.
  function applyLocally(state, matchId, sets, reason, comment, level, scoring, nowIso = new Date().toISOString()) {
    const simulation = simulate(state, matchId, sets, scoring);
    if (!simulation.ok) return simulation;
    if (simulation.blocked) return { ok: false, error: "blocked" };
    if (!REASONS.includes(reason)) return { ok: false, error: "reason" };
    const cleanComment = String(comment ?? "").trim();
    if (reason === "other" && !cleanComment) return { ok: false, error: "comment" };
    if (cleanComment.length > 500) return { ok: false, error: "comment" };
    const { match } = locate(state, matchId);
    const entry = {
      at: nowIso,
      by: "admin",
      reason,
      comment: cleanComment || null,
      level: level ?? simulation.level,
      winnerChanged: simulation.winnerChanged,
      before: { completedSets: structuredClone(match.completedSets ?? []), winnerTeamIndex: match.winnerTeamIndex },
      after: { completedSets: structuredClone(simulation.sets), winnerTeamIndex: simulation.winner },
    };
    match.correctionHistory = [...(match.correctionHistory ?? []), entry].slice(-50);
    match.completedSets = simulation.sets;
    match.winnerTeamIndex = simulation.winner;
    match.correctedAt = nowIso;
    delete match.timeWinnerTeamIndex;
    if (match.approval) {
      match.approval.completedSets = structuredClone(simulation.sets);
      match.approval.winnerTeamIndex = simulation.winner;
    }
    return { ok: true, simulation };
  }

  function setsText(sets) {
    return (sets ?? []).map((set) => `${set.teamOne}–${set.teamTwo}`).join(", ");
  }

  global.PadelstarResultCorrection = { REASONS, simulate, validateSets, applyLocally, rulesFor, locate, setsText };
})(window);
