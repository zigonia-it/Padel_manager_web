window.PadelstarRealtime = (() => {
  const reconnectBackoffMs = [1000, 2000, 5000, 10000, 30000];
  const retryStatuses = new Set(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]);

  function channelName(tournamentId) {
    return `tournament:${tournamentId}`;
  }

  function backoffForAttempt(attempt) {
    const index = Math.min(Math.max(Number(attempt) || 0, 0), reconnectBackoffMs.length - 1);
    return reconnectBackoffMs[index];
  }

  function connectionStateForAttempt(attempt) {
    return attempt > 0 ? "reconnecting" : "connecting";
  }

  function shouldReconnect(status) {
    return retryStatuses.has(status);
  }

  function isSubscribed(status) {
    return status === "SUBSCRIBED";
  }

  return {
    backoffForAttempt,
    channelName,
    connectionStateForAttempt,
    isSubscribed,
    shouldReconnect,
  };
})();
