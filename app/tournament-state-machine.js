window.PadelstarTournamentStateMachine = (() => {
  const tournamentStatuses = Object.freeze({ DRAFT: "draft", REGISTRATION: "registration", READY: "ready", ACTIVE: "active", PAUSED: "paused", COMPLETED: "completed", CANCELLED: "cancelled" });
  const roundStatuses = Object.freeze({ SCHEDULED: "scheduled", ACTIVE: "active", COMPLETED: "completed" });
  const matchStatuses = Object.freeze({ SCHEDULED: "scheduled", READY: "ready", ACTIVE: "active", COMPLETED: "completed", CANCELLED: "cancelled" });

  const transitions = Object.freeze({
    tournament: { draft: ["registration", "cancelled"], registration: ["ready", "cancelled"], ready: ["active", "cancelled"], active: ["paused", "completed", "cancelled"], paused: ["active", "cancelled"], completed: [], cancelled: [] },
    round: { scheduled: ["active"], active: ["completed"], completed: [] },
    match: { scheduled: ["ready", "cancelled"], ready: ["active", "cancelled"], active: ["completed", "cancelled"], completed: ["ready"], cancelled: ["ready"] },
  });

  function canTransition(kind, from, to) {
    return from === to || Boolean(transitions[kind]?.[from]?.includes(to));
  }

  function transition(kind, entity, nextStatus) {
    if (!entity || !canTransition(kind, entity.status, nextStatus)) return false;
    entity.status = nextStatus;
    return true;
  }

  function synchronizeLegacyMatch(match) {
    if (!match) return null;
    if (!match.status) match.status = match.state === "finished" ? "completed" : match.state === "playing" ? "active" : "scheduled";
    if (!match.state) match.state = match.status === "completed" ? "finished" : match.status === "active" ? "playing" : "waiting";
    return match;
  }

  function synchronizeLegacyRound(round) {
    if (!round) return null;
    if (!round.status) round.status = round.state === "finished" ? "completed" : round.state === "active" ? "active" : "scheduled";
    if (!round.state) round.state = round.status === "completed" ? "finished" : round.status;
    round.matches?.forEach(synchronizeLegacyMatch);
    return round;
  }

  return { tournamentStatuses, roundStatuses, matchStatuses, canTransition, transition, synchronizeLegacyMatch, synchronizeLegacyRound };
})();
