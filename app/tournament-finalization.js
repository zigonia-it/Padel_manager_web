(function attachTournamentFinalization(global) {
  "use strict";

  // The server owns final statistics and deletion. A failed/uncertain request
  // leaves the active snapshot intact so the same finalization can be retried.
  function create({ getState, isShared, isOnline, flushWrites, call, commit, reportError, getIntent = () => null, saveIntent = () => {}, clearIntent = () => {} }) {
    let pending = null;

    async function run(outcome) {
      const original = getState();
      const id = original.id;
      if (!["completed", "cancelled"].includes(outcome)) throw new Error("Invalid finalization outcome");
      try {
        if (isShared(original)) {
          if (!isOnline()) throw new Error("Connection required to save player statistics");
          let intent = getIntent(id);
          if (!intent) {
            if (!await flushWrites(id)) throw new Error("Pending results could not be saved");
            const current = getState();
            if (current.id !== id) throw new Error("Active tournament changed");
            intent = { id, revision: current.revision, outcome };
            // Persist before dispatch. After a lost response the server may
            // already have deleted this tournament; saving it again would fail.
            await saveIntent(intent);
          }
          const current = getState();
          if (current.id !== id || intent.id !== id) throw new Error("Active tournament changed");
          const { data, error } = await call("finalize_tournament", {
            p_tournament_id: id,
            p_admin_token: current.adminToken,
            p_expected_revision: intent.revision,
            p_outcome: intent.outcome,
          });
          if (error) throw error;
          if (!data || data.id !== id || data.statisticsSaved !== true
            || !["completed", "cancelled"].includes(data.outcome)
            || typeof data.deleted !== "boolean") {
            throw new Error("Finalization was not confirmed");
          }
          // Do not let a delayed response replace a different tournament.
          if (getState().id !== id) throw new Error("Active tournament changed");
          await commit(data);
          await clearIntent(id);
          return true;
        }

        const state = structuredClone(original);
        state.status = "Avsluttet";
        state.lifecycleStatus = outcome;
        state.endedAt = new Date().toISOString();
        for (const round of state.rounds ?? []) {
          round.status = "completed";
          for (const match of round.matches ?? []) {
            if (match.state !== "finished") {
              match.state = "cancelled";
              match.status = "cancelled";
            }
          }
        }
        await commit({ id, outcome, deleted: !state.ownerUserId, statisticsSaved: false, localOnly: true, state });
        return true;
      } catch (error) {
        reportError(error);
        return false;
      }
    }

    function finalize(outcome = "completed") {
      if (pending) return pending;
      pending = run(outcome).finally(() => { pending = null; });
      return pending;
    }

    return { finalize, isPending: () => pending !== null };
  }

  global.PadelstarTournamentFinalization = { create };
})(window);
