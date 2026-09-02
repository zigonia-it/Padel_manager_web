window.PadelstarTournamentEvents = (() => {
  function create({ getActor = () => null, getState, now = () => new Date().toISOString(), randomUUID = () => crypto.randomUUID() }) {
    function record(eventType, entityType, entityId, payload = {}, inverse = null) {
      const state = getState();
      state.events = Array.isArray(state.events) ? state.events : [];
      const event = {
        id: randomUUID(),
        tournamentId: state.id ?? null,
        eventType,
        entityType,
        entityId: entityId ?? null,
        actorId: getActor(),
        payload: structuredClone(payload),
        inverse: inverse == null ? null : structuredClone(inverse),
        createdAt: now(),
      };
      state.events.push(event);
      if (state.events.length > 200) state.events.splice(0, state.events.length - 200);
      return event;
    }

    function recent(limit = 20) {
      return [...(getState().events ?? [])].slice(-limit).reverse();
    }

    function markUndone(eventId) {
      const event = (getState().events ?? []).find((item) => item.id === eventId);
      if (!event || event.undoneAt) return null;
      event.undoneAt = now();
      return event;
    }

    return { markUndone, recent, record };
  }

  return { create };
})();
