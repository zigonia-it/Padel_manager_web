(function initPadelstarAdminIdentity(global) {
  function create({ getClient, getElements, getState, isAdmin, observability, remoteErrorMessage, remoteRpc, saveState, translate }) {
    async function currentAuthUser() {
      const client = getClient();
      if (!client) return null;
      try {
        const { data } = await client.auth.getUser();
        return data?.user ?? null;
      } catch (error) {
        observability?.error("auth_session_read_failed", error);
        return null;
      }
    }

    async function sendAdminSignInLink(event) {
      event.preventDefault();
      return sendSignInLink(getElements().adminIdentityEmail.value.trim());
    }

    async function sendSignInLink(email) {
      const elements = getElements();
      const client = getClient();
      if (!client) {
        elements.adminIdentityNotice.textContent = translate("admin.identityUnavailable");
        return false;
      }
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: global.location.origin },
      });
      elements.adminIdentityNotice.textContent = error
        ? remoteErrorMessage(error, translate("admin.identityFailed"))
        : translate("admin.identityLinkSent");
      if (!error) observability?.emit("admin_signin_link_requested");
      return !error;
    }

    async function claimCurrentTournament() {
      const client = getClient();
      const state = getState();
      const elements = getElements();
      if (!client || !state.id || !state.adminToken) return;
      const user = await currentAuthUser();
      if (!user) {
        elements.adminIdentityNotice.textContent = translate("admin.identitySignInFirst");
        return;
      }
      const { data, error } = await remoteRpc(client, "claim_tournament", {
        p_tournament_id: state.id,
        p_admin_token: state.adminToken,
      });
      if (error) {
        elements.adminIdentityNotice.textContent = remoteErrorMessage(error, translate("admin.identityFailed"));
        observability?.error("admin_claim_failed", error);
        return;
      }
      state.ownerUserId = data?.ownerUserId ?? user.id;
      state.claimedAt = data?.claimedAt ?? new Date().toISOString();
      saveState({ remote: false });
      elements.adminIdentityNotice.textContent = translate("admin.identityClaimed");
      observability?.emit("admin_tournament_claimed");
      render();
    }

    async function render() {
      const elements = getElements();
      if (!elements.adminIdentityPanel) return;
      const admin = isAdmin();
      elements.adminIdentityPanel.classList.toggle("hidden", !admin);
      if (!admin) return;
      const user = await currentAuthUser();
      const state = getState();
      const claimed = Boolean(state.ownerUserId && user?.id === state.ownerUserId);
      elements.adminIdentityStatus.textContent = claimed
        ? translate("admin.identityClaimedShort")
        : user
          ? translate("admin.identitySignedIn")
          : translate("admin.identityToken");
      // Account authentication is handled by the shared Konto view with email and password.
      // Keep the legacy magic-link form disabled so admin access cannot drift between auth flows.
      elements.adminIdentityForm?.classList.add("hidden");
      elements.adminAccountAuthButton?.classList.toggle("hidden", Boolean(user));
      elements.claimTournamentButton.classList.toggle("hidden", claimed || !user);
      if (claimed) elements.adminIdentityNotice.textContent = user.email ?? "";
    }

    return { claimCurrentTournament, currentAuthUser, render, sendAdminSignInLink, sendSignInLink };
  }

  global.PadelstarAdminIdentity = { create };
})(window);
