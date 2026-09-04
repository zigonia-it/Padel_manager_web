(function attachSupabaseConfig(global) {
  function readMeta(document, name) {
    return document.querySelector(`meta[name="${name}"]`)?.content?.trim() ?? "";
  }

  function create({ document = global.document, window = global } = {}) {
    const configured = window.PADELSTAR_SUPABASE ?? window.PADEL_MANAGER_SUPABASE;
    if (configured) return configured;

    return {
      url: readMeta(document, "padelstar-supabase-url"),
      anonKey: readMeta(document, "padelstar-supabase-anon-key"),
    };
  }

  global.PadelstarSupabaseConfig = Object.freeze({ create });
}(window));
