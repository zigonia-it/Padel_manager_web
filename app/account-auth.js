(function initializeAccountAuth(global) {
  "use strict";

  function create({ getClient, getElements, getProfile, onProfileLoaded, translate, onAuthChange }) {
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
      if (user) await loadRemoteProfile(user);
      render();
      onAuthChange?.(user);
      return user;
    }

    async function ensureRemoteProfile(nextUser) {
      const client = getClient();
      if (!client || !nextUser?.id || typeof client.from !== "function") return;
      try {
        await client.from("profiles").upsert({ id: nextUser.id }, { onConflict: "id", ignoreDuplicates: true });
      } catch { /* Auth must remain usable even before the profile migration is deployed. */ }
    }

    async function loadRemoteProfile(nextUser) {
      const client = getClient();
      if (!client || !nextUser?.id || typeof client.from !== "function") return null;
      try {
        const { data, error } = await client.from("profiles")
          .select("display_name, avatar_id")
          .eq("id", nextUser.id)
          .maybeSingle();
        if (!error && data?.display_name?.trim()) {
          const remoteProfile = { displayName: data.display_name.trim(), avatarId: data.avatar_id };
          onProfileLoaded?.(remoteProfile);
          return remoteProfile;
        }
      } catch { /* Keep the local profile usable when the remote profile is unavailable. */ }
      return null;
    }

    async function syncProfile(nextProfile, preferredLanguage) {
      if (!user || !nextProfile) return false;
      const client = getClient();
      if (!client || typeof client.from !== "function") return false;
      try {
        const profilePayload = {
          id: user.id,
          display_name: nextProfile.displayName,
          avatar_id: nextProfile.avatarId,
        };
        if (preferredLanguage) profilePayload.preferred_language = preferredLanguage;
        const { error } = await client.from("profiles").upsert(profilePayload, { onConflict: "id" });
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
      const submitButton = event.submitter ?? form.querySelector("[type=submit]");
      const previousLabel = submitButton?.textContent ?? "";
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = translate("account.signingIn");
      }
      notice(translate("account.signingIn"));
      let data;
      let error;
      try {
        ({ data, error } = await client.auth.signInWithPassword({ email, password }));
      } catch (authError) {
        error = authError;
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = previousLabel;
        }
      }
      if (error) { notice(translate("account.authFailed"), true); return false; }
      user = data.user;
      await ensureRemoteProfile(user);
      await loadRemoteProfile(user);
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
      if (user) await loadRemoteProfile(user);
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

    async function updateAccount(event) {
      event.preventDefault();
      if (!user) return false;
      const elements = getElements();
      const form = event.currentTarget;
      const email = form.elements.email.value.trim();
      const password = form.elements.newPassword.value;
      const passwordConfirm = form.elements.passwordConfirm.value;
      if (password && password !== passwordConfirm) {
        notice(translate("account.passwordMismatch"), true);
        return false;
      }
      const payload = {};
      if (email && email !== user.email) payload.email = email;
      if (password) payload.password = password;
      if (Object.keys(payload).length === 0) {
        notice(translate("account.noChanges"));
        return true;
      }
      const client = getClient();
      if (!client) { notice(translate("account.authUnavailable"), true); return false; }
      const { data, error } = await client.auth.updateUser(payload);
      if (error) { notice(translate("account.authUpdateFailed"), true); return false; }
      user = data.user ?? { ...user, ...(payload.email ? { email: payload.email } : {}) };
      form.elements.newPassword.value = "";
      form.elements.passwordConfirm.value = "";
      notice(payload.email ? translate("account.authEmailChangePending") : translate("account.authUpdated"));
      render();
      onAuthChange?.(user);
      return true;
    }

    function render() {
      const elements = getElements();
      if (!elements.accountAuthPanel) return;
      const profileName = getProfile?.()?.displayName?.trim();
      const metadataName = user?.user_metadata?.display_name?.trim();
      const emailName = user?.email?.split("@")[0]?.trim();
      const signedInName = profileName || metadataName || emailName || translate("account.accountUser");
      elements.accountAuthPanel.classList.remove("hidden");
      elements.profileLightPanel?.classList.toggle("hidden", !user);
      elements.accountAuthSignedIn.classList.toggle("hidden", !user);
      elements.accountAuthForm.classList.toggle("hidden", Boolean(user));
      elements.accountAuthSignOut.classList.toggle("hidden", !user);
      elements.accountAuthIdentity.textContent = user?.email ?? "";
      if (elements.accountAuthAccountEmail && user) elements.accountAuthAccountEmail.value = user.email ?? "";
      if (elements.accountAuthDisplayName) elements.accountAuthDisplayName.textContent = signedInName;
      if (elements.accountAuthEmailStatus) {
        elements.accountAuthEmailStatus.textContent = user
          ? user.email_confirmed_at ? translate("account.emailConfirmed") : translate("account.emailNotConfirmed")
          : "";
      }
      if (elements.accountAuthCreated) {
        elements.accountAuthCreated.textContent = user?.created_at
          ? translate("account.memberSince", { date: new Date(user.created_at).toLocaleDateString(document.documentElement.lang || "nb-NO") })
          : "";
      }
      if (elements.createAccountAuthButton) {
        elements.createAccountAuthButton.textContent = user
          ? translate("account.authSignedInAs", { name: signedInName })
          : translate("account.openLogin");
      }
    }

    function bind() {
      const elements = getElements();
      elements.accountAuthForm?.addEventListener("submit", signIn);
      elements.accountDetailsForm?.addEventListener("submit", updateAccount);
      elements.accountAuthSignUp?.addEventListener("click", () => void signUp());
      elements.accountAuthSignOut?.addEventListener("click", () => void signOut());
    }

    function currentUser() {
      return user;
    }

    return { bind, currentUser, ensureRemoteProfile, loadRemoteProfile, refresh, render, signIn, signOut, signUp, syncProfile, updateAccount };
  }

  global.PadelstarAccountAuth = { create };
})(window);
