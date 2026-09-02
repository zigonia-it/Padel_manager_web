window.PadelstarScoreSubmissions = (() => {
  function scoreKey(teamOne, teamTwo) {
    return `${teamOne}-${teamTwo}`;
  }

  function createSubmission({ matchId, teamOne, teamTwo, submittedBy, submittedAt = new Date().toISOString(), id = crypto.randomUUID() }) {
    if (!matchId || !Number.isInteger(teamOne) || !Number.isInteger(teamTwo) || !submittedBy) return null;
    return { id, matchId, teamOne, teamTwo, submittedBy, submittedAt, status: "pending" };
  }

  function evaluate(submissions = []) {
    const valid = submissions.filter(Boolean);
    if (!valid.length) return { status: "none", submissions: [] };
    const keys = new Set(valid.map((submission) => scoreKey(submission.teamOne, submission.teamTwo)));
    if (keys.size > 1) return { status: "conflict", submissions: valid };
    return { status: valid.length > 1 ? "confirmed" : "pending", submissions: valid };
  }

  function add(state, submission) {
    if (!submission) return { status: "none", submissions: [] };
    state.scoreSubmissions = Array.isArray(state.scoreSubmissions) ? state.scoreSubmissions : [];
    const matchSubmissions = state.scoreSubmissions.filter((item) => item.matchId === submission.matchId);
    if (matchSubmissions.some((item) => item.submittedBy === submission.submittedBy && item.status !== "rejected")) return syncMatchStatus(state, submission.matchId, evaluate(matchSubmissions));
    state.scoreSubmissions.push(submission);
    return syncMatchStatus(state, submission.matchId, evaluate([...matchSubmissions, submission]));
  }

  function syncMatchStatus(state, matchId, result) {
    const match = (state.rounds ?? []).flatMap((round) => round.matches ?? []).find((item) => item.id === matchId);
    if (match) match.scoreStatus = result.status === "conflict" ? "score_conflict" : result.status;
    return result;
  }

  function resolve(state, matchId, teamOne, teamTwo, resolvedBy) {
    if (!resolvedBy || !matchId || !Number.isInteger(teamOne) || !Number.isInteger(teamTwo)) return null;
    state.scoreSubmissions = Array.isArray(state.scoreSubmissions) ? state.scoreSubmissions : [];
    const related = state.scoreSubmissions.filter((item) => item.matchId === matchId);
    related.forEach((submission) => { submission.status = "rejected"; });
    const resolution = createSubmission({ matchId, teamOne, teamTwo, submittedBy: resolvedBy, id: crypto.randomUUID() });
    resolution.status = "resolved";
    resolution.resolvedBy = resolvedBy;
    state.scoreSubmissions.push(resolution);
    syncMatchStatus(state, matchId, { status: "resolved" });
    return resolution;
  }

  function forMatch(state, matchId) {
    return evaluate((state.scoreSubmissions ?? []).filter((submission) => submission.matchId === matchId && submission.status !== "rejected"));
  }

  return { add, createSubmission, evaluate, forMatch, resolve };
})();
