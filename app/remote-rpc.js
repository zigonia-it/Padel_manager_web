// Small transport seam for all Supabase RPC calls made by the browser app.
// Domain modules still own queueing and revision policy; this module owns the
// client invocation boundary so it can be instrumented or replaced in tests.
window.PadelstarRemoteRpc = (() => {
  function call(client, name, payload = {}) {
    if (!client || typeof client.rpc !== "function") {
      return Promise.resolve({ data: null, error: new Error("Remote client unavailable") });
    }
    return client.rpc(name, payload);
  }

  return { call };
})();
