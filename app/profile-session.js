(function initPadelstarProfileSession(global) {
  function create(dependencies = {}) {
    const {
      defaultAvatarId,
      getElements,
      getIsCurrentUserAdmin = () => false,
      getLocalStorage = () => global.localStorage,
      getObservability = () => null,
      getPlayerById,
      getProfile,
      getState,
      getSupabaseClient,
      getAccountUser = () => null,
      mirrorStorageKeys,
      profileHistoryStorageKey,
      profileManager,
      profileStorageKey,
      removeOfflineStorageKeys,
      remoteRpc,
      render,
      renderProfile,
      requestConfirmation,
      saveProfileHistory,
      saveState,
      syncJoinPreview,
      syncAuthenticatedProfile = () => Promise.resolve(false),
      translate,
      setProfile,
    } = dependencies;

    function storage() {
      return getLocalStorage();
    }

    function profile() {
      return getProfile();
    }

    function state() {
      return getState();
    }

    function elements() {
      return getElements();
    }

    function t(key, values) {
      return translate(key, values);
    }

    function loadLocalProfile() {
      // A profile is only deleted after an explicit deletion request has been
      // processed by the trusted server cleanup job. Never purge it merely
      // because a local timestamp has passed.
      return profileManager?.loadProfile(storage(), profileStorageKey);
    }

    function persistLocalProfile() {
      const currentProfile = profile();
      if (!currentProfile) {
        storage().removeItem(profileStorageKey);
        removeOfflineStorageKeys([profileStorageKey, profileHistoryStorageKey]);
        return;
      }
      storage().setItem(profileStorageKey, JSON.stringify(currentProfile));
      mirrorStorageKeys([profileStorageKey, profileHistoryStorageKey]);
    }

    async function syncProfileRemote() {
      const currentProfile = profile();
      const supabaseClient = getSupabaseClient();
      if (!supabaseClient || !currentProfile?.accessToken || !getAccountUser()) return false;
      const { data, error } = await remoteRpc(supabaseClient, "upsert_player_profile", {
        p_profile_id: currentProfile.id,
        p_profile_token: currentProfile.accessToken,
        p_display_name: currentProfile.displayName,
        p_avatar_id: currentProfile.avatarId,
        p_accent: currentProfile.accent,
      });
      if (error) {
        console.warn("Profile sync failed", error);
        return false;
      }
      if (data?.profile) {
        setProfile(profileManager.normalizeProfile({ ...currentProfile, ...data.profile }));
        persistLocalProfile();
      }
      return true;
    }

    async function syncProfileHistoryRemote() {
      // Statistics are written by finalize_tournament, never by a participant's
      // browser. Refresh this account's rows through its authenticated RLS scope.
      return syncProfileHistoryRemoteRead();
    }

    async function syncProfileHistoryRemoteRead() {
      const account = getAccountUser();
      const currentProfile = profile();
      const client = getSupabaseClient();
      if (!account?.id || !currentProfile || !client?.from) return false;
      const { data, error } = await client.from("account_tournament_statistics")
        .select("tournament_id, ended_at, outcome, matches, wins, sets, games")
        .eq("user_id", account.id).order("ended_at", { ascending: false });
      if (error) {
        getObservability()?.error("account_statistics_read_failed", error);
        return false;
      }
      if (getAccountUser()?.id !== account.id || profile()?.id !== currentProfile.id) return false;
      for (const row of data ?? []) {
        profileManager.recordHistory(storage(), profileHistoryStorageKey, {
          id: row.tournament_id, profileId: currentProfile.id, accountUserId: account.id,
          endedAt: row.ended_at, outcome: row.outcome, matches: row.matches,
          wins: row.wins, sets: row.sets, games: row.games,
          tournamentName: t("tournament.finished"),
        });
      }
      mirrorStorageKeys([profileHistoryStorageKey]);
      renderProfile();
      return true;
    }

    function purgeLocalProfile() {
      setProfile(null);
      storage().removeItem(profileStorageKey);
      storage().removeItem(profileHistoryStorageKey);
      removeOfflineStorageKeys([profileStorageKey, profileHistoryStorageKey]);
    }

    function profileAvatarIdFromForm() {
      return new global.FormData(elements().profileForm).get("profileAvatarId") || defaultAvatarId;
    }

    function profileAccentFromForm() {
      return new global.FormData(elements().profileForm).get("profileAccent") || null;
    }

    function saveLocalProfileFromForm() {
      const currentElements = elements();
      const displayName = currentElements.profileNameInput.value.trim();
      if (!displayName) {
        currentElements.profileNameInput.focus();
        return;
      }
      const avatarId = profileAvatarIdFromForm();
      const accent = profileAccentFromForm();
      const currentProfile = profile();
      setProfile(currentProfile
        ? profileManager.normalizeProfile({ ...currentProfile, displayName, avatarId, accent, deletionRequestedAt: null, deletionScheduledFor: null })
        : profileManager.createProfile(displayName, avatarId, undefined, undefined, undefined, accent));
      persistLocalProfile();
      void syncAuthenticatedProfile(profile());
      void syncProfileRemote();
      const selectedPlayer = getPlayerById(state().selectedPlayerId);
      if (selectedPlayer) {
        selectedPlayer.profileId = profile().id;
        if (state().rounds.length === 0) {
          selectedPlayer.name = profile().displayName;
          selectedPlayer.avatarId = profile().avatarId;
          if (profile().accent) selectedPlayer.accent = profile().accent;
        }
        saveState({ remote: getIsCurrentUserAdmin() });
      }
      saveProfileHistory();
      renderProfile();
      syncJoinPreview();
      render();
    }

    function ensureProfileForJoin(displayName, avatarId) {
      const currentProfile = profile();
      if (!currentProfile) setProfile(profileManager.createProfile(displayName, avatarId));
      else if (!currentProfile.displayName || currentProfile.displayName === displayName) {
        setProfile(profileManager.normalizeProfile({ ...currentProfile, displayName, avatarId, deletionRequestedAt: null, deletionScheduledFor: null }));
      }
      persistLocalProfile();
      void syncProfileRemote();
    }

    async function requestProfileDeletion() {
      if (!profile() || !await requestConfirmation(t("profile.deleteConfirm"))) return;
      setProfile(profileManager.requestDeletion(profile()));
      persistLocalProfile();
      void requestRemoteProfileDeletion();
      renderProfile();
    }

    function cancelProfileDeletion() {
      if (!profile()) return;
      setProfile(profileManager.cancelDeletion(profile()));
      persistLocalProfile();
      void cancelRemoteProfileDeletion();
      renderProfile();
    }

    function linkProfileToPlayer(player) {
      if (player && profile()) player.profileId = profile().id;
      return player;
    }

    async function requestRemoteProfileDeletion() {
      const currentProfile = profile();
      const supabaseClient = getSupabaseClient();
      if (!supabaseClient || !currentProfile?.accessToken) return;
      await remoteRpc(supabaseClient, "request_player_profile_deletion", {
        p_profile_id: currentProfile.id,
        p_profile_token: currentProfile.accessToken,
      });
    }

    async function cancelRemoteProfileDeletion() {
      const currentProfile = profile();
      const supabaseClient = getSupabaseClient();
      if (!supabaseClient || !currentProfile?.accessToken) return;
      await remoteRpc(supabaseClient, "cancel_player_profile_deletion", {
        p_profile_id: currentProfile.id,
        p_profile_token: currentProfile.accessToken,
      });
    }

    return {
      cancelProfileDeletion,
      ensureProfileForJoin,
      linkProfileToPlayer,
      loadLocalProfile,
      persistLocalProfile,
      profileAvatarIdFromForm,
      purgeLocalProfile,
      requestProfileDeletion,
      requestRemoteProfileDeletion,
      saveLocalProfileFromForm,
      syncProfileHistoryRemote,
      syncProfileHistoryRemoteRead,
      syncProfileRemote,
      cancelRemoteProfileDeletion,
    };
  }

  global.PadelstarProfileSession = { create };
})(window);
