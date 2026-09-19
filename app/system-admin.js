// The system owner's administration page (admin.html) and the menu link that only the owner sees (Phase 23).
// Nothing here grants access: the server decides (is_system_owner / admin_overview check auth.uid()). The page loads
// no administration data before the server has confirmed the owner, and sends everyone else back Home with a message.
(function (global) {
  const TEXT = {
    nb: {
      title: "Systemadministrasjon", checking: "Sjekker tilgang …", signIn: "Logg inn for å åpne systemadministrasjonen.", denied: "Du har ikke tilgang til systemadministrasjonen.",
      failed: "Kunne ikke hente data. Prøv igjen.", back: "Til forsiden", overview: "Oversikt", generated: "Hentet {time}", recent: "Siste turneringer",
      tournaments: "Turneringer", running: "Pågår", finished: "Avsluttet", expired: "Utløpt", accountOwned: "Med konto", profiles: "Profiler",
      colName: "Navn", colStatus: "Status", colPlayers: "Spillere", colOwner: "Konto", colCreated: "Opprettet", yes: "Ja", no: "Nei", none: "Ingen turneringer.",
    },
    en: {
      title: "System administration", checking: "Checking access …", signIn: "Sign in to open system administration.", denied: "You do not have access to system administration.",
      failed: "Could not load the data. Try again.", back: "Back to the start page", overview: "Overview", generated: "Loaded {time}", recent: "Latest tournaments",
      tournaments: "Tournaments", running: "Running", finished: "Finished", expired: "Expired", accountOwned: "With account", profiles: "Profiles",
      colName: "Name", colStatus: "Status", colPlayers: "Players", colOwner: "Account", colCreated: "Created", yes: "Yes", no: "No", none: "No tournaments.",
    },
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // The one decision the page makes about access: what to do given what the server said.
  function decideAccess({ session, isOwner, error } = {}) {
    if (!session) return "signIn";
    if (error || isOwner !== true) return "denied";
    return "ok";
  }

  function renderOverview(overview, t, locale = "nb-NO") {
    const counts = overview?.counts ?? {};
    const cards = ["tournaments", "running", "finished", "expired", "accountOwned", "profiles"]
      .map((key) => `<div class="system-admin-stat"><span>${escapeHtml(t[key])}</span><strong>${escapeHtml(counts[key] ?? 0)}</strong></div>`).join("");
    const date = (value) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" }); };
    const rows = (overview?.recentTournaments ?? []).map((row) => `<tr><td>${escapeHtml(row.name || "—")}</td><td>${escapeHtml(row.status || "")}</td><td>${escapeHtml(row.players ?? 0)}</td><td>${escapeHtml(row.account_owned ? t.yes : t.no)}</td><td>${escapeHtml(date(row.created_at))}</td></tr>`).join("");
    const table = rows
      ? `<div class="system-admin-table-wrap"><table class="system-admin-table"><thead><tr><th>${escapeHtml(t.colName)}</th><th>${escapeHtml(t.colStatus)}</th><th>${escapeHtml(t.colPlayers)}</th><th>${escapeHtml(t.colOwner)}</th><th>${escapeHtml(t.colCreated)}</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : `<p class="hint">${escapeHtml(t.none)}</p>`;
    return `<h2>${escapeHtml(t.overview)}</h2><div class="system-admin-stats">${cards}</div><h2>${escapeHtml(t.recent)}</h2>${table}<p class="hint">${escapeHtml(t.generated.replace("{time}", date(overview?.generatedAt)))}</p>`;
  }

  function createClient(settings) {
    if (!settings?.url || !settings?.anonKey || !global.supabase?.createClient) return null;
    return global.supabase.createClient(settings.url, settings.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  }

  // admin.html
  async function runPage({ document, client, language = "nb", redirect = (url) => global.location.assign(url), delay = 2200 } = {}) {
    const t = TEXT[language] ?? TEXT.nb;
    const status = document.querySelector("#systemAdminStatus");
    const content = document.querySelector("#systemAdminContent");
    const toast = document.querySelector("#systemAdminToast");
    const setStatus = (message) => { if (status) status.textContent = message; };
    document.querySelectorAll("[data-admin-i18n]").forEach((node) => { if (t[node.dataset.adminI18n]) node.textContent = t[node.dataset.adminI18n]; });
    document.documentElement.lang = language === "nb" ? "no" : language;

    const deny = (kind) => {
      setStatus(t[kind]);
      if (toast) { toast.textContent = t[kind]; toast.classList.add("is-visible"); }
      global.setTimeout?.(() => redirect(kind === "signIn" ? "index.html?view=account" : "index.html"), delay);
      return kind;
    };
    if (!client) return deny("denied");
    let session = null;
    try { session = (await client.auth.getSession()).data?.session ?? null; } catch { session = null; }
    if (!session) return deny("signIn");
    let isOwner = null;
    let error = null;
    try { ({ data: isOwner, error } = await client.rpc("is_system_owner")); } catch (caught) { error = caught; }
    const decision = decideAccess({ session, isOwner, error });
    if (decision !== "ok") return deny(decision);

    // Authorized: only now is any administration data requested.
    try {
      const { data, error: loadError } = await client.rpc("admin_overview");
      if (loadError || !data) { setStatus(t.failed); return "failed"; }
      setStatus("");
      content.innerHTML = renderOverview(data, t, language === "nb" ? "nb-NO" : "en-GB");
      content.hidden = false;
      return "ok";
    } catch { setStatus(t.failed); return "failed"; }
  }

  // index.html: show the menu link only to the system owner (the server answers; a failure just keeps it hidden).
  function createLink({ document, getClient }) {
    const link = document.querySelector("#systemAdminLink");
    let checkedFor = null;
    async function refresh(user) {
      if (!link) return false;
      if (!user?.id) { checkedFor = null; link.classList.add("hidden"); return false; }
      if (checkedFor?.id === user.id) return checkedFor.owner;
      let owner = false;
      try {
        const client = getClient();
        const { data, error } = client ? await client.rpc("is_system_owner") : { data: false, error: null };
        owner = !error && data === true;
      } catch { owner = false; }
      checkedFor = { id: user.id, owner };
      link.classList.toggle("hidden", !owner);
      return owner;
    }
    return { refresh };
  }

  global.PadelstarSystemAdmin = { TEXT, decideAccess, renderOverview, runPage, createLink, createClient, escapeHtml };

  if (global.document?.querySelector?.("#systemAdminContent")) {
    const start = () => {
      const settings = global.PadelstarSupabaseConfig?.create({ document: global.document, window: global });
      void runPage({ document: global.document, client: createClient(settings), language: global.PadelstarPageLanguage?.resolve({ supported: ["nb", "en"] }) ?? "nb" });
    };
    if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", start); else start();
  }
})(window);
