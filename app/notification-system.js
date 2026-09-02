(function initPadelstarNotificationSystem(global) {
  function create(dependencies = {}) {
    const {
      getElements,
      getLocalStorage = () => global.localStorage,
      getNotificationPreferenceKey,
      getObservability = () => null,
      getPushSubscriptionStorageKey,
      getState,
      getSupabaseClient,
      getSupabaseSettings,
      getSpectatorMode = () => false,
      remoteRpc,
      translate,
    } = dependencies;

    function storage() {
      return getLocalStorage();
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

    async function sendPushNotification(kind, matchId = null) {
      const supabaseClient = getSupabaseClient();
      const currentState = state();
      if (!supabaseClient || !currentState.id || !currentState.adminToken || !supabaseClient.functions) return;
      const copy = kind === "match_started"
        ? {
          title: t("notifications.matchReadyTitle"),
          body: t("notifications.matchPlayingBody"),
        }
        : {
          title: t("notifications.matchReadyTitle"),
          body: t("notifications.matchReadyBody"),
        };
      try {
        const { error } = await supabaseClient.functions.invoke("push-send", {
          body: {
            tournamentId: currentState.id,
            title: copy.title,
            body: copy.body,
            tag: `padelstar-${kind}-${matchId ?? currentState.currentRound}`,
          },
          headers: { "x-padelstar-admin-token": currentState.adminToken },
        });
        if (error) throw error;
        getObservability()?.emit("push_notification_sent", { kind });
      } catch (error) {
        getObservability()?.error("push_notification_failed", error, { kind });
      }
    }

    function notificationsSupported() {
      return "Notification" in global && "serviceWorker" in global.navigator;
    }

    function notificationsEnabled() {
      return storage().getItem(getNotificationPreferenceKey()) === "enabled"
        && global.Notification.permission === "granted";
    }

    function renderNotificationControl() {
      const button = elements().toggleNotificationsButton;
      const currentState = state();
      if (!button) return;
      button.classList.toggle("hidden", !currentState.selectedPlayerId || getSpectatorMode() || !notificationsSupported());
      button.textContent = notificationsEnabled() ? t("actions.disableNotifications") : t("actions.enableNotifications");
    }

    async function toggleNotifications() {
      if (!notificationsSupported()) return;
      if (notificationsEnabled()) {
        await unsubscribeFromPush();
        storage().removeItem(getNotificationPreferenceKey());
        renderNotificationControl();
        return;
      }
      const permission = await global.Notification.requestPermission();
      if (permission !== "granted") {
        elements().copyStatus.textContent = t("messages.notificationsDenied");
        return;
      }
      await subscribeToPush();
      storage().setItem(getNotificationPreferenceKey(), "enabled");
      renderNotificationControl();
      getObservability()?.emit("notifications_enabled");
      const registration = await global.navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: "padelstar-show-notification",
        title: t("notifications.enabledTitle"),
        body: t("notifications.enabledBody"),
        tag: "padelstar-notifications-enabled",
      });
    }

    function base64ToUint8Array(value) {
      const padded = `${value}${"=".repeat((4 - value.length % 4) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
      return Uint8Array.from(global.atob(padded), (character) => character.charCodeAt(0));
    }

    async function subscribeToPush() {
      const publicKey = String(getSupabaseSettings().vapidPublicKey ?? "").trim();
      if (!publicKey || !global.navigator.serviceWorker?.ready) return null;
      const currentState = state();
      try {
        const registration = await global.navigator.serviceWorker.ready;
        if (!registration.pushManager) return null;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(publicKey),
        });
        const json = subscription.toJSON();
        storage().setItem(getPushSubscriptionStorageKey(), JSON.stringify(json));
        const supabaseClient = getSupabaseClient();
        if (supabaseClient && currentState.playerToken && currentState.selectedPlayerId) {
          const { error } = await remoteRpc(supabaseClient, "upsert_push_subscription", {
            p_tournament_id: currentState.id,
            p_invite_code: currentState.inviteCode,
            p_player_id: currentState.selectedPlayerId,
            p_player_token: currentState.playerToken,
            p_subscription: json,
          });
          if (error) throw error;
        }
        getObservability()?.emit("push_subscription_enabled");
        return subscription;
      } catch (error) {
        getObservability()?.error("push_subscription_failed", error);
        storage().removeItem(getPushSubscriptionStorageKey());
        return null;
      }
    }

    async function unsubscribeFromPush() {
      const subscriptionKey = getPushSubscriptionStorageKey();
      const serialized = storage().getItem(subscriptionKey);
      const currentState = state();
      try {
        const registration = await global.navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
        const supabaseClient = getSupabaseClient();
        if (serialized && supabaseClient && currentState.playerToken && currentState.selectedPlayerId) {
          await remoteRpc(supabaseClient, "delete_push_subscription", {
            p_tournament_id: currentState.id,
            p_player_id: currentState.selectedPlayerId,
            p_player_token: currentState.playerToken,
            p_endpoint: JSON.parse(serialized).endpoint,
          });
        }
      } catch (error) {
        getObservability()?.error("push_subscription_delete_failed", error);
      } finally {
        storage().removeItem(subscriptionKey);
      }
    }

    return {
      base64ToUint8Array,
      notificationsEnabled,
      notificationsSupported,
      renderNotificationControl,
      sendPushNotification,
      subscribeToPush,
      toggleNotifications,
      unsubscribeFromPush,
    };
  }

  global.PadelstarNotificationSystem = { create };
})(window);
