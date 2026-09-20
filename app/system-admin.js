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
      tabsLabel: "Administrasjon", tabOverview: "Oversikt", tabTournaments: "Turneringer", tabUsers: "Brukere", tabMaintenance: "Vedlikehold",
      searchTournaments: "Søk på turneringsnavn", searchUsers: "Søk på e-post", search: "Søk", filterAll: "Alle", filterRunning: "Pågår", filterFinished: "Avsluttet", filterExpired: "Utløpt",
      colRounds: "Runder", colFormat: "Format", colUpdated: "Sist endret", colEmail: "E-post", colConfirmed: "Bekreftet", colLastSignIn: "Sist innlogget", colOwned: "Eier", colPlayed: "Deltatt", colFinished: "Fullført",
      owner: "Systemeier", never: "Aldri", loading: "Laster …", noUsers: "Ingen brukere funnet.", noResults: "Ingen treff.", showing: "Viser {from}–{to} av {total}", previous: "Forrige", next: "Neste", refresh: "Oppdater",
      jobs: "Planlagte oppgaver", jobName: "Oppgave", jobSchedule: "Tidsplan", jobActive: "Aktiv", jobLastRun: "Siste kjøring", jobNever: "Ikke kjørt ennå", jobsNone: "Ingen planlagte oppgaver funnet.",
      waiting: "Venter på opprydding", waitExpired: "Utløpte turneringer", waitExpiredDue: "Utløpt over 7 dager (slettes)", waitFinishedDue: "Ferdige, oppbevaring over", waitIdle: "Inaktive over 30 dager", waitProfiles: "Profiler med utløpt slettefrist",
      format_roundRobin: "Round Robin", format_cup: "Cup", unconfirmed: "Ikke bekreftet",
    },
    en: {
      title: "System administration", checking: "Checking access …", signIn: "Sign in to open system administration.", denied: "You do not have access to system administration.",
      failed: "Could not load the data. Try again.", back: "Back to the start page", overview: "Overview", generated: "Loaded {time}", recent: "Latest tournaments",
      tournaments: "Tournaments", running: "Running", finished: "Finished", expired: "Expired", accountOwned: "With account", profiles: "Profiles",
      colName: "Name", colStatus: "Status", colPlayers: "Players", colOwner: "Account", colCreated: "Created", yes: "Yes", no: "No", none: "No tournaments.",
      tabsLabel: "Administration", tabOverview: "Overview", tabTournaments: "Tournaments", tabUsers: "Users", tabMaintenance: "Maintenance",
      searchTournaments: "Search tournament name", searchUsers: "Search e-mail", search: "Search", filterAll: "All", filterRunning: "Running", filterFinished: "Finished", filterExpired: "Expired",
      colRounds: "Rounds", colFormat: "Format", colUpdated: "Last changed", colEmail: "E-mail", colConfirmed: "Confirmed", colLastSignIn: "Last sign-in", colOwned: "Owned", colPlayed: "Played", colFinished: "Finished",
      owner: "System owner", never: "Never", loading: "Loading …", noUsers: "No users found.", noResults: "No results.", showing: "Showing {from}–{to} of {total}", previous: "Previous", next: "Next", refresh: "Refresh",
      jobs: "Scheduled jobs", jobName: "Job", jobSchedule: "Schedule", jobActive: "Active", jobLastRun: "Last run", jobNever: "Not run yet", jobsNone: "No scheduled jobs found.",
      waiting: "Waiting for cleanup", waitExpired: "Expired tournaments", waitExpiredDue: "Expired over 7 days (deleted)", waitFinishedDue: "Finished, retention over", waitIdle: "Idle over 30 days", waitProfiles: "Profiles past their deletion date",
      format_roundRobin: "Round Robin", format_cup: "Cup", unconfirmed: "Not confirmed",
    },
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // The one decision the page makes about access: what to do given what the server said.
  function decideAccess({ session, isOwner, error } = {}) {
    if (!session) return "signIn";
    if (error || isOwner !== true) return "denied";
    return "ok";
  }

  const formatDate = (value, locale) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" }); };

  // A table whose rows turn into stacked cards on a phone (each cell carries its own label), so nothing runs off the screen.
  function table(columns, rows) {
    const head = columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("");
    const body = rows.map((cells) => `<tr>${cells.map((cell, index) => `<td data-label="${escapeHtml(columns[index])}">${cell}</td>`).join("")}</tr>`).join("");
    return `<div class="system-admin-table-wrap"><table class="system-admin-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function renderOverview(overview, t, locale = "nb-NO") {
    const counts = overview?.counts ?? {};
    const cards = ["tournaments", "running", "finished", "expired", "accountOwned", "profiles"]
      .map((key) => `<div class="system-admin-stat"><span>${escapeHtml(t[key])}</span><strong>${escapeHtml(counts[key] ?? 0)}</strong></div>`).join("");
    const rows = (overview?.recentTournaments ?? []).map((row) => [escapeHtml(row.name || "—"), escapeHtml(row.status || ""), escapeHtml(row.players ?? 0), escapeHtml(row.account_owned ? t.yes : t.no), escapeHtml(formatDate(row.created_at, locale))]);
    const list = rows.length
      ? table([t.colName, t.colStatus, t.colPlayers, t.colOwner, t.colCreated], rows)
      : `<p class="hint">${escapeHtml(t.none)}</p>`;
    return `<h2>${escapeHtml(t.overview)}</h2><div class="system-admin-stats">${cards}</div><h2>${escapeHtml(t.recent)}</h2>${list}<p class="hint">${escapeHtml(t.generated.replace("{time}", formatDate(overview?.generatedAt, locale)))}</p>`;
  }

  function renderPager(data, t) {
    const total = Number(data?.total ?? 0);
    if (total === 0) return "";
    const offset = Number(data?.offset ?? 0);
    const limit = Number(data?.limit ?? 25);
    const from = offset + 1;
    const to = Math.min(total, offset + limit);
    const label = t.showing.replace("{from}", from).replace("{to}", to).replace("{total}", total);
    return `<div class="system-admin-pager"><span>${escapeHtml(label)}</span><span class="system-admin-pager-buttons">`
      + `<button class="secondary" type="button" data-page="previous"${offset <= 0 ? " disabled" : ""}>${escapeHtml(t.previous)}</button>`
      + `<button class="secondary" type="button" data-page="next"${offset + limit >= total ? " disabled" : ""}>${escapeHtml(t.next)}</button></span></div>`;
  }

  function renderTournamentList(data, t, locale = "nb-NO") {
    const rows = (data?.rows ?? []).map((row) => [
      escapeHtml(row.name || "—"),
      escapeHtml(row.status || ""),
      escapeHtml(t[`format_${row.format}`] ?? row.format ?? ""),
      escapeHtml(row.players ?? 0),
      escapeHtml(row.rounds ?? 0),
      escapeHtml(row.account_owned ? t.yes : t.no),
      escapeHtml(formatDate(row.created_at, locale)),
      escapeHtml(formatDate(row.updated_at, locale)),
    ]);
    if (!rows.length) return `<p class="hint">${escapeHtml(t.noResults)}</p>`;
    return table([t.colName, t.colStatus, t.colFormat, t.colPlayers, t.colRounds, t.colOwner, t.colCreated, t.colUpdated], rows) + renderPager(data, t);
  }

  function renderUserList(data, t, locale = "nb-NO") {
    const rows = (data?.rows ?? []).map((row) => [
      `${escapeHtml(row.email || "—")}${row.is_system_owner ? ` <span class="system-admin-badge">${escapeHtml(t.owner)}</span>` : ""}`,
      escapeHtml(row.email_confirmed ? t.yes : t.unconfirmed),
      escapeHtml(formatDate(row.created_at, locale)),
      escapeHtml(row.last_sign_in_at ? formatDate(row.last_sign_in_at, locale) : t.never),
      escapeHtml(row.owned_tournaments ?? 0),
      escapeHtml(row.played_tournaments ?? 0),
      escapeHtml(row.finished_tournaments ?? 0),
    ]);
    if (!rows.length) return `<p class="hint">${escapeHtml(t.noUsers)}</p>`;
    return table([t.colEmail, t.colConfirmed, t.colCreated, t.colLastSignIn, t.colOwned, t.colPlayed, t.colFinished], rows) + renderPager(data, t);
  }

  function renderMaintenance(data, t, locale = "nb-NO") {
    const jobs = (data?.jobs ?? []).map((job) => [
      escapeHtml(job.name || ""),
      escapeHtml(job.schedule || ""),
      escapeHtml(job.active ? t.yes : t.no),
      escapeHtml(job.lastRun ? `${job.lastRun.status ?? ""} · ${formatDate(job.lastRun.startedAt, locale)}` : t.jobNever),
    ]);
    const waiting = data?.waiting ?? {};
    const cards = [["waitExpired", "expired"], ["waitExpiredDue", "expiredDeletionDue"], ["waitFinishedDue", "finishedRetentionDue"], ["waitIdle", "idleOver30Days"], ["waitProfiles", "profileDeletionDue"]]
      .map(([label, key]) => `<div class="system-admin-stat"><span>${escapeHtml(t[label])}</span><strong>${escapeHtml(waiting[key] ?? 0)}</strong></div>`).join("");
    const list = jobs.length ? table([t.jobName, t.jobSchedule, t.jobActive, t.jobLastRun], jobs) : `<p class="hint">${escapeHtml(t.jobsNone)}</p>`;
    return `<h2>${escapeHtml(t.waiting)}</h2><div class="system-admin-stats">${cards}</div><h2>${escapeHtml(t.jobs)}</h2>${list}<p class="hint">${escapeHtml(t.generated.replace("{time}", formatDate(data?.generatedAt, locale)))}</p>`;
  }

  const TABS = ["overview", "tournaments", "users", "maintenance"];

  // The page skeleton: the tab bar and one panel per tab. Only the overview is filled in at first; the others load when opened.
  function renderShell(overview, t, locale = "nb-NO") {
    const tabLabel = { overview: t.tabOverview, tournaments: t.tabTournaments, users: t.tabUsers, maintenance: t.tabMaintenance };
    const tabs = TABS.map((tab, index) => `<button type="button" role="tab" class="system-admin-tab" id="systemAdminTab-${tab}" data-tab="${tab}" aria-controls="systemAdminPanel-${tab}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${escapeHtml(tabLabel[tab])}</button>`).join("");
    const toolbar = (kind, placeholder, withStatus) => `<form class="system-admin-toolbar" data-search-form="${kind}" role="search">`
      + `<input type="search" name="q" maxlength="80" autocomplete="off" placeholder="${escapeHtml(placeholder)}" aria-label="${escapeHtml(placeholder)}">`
      + (withStatus ? `<select name="status" aria-label="${escapeHtml(t.colStatus)}"><option value="all">${escapeHtml(t.filterAll)}</option><option value="running">${escapeHtml(t.filterRunning)}</option><option value="finished">${escapeHtml(t.filterFinished)}</option><option value="expired">${escapeHtml(t.filterExpired)}</option></select>` : "")
      + `<button class="secondary" type="submit">${escapeHtml(t.search)}</button></form>`;
    const panels = {
      overview: renderOverview(overview, t, locale),
      tournaments: `${toolbar("tournaments", t.searchTournaments, true)}<div class="system-admin-results" data-results="tournaments"></div>`,
      users: `${toolbar("users", t.searchUsers, false)}<div class="system-admin-results" data-results="users"></div>`,
      maintenance: `<div class="system-admin-results" data-results="maintenance"></div>`,
    };
    const sections = TABS.map((tab, index) => `<section class="system-admin-panel" role="tabpanel" id="systemAdminPanel-${tab}" data-panel="${tab}" aria-labelledby="systemAdminTab-${tab}"${index === 0 ? "" : " hidden"}>${panels[tab]}</section>`).join("");
    return `<div class="system-admin-tabs" role="tablist" aria-label="${escapeHtml(t.tabsLabel)}">${tabs}</div>${sections}`;
  }

  // Wires the tabs, the searches and the paging. Each list asks the server for one page at a time (25 rows).
  function bindPanels({ content, client, t, locale, limit = 25 }) {
    if (!content?.addEventListener) return null;
    const state = { tournaments: { q: "", status: "all", offset: 0 }, users: { q: "", offset: 0 }, maintenance: {} };
    const loaded = new Set(["overview"]);
    const rpcFor = {
      tournaments: () => client.rpc("admin_list_tournaments", { p_search: state.tournaments.q || null, p_status: state.tournaments.status, p_limit: limit, p_offset: state.tournaments.offset }),
      users: () => client.rpc("admin_list_users", { p_search: state.users.q || null, p_limit: limit, p_offset: state.users.offset }),
      maintenance: () => client.rpc("admin_maintenance_status"),
    };
    const renderFor = { tournaments: renderTournamentList, users: renderUserList, maintenance: renderMaintenance };

    async function load(tab) {
      const target = content.querySelector(`[data-results="${tab}"]`);
      if (!target) return;
      target.setAttribute("aria-busy", "true");
      target.innerHTML = `<p class="hint">${escapeHtml(t.loading)}</p>`;
      try {
        const { data, error } = await rpcFor[tab]();
        target.innerHTML = error || !data ? `<p class="hint" role="alert">${escapeHtml(t.failed)}</p>` : renderFor[tab](data, t, locale);
        loaded.add(tab);
      } catch { target.innerHTML = `<p class="hint" role="alert">${escapeHtml(t.failed)}</p>`; }
      target.removeAttribute("aria-busy");
    }

    function select(tab) {
      content.querySelectorAll("[data-tab]").forEach((button) => {
        const active = button.dataset.tab === tab;
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
      });
      content.querySelectorAll("[data-panel]").forEach((panel) => { panel.hidden = panel.dataset.panel !== tab; });
      if (!loaded.has(tab)) void load(tab);
    }

    content.addEventListener("click", (event) => {
      const tab = event.target.closest?.("[data-tab]");
      if (tab) { select(tab.dataset.tab); return; }
      const page = event.target.closest?.("[data-page]");
      if (page && !page.disabled) {
        const panel = page.closest("[data-panel]")?.dataset.panel;
        if (panel !== "tournaments" && panel !== "users") return;
        state[panel].offset = Math.max(0, state[panel].offset + (page.dataset.page === "next" ? limit : -limit));
        void load(panel);
      }
    });
    content.addEventListener("keydown", (event) => {
      const tab = event.target.closest?.("[data-tab]");
      if (!tab || !["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      const index = TABS.indexOf(tab.dataset.tab);
      const next = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
      event.preventDefault();
      select(TABS[next]);
      content.querySelector(`[data-tab="${TABS[next]}"]`)?.focus();
    });
    content.addEventListener("submit", (event) => {
      const form = event.target.closest?.("[data-search-form]");
      if (!form) return;
      event.preventDefault();
      const kind = form.dataset.searchForm;
      state[kind].q = String(form.elements.q.value ?? "").trim();
      if (kind === "tournaments") state.tournaments.status = form.elements.status.value;
      state[kind].offset = 0;
      void load(kind);
    });
    return { select, load };
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
      const locale = language === "nb" ? "nb-NO" : "en-GB";
      content.innerHTML = renderShell(data, t, locale);
      content.hidden = false;
      bindPanels({ content, client, t, locale });
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

  global.PadelstarSystemAdmin = { TEXT, decideAccess, renderOverview, renderShell, renderTournamentList, renderUserList, renderMaintenance, renderPager, bindPanels, runPage, createLink, createClient, escapeHtml };

  if (global.document?.querySelector?.("#systemAdminContent")) {
    const start = () => {
      const settings = global.PadelstarSupabaseConfig?.create({ document: global.document, window: global });
      void runPage({ document: global.document, client: createClient(settings), language: global.PadelstarPageLanguage?.resolve({ supported: ["nb", "en"] }) ?? "nb" });
    };
    if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", start); else start();
  }
})(window);
