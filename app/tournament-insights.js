window.PadelstarTournamentInsights = (() => {
  function expected(rating, opponentRating) { return 1 / (1 + 10 ** ((opponentRating - rating) / 400)); }

  function updateRating(rating, opponentRating, score, kFactor = 32) {
    return Math.round(rating + kFactor * (score - expected(rating, opponentRating)));
  }

  function applyMatchRatings(ratings = {}, match, options = {}) {
    if (!match || ![0, 1].includes(match.winnerTeamIndex)) return { ...ratings };
    const first = (match.teamOne?.players ?? []).map((player) => player.profileId ?? player.id).filter(Boolean);
    const second = (match.teamTwo?.players ?? []).map((player) => player.profileId ?? player.id).filter(Boolean);
    const average = (ids) => ids.length ? ids.reduce((sum, id) => sum + (ratings[id] ?? options.initialRating ?? 1000), 0) / ids.length : (options.initialRating ?? 1000);
    const firstRating = average(first); const secondRating = average(second);
    const next = { ...ratings };
    first.forEach((id) => { next[id] = updateRating(ratings[id] ?? options.initialRating ?? 1000, secondRating, match.winnerTeamIndex === 0 ? 1 : 0, options.kFactor ?? 32); });
    second.forEach((id) => { next[id] = updateRating(ratings[id] ?? options.initialRating ?? 1000, firstRating, match.winnerTeamIndex === 1 ? 1 : 0, options.kFactor ?? 32); });
    return next;
  }

  function calculateRatings(matches = [], options = {}) {
    return matches.filter((match) => match?.state === "finished" || match?.status === "completed")
      .reduce((ratings, match) => applyMatchRatings(ratings, match, options), {});
  }

  function seasonSummary(tournaments = [], seasonId) {
    const selected = tournaments.filter((tournament) => !seasonId || tournament.seasonId === seasonId);
    return { seasonId: seasonId ?? null, tournaments: selected.length, matches: selected.reduce((sum, tournament) => sum + Number(tournament.matches ?? 0), 0), points: selected.reduce((sum, tournament) => sum + Number(tournament.points ?? 0), 0) };
  }

  function assistantFindings(state) {
    const findings = [];
    const active = state?.players?.filter((player) => player.active && player.availability !== "away") ?? [];
    if (active.length < 2) findings.push({ code: "too_few_players", severity: "error" });
    if (!(state?.courts ?? []).some((court) => court.active)) findings.push({ code: "no_active_court", severity: "error" });
    if (state?.status === "Klar" && state?.settings?.format === "cup" && (state.cupTeams?.length ?? 0) < 2 && state.settings.cupTeamSetupMode === "manual") findings.push({ code: "cup_teams_missing", severity: "warning" });
    if ((state?.scoreSubmissions ?? []).some((submission) => submission.status === "conflict")) findings.push({ code: "score_conflict", severity: "warning" });
    return findings;
  }

  return { applyMatchRatings, assistantFindings, calculateRatings, expected, seasonSummary, updateRating };
})();
