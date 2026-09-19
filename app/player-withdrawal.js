(function (global) {
  "use strict";

  // Player withdrawal without a replacement (Phase 13, decided by the developer 2026-09-19):
  // the matches the player still had to play are NOT cancelled. They wait for the remaining teammate, who decides
  //   * to play alone (1 against 2), or
  //   * to give a walkover (the opponents win),
  // and the admin can decide on the teammate's behalf. If nobody is left on that side the opponents win by walkover
  // automatically; if the other side has lost a player as well the match is cancelled.
  //
  // A match that waits for that decision has state "awaitingWithdrawalDecision" (and status "blocked"), so no
  // scheduler, court queue or round advance starts it. It carries match.withdrawal = { playerId, teamIndex,
  // teammateId, absent, absentIndex, status: pending | playAlone | walkover, decidedBy, ... } so the absent
  // player can be put back or replaced later.

  const BLOCKED_STATE = "awaitingWithdrawalDecision";
  const FUTURE_STATES = ["waiting", "scheduled", "ready"];

  function allMatches(state) {
    return (state.rounds ?? []).flatMap((round) => round.matches ?? []);
  }

  function roundOf(state, match) {
    return (state.rounds ?? []).find((round) => (round.matches ?? []).includes(match));
  }

  function teamOf(match, teamIndex) {
    return teamIndex === 0 ? match.teamOne : match.teamTwo;
  }

  function teamIndexOf(match, playerId) {
    if (match.teamOne?.players?.some((player) => player.id === playerId)) return 0;
    if (match.teamTwo?.players?.some((player) => player.id === playerId)) return 1;
    return null;
  }

  function isFuture(match) {
    return FUTURE_STATES.includes(match.state) || (!match.state && ["scheduled", "ready"].includes(match.status));
  }

  function isPresent(state, playerId) {
    const player = (state.players ?? []).find((item) => item.id === playerId);
    return Boolean(player) && player.active !== false && !player.withdrawn;
  }

  // What would happen if this player withdrew? Never changes anything.
  function plan(state, playerId) {
    const player = (state.players ?? []).find((item) => item.id === playerId);
    if (!player) return { ok: false, blocked: "notFound" };
    if (state.status === "Avsluttet") return { ok: false, blocked: "ended" };
    // A Cup bracket refers to team ids and a team that plays alone gets a new one: not supported until decided (see ROADMAP).
    if (state.settings?.format === "cup") return { ok: false, blocked: "cup" };
    if (player.withdrawn || player.active === false) return { ok: false, blocked: "inactive" };
    const matches = allMatches(state).filter((match) => teamIndexOf(match, playerId) !== null);
    if (matches.some((match) => match.state === "awaitingApproval")) return { ok: false, blocked: "awaitingApproval" };
    const result = { ok: true, restart: [], decide: [], walkover: [], cancel: [], kept: [] };
    matches.forEach((match) => {
      if (["finished", "cancelled"].includes(match.state)) { result.kept.push(match.id); return; }
      if (match.state === BLOCKED_STATE) {
        result[match.withdrawal?.teamIndex === teamIndexOf(match, playerId) ? "walkover" : "cancel"].push(match.id);
        return;
      }
      if (!isFuture(match) && match.state !== "playing") return;
      const teamIndex = teamIndexOf(match, playerId);
      const teammate = teamOf(match, teamIndex).players.find((item) => item.id !== playerId);
      if (match.state === "playing") result.restart.push(match.id);
      if (!teammate || !isPresent(state, teammate.id)) result.walkover.push(match.id);
      else if (match.withdrawal && match.withdrawal.teamIndex !== teamIndex && match.withdrawal.status !== "walkover") result.cancel.push(match.id);
      else result.decide.push(match.id);
    });
    return result;
  }

  function finishWalkover(match, winnerTeamIndex, nowIso) {
    match.state = "finished";
    match.status = "completed";
    match.completedSets = [];
    match.currentSet = { teamOne: 0, teamTwo: 0 };
    match.currentGame = { teamOne: 0, teamTwo: 0 };
    match.winnerTeamIndex = winnerTeamIndex;
    match.isWalkover = true;
    match.completedAt = nowIso;
    match.courtId = match.courtId ?? null;
  }

  // Starts a waiting match on a court that is not in use in its round (used after a decision to play on).
  function startIfCourtFree(state, match, nowIso) {
    const round = roundOf(state, match);
    const courts = state.courts ?? [];
    if (!round || courts.length === 0) return false;
    const inUse = new Set((round.matches ?? []).filter((item) => item.state === "playing").map((item) => item.courtId));
    const free = courts.find((court) => !inUse.has(court.id));
    if (!free) return false;
    match.state = "playing";
    match.status = "active";
    match.courtId = free.id ?? null;
    match.courtName = free.name ?? null;
    match.startedAtCourt = nowIso;
    return true;
  }

  // Marks the player as withdrawn and puts every unplayed / running match of theirs in the right state.
  // Returns { ok, decide, walkover, cancel, restarted, freed } where `freed` are courts released by restarted matches.
  function withdraw(state, playerId, { createTeam, nowIso = new Date().toISOString(), restartMatch } = {}) {
    const checked = plan(state, playerId);
    if (!checked.ok) return checked;
    const player = state.players.find((item) => item.id === playerId);
    player.slotId = player.slotId ?? player.id;
    player.withdrawn = true;
    player.withdrawnAt = nowIso;
    player.active = false;
    player.availability = "away";
    const result = { ok: true, decide: [], walkover: [], cancel: [], restarted: [], freed: [] };
    allMatches(state).forEach((match) => {
      const teamIndex = teamIndexOf(match, playerId);
      if (teamIndex === null || ["finished", "cancelled"].includes(match.state)) return;
      const wasPlaying = match.state === "playing";
      const isBlocked = match.state === BLOCKED_STATE;
      if (!wasPlaying && !isFuture(match) && !isBlocked) return;
      const team = teamOf(match, teamIndex);
      const teammate = team.players.find((item) => item.id !== playerId);
      const record = {
        playerId,
        teamIndex,
        teammateId: teammate?.id ?? null,
        absent: { id: player.id, name: player.name, accent: player.accent ?? null },
        absentIndex: team.players.findIndex((item) => item.id === playerId),
        status: "pending",
        at: nowIso,
      };
      if (wasPlaying) {
        // the running match is annulled (same rule as a replacement); its court goes to the next waiting match
        if (match.courtId || match.courtName) result.freed.push({ courtId: match.courtId ?? null, courtName: match.courtName ?? null });
        restartMatch?.(match, nowIso);
        match.courtId = null;
        match.courtName = null;
        result.restarted.push(match.id);
      }
      const otherSideAbsent = match.withdrawal && match.withdrawal.teamIndex !== teamIndex && match.withdrawal.status !== "walkover";
      if (otherSideAbsent) {
        match.withdrawal = { ...match.withdrawal, bothSides: true, secondAbsent: record.absent };
        match.state = "cancelled";
        match.status = "cancelled";
        result.cancel.push(match.id);
      } else if (!teammate || !isPresent(state, teammate.id)) {
        match.withdrawal = { ...record, status: "walkover", decidedBy: "auto", decidedAt: nowIso };
        finishWalkover(match, 1 - teamIndex, nowIso);
        result.walkover.push(match.id);
      } else {
        match.withdrawal = record;
        match.state = BLOCKED_STATE;
        match.status = "blocked";
        result.decide.push(match.id);
      }
    });
    return result;
  }

  // The remaining teammate (or the admin for them) decides. `decision` is "playAlone" or "walkover".
  function decide(state, matchId, decision, { createTeam, by = "teammate", nowIso = new Date().toISOString() } = {}) {
    const match = allMatches(state).find((item) => item.id === matchId);
    if (!match || match.state !== BLOCKED_STATE || match.withdrawal?.status !== "pending") return { ok: false, error: "notPending" };
    if (!["playAlone", "walkover"].includes(decision)) return { ok: false, error: "invalid" };
    const record = match.withdrawal;
    if (decision === "walkover") {
      match.withdrawal = { ...record, status: "walkover", decidedBy: by, decidedAt: nowIso };
      finishWalkover(match, 1 - record.teamIndex, nowIso);
      return { ok: true, decision, started: false };
    }
    const team = teamOf(match, record.teamIndex);
    const remaining = createTeam(team.players.filter((player) => player.id !== record.playerId));
    if (record.teamIndex === 0) match.teamOne = remaining; else match.teamTwo = remaining;
    match.withdrawal = { ...record, status: "playAlone", decidedBy: by, decidedAt: nowIso };
    match.state = "waiting";
    match.status = "scheduled";
    const started = startIfCourtFree(state, match, nowIso);
    return { ok: true, decision, started };
  }

  // Puts `incoming` (the original player or a replacement) in the absent player's place in every match that has
  // not been played, and lets those matches be played normally again.
  function restoreForSlot(state, absentPlayerId, incoming, { createTeam }) {
    const restored = [];
    allMatches(state).forEach((match) => {
      const record = match.withdrawal;
      if (!record || record.playerId !== absentPlayerId || record.status === "walkover" || record.bothSides) return;
      if (!(match.state === BLOCKED_STATE || (record.status === "playAlone" && isFuture(match)))) return;
      const team = teamOf(match, record.teamIndex);
      const players = team.players.filter((player) => player.id !== absentPlayerId);
      const index = Math.min(Math.max(record.absentIndex ?? players.length, 0), players.length);
      players.splice(index, 0, incoming);
      const rebuilt = createTeam(players);
      if (record.teamIndex === 0) match.teamOne = rebuilt; else match.teamTwo = rebuilt;
      match.state = "waiting";
      match.status = "scheduled";
      delete match.withdrawal;
      restored.push(match.id);
    });
    return restored;
  }

  // The withdrawn player is back: unplayed matches return to normal. A match already being played alone cannot be changed.
  function reinstate(state, playerId, { createTeam }) {
    const player = (state.players ?? []).find((item) => item.id === playerId);
    if (!player || !player.withdrawn) return { ok: false, blocked: "notFound" };
    if (state.status === "Avsluttet") return { ok: false, blocked: "ended" };
    if (player.replacedBy) return { ok: false, blocked: "replaced" };
    const running = allMatches(state).find((match) => match.withdrawal?.playerId === playerId && match.state === "playing");
    if (running) return { ok: false, blocked: "matchInProgress" };
    const restored = restoreForSlot(state, playerId, player, { createTeam });
    player.withdrawn = false;
    player.active = true;
    player.availability = "available";
    delete player.withdrawnAt;
    return { ok: true, restored };
  }

  global.PadelstarPlayerWithdrawal = { BLOCKED_STATE, plan, withdraw, decide, restoreForSlot, reinstate, startIfCourtFree };
})(window);
