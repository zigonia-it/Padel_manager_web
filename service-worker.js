const cacheName = "padelstar-v355";

const appShell = [
  "./",
  "./index.html",
  "./tv.html",
  "./privacy.html",
  "./guide.html",
  "./styles/tokens.css?v=padelstar-tokens-1",
  "./styles/base.css?v=padelstar-base-8",
  "./styles/layout.css?v=padelstar-layout-10",
  "./styles/components.css?v=padelstar-components-23",
  "./styles/tv.css?v=padelstar-tv-17",
  "./assets/logos/main_logo_without_icon.png",
  "./assets/icons/padelstar-icon.png",
  "./assets/logos/tv-brand.png",
  "./styles/modules.css?v=padelstar-modules-15",
  "./styles/styles.css?v=padelstar-ui-104",
  "./styles/responsive.css?v=padelstar-responsive-6",
  "./styles/ui-consistency.css?v=padelstar-ui-consistency-53",
  "./styles/components-v2.css?v=padelstar-components-v2-3",
  "./styles/workspace-nav.css?v=padelstar-workspace-nav-8",
  "./styles/podium.css?v=padelstar-podium-5",
  "./styles/lobby.css?v=padelstar-lobby-6",
  "./styles/scoreboard-table.css?v=padelstar-scoreboard-table-4",
  "./styles/match-list-collapse.css?v=padelstar-match-list-collapse-1",
  "./styles/feedback.css?v=padelstar-feedback-3",
  "./styles/captcha.css?v=padelstar-captcha-1",
  "./styles/info-dialog.css?v=padelstar-info-dialog-3",
  "./styles/notification-center.css?v=padelstar-notification-center-8",
  "./styles/theme-toggle.css?v=padelstar-color-mode-2",
  "./styles/scorer-panel.css?v=padelstar-scorer-panel-8",
  "./styles/settings-rows.css?v=padelstar-settings-rows-2",
  "./styles/create-wizard.css?v=padelstar-create-wizard-4",
  "./styles/invite-code-input.css?v=padelstar-invite-code-input-2",
  "./styles/accent-picker.css?v=padelstar-accent-picker-2",
  "./styles/privacy.css?v=padelstar-privacy-7",
  "./app/translations.js?v=padelstar-i18n-62",
  "./app/i18n-ui.js?v=padelstar-i18n-ui-6",
  "./app/storage.js?v=padelstar-storage-1",
  "./app/tournament-library.js?v=padelstar-tournament-library-3",
  "./app/rendering.js?v=padelstar-rendering-2",
  "./app/remote-tournament.js?v=padelstar-remote-tournament-2",
  "./app/admin-actions.js?v=padelstar-admin-actions-4",
  "./app/court-settings.js?v=padelstar-court-settings-2",
  "./app/setup-forms.js?v=padelstar-setup-forms-5",
  "./app/tournament-queries.js?v=padelstar-tournament-queries-1",
  "./app/tournament-sharing.js?v=padelstar-tournament-sharing-1",
  "./app/result-submissions.js?v=padelstar-result-submissions-1",
  "./app/player-actions.js?v=padelstar-player-actions-1",
  "./app/privacy-i18n.js?v=padelstar-privacy-i18n-10",
  "./app/page-language.js?v=padelstar-page-language-1",
  "./app/guide-i18n.js?v=padelstar-guide-i18n-5",
  "./app/tournament-engine.js?v=padelstar-engine-2",
  "./app/tournament-modes.js?v=padelstar-modes-1",
  "./app/player-statistics.js?v=padelstar-player-statistics-1",
  "./app/tournament-insights.js?v=padelstar-insights-1",
  "./app/historical-records.js?v=padelstar-history-1",
  "./app/tournament-state-machine.js?v=padelstar-state-machine-1",
  "./app/tournament-scheduler.js?v=padelstar-scheduler-1",
  "./app/tournament-rounds.js?v=padelstar-rounds-2",
  "./app/tournament-runtime.js?v=padelstar-tournament-runtime-4",
  "./app/workspace-overview.js?v=padelstar-workspace-overview-2",
  "./app/court-queue.js?v=padelstar-court-queue-3",
  "./app/tournament-events.js?v=padelstar-tournament-events-1",
  "./app/score-submissions.js?v=padelstar-score-submissions-1",
  "./app/retention-policy.js?v=padelstar-retention-1",
  "./app/remote-player-result.js?v=padelstar-player-result-1",
  "./app/match-list.js?v=padelstar-match-list-4",
  "./app/standings.js?v=padelstar-standings-3",
  "./app/podium.js?v=padelstar-podium-3",
  "./app/lobby.js?v=padelstar-lobby-5",
  "./app/player-list.js?v=padelstar-player-list-3",
  "./app/cup-bracket.js?v=padelstar-cup-bracket-2",
  "./app/player-status.js?v=padelstar-player-status-1",
  "./app/player-next-match.js?v=padelstar-player-next-match-7",
  "./app/rules.js?v=padelstar-rules-4",
  "./app/player-controls.js?v=padelstar-player-controls-2",
  "./app/large-score.js?v=padelstar-large-score-2",
  "./app/set-score-dialog.js?v=padelstar-set-score-dialog-1",
  "./app/admin-status.js?v=padelstar-admin-status-3",
  "./app/profile-ui.js?v=padelstar-profile-ui-5",
  "./app/backup-ui.js?v=padelstar-backup-ui-2",
  "./app/player-replacement.js?v=padelstar-player-replacement-2",
  "./app/player-withdrawal.js?v=padelstar-player-withdrawal-2",
  "./app/player-state.js?v=padelstar-player-state-5",
  "./app/tournament-status.js?v=padelstar-tournament-status-1",
  "./app/tournament-finalization.js?v=padelstar-finalization-1",
  "./app/scoring-engine.js?v=padelstar-scoring-5",
  "./app/state-manager.js?v=padelstar-state-2",
  "./app/realtime-sync.js?v=padelstar-realtime-sync-1",
  "./app/offline-storage.js?v=padelstar-offline-1",
  "./app/persistence.js?v=padelstar-persistence-1",
  "./app/admin-identity.js?v=padelstar-admin-identity-2",
  "./app/remote-feedback.js?v=padelstar-remote-feedback-1",
  "./app/realtime-connection.js?v=padelstar-realtime-connection-2",
  "./app/observability.js?v=padelstar-observability-1",
  "./app/profile-manager.js?v=padelstar-profile-2",
  "./app/profile-history.js?v=padelstar-profile-history-1",
  "./app/remote-rpc.js?v=padelstar-remote-rpc-1",
  "./app/ui-effects.js?v=padelstar-ui-effects-1",
  "./app/navigation.js?v=padelstar-navigation-2",
  "./app/workspace-rail.js?v=padelstar-workspace-rail-4",
  "./app/avatar-system.js?v=padelstar-avatar-system-1",
  "./app/pwa-install.js?v=padelstar-pwa-install-3",
  "./app/accent-system.js?v=padelstar-accent-system-2",
  "./app/player-visuals.js?v=padelstar-player-visuals-3",
  "./app/ui-feedback.js?v=padelstar-ui-feedback-2",
  "./app/notification-system.js?v=padelstar-notification-system-2",
  "./app/color-mode.js?v=padelstar-color-mode-2",
  "./app/notification-center.js?v=padelstar-notification-center-7",
  "./app/notification-center-ui.js?v=padelstar-notification-center-7",
  "./app/system-admin.js?v=padelstar-system-admin-4",
  "./app/system-two-factor.js?v=padelstar-system-two-factor-1",
  "./app/invitations.js?v=padelstar-invitations-2",
  "./styles/system-admin.css?v=padelstar-system-admin-5",
  "./admin.html",
  "./assets/sounds/notification1.mp3",
  "./assets/sounds/notification2.mp3",
  "./app/profile-session.js?v=padelstar-profile-session-4",
  "./app/captcha.js?v=padelstar-captcha-1",
  "./app/account-auth.js?v=padelstar-account-auth-7",
  "./app/config/storage-keys.js?v=padelstar-storage-keys-1",
  "./app/config/supabase-config.js?v=padelstar-supabase-config-1",
  "./app/core/utilities.js?v=padelstar-utilities-1",
  "./app/core/language-controller.js?v=padelstar-language-controller-1",
  "./app/core/session-controller.js?v=padelstar-session-controller-2",
  "./app/core/remote-state-controller.js?v=padelstar-remote-state-controller-3",
  "./app/core/remote-sync-controller.js?v=padelstar-remote-sync-controller-1",
  "./app/bootstrap/dom-elements.js?v=padelstar-dom-elements-15",
  "./app/bootstrap/app-meta.js?v=padelstar-app-meta-16",
  "./app/bootstrap/app-events.js?v=padelstar-bootstrap-events-3",
  "./app/bootstrap/app-init.js?v=padelstar-app-init-2",
  "./app/ui/theme.js?v=padelstar-theme-2",
  "./app/ui/app-renderer.js?v=padelstar-app-renderer-5",
  "./app/feedback.js?v=padelstar-feedback-2",
  "./app/info-dialog.js?v=padelstar-info-dialog-2",
  "./app/result-correction.js?v=padelstar-result-correction-2",
  "./app/result-correction-dialog.js?v=padelstar-result-correction-dialog-2",
  "./app/match-card.js?v=padelstar-match-card-15",
  "./app/backup-format.js?v=padelstar-backup-format-2",
  "./app/link-utils.js?v=padelstar-link-utils-2",
  "./app/tournament-state.js?v=padelstar-tournament-state-5",
  "./app/state-bootstrap.js?v=padelstar-state-bootstrap-1",
  "./app/module-routing.js?v=padelstar-module-routing-5",
  "./app/session-policy.js?v=padelstar-session-policy-1",
  "./app/tv-mode.js?v=padelstar-tv-mode-11",
  "./app/remote-state-write.js?v=padelstar-remote-state-write-1",
  "./app/remote-admin-actions.js?v=padelstar-remote-admin-actions-5",
  "./app/remote-player-score.js?v=padelstar-remote-player-score-4",
  "./app/score-actions.js?v=padelstar-score-actions-6",
  "./app/workspace-navigation.js?v=padelstar-workspace-navigation-6",
  "./app/app-events.js?v=padelstar-app-events-5",
  "./app/workspace-events.js?v=padelstar-workspace-events-3",
  "./app/tournament-entry.js?v=padelstar-tournament-entry-7",
  "./app/create-wizard.js?v=padelstar-create-wizard-3",
  "./app/invite-code-input.js?v=padelstar-invite-code-input-1",
  "./app/accent-picker.js?v=padelstar-accent-picker-1",
  "./app/admin-form-events.js?v=padelstar-admin-form-events-8",
  "./app/match-actions.js?v=padelstar-match-actions-3",
  "./app/initial-view.js?v=padelstar-initial-view-3",
  "./app/app.js?v=padelstar-session-84",
  "./supabase-config.js",
  "./manifest.webmanifest",
  "./assets/icons/padelstar-192.png",
  "./assets/icons/padelstar-512.png",
  "./assets/icons/padelstar-maskable-512.png",
  "./assets/icons/games-96.png",
  "./assets/icons/trophy-96.png",
  "./assets/logos/main_logo.png",
  "./assets/icons/vs_icon",
  "./assets/icons/padelstar-icon.png",
  "./assets/backgrounds/bg_img-1600.jpg",
  "./assets/ui/menu_highlight.png",
  "./assets/fonts/Archivo-Medium.woff",
  "./assets/fonts/Archivo-SemiBold.woff",
  "./assets/fonts/Archivo-Bold.woff",
  "./assets/fonts/Archivo-ExtraBold.woff",
  "./assets/fonts/Archivo-Black.woff",
  "./assets/fonts/InstrumentSans-Regular.woff",
  "./assets/fonts/InstrumentSans-Medium.woff",
  "./assets/fonts/InstrumentSans-SemiBold.woff",
  "./assets/fonts/InstrumentSans-Bold.woff",
  "./assets/fonts/TitilliumWeb-Bold.ttf",
  "./assets/fonts/Anton-Regular.ttf",
  "./assets/fonts/Inter-VariableFont_opsz,wght.ttf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(appShell)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)));
    }).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then((response) => {
      if (!response || !response.ok) return response;
      const responseToCache = response.clone();
      caches.open(cacheName).then((cache) => cache.put(event.request, responseToCache));
      return response;
    }).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === "navigate") {
          return caches.match("./index.html").then((indexResponse) => indexResponse || caches.match("./"));
        }
        return Response.error();
      });
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "padelstar-show-notification") return;
  event.waitUntil(self.registration.showNotification(event.data.title, {
    body: event.data.body,
    tag: event.data.tag || "padelstar-tournament",
    icon: "./assets/icons/padelstar-icon.png",
    badge: "./assets/icons/padelstar-icon.png",
  }));
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() ?? "" };
  }
  event.waitUntil(self.registration.showNotification(payload.title || "Padelstar", {
    body: payload.body || "",
    tag: payload.tag || "padelstar-push",
    icon: "./assets/icons/padelstar-icon.png",
    badge: "./assets/icons/padelstar-icon.png",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => "focus" in client);
    return existing ? existing.focus() : self.clients.openWindow("./");
  }));
});
