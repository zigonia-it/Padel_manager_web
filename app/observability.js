window.PadelstarObservability = (() => {
  const maxEventsPerSession = 20;
  const recentEvents = new Map();
  let eventCount = 0;

  function normalizeError(error) {
    const message = String(error?.message ?? error ?? "unknown").slice(0, 160);
    return message.replace(/https?:\/\/\S+/gi, "[url]");
  }

  function emit(name, data = {}) {
    if (eventCount >= maxEventsPerSession) return false;
    const key = `${name}:${JSON.stringify(data)}`;
    const lastSent = recentEvents.get(key) ?? 0;
    if (Date.now() - lastSent < 60000) return false;
    recentEvents.set(key, Date.now());
    eventCount += 1;
    if (typeof window.va === "function") {
      window.va("event", {
        name: `padelstar_${name}`,
        data: Object.fromEntries(Object.entries(data).map(([field, value]) => [field, String(value).slice(0, 80)])),
      });
    }
    return true;
  }

  function error(name, caughtError, context = {}) {
    return emit(name, { ...context, message: normalizeError(caughtError) });
  }

  function installGlobalHandlers() {
    window.addEventListener("error", (event) => {
      error("client_error", event.error ?? event.message, { source: "window" });
    });
    window.addEventListener("unhandledrejection", (event) => {
      error("unhandled_rejection", event.reason, { source: "promise" });
    });
  }

  return { emit, error, installGlobalHandlers };
})();
