(function initPadelstarRealtimeConnection(global) {
  function create({ applyRemoteState, flushPendingRemoteWrites, getClient, getInviteState, getNavigator, getState, handleRemoteError, hasActiveTournament, isReady, observability, onConnectionStateChange, realtimeSync, translate }) {
    let channel = null;
    let tournamentId = null;
    let reconnectTimer = null;
    let reconnectAttempt = 0;
    let connectionState = "disconnected";
    let connectionGeneration = 0;
    let refreshPromise = null;

    function setConnectionState(nextState) {
      connectionState = nextState;
      onConnectionStateChange(nextState);
    }

    function removeChannel() {
      global.clearTimeout(reconnectTimer);
      reconnectTimer = null;
      connectionGeneration += 1;
      if (channel) getClient()?.removeChannel(channel);
      channel = null;
      tournamentId = null;
    }

    function scheduleReconnect() {
      const state = getState();
      if (!isReady() || !state.id || !hasActiveTournament() || !getNavigator().onLine) {
        setConnectionState("disconnected");
        return;
      }
      if (reconnectTimer) return;

      if (channel) {
        const staleChannel = channel;
        channel = null;
        tournamentId = null;
        connectionGeneration += 1;
        getClient().removeChannel(staleChannel);
      }

      const backoff = realtimeSync.backoffForAttempt(reconnectAttempt);
      reconnectAttempt += 1;
      setConnectionState("reconnecting");
      reconnectTimer = global.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, backoff);
    }

    async function refresh(reason = "reconnect") {
      const state = getState();
      if (!isReady() || !state.id || !state.inviteCode || !getNavigator().onLine) return false;
      if (refreshPromise) return refreshPromise;

      const currentTournamentId = state.id;
      refreshPromise = getInviteState(state.inviteCode).then(({ data, error }) => {
        if (error || !data || data.id !== currentTournamentId) {
          if (error) handleRemoteError(error, translate("messages.fetchRemoteFailed"));
          return false;
        }
        return applyRemoteState(data, { source: "refresh", clearConflict: reason === "manual" });
      }).catch((error) => {
        handleRemoteError(error, translate("messages.fetchRemoteFailed"));
        return false;
      }).finally(() => {
        refreshPromise = null;
      });

      return refreshPromise;
    }

    function connect() {
      const state = getState();
      if (!isReady() || !state.id || !hasActiveTournament()) {
        setConnectionState("connected");
        return;
      }
      if (channel && tournamentId === state.id) return;
      removeChannel();

      const currentTournamentId = state.id;
      const generation = ++connectionGeneration;
      tournamentId = currentTournamentId;
      setConnectionState(realtimeSync.connectionStateForAttempt(reconnectAttempt));
      let currentChannel;
      currentChannel = getClient()
        .channel(realtimeSync.channelName(currentTournamentId))
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "tournaments",
            filter: `id=eq.${currentTournamentId}`,
          },
          (payload) => {
            if (generation !== connectionGeneration || currentChannel !== channel) return;
            if (payload.new?.state) {
              applyRemoteState({
                ...payload.new.state,
                revision: payload.new.revision ?? payload.new.state.revision,
              }, { source: "realtime" });
            }
          },
        );
      channel = currentChannel;
      currentChannel.subscribe((status, error) => {
        if (generation !== connectionGeneration || currentChannel !== channel) return;
        if (realtimeSync.isSubscribed(status)) {
          reconnectAttempt = 0;
          setConnectionState("connected");
          refresh("reconnect").finally(flushPendingRemoteWrites);
        } else if (realtimeSync.shouldReconnect(status)) {
          if (status !== "CLOSED") console.warn("Supabase realtime channel failed", error);
          if (error) observability?.error("realtime_error", error, { status });
          setConnectionState(status === "CLOSED" ? "disconnected" : "error");
          scheduleReconnect();
        }
      });
    }

    function handleOnline() {
      reconnectAttempt = 0;
      global.clearTimeout(reconnectTimer);
      reconnectTimer = null;
      onConnectionStateChange(connectionState);
      const state = getState();
      if (!isReady() || !state.id || !hasActiveTournament()) return;
      connect();
      flushPendingRemoteWrites();
    }

    function handleOffline() {
      removeChannel();
      setConnectionState("disconnected");
    }

    return {
      connect,
      getConnectionState: () => connectionState,
      handleOffline,
      handleOnline,
      hasChannel: () => Boolean(channel),
      refresh,
      removeChannel,
      scheduleReconnect,
      setConnectionState,
    };
  }

  global.PadelstarRealtimeConnection = { create };
})(window);
