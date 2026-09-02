(function initializeAccountAuth(global) {
  "use strict";

  function create({ getClient, getElements, translate, onAuthChange }) {
    let user = null;

    function notice(message, error = false) {
      const element = getElements().accountAuthNotice;
      if (!element) return;
      element.textContent = message;
      element.classList.toggle("status-message-error", error);
      element.classList.toggle("status-message-success", !error && Boolean(message));
    }

    async function refresh() {
      const client = getClient();
      if (!client) { user = null; render(); return null; }
      try {
        const result = await client.auth.getUser();
        user = result.data?.user ?? null;
      } catch { user = null; }
      render();
      return user;
    }

    async function ensureRemoteProfile(nextUser) {
      const client = getClient();
      if (!client || !nextUser?.id || typeof client.from !== "function") return;
      try {
        await client.from("profiles").upsert({ id: nextUser.id }, { onConflict: "id", ignoreDuplicates: true });
      } catch { /* Auth must remain usable even before the profile migration is deployed. */ }
    }

    async function syncProfile(nextProfile) {
      if (!user || !nextProfile) return false;
      const client = getClient();
      if (!client || typeof client.from !== "function") return false;
      try {
        const { error } = await client.from("profiles").upsert({
          id: user.id,
          display_name: nextProfile.displayName,
          avatar_id: nextProfile.avatarId,
        }, { onConflict: "id" });
        return !error;
      } catch { return false; }
    }

    async function signIn(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const email = form.elements.email.value.trim();
      const password = form.elements.password.value;
      const client = getClient();
      if (!client) { notice(translate("account.authUnavailable"), true); return false; }
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) { notice(translate("account.authFailed"), true); return false; }
      user = data.user;
      await ensureRemoteProfile(user);
      notice(translate("account.authSignedIn"));
      form.elements.password.value = "";
      render();
      onAuthChange?.(user);
      return true;
    }

    async function signUp() {
      const elements = getElements();
      if (!elements.accountAuthForm?.reportValidity()) return false;
      const email = elements.accountAuthEmail.value.trim();
      const password = elements.accountAuthPassword.value;
      const client = getClient();
      if (!client) { notice(translate("account.authUnavailable"), true); return false; }
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) { notice(translate("account.authFailed"), true); return false; }
      user = data.user ?? null;
      await ensureRemoteProfile(user);
      elements.accountAuthPassword.value = "";
      notice(data.session ? translate("account.authSignedIn") : translate("account.authConfirmEmail"));
      render();
      onAuthChange?.(user);
      return true;
    }

    async function signOut() {
      const client = getClient();
      if (!client) return false;
      const { error } = await client.auth.signOut();
      if (error) { notice(translate("account.authFailed"), true); return false; }
      user = null;
      notice(translate("account.authSignedOut"));
      render();
      onAuthChange?.(null);
      return true;
    }

    function render() {
      const elements = getElements();
      if (!elements.accountAuthPanel) return;
      elements.accountAuthPanel.classList.remove("hidden");
      elements.accountAuthSignedIn.classList.toggle("hidden", !user);
      elements.accountAuthForm.classList.toggle("hidden", Boolean(user));
      elements.accountAuthSignOut.classList.toggle("hidden", !user);
      elements.accountAuthIdentity.textContent = user?.email ?? "";
    }

    function bind() {
      const elements = getElements();
      elements.accountAuthForm?.addEventListener("submit", signIn);
      elements.accountAuthSignUp?.addEventListener("click", () => void signUp());
      elements.accountAuthSignOut?.addEventListener("click", () => void signOut());
    }

    return { bind, ensureRemoteProfile, refresh, render, signIn, signOut, signUp, syncProfile };
  }

  global.PadelstarAccountAuth = { create };
})(window);
