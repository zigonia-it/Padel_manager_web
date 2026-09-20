// The admin of a guest tournament is told when it has expired (30 days without activity) and when it will be deleted
// (7 days later), with a button to continue (Phase 16). The server decides: admin_tournament_expiry answers only to the
// tournament's admin token; any real change of the tournament reactivates it (a database trigger), so "continue" is one
// harmless change that is saved like any other.
(function (global) {
  function create({ document, getState, getClient, isShared, remoteRpc, resume, t, getLocale = () => document.documentElement?.lang || "nb" }) {
    const notice = document.querySelector("#expiryNotice");
    const text = document.querySelector("#expiryNoticeText");
    const button = document.querySelector("#expiryResumeButton");
    let checkedFor = null;

    const eligible = () => {
      const state = getState();
      return Boolean(notice && getClient() && state.id && state.adminToken && isShared(state) && state.status !== "Avsluttet");
    };

    function dateText(iso) {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "";
      try { return date.toLocaleDateString(getLocale(), { day: "numeric", month: "long" }); } catch { return date.toISOString().slice(0, 10); }
    }

    function show(status) {
      if (!notice) return;
      notice.classList.toggle("hidden", !status?.expired);
      if (status?.expired && text) text.textContent = t("expiry.notice", { date: dateText(status.deletesAt) });
    }

    // Asks the server once per tournament (a page load); a failure just keeps the notice hidden.
    async function refresh() {
      if (!notice) return false;
      if (!eligible()) { notice.classList.add("hidden"); checkedFor = null; return false; }
      const state = getState();
      if (checkedFor === state.id) return !notice.classList.contains("hidden");
      checkedFor = state.id;
      try {
        const { data, error } = await remoteRpc(getClient(), "admin_tournament_expiry", { p_tournament_id: state.id, p_admin_token: state.adminToken });
        if (error) throw error;
        show(data);
        return data?.expired === true;
      } catch {
        notice.classList.add("hidden");
        return false;
      }
    }

    async function continueTournament() {
      if (button) button.disabled = true;
      try { await resume(); } finally { if (button) button.disabled = false; }
      notice?.classList.add("hidden");
    }

    button?.addEventListener("click", () => void continueTournament());
    return { refresh, continueTournament };
  }

  global.PadelstarExpiryNotice = { create };
})(window);
