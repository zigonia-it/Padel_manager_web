(function (global) {
  "use strict";

  function create(deps) {
    function saveRemoteState() {
      const state = deps.getState();
      if (!deps.isSupabaseReady() || !state.adminToken || !state.id) return Promise.resolve(false);
      if (!deps.isOnline()) {
        deps.syncConnectionStatus();
        return Promise.resolve(false);
      }

      const requestSequence = deps.getMutationSequence();
      const expectedRevision = state.revision;
      return deps.remoteRpc(deps.getSupabaseClient(), "save_tournament_state", {
        p_tournament_id: state.id,
        p_admin_token: state.adminToken,
        p_state: deps.sanitizeSharedState(state),
        p_expected_revision: expectedRevision,
      }).then(({ data, error }) => {
        if (error) {
          console.warn("Supabase sync failed", error);
          if (deps.isConflictError(error) && requestSequence === deps.getMutationSequence()) {
            deps.setRemoteConflict();
          } else {
            deps.handleRemoteError(error, deps.t("messages.syncFailed"));
          }
          return false;
        }
        if (!data) return false;

        deps.setLastPersistedSequence(requestSequence);
        if (requestSequence === deps.getMutationSequence()) {
          deps.resetRemoteRetry();
          deps.setPendingAdminSync(false);
          deps.persistSyncMetadata();
          deps.applyRemoteState(data, { source: "rpc", clearConflict: true });
        } else if (state.id === data.id && Number.isInteger(data.revision)) {
          deps.saveLocalRevision(data.revision);
        }
        return true;
      }).catch((error) => {
        console.warn("Supabase sync failed", error);
        deps.handleRemoteError(error, deps.t("messages.syncFailed"));
        return false;
      });
    }

    return { saveRemoteState };
  }

  global.PadelstarRemoteStateWrite = { create };
})(window);
