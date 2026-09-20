// Invitations without a friend list (Phase 17). The admin invites by email in the lobby; the invited person sees the
// invitation on their profile page after signing in with that verified email and accepts by joining (the normal join
// flow) or declines. The server enforces everything; this file only asks and shows.
(function (global) {
  const ERRORS = [
    [/Invalid email/i, "invitations.error.email"],
    [/already started/i, "invitations.error.started"],
    [/Too many/i, "invitations.error.tooMany"],
    [/Rate limit/i, "invitations.error.rateLimit"],
  ];

  function errorKey(error) {
    const message = String(error?.message ?? "");
    return ERRORS.find(([pattern]) => pattern.test(message))?.[1] ?? "invitations.error.failed";
  }

  function create({ document, getState, getClient, isShared, remoteRpc, t, showToast, escapeHtml, prefillJoinForm, showModule, getAccountUser, sendEmail }) {
    const card = document.querySelector("#lobbyInviteCard");
    const form = document.querySelector("#lobbyInviteForm");
    const adminList = document.querySelector("#lobbyInvitationsList");
    const panel = document.querySelector("#myInvitationsPanel");
    const mineList = document.querySelector("#myInvitationsList");
    let adminLoadedFor = null;
    let mine = [];

    const canInvite = () => {
      const state = getState();
      return Boolean(getClient() && state.id && state.adminToken && isShared(state) && (state.rounds ?? []).length === 0 && state.status !== "Avsluttet");
    };

    function renderAdminList(invitations) {
      if (!adminList) return;
      adminList.innerHTML = invitations.length
        ? invitations.map((item) => `<li class="invitation-item invitation-${escapeHtml(item.status)}"><span class="invitation-email">${escapeHtml(item.email)}</span><span class="join-source-chip">${escapeHtml(t(`invitations.status.${item.status}`))}</span>${item.status === "pending" ? `<button class="ghost icon-button" type="button" data-cancel-invitation="${escapeHtml(item.id)}">${escapeHtml(t("invitations.cancel"))}</button>` : ""}</li>`).join("")
        : `<li class="empty-list-item">${escapeHtml(t("invitations.noneSent"))}</li>`;
      adminList.querySelectorAll("[data-cancel-invitation]").forEach((button) => button.addEventListener("click", () => void cancel(button.dataset.cancelInvitation)));
    }

    async function admin(name, extra = {}) {
      const state = getState();
      const { data, error } = await remoteRpc(getClient(), name, { p_tournament_id: state.id, p_admin_token: state.adminToken, ...extra });
      if (error) { showToast(t(errorKey(error)), "status-message-error"); return null; }
      renderAdminList(data?.invitations ?? []);
      return data?.invitations ?? [];
    }

    // The lobby card is shown only for a shared tournament that has not started; the list is fetched once per tournament.
    function renderAdmin() {
      if (!card) return;
      const visible = canInvite();
      card.classList.toggle("hidden", !visible);
      if (!visible) { adminLoadedFor = null; return; }
      const id = getState().id;
      if (adminLoadedFor !== id) { adminLoadedFor = id; void admin("admin_list_invitations"); }
    }

    async function invite(email) {
      if (!canInvite()) return null;
      const result = await admin("admin_invite_player", { p_email: email });
      if (!result) return result;
      const entry = result.find((item) => String(item.email).toLowerCase() === email.toLowerCase());
      if (typeof sendEmail === "function" && entry?.status === "pending") {
        // The invitation is already saved and shown in the app; the email is the second step and may fail on its own.
        const state = getState();
        const sent = await sendEmail({ tournamentId: state.id, adminToken: state.adminToken, inviteCode: state.inviteCode, email, language: state.settings?.language });
        showToast(t(sent ? "invitations.emailSent" : "invitations.emailFailed", { email }), sent ? "status-message-success" : "status-message-error");
      } else {
        showToast(t("invitations.sent"), "status-message-success");
      }
      return result;
    }

    async function cancel(id) {
      return canInvite() ? admin("admin_cancel_invitation", { p_invitation_id: id }) : null;
    }

    function renderMine() {
      if (!panel || !mineList) return;
      const signedIn = Boolean(getAccountUser?.());
      panel.classList.toggle("hidden", !signedIn || mine.length === 0);
      mineList.innerHTML = mine.map((item) => `<li class="invitation-item"><span class="invitation-email">${escapeHtml(t("invitations.invitedTo", { name: item.tournamentName || item.inviteCode }))}</span><span class="invitation-actions"><button class="secondary" type="button" data-accept-invitation="${escapeHtml(item.id)}">${escapeHtml(t("invitations.join"))}</button><button class="ghost" type="button" data-decline-invitation="${escapeHtml(item.id)}">${escapeHtml(t("invitations.decline"))}</button></span></li>`).join("");
      mineList.querySelectorAll("[data-accept-invitation]").forEach((button) => button.addEventListener("click", () => accept(button.dataset.acceptInvitation)));
      mineList.querySelectorAll("[data-decline-invitation]").forEach((button) => button.addEventListener("click", () => void decline(button.dataset.declineInvitation)));
    }

    async function loadMine() {
      const client = getClient();
      if (!client || !getAccountUser?.()) { mine = []; renderMine(); return []; }
      const { data, error } = await remoteRpc(client, "list_my_invitations", {});
      mine = error || !Array.isArray(data) ? [] : data;
      renderMine();
      return mine;
    }

    // Accepting is joining: the join form is filled with the invite code, and the person presses Join themselves.
    function accept(id) {
      const item = mine.find((entry) => entry.id === id);
      if (!item) return false;
      prefillJoinForm(item.inviteCode);
      showModule("setup-player");
      return true;
    }

    async function decline(id) {
      const { data, error } = await remoteRpc(getClient(), "decline_invitation", { p_invitation_id: id });
      if (error) { showToast(t("invitations.error.failed"), "status-message-error"); return false; }
      mine = mine.filter((entry) => entry.id !== id);
      renderMine();
      return data === true;
    }

    function bind() {
      form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = String(new FormData(form).get("email") ?? "").trim();
        if (!email) return;
        if (await invite(email)) form.reset();
      });
    }

    return { bind, renderAdmin, renderMine, loadMine, invite, cancel, accept, decline, errorKey };
  }

  global.PadelstarInvitations = { create, errorKey };
})(window);
