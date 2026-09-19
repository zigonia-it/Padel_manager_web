(function (global) {
  "use strict";

  // Player replacement rules (Phase 13, approved spec FASE K):
  //   * a replacement takes over the structural SLOT of the player it replaces (slotId), the person is a new player
  //     with their own statistics starting at 0; the replaced player keeps everything they played;
  //   * finished (and cancelled) matches keep the actual player who played them;
  //   * matches that have not started follow the slot: the replacement plays them;
  //   * a match in progress is restarted 0-0 (the ongoing score is annulled) - the caller shows a warning first;
  //   * a result that awaits approval (draft, pending or flagged) blocks the replacement until it is resolved;
  //   * the original player can be put back, which is another replacement in the opposite direction;
  //   * the same person can never fill two active slots.

  const FUTURE_STATES = ["waiting", "scheduled", "ready"];

  function allMatches(state) {
    return (state.rounds ?? []).flatMap((round) => round.matches ?? []);
  }

  function includes(match, playerId) {
    return [match.teamOne, match.teamTwo].some((team) => (team?.players ?? []).some((player) => player.id === playerId));
  }

  function isFuture(match) {
    return FUTURE_STATES.includes(match.state) || (!match.state && ["scheduled", "ready"].includes(match.status));
  }

  // What would happen if this player were swapped out? Never changes anything.
  function plan(state, playerId) {
    const player = (state.players ?? []).find((item) => item.id === playerId);
    if (!player) return { ok: false, blocked: "notFound" };
    if (state.status === "Avsluttet") return { ok: false, blocked: "ended" };
    const matches = allMatches(state).filter((match) => includes(match, playerId));
    if (matches.some((match) => match.state === "awaitingApproval")) return { ok: false, blocked: "awaitingApproval" };
    return {
      ok: true,
      restart: matches.filter((match) => match.state === "playing").map((match) => match.id),
      future: matches.filter(isFuture).map((match) => match.id),
      kept: matches.filter((match) => ["finished", "cancelled"].includes(match.state)).map((match) => match.id),
    };
  }

  // A running match starts again from 0-0: the ongoing score, undo history, scorer role and clock are dropped.
  function restartMatch(match, nowIso) {
    match.currentGame = { teamOne: 0, teamTwo: 0 };
    match.currentSet = { teamOne: 0, teamTwo: 0 };
    match.completedSets = [];
    match.inTiebreak = false;
    match.undoStack = [];
    match.redoStack = [];
    for (const field of ["decidingGame", "scorer", "scorerRequest", "startedAt", "rules", "endReason", "timeWinnerTeamIndex", "approval"]) delete match[field];
    match.restartedAt = nowIso;
    match.restartCount = (match.restartCount ?? 0) + 1;
    match.restartReason = "playerReplaced";
  }

  function swapInTeam(team, outgoingId, incoming, createTeam) {
    return createTeam((team?.players ?? []).map((player) => (player.id === outgoingId ? incoming : player)));
  }

  // Moves the slot from `outgoing` to `incoming` in every match that has not been played, restarts running matches.
  function transfer(state, outgoing, incoming, createTeam, nowIso) {
    const restarted = [];
    const changed = [];
    allMatches(state).forEach((match) => {
      if (!includes(match, outgoing.id)) return;
      if (!isFuture(match) && match.state !== "playing") return;
      if (match.teamOne?.players.some((player) => player.id === outgoing.id)) match.teamOne = swapInTeam(match.teamOne, outgoing.id, incoming, createTeam);
      if (match.teamTwo?.players.some((player) => player.id === outgoing.id)) match.teamTwo = swapInTeam(match.teamTwo, outgoing.id, incoming, createTeam);
      changed.push(match.id);
      if (match.state === "playing") {
        restartMatch(match, nowIso);
        restarted.push(match.id);
      }
    });
    state.cupTeams = (state.cupTeams ?? []).map((team) => swapInTeam(team, outgoing.id, incoming, createTeam));
    return { changed, restarted };
  }

  // Replaces `playerId` by `replacement` (a new player object). `nameTaken(name)` tells if a person is already in.
  function replace(state, playerId, replacement, { createTeam, nameTaken = () => false, nowIso = new Date().toISOString() }) {
    const outgoing = (state.players ?? []).find((item) => item.id === playerId);
    const checked = plan(state, playerId);
    if (!checked.ok) return checked;
    if (!outgoing.active && outgoing.active !== undefined && !outgoing.withdrawn) return { ok: false, blocked: "inactive" };
    if (outgoing.replacedBy) return { ok: false, blocked: "inactive" };
    if (nameTaken(replacement.name)) return { ok: false, blocked: "duplicate" };
    outgoing.slotId = outgoing.slotId ?? outgoing.id;
    replacement.slotId = outgoing.slotId;
    replacement.replacedPlayerId = outgoing.id;
    replacement.joinedFrom = replacement.joinedFrom ?? "admin-replacement";
    outgoing.active = false;
    outgoing.availability = "away";
    outgoing.replacedBy = replacement.id;
    state.players.push(replacement);
    const moved = transfer(state, outgoing, replacement, createTeam, nowIso);
    // matches that were waiting for the teammate's decision (or being played alone) get the replacement as partner
    const resolved = global.PadelstarPlayerWithdrawal?.restoreForSlot(state, outgoing.id, replacement, { createTeam }) ?? [];
    return { ok: true, replacement, ...moved, resolvedWithdrawals: resolved };
  }

  // Puts the original player back in the slot they lost to `replacementId`.
  function restore(state, replacementId, { createTeam, nameTaken = () => false, nowIso = new Date().toISOString() }) {
    const replacement = (state.players ?? []).find((item) => item.id === replacementId);
    const original = (state.players ?? []).find((item) => item.id === replacement?.replacedPlayerId);
    if (!replacement || !original) return { ok: false, blocked: "notFound" };
    if (original.replacedBy !== replacement.id) return { ok: false, blocked: "notFound" };
    const checked = plan(state, replacementId);
    if (!checked.ok) return checked;
    if ((state.players ?? []).some((player) => player.id !== original.id && player.active !== false && nameTaken(original.name, player))) return { ok: false, blocked: "duplicate" };
    original.active = true;
    original.availability = "available";
    original.withdrawn = false;
    delete original.withdrawnAt;
    delete original.replacedBy;
    replacement.active = false;
    replacement.availability = "away";
    replacement.replacedBy = original.id;
    replacement.replacedByRestore = true;
    const moved = transfer(state, replacement, original, createTeam, nowIso);
    return { ok: true, original, ...moved };
  }

  global.PadelstarPlayerReplacement = { plan, replace, restore, isFuture, restartMatch };
})(window);
