const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const serviceWorkerSource = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const manifestSource = fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8");
const stylesSource = fs.readFileSync(path.join(root, "styles", "styles.css"), "utf8");
const baseStylesSource = fs.readFileSync(path.join(root, "styles", "base.css"), "utf8");
const layoutStylesSource = fs.readFileSync(path.join(root, "styles", "layout.css"), "utf8");
const componentsStylesSource = fs.readFileSync(path.join(root, "styles", "components.css"), "utf8");
const modulesStylesSource = fs.readFileSync(path.join(root, "styles", "modules.css"), "utf8");
const responsiveStylesSource = fs.readFileSync(path.join(root, "styles", "responsive.css"), "utf8");
const uiConsistencyStylesSource = fs.readFileSync(path.join(root, "styles", "ui-consistency.css"), "utf8");
const navigationSource = fs.readFileSync(path.join(root, "app", "navigation.js"), "utf8");
const tournamentLibrarySource = fs.readFileSync(path.join(root, "app", "tournament-library.js"), "utf8");
const privacySource = fs.readFileSync(path.join(root, "privacy.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "app", "app.js"), "utf8");
const utilitiesSource = fs.readFileSync(path.join(root, "app", "core", "utilities.js"), "utf8");
const domElementsSource = fs.readFileSync(path.join(root, "app", "bootstrap", "dom-elements.js"), "utf8");
const appMetaSource = fs.readFileSync(path.join(root, "app", "bootstrap", "app-meta.js"), "utf8");
const themeSource = fs.readFileSync(path.join(root, "app", "ui", "theme.js"), "utf8");
const translationsSource = fs.readFileSync(path.join(root, "app", "translations.js"), "utf8");
const avatarSystemSource = fs.readFileSync(path.join(root, "app", "avatar-system.js"), "utf8");
const accentSystemSource = fs.readFileSync(path.join(root, "app", "accent-system.js"), "utf8");
const uiFeedbackSource = fs.readFileSync(path.join(root, "app", "ui-feedback.js"), "utf8");
const notificationSystemSource = fs.readFileSync(path.join(root, "app", "notification-system.js"), "utf8");
const profileSessionSource = fs.readFileSync(path.join(root, "app", "profile-session.js"), "utf8");
const matchCardSource = fs.readFileSync(path.join(root, "app", "match-card.js"), "utf8");
const matchListSource = fs.readFileSync(path.join(root, "app", "match-list.js"), "utf8");
const standingsSource = fs.readFileSync(path.join(root, "app", "standings.js"), "utf8");
const playerListSource = fs.readFileSync(path.join(root, "app", "player-list.js"), "utf8");
const cupBracketSource = fs.readFileSync(path.join(root, "app", "cup-bracket.js"), "utf8");
const playerStatusSource = fs.readFileSync(path.join(root, "app", "player-status.js"), "utf8");
const playerNextMatchSource = fs.readFileSync(path.join(root, "app", "player-next-match.js"), "utf8");
const rulesSource = fs.readFileSync(path.join(root, "app", "rules.js"), "utf8");
const playerControlsSource = fs.readFileSync(path.join(root, "app", "player-controls.js"), "utf8");
const largeScoreSource = fs.readFileSync(path.join(root, "app", "large-score.js"), "utf8");
const setScoreDialogSource = fs.readFileSync(path.join(root, "app", "set-score-dialog.js"), "utf8");
const adminStatusSource = fs.readFileSync(path.join(root, "app", "admin-status.js"), "utf8");
const profileUiSource = fs.readFileSync(path.join(root, "app", "profile-ui.js"), "utf8");
const backupUiSource = fs.readFileSync(path.join(root, "app", "backup-ui.js"), "utf8");
const playerStateSource = fs.readFileSync(path.join(root, "app", "player-state.js"), "utf8");
const tournamentStatusSource = fs.readFileSync(path.join(root, "app", "tournament-status.js"), "utf8");
const persistenceSource = fs.readFileSync(path.join(root, "app", "persistence.js"), "utf8");
const adminIdentitySource = fs.readFileSync(path.join(root, "app", "admin-identity.js"), "utf8");
const remoteFeedbackSource = fs.readFileSync(path.join(root, "app", "remote-feedback.js"), "utf8");
const realtimeConnectionSource = fs.readFileSync(path.join(root, "app", "realtime-connection.js"), "utf8");
const backupFormatSource = fs.readFileSync(path.join(root, "app", "backup-format.js"), "utf8");
const privacyI18nSource = fs.readFileSync(path.join(root, "app", "privacy-i18n.js"), "utf8");
const i18nUiSource = fs.readFileSync(path.join(root, "app", "i18n-ui.js"), "utf8");
const storageSource = fs.readFileSync(path.join(root, "app", "storage.js"), "utf8");
const renderingSource = fs.readFileSync(path.join(root, "app", "rendering.js"), "utf8");
const remoteTournamentSource = fs.readFileSync(path.join(root, "app", "remote-tournament.js"), "utf8");
const adminActionsSource = fs.readFileSync(path.join(root, "app", "admin-actions.js"), "utf8");
const playerActionsSource = fs.readFileSync(path.join(root, "app", "player-actions.js"), "utf8");
const linkUtilsSource = fs.readFileSync(path.join(root, "app", "link-utils.js"), "utf8");
const tournamentStateSource = fs.readFileSync(path.join(root, "app", "tournament-state.js"), "utf8");
const stateBootstrapSource = fs.readFileSync(path.join(root, "app", "state-bootstrap.js"), "utf8");
const moduleRoutingSource = fs.readFileSync(path.join(root, "app", "module-routing.js"), "utf8");
const sessionPolicySource = fs.readFileSync(path.join(root, "app", "session-policy.js"), "utf8");
const remoteStateWriteSource = fs.readFileSync(path.join(root, "app", "remote-state-write.js"), "utf8");
const remoteAdminActionsSource = fs.readFileSync(path.join(root, "app", "remote-admin-actions.js"), "utf8");
const remotePlayerScoreSource = fs.readFileSync(path.join(root, "app", "remote-player-score.js"), "utf8");
const scoreActionsSource = fs.readFileSync(path.join(root, "app", "score-actions.js"), "utf8");
const workspaceNavigationSource = fs.readFileSync(path.join(root, "app", "workspace-navigation.js"), "utf8");
const appEventsSource = fs.readFileSync(path.join(root, "app", "app-events.js"), "utf8");
const workspaceEventsSource = fs.readFileSync(path.join(root, "app", "workspace-events.js"), "utf8");
const tournamentEntrySource = fs.readFileSync(path.join(root, "app", "tournament-entry.js"), "utf8");
const adminFormEventsSource = fs.readFileSync(path.join(root, "app", "admin-form-events.js"), "utf8");
const matchActionsSource = fs.readFileSync(path.join(root, "app", "match-actions.js"), "utf8");
const initialViewSource = fs.readFileSync(path.join(root, "app", "initial-view.js"), "utf8");
const pwaInstallSource = fs.readFileSync(path.join(root, "app", "pwa-install.js"), "utf8");
const profileHistorySource = fs.readFileSync(path.join(root, "app", "profile-history.js"), "utf8");
const courtSettingsSource = fs.readFileSync(path.join(root, "app", "court-settings.js"), "utf8");
const setupFormsSource = fs.readFileSync(path.join(root, "app", "setup-forms.js"), "utf8");
const tournamentQueriesSource = fs.readFileSync(path.join(root, "app", "tournament-queries.js"), "utf8");
const tournamentSharingSource = fs.readFileSync(path.join(root, "app", "tournament-sharing.js"), "utf8");
const resultSubmissionsSource = fs.readFileSync(path.join(root, "app", "result-submissions.js"), "utf8");

test("service worker claims updates and keeps a navigation fallback", () => {
  assert.match(serviceWorkerSource, /padelstar-v273/);
  assert.match(indexSource, /styles\/ui-consistency\.css\?v=padelstar-ui-consistency-40/);
  assert.match(serviceWorkerSource, /styles\/ui-consistency\.css\?v=padelstar-ui-consistency-40/);
  assert.match(indexSource, /app\/tournament-rounds\.js\?v=padelstar-rounds-1/);
  assert.match(serviceWorkerSource, /app\/tournament-rounds\.js\?v=padelstar-rounds-1/);
  assert.match(indexSource, /app\/player-visuals\.js\?v=padelstar-player-visuals-1/);
  assert.match(serviceWorkerSource, /app\/player-visuals\.js\?v=padelstar-player-visuals-1/);
  assert.match(indexSource, /app\/tournament-runtime\.js\?v=padelstar-tournament-runtime-1/);
  assert.match(serviceWorkerSource, /app\/tournament-runtime\.js\?v=padelstar-tournament-runtime-1/);
  assert.match(indexSource, /app\/workspace-overview\.js\?v=padelstar-workspace-overview-2/);
  assert.match(serviceWorkerSource, /app\/workspace-overview\.js\?v=padelstar-workspace-overview-2/);
  assert.match(indexSource, /app\/match-list\.js\?v=padelstar-match-list-1/);
  assert.match(serviceWorkerSource, /app\/match-list\.js\?v=padelstar-match-list-1/);
  assert.match(serviceWorkerSource, /padelstar-avatar-system-1/);
  assert.match(serviceWorkerSource, /padelstar-accent-system-1/);
  assert.match(serviceWorkerSource, /padelstar-ui-feedback-1/);
  assert.match(serviceWorkerSource, /padelstar-notification-system-1/);
  assert.match(serviceWorkerSource, /padelstar-profile-session-1/);
  assert.match(serviceWorkerSource, /padelstar-backup-format-1/);
  assert.match(serviceWorkerSource, /padelstar-link-utils-1/);
  assert.match(serviceWorkerSource, /padelstar-tournament-state-1/);
  assert.match(serviceWorkerSource, /padelstar-state-bootstrap-1/);
  assert.match(serviceWorkerSource, /padelstar-module-routing-1/);
  assert.match(serviceWorkerSource, /padelstar-session-policy-1/);
  assert.match(serviceWorkerSource, /profile-manager\.js/);
  assert.match(serviceWorkerSource, /self\.skipWaiting\(\)/);
  assert.match(serviceWorkerSource, /self\.clients\.claim\(\)/);
  assert.match(serviceWorkerSource, /event\.request\.mode === "navigate"/);
  assert.match(serviceWorkerSource, /caches\.match\("\.\/index\.html"\)/);
  assert.match(serviceWorkerSource, /"\.\/privacy\.html"/);
  assert.match(indexSource, /app\/remote-state-write\.js\?v=padelstar-remote-state-write-1/);
  assert.match(serviceWorkerSource, /app\/remote-state-write\.js\?v=padelstar-remote-state-write-1/);
});

test("profile history has its own domain boundary", () => {
  assert.match(indexSource, /app\/profile-history\.js\?v=padelstar-profile-history-1/);
  assert.match(serviceWorkerSource, /app\/profile-history\.js\?v=padelstar-profile-history-1/);
  assert.match(profileHistorySource, /global\.PadelstarProfileHistory/);
  assert.doesNotMatch(profileHistorySource, /localStorage|document\.querySelector/);
});

test("court settings have their own domain boundary", () => {
  assert.match(indexSource, /app\/court-settings\.js\?v=padelstar-court-settings-1/);
  assert.match(serviceWorkerSource, /app\/court-settings\.js\?v=padelstar-court-settings-1/);
  assert.match(courtSettingsSource, /global\.PadelstarCourtSettings/);
  assert.doesNotMatch(courtSettingsSource, /localStorage|document\.querySelector/);
  assert.match(appSource, /courtSettings\.renderCourtNames\(\)/);
});

test("setup forms have their own boundary", () => {
  assert.match(indexSource, /app\/setup-forms\.js\?v=padelstar-setup-forms-1/);
  assert.match(serviceWorkerSource, /app\/setup-forms\.js\?v=padelstar-setup-forms-1/);
  assert.match(setupFormsSource, /global\.PadelstarSetupForms/);
  assert.doesNotMatch(setupFormsSource, /localStorage|document\.querySelector/);
  assert.match(appSource, /setupForms\.syncJoinPreview\(\)/);
});

test("tournament queries have their own domain boundary", () => {
  assert.match(indexSource, /app\/tournament-queries\.js\?v=padelstar-tournament-queries-1/);
  assert.match(serviceWorkerSource, /app\/tournament-queries\.js\?v=padelstar-tournament-queries-1/);
  assert.match(tournamentQueriesSource, /global\.PadelstarTournamentQueries/);
  assert.doesNotMatch(tournamentQueriesSource, /localStorage|document\.querySelector/);
  assert.match(appSource, /tournamentQueries\.getAllMatches\(\)/);
});

test("tournament sharing has its own browser API boundary", () => {
  assert.match(indexSource, /app\/tournament-sharing\.js\?v=padelstar-tournament-sharing-1/);
  assert.match(serviceWorkerSource, /app\/tournament-sharing\.js\?v=padelstar-tournament-sharing-1/);
  assert.match(tournamentSharingSource, /global\.PadelstarTournamentSharing/);
  assert.match(tournamentSharingSource, /navigator\.clipboard|navigator\.share/);
  assert.match(appSource, /tournamentSharing\.shareCurrentTournament\(\)/);
});

test("score result submissions have their own domain boundary", () => {
  assert.match(indexSource, /app\/result-submissions\.js\?v=padelstar-result-submissions-1/);
  assert.match(serviceWorkerSource, /app\/result-submissions\.js\?v=padelstar-result-submissions-1/);
  assert.match(resultSubmissionsSource, /global\.PadelstarResultSubmissions/);
  assert.match(resultSubmissionsSource, /score_submitted|result_resolved/);
  assert.match(appSource, /resultSubmissions\.submitPlayerResult\(matchId, teamOne, teamTwo\)/);
});

test("remote state writes have their own persistence boundary", () => {
  assert.match(remoteStateWriteSource, /save_tournament_state/);
  assert.match(remoteStateWriteSource, /global\.PadelstarRemoteStateWrite/);
  assert.match(appSource, /remoteStateWrite\.saveRemoteState\(\)/);
  assert.doesNotMatch(appSource, /p_state: sanitizeSharedState\(state\)/);
});

test("remote admin mutations have their own RPC boundary", () => {
  assert.match(remoteAdminActionsSource, /admin_match_action/);
  assert.match(remoteAdminActionsSource, /admin_set_result/);
  assert.match(remoteAdminActionsSource, /global\.PadelstarRemoteAdminActions/);
  assert.match(indexSource, /app\/remote-admin-actions\.js\?v=padelstar-remote-admin-actions-1/);
  assert.match(serviceWorkerSource, /app\/remote-admin-actions\.js\?v=padelstar-remote-admin-actions-1/);
  assert.match(appSource, /remoteAdminActions\.queueRemoteMatchAction/);
  assert.doesNotMatch(appSource, /admin_advance_round.*p_expected_revision/s);
});

test("remote player scoring has its own queue boundary", () => {
  assert.match(remotePlayerScoreSource, /save_player_point/);
  assert.match(remotePlayerScoreSource, /global\.PadelstarRemotePlayerScore/);
  assert.match(indexSource, /app\/remote-player-score\.js\?v=padelstar-remote-player-score-1/);
  assert.match(serviceWorkerSource, /app\/remote-player-score\.js\?v=padelstar-remote-player-score-1/);
  assert.match(appSource, /remotePlayerScore\.queuePlayerScore/);
});

test("score actions have their own mutation boundary", () => {
  assert.match(scoreActionsSource, /awardTennisPoint/);
  assert.match(scoreActionsSource, /saveSetResult/);
  assert.match(scoreActionsSource, /global\.PadelstarScoreActions/);
  assert.match(indexSource, /app\/score-actions\.js\?v=padelstar-score-actions-2/);
  assert.match(serviceWorkerSource, /app\/score-actions\.js\?v=padelstar-score-actions-2/);
  assert.match(appSource, /scoreActions\.awardTennisPoint/);
});

test("workspace navigation has its own UI boundary", () => {
  assert.match(workspaceNavigationSource, /renderRoleVisibility/);
  assert.match(workspaceNavigationSource, /global\.PadelstarWorkspaceNavigation/);
  assert.match(indexSource, /app\/workspace-navigation\.js\?v=padelstar-workspace-navigation-3/);
  assert.match(serviceWorkerSource, /app\/workspace-navigation\.js\?v=padelstar-workspace-navigation-3/);
  assert.match(appSource, /workspaceNavigation\.showModule/);
});

test("global app event wiring has its own boundary", () => {
  assert.match(appEventsSource, /function bind\(/);
  assert.match(appEventsSource, /global\.PadelstarAppEvents/);
  assert.match(indexSource, /app\/app-events\.js\?v=padelstar-app-events-1/);
  assert.match(serviceWorkerSource, /app\/app-events\.js\?v=padelstar-app-events-1/);
  assert.match(appSource, /PadelstarAppEvents\?\.bind/);
});

test("workspace session controls have their own event boundary", () => {
  assert.match(workspaceEventsSource, /function bind\(/);
  assert.match(workspaceEventsSource, /global\.PadelstarWorkspaceEvents/);
  assert.match(indexSource, /app\/workspace-events\.js\?v=padelstar-workspace-events-1/);
  assert.match(serviceWorkerSource, /app\/workspace-events\.js\?v=padelstar-workspace-events-1/);
  assert.match(appSource, /PadelstarWorkspaceEvents\?\.bind/);
});

test("tournament create and join flows have their own event boundary", () => {
  assert.match(tournamentEntrySource, /handleCreate/);
  assert.match(tournamentEntrySource, /handleJoin/);
  assert.match(tournamentEntrySource, /global\.PadelstarTournamentEntry/);
  assert.match(indexSource, /app\/tournament-entry\.js\?v=padelstar-tournament-entry-1/);
  assert.match(serviceWorkerSource, /app\/tournament-entry\.js\?v=padelstar-tournament-entry-1/);
  assert.match(appSource, /PadelstarTournamentEntry\?\.create/);
});

test("admin form mutations have their own event boundary", () => {
  assert.match(adminFormEventsSource, /generateRoundBlockReason/);
  assert.match(adminFormEventsSource, /global\.PadelstarAdminFormEvents/);
  assert.match(indexSource, /app\/admin-form-events\.js\?v=padelstar-admin-form-events-2/);
  assert.match(serviceWorkerSource, /app\/admin-form-events\.js\?v=padelstar-admin-form-events-2/);
  assert.match(appSource, /PadelstarAdminFormEvents\?\.create/);
});

test("setup pages share the app shell width with workspace pages", () => {
  assert.match(componentsStylesSource, /\.setup-card \{\s*width: 100%;/);
  assert.match(indexSource, /id="createTournamentForm"/);
  assert.match(indexSource, /id="joinTournamentForm"/);
});

test("match lifecycle actions have their own mutation boundary", () => {
  assert.match(matchActionsSource, /captureMatchUndoState/);
  assert.match(matchActionsSource, /setWalkover/);
  assert.match(matchActionsSource, /global\.PadelstarMatchActions/);
  assert.match(indexSource, /app\/match-actions\.js\?v=padelstar-match-actions-1/);
  assert.match(serviceWorkerSource, /app\/match-actions\.js\?v=padelstar-match-actions-1/);
  assert.match(appSource, /matchActions\.startMatch/);
});

test("initial URL and session view restoration has its own boundary", () => {
  assert.match(initialViewSource, /function restore\(/);
  assert.match(initialViewSource, /global\.PadelstarInitialView/);
  assert.match(indexSource, /app\/initial-view\.js\?v=padelstar-initial-view-1/);
  assert.match(serviceWorkerSource, /app\/initial-view\.js\?v=padelstar-initial-view-1/);
  assert.match(appSource, /initialView\.restore/);
});

test("all active app icon surfaces use the shared Padelstar icon", () => {
  assert.match(indexSource, /apple-touch-icon" href="assets\/icons\/padelstar-icon\.png/);
  assert.match(indexSource, /rel="icon" href="assets\/icons\/padelstar-icon\.png/);
  assert.match(privacySource, /apple-touch-icon" href="assets\/icons\/padelstar-icon\.png/);
  assert.match(privacySource, /rel="icon" href="assets\/icons\/padelstar-icon\.png/);
  assert.match(manifestSource, /"src": "assets\/icons\/padelstar-192\.png"/);
  assert.match(manifestSource, /"src": "assets\/icons\/padelstar-maskable-512\.png"/);
  assert.match(serviceWorkerSource, /assets\/icons\/padelstar-192\.png/);
  assert.match(serviceWorkerSource, /assets\/icons\/padelstar-512\.png/);
  assert.match(serviceWorkerSource, /icon: "\.\/assets\/icons\/padelstar-icon\.png"/);
  assert.match(serviceWorkerSource, /badge: "\.\/assets\/icons\/padelstar-icon\.png"/);
  assert.match(matchCardSource, /src="assets\/icons\/padelstar-icon\.png"/);
});

test("PWA install flow supports native prompts, standalone detection and platform fallback", () => {
  assert.match(pwaInstallSource, /beforeinstallprompt/);
  assert.match(pwaInstallSource, /appinstalled/);
  assert.match(pwaInstallSource, /display-mode: standalone/);
  assert.match(pwaInstallSource, /iphone\|ipad\|ipod/);
  assert.match(indexSource, /id="installAppButton"/);
  assert.match(indexSource, /id="installModal"/);
  assert.match(indexSource, /id="installInstructions"/);
  assert.match(indexSource, /app\/pwa-install\.js\?v=padelstar-pwa-install-2/);
  assert.match(serviceWorkerSource, /app\/pwa-install\.js\?v=padelstar-pwa-install-2/);
});

test("tournament creation keeps profiles optional while tracking ownership", () => {
  assert.doesNotMatch(indexSource, /name="avatarId"/);
  assert.match(tournamentEntrySource, /getAdminAuthUser/);
  assert.match(appSource, /getAdminAuthUser: async \(\) => accountAuth\?\.currentUser\(\)/);
  assert.match(appSource, /showAccount: \(\) => showModule\("account"\)/);
  assert.match(tournamentEntrySource, /getProfile/);
  assert.match(tournamentEntrySource, /randomAvatarId/);
  assert.match(tournamentEntrySource, /ownerUserId/);
  assert.match(tournamentEntrySource, /ownerProfileId/);
  assert.match(fs.readFileSync(path.join(root, "supabase_schema.sql"), "utf8"), /owner_user_id, claimed_at/);
  assert.match(appSource, /detectSessionInUrl: true/);
  assert.match(indexSource, /id="createAdminSignInLinkButton"/);
  assert.match(indexSource, /class="setup-account-option"/);
  assert.doesNotMatch(indexSource, /id="createAccountAuthButton"[^>]*data-module-link/);
});

test("home and menu expose account and TV Mode entry points", () => {
  assert.match(indexSource, /id="signInModuleLink"[^>]*data-module-link="account"[^>]*data-focus-target="profileNameInput"/);
  assert.match(indexSource, /id="adminEmail"[^>]*name="adminEmail"/);
  assert.match(indexSource, /id="tvModeMenuButton"[^>]*data-action="tv-mode"/);
  assert.match(navigationSource, /focusTarget/);
  assert.match(appSource, /tvModeMenuButton/);
});

test("TV Mode is a full-viewport read-only layout across aspect ratios", () => {
  assert.match(indexSource, /class="tv-mode-logo"[^>]*src="assets\/icons\/padelstar-icon\.png"/);
  assert.doesNotMatch(indexSource, /id="tvModeButton"/);
  assert.match(indexSource, /id="tvModeMenuButton"[^>]*data-action="tv-mode"/);
  assert.match(modulesStylesSource, /\.tv-mode \.app-shell[\s\S]*height: 100dvh/);
  assert.match(modulesStylesSource, /\.tv-mode \.site-footer/);
  assert.match(modulesStylesSource, /\.tv-mode \.workspace-header #roleIndicator/);
  assert.match(modulesStylesSource, /\.tv-mode \.workspace-header #leaveSessionButton/);
  assert.match(modulesStylesSource, /top: clamp\(10px, 1\.5vw, 24px\)/);
  assert.match(modulesStylesSource, /\.tv-mode \.tv-queue-panel \.court-queue[\s\S]*padding-top: 0/);
  assert.match(modulesStylesSource, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(modulesStylesSource, /@media \(max-width: 1000px\), \(max-aspect-ratio: 3 \/ 2\)/);
  assert.match(modulesStylesSource, /text-transform: uppercase/);
});

test("branding uses the shield icon in the menu and the wordmark in the hero", () => {
  assert.match(indexSource, /class="brand-logo" src="assets\/icons\/padelstar-icon\.png"/);
  assert.match(indexSource, /class="hero-logo-wordmark"[\s\S]*src="assets\/logos\/main_logo_without_icon\.png"/);
  assert.match(componentsStylesSource, /\.hero-logo-wordmark[\s\S]*aspect-ratio: 1500 \/ 352/);
});

test("TV header uses the icon and the standalone wordmark", () => {
  assert.match(indexSource, /class="tv-mode-wordmark"[\s\S]*main_logo_without_icon\.png/);
  assert.match(indexSource, /class="tv-mode-logo"[\s\S]*assets\/icons\/padelstar-icon\.png/);
  assert.match(modulesStylesSource, /\.tv-mode \.tv-mode-wordmark[\s\S]*display: block/);
});

test("account entry opens a separate profile module and landing actions center odd buttons", () => {
  assert.match(indexSource, /id="signInModuleLink"[^>]*data-module-link="account"[^>]*data-i18n="nav.account"/);
  assert.match(indexSource, /id="accountView"[^>]*data-module="account"/);
  assert.match(indexSource, /id="profileForm"/);
  assert.match(componentsStylesSource, /\.landing-actions > :last-child:nth-child\(odd\)[\s\S]*width: 50%/);
  assert.match(moduleRoutingSource, /"account"/);
});

test("account profile uses automatic avatars without exposing an avatar picker", () => {
  assert.doesNotMatch(indexSource, /id="profileAvatarPicker"/);
  assert.match(profileSessionSource, /\| defaultAvatarId/);
  assert.match(profileUiSource, /profileAvatarPicker\?\.querySelectorAll/);
});

test("connection status is a dot indicator with green online and gray offline states", () => {
  assert.match(indexSource, /id="connectionStatus"/);
  assert.match(componentsStylesSource, /\.status-pill::before[\s\S]*border-radius: 50%/);
  assert.match(componentsStylesSource, /\.status-pill \{[\s\S]*color: #55e69a/);
  assert.match(componentsStylesSource, /\.status-pill\.offline[\s\S]*color: #9aa7b8/);
});

test("local, disconnected and unavailable connections all use the offline label", () => {
  assert.match(adminStatusSource, /const statusKey = isOnline \? "realtimeConnected" : "offline"/);
  assert.match(adminStatusSource, /const statusClass = isOnline \? "connected" : "offline"/);
  assert.match(translationsSource, /localPwa: "Offline"/);
});

test("TV module headings share one larger display style", () => {
  assert.match(modulesStylesSource, /\.tv-mode \.panel-heading h3[\s\S]*font-family: var\(--font-display\)/);
  assert.match(modulesStylesSource, /\.tv-mode \.spectator-live-group > h4[\s\S]*font-size: clamp\(1rem, 1\.25vw, 1\.35rem\)/);
});

test("navigation menu is contextual and uses TV Mode for the public tournament view", () => {
  assert.match(workspaceNavigationSource, /"setup-admin",\n\s+"setup-player",/);
  assert.match(workspaceNavigationSource, /const canShowAdmin = tournamentIsActive && isAdmin/);
  assert.match(workspaceNavigationSource, /const canShowPlayer = tournamentIsActive && Boolean\(state\.selectedPlayerId\)/);
  assert.match(workspaceNavigationSource, /elements\.tournamentTab\.classList\.add\("hidden"\)/);
});

test("rules are available in the player workspace, not the public tournament view", () => {
  assert.match(indexSource, /data-section="player"[\s\S]*player-rules-panel[\s\S]*id="rulesList"/);
  const tournamentSection = indexSource.match(/<section class="view-grid hidden" data-section="tournament"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.doesNotMatch(tournamentSection, /id="rulesList"/);
});

test("browser entrypoint uses the organized app and styles directories", () => {
  assert.doesNotMatch(indexSource, /<style[\s>]/);
  assert.match(indexSource, /href="styles\/styles\.css/);
  assert.match(indexSource, /href="styles\/base\.css/);
  assert.match(indexSource, /href="styles\/layout\.css/);
  assert.match(indexSource, /href="styles\/components\.css/);
  assert.match(indexSource, /href="styles\/modules\.css/);
  assert.match(indexSource, /href="styles\/responsive\.css/);
  assert.match(indexSource, /src="app\/translations\.js/);
  assert.match(indexSource, /src="app\/app\.js/);
  assert.match(serviceWorkerSource, /"\.\/styles\/styles\.css/);
  assert.match(serviceWorkerSource, /"\.\/styles\/base\.css/);
  assert.match(serviceWorkerSource, /"\.\/styles\/layout\.css/);
  assert.match(serviceWorkerSource, /"\.\/styles\/components\.css/);
  assert.match(serviceWorkerSource, /"\.\/styles\/modules\.css/);
  assert.match(serviceWorkerSource, /"\.\/styles\/responsive\.css/);
  assert.match(privacySource, /href="styles\/privacy\.css/);
  assert.match(serviceWorkerSource, /"\.\/styles\/privacy\.css/);
  assert.match(privacySource, /src="app\/privacy-i18n\.js/);
  assert.match(serviceWorkerSource, /"\.\/app\/privacy-i18n\.js/);
  assert.match(serviceWorkerSource, /"\.\/app\/app\.js/);
  assert.match(serviceWorkerSource, /"\.\/app\/i18n-ui\.js/);
  assert.match(serviceWorkerSource, /"\.\/app\/storage\.js/);
  assert.match(serviceWorkerSource, /"\.\/app\/rendering\.js/);
  assert.match(serviceWorkerSource, /"\.\/app\/remote-tournament\.js/);
  assert.match(indexSource, /src="app\/ui-effects\.js/);
  assert.match(indexSource, /src="app\/remote-rpc\.js/);
  assert.match(serviceWorkerSource, /"\.\/app\/ui-effects\.js/);
  assert.match(serviceWorkerSource, /"\.\/app\/remote-rpc\.js/);
});

test("privacy page follows the local user language preference", () => {
  assert.match(privacySource, /id="privacyLanguage"/);
  assert.match(privacySource, /data-privacy-i18n="title"/);
  assert.match(privacyI18nSource, /padelstar-language/);
  assert.match(privacyI18nSource, /localStorage\.setItem/);
  assert.match(privacyI18nSource, /translations\[languageCode\]/);
});

test("player avatars use the DiceBear Lorelei Neutral style", () => {
  assert.match(avatarSystemSource, /api\.dicebear\.com\/10\.x\/lorelei-neutral\/svg/);
  assert.match(avatarSystemSource, /Sophie/);
  assert.match(avatarSystemSource, /Aiden/);
  assert.match(avatarSystemSource, /Luna/);
  assert.match(avatarSystemSource, /Milo/);
  assert.match(appSource, /avatarMarkup/);
  assert.doesNotMatch(avatarSystemSource, /api\.dicebear\.com\/10\.x\/thumbs\/svg/);
});

test("player accent styling has its own module boundary", () => {
  assert.match(accentSystemSource, /normalizeAccent/);
  assert.match(accentSystemSource, /accentStyle/);
  assert.match(accentSystemSource, /global\.PadelstarAccentSystem/);
  assert.match(indexSource, /app\/accent-system\.js\?v=padelstar-accent-system-1/);
  assert.match(serviceWorkerSource, /app\/accent-system\.js\?v=padelstar-accent-system-1/);
  assert.doesNotMatch(appSource, /function hexToRgb/);
});

test("confirmation and toast feedback has its own module boundary", () => {
  assert.match(uiFeedbackSource, /requestConfirmation/);
  assert.match(uiFeedbackSource, /showToast/);
  assert.match(uiFeedbackSource, /global\.PadelstarUiFeedback/);
  assert.match(indexSource, /app\/ui-feedback\.js\?v=padelstar-ui-feedback-1/);
  assert.match(serviceWorkerSource, /app\/ui-feedback\.js\?v=padelstar-ui-feedback-1/);
});

test("backup format has its own token-free serialization boundary", () => {
  assert.match(backupFormatSource, /serialize/);
  assert.match(backupFormatSource, /parse/);
  assert.match(backupFormatSource, /global\.PadelstarBackupFormat/);
  assert.match(indexSource, /app\/backup-format\.js\?v=padelstar-backup-format-1/);
  assert.match(serviceWorkerSource, /app\/backup-format\.js\?v=padelstar-backup-format-1/);
  assert.match(backupFormatSource, /sanitizeState/);
});

test("push notifications have their own browser and subscription boundary", () => {
  assert.match(notificationSystemSource, /sendPushNotification/);
  assert.match(notificationSystemSource, /subscribeToPush/);
  assert.match(notificationSystemSource, /global\.PadelstarNotificationSystem/);
  assert.match(notificationSystemSource, /notifyPlayerMatch/);
  assert.match(indexSource, /app\/notification-system\.js\?v=padelstar-notification-system-1/);
  assert.match(serviceWorkerSource, /app\/notification-system\.js\?v=padelstar-notification-system-1/);
  assert.doesNotMatch(appSource, /return Uint8Array\.from\(atob/);
});

test("profile session lifecycle has its own storage and RPC boundary", () => {
  assert.match(profileSessionSource, /loadLocalProfile/);
  assert.match(profileSessionSource, /syncProfileRemote/);
  assert.match(profileSessionSource, /requestProfileDeletion/);
  assert.match(profileSessionSource, /global\.PadelstarProfileSession/);
  assert.match(indexSource, /app\/profile-session\.js\?v=padelstar-profile-session-1/);
  assert.match(serviceWorkerSource, /app\/profile-session\.js\?v=padelstar-profile-session-1/);
  assert.match(indexSource, /app\/bootstrap\/dom-elements\.js\?v=padelstar-dom-elements-1/);
  assert.match(indexSource, /app\/bootstrap\/app-meta\.js\?v=padelstar-app-meta-1/);
  assert.match(indexSource, /app\/ui\/theme\.js\?v=padelstar-theme-1/);
  assert.match(serviceWorkerSource, /app\/bootstrap\/dom-elements\.js\?v=padelstar-dom-elements-1/);
  assert.match(serviceWorkerSource, /app\/bootstrap\/app-meta\.js\?v=padelstar-app-meta-1/);
  assert.match(serviceWorkerSource, /app\/ui\/theme\.js\?v=padelstar-theme-1/);
  assert.doesNotMatch(appSource, /p_profile_token:\s*profile\.accessToken/);
});

test("match card rendering has its own DOM and action boundary", () => {
  assert.match(matchCardSource, /createMatchCard/);
  assert.match(matchCardSource, /global\.PadelstarMatchCard/);
  assert.match(indexSource, /app\/match-card\.js\?v=padelstar-match-card-1/);
  assert.match(serviceWorkerSource, /app\/match-card\.js\?v=padelstar-match-card-1/);
  assert.doesNotMatch(appSource, /createMatchCardLegacy/);
});

test("match list rendering has its own grouping and spectator boundary", () => {
  assert.match(matchListSource, /renderGroupedMatches/);
  assert.match(matchListSource, /renderSpectatorMatches/);
  assert.match(matchListSource, /window\.PadelstarMatchList/);
  assert.match(indexSource, /app\/match-list\.js\?v=padelstar-match-list-1/);
  assert.match(serviceWorkerSource, /app\/match-list\.js\?v=padelstar-match-list-1/);
  assert.doesNotMatch(appSource, /function renderGroupedMatches/);
  assert.doesNotMatch(appSource, /function renderSpectatorMatches/);
});

test("standings rendering has its own leaderboard boundary", () => {
  assert.match(standingsSource, /renderStandings/);
  assert.match(standingsSource, /window\.PadelstarStandings/);
  assert.match(indexSource, /app\/standings\.js\?v=padelstar-standings-1/);
  assert.match(serviceWorkerSource, /app\/standings\.js\?v=padelstar-standings-1/);
  assert.doesNotMatch(appSource, /function renderStandingsList/);
});

test("player list rendering has its own player-management boundary", () => {
  assert.match(playerListSource, /renderPlayers/);
  assert.match(playerListSource, /renderExistingPlayerList/);
  assert.match(playerListSource, /window\.PadelstarPlayerList/);
  assert.match(indexSource, /app\/player-list\.js\?v=padelstar-player-list-1/);
  assert.match(serviceWorkerSource, /app\/player-list\.js\?v=padelstar-player-list-1/);
  assert.match(appSource, /playerList\.renderPlayers\(\)/);
});

test("cup bracket rendering has its own DOM boundary", () => {
  assert.match(cupBracketSource, /renderCupBracket/);
  assert.match(cupBracketSource, /window\.PadelstarCupBracket/);
  assert.match(indexSource, /app\/cup-bracket\.js\?v=padelstar-cup-bracket-2/);
  assert.match(serviceWorkerSource, /app\/cup-bracket\.js\?v=padelstar-cup-bracket-2/);
  assert.match(appSource, /cupBracket\.renderCupBracket\(\)/);
});

test("player status rendering has its own dashboard boundary", () => {
  assert.match(playerStatusSource, /renderPlayerStatus/);
  assert.match(playerStatusSource, /window\.PadelstarPlayerStatus/);
  assert.match(indexSource, /app\/player-status\.js\?v=padelstar-player-status-1/);
  assert.match(serviceWorkerSource, /app\/player-status\.js\?v=padelstar-player-status-1/);
  assert.match(appSource, /playerStatus\.renderPlayerStatus\(matches\)/);
});

test("player next-match rendering has its own workspace boundary", () => {
  assert.match(playerNextMatchSource, /renderPlayerNextMatch/);
  assert.match(playerNextMatchSource, /window\.PadelstarPlayerNextMatch/);
  assert.match(indexSource, /app\/player-next-match\.js\?v=padelstar-player-next-match-1/);
  assert.match(serviceWorkerSource, /app\/player-next-match\.js\?v=padelstar-player-next-match-1/);
  assert.match(appSource, /playerNextMatch\.renderPlayerNextMatch\(matches\)/);
});

test("rules rendering has its own translation and DOM boundary", () => {
  assert.match(rulesSource, /renderRules/);
  assert.match(rulesSource, /window\.PadelstarRules/);
  assert.match(indexSource, /app\/rules\.js\?v=padelstar-rules-1/);
  assert.match(serviceWorkerSource, /app\/rules\.js\?v=padelstar-rules-1/);
  assert.match(appSource, /rules\.renderRules\(\)/);
});

test("player controls have their own identity and session boundary", () => {
  assert.match(playerControlsSource, /renderPlayerIdentity/);
  assert.match(playerControlsSource, /renderLeaveTournamentControl/);
  assert.match(playerControlsSource, /window\.PadelstarPlayerControls/);
  assert.match(indexSource, /app\/player-controls\.js\?v=padelstar-player-controls-1/);
  assert.match(serviceWorkerSource, /app\/player-controls\.js\?v=padelstar-player-controls-1/);
  assert.match(appSource, /playerControls\.renderPlayerIdentity\(\)/);
});

test("large score rendering has its own dialog boundary", () => {
  assert.match(largeScoreSource, /renderLargeScore/);
  assert.match(largeScoreSource, /window\.PadelstarLargeScore/);
  assert.match(indexSource, /app\/large-score\.js\?v=padelstar-large-score-1/);
  assert.match(serviceWorkerSource, /app\/large-score\.js\?v=padelstar-large-score-1/);
  assert.match(appSource, /largeScore\.renderLargeScore\(largeScoreMatchId\)/);
});

test("set score dialog owns quick-result rendering and selection", () => {
  assert.match(setScoreDialogSource, /openSetScoreDialog/);
  assert.match(setScoreDialogSource, /quickScoreButtons/);
  assert.match(setScoreDialogSource, /window\.PadelstarSetScoreDialog/);
  assert.match(indexSource, /app\/set-score-dialog\.js\?v=padelstar-set-score-dialog-1/);
  assert.match(serviceWorkerSource, /app\/set-score-dialog\.js\?v=padelstar-set-score-dialog-1/);
  assert.match(appSource, /setScoreDialog\.openSetScoreDialog\(matchId\)/);
});

test("admin status rendering has its own lobby and sync boundary", () => {
  assert.match(adminStatusSource, /renderLobbyStatus/);
  assert.match(adminStatusSource, /renderSyncControls/);
  assert.match(adminStatusSource, /renderStartResume/);
  assert.match(adminStatusSource, /syncConnectionStatus/);
  assert.match(adminStatusSource, /window\.PadelstarAdminStatus/);
  assert.match(indexSource, /app\/admin-status\.js\?v=padelstar-admin-status-2/);
  assert.match(serviceWorkerSource, /app\/admin-status\.js\?v=padelstar-admin-status-2/);
  assert.match(appSource, /adminStatus\.renderLobbyStatus\(\)/);
});

test("profile UI rendering has its own form and history boundary", () => {
  assert.match(profileUiSource, /renderProfile/);
  assert.match(profileUiSource, /window\.PadelstarProfileUi/);
  assert.match(indexSource, /app\/profile-ui\.js\?v=padelstar-profile-ui-1/);
  assert.match(serviceWorkerSource, /app\/profile-ui\.js\?v=padelstar-profile-ui-1/);
  assert.match(appSource, /profileUi\.renderProfile\(\)/);
});

test("backup UI has its own import and export boundary", () => {
  assert.match(backupUiSource, /exportBackup/);
  assert.match(backupUiSource, /importBackup/);
  assert.match(backupUiSource, /window\.PadelstarBackupUi/);
  assert.match(indexSource, /app\/backup-ui\.js\?v=padelstar-backup-ui-1/);
  assert.match(serviceWorkerSource, /app\/backup-ui\.js\?v=padelstar-backup-ui-1/);
  assert.match(appSource, /backupUi\.importBackup\(event\)/);
});

test("player state operations have their own domain boundary", () => {
  assert.match(playerStateSource, /parsePlayerNames/);
  assert.match(playerStateSource, /updatePlayer/);
  assert.match(playerStateSource, /removePlayer/);
  assert.match(playerStateSource, /window\.PadelstarPlayerState/);
  assert.match(indexSource, /app\/player-state\.js\?v=padelstar-player-state-1/);
  assert.match(serviceWorkerSource, /app\/player-state\.js\?v=padelstar-player-state-1/);
  assert.match(appSource, /playerState\.updatePlayer\(playerId, updates\)/);
});

test("tournament status logic has its own scheduling boundary", () => {
  assert.match(tournamentStatusSource, /generateRoundBlockReason/);
  assert.match(tournamentStatusSource, /tournamentActionText/);
  assert.match(tournamentStatusSource, /window\.PadelstarTournamentStatus/);
  assert.match(indexSource, /app\/tournament-status\.js\?v=padelstar-tournament-status-1/);
  assert.match(serviceWorkerSource, /app\/tournament-status\.js\?v=padelstar-tournament-status-1/);
  assert.match(appSource, /tournamentStatus\.generateRoundBlockReason\(\)/);
});

test("local persistence has its own offline storage boundary", () => {
  assert.match(persistenceSource, /writeTournamentState/);
  assert.match(persistenceSource, /mirrorKeys/);
  assert.match(persistenceSource, /global\.PadelstarPersistence/);
  assert.match(indexSource, /app\/persistence\.js\?v=padelstar-persistence-1/);
  assert.match(serviceWorkerSource, /app\/persistence\.js\?v=padelstar-persistence-1/);
});

test("admin identity lifecycle has its own module boundary", () => {
  assert.match(adminIdentitySource, /claimCurrentTournament/);
  assert.match(adminIdentitySource, /global\.PadelstarAdminIdentity/);
  assert.match(indexSource, /app\/admin-identity\.js\?v=padelstar-admin-identity-1/);
  assert.match(serviceWorkerSource, /app\/admin-identity\.js\?v=padelstar-admin-identity-1/);
});

test("remote feedback has its own RPC and status boundary", () => {
  assert.match(remoteFeedbackSource, /getTournamentByInviteRpc/);
  assert.match(remoteFeedbackSource, /sanitizeSharedState/);
  assert.match(remoteFeedbackSource, /global\.PadelstarRemoteFeedback/);
  assert.match(indexSource, /app\/remote-feedback\.js\?v=padelstar-remote-feedback-1/);
  assert.match(serviceWorkerSource, /app\/remote-feedback\.js\?v=padelstar-remote-feedback-1/);
});

test("realtime connection has its own lifecycle boundary", () => {
  assert.match(realtimeConnectionSource, /scheduleReconnect/);
  assert.match(realtimeConnectionSource, /global\.PadelstarRealtimeConnection/);
  assert.match(indexSource, /app\/realtime-connection\.js\?v=padelstar-realtime-connection-1/);
  assert.match(serviceWorkerSource, /app\/realtime-connection\.js\?v=padelstar-realtime-connection-1/);
});

test("link and QR generation has its own module boundary", () => {
  assert.match(linkUtilsSource, /createJoinLink/);
  assert.match(linkUtilsSource, /createSpectatorLink/);
  assert.match(linkUtilsSource, /createQrCodeUrl/);
  assert.match(linkUtilsSource, /global\.PadelstarLinks/);
  assert.match(indexSource, /app\/link-utils\.js\?v=padelstar-link-utils-1/);
  assert.match(serviceWorkerSource, /app\/link-utils\.js\?v=padelstar-link-utils-1/);
  assert.doesNotMatch(appSource, /quickchart\.io\/qr/);
});

test("tournament state construction has its own module boundary", () => {
  assert.match(tournamentStateSource, /createTournament/);
  assert.match(tournamentStateSource, /createPlayer/);
  assert.match(tournamentStateSource, /global\.PadelstarTournamentState/);
  assert.match(indexSource, /app\/tournament-state\.js\?v=padelstar-tournament-state-1/);
  assert.match(serviceWorkerSource, /app\/tournament-state\.js\?v=padelstar-tournament-state-1/);
});

test("state bootstrap has its own recovery module boundary", () => {
  assert.match(stateBootstrapSource, /loadState/);
  assert.match(stateBootstrapSource, /loadSavedState/);
  assert.match(stateBootstrapSource, /global\.PadelstarStateBootstrap/);
  assert.match(indexSource, /app\/state-bootstrap\.js\?v=padelstar-state-bootstrap-1/);
  assert.match(serviceWorkerSource, /app\/state-bootstrap\.js\?v=padelstar-state-bootstrap-1/);
});

test("module routing has its own policy boundary", () => {
  assert.match(moduleRoutingSource, /normalizeModule/);
  assert.match(moduleRoutingSource, /fallbackTournamentModule/);
  assert.match(moduleRoutingSource, /global\.PadelstarModuleRouting/);
  assert.match(indexSource, /app\/module-routing\.js\?v=padelstar-module-routing-1/);
  assert.match(serviceWorkerSource, /app\/module-routing\.js\?v=padelstar-module-routing-1/);
});

test("session role policy has its own boundary", () => {
  assert.match(sessionPolicySource, /hasTournamentForInvite/);
  assert.match(sessionPolicySource, /currentLocalRole/);
  assert.match(sessionPolicySource, /global\.PadelstarSessionPolicy/);
  assert.match(indexSource, /app\/session-policy\.js\?v=padelstar-session-policy-1/);
  assert.match(serviceWorkerSource, /app\/session-policy\.js\?v=padelstar-session-policy-1/);
});

test("language DOM handling has its own module boundary", () => {
  assert.match(i18nUiSource, /loadUserLanguage/);
  assert.match(i18nUiSource, /applyLanguage/);
  assert.match(i18nUiSource, /syncLanguageOptions/);
  assert.match(i18nUiSource, /window\.PadelstarI18nUi/);
  assert.match(indexSource, /id="languageMenu"/);
  assert.match(i18nUiSource, /language-option/);
  assert.match(translationsSource, /flag: "🇬🇧"/);
  assert.match(translationsSource, /code: "sv".*flag: "🇸🇪"/s);
  assert.match(translationsSource, /code: "da".*flag: "🇩🇰"/s);
});

test("JSON persistence has its own storage module boundary", () => {
  assert.match(storageSource, /readJson/);
  assert.match(storageSource, /writeJson/);
  assert.match(storageSource, /window\.PadelstarStorage/);
});

test("shared match rendering has its own module boundary", () => {
  assert.match(renderingSource, /primaryMatchHeadline/);
  assert.match(renderingSource, /scoreSummary/);
  assert.match(renderingSource, /sittingOutSummary/);
  assert.match(renderingSource, /window\.PadelstarRendering/);
});

test("remote tournament operations have their own module boundary", () => {
  assert.match(remoteTournamentSource, /createTournament/);
  assert.match(remoteTournamentSource, /loadByInvite/);
  assert.match(remoteTournamentSource, /window\.PadelstarRemoteTournament/);
});

test("admin and player actions have explicit module boundaries", () => {
  assert.match(adminActionsSource, /updateTournamentRules/);
  assert.match(adminActionsSource, /saveManualCupTeams/);
  assert.match(adminActionsSource, /updateCourtsFromInput/);
  assert.match(adminActionsSource, /window\.PadelstarAdminActions/);
  assert.match(playerActionsSource, /toggleSelectedPlayerAvailability/);
  assert.match(playerActionsSource, /window\.PadelstarPlayerActions/);
});

test("responsive navigation has one shared hamburger owner", () => {
  assert.match(indexSource, /id="appMenuToggle"/);
  assert.match(navigationSource, /app-menu-open/);
  assert.match(navigationSource, /event\.key === "Escape"/);
  assert.match(navigationSource, /data-module-link/);
  assert.match(responsiveStylesSource, /\.menu-drawer/);
  assert.match(responsiveStylesSource, /@media \(max-width: 900px\)/);
  assert.doesNotMatch(indexSource, /id="mobile-header-overrides"/);
});

test("navigation binds module links independently of the responsive drawer", () => {
  assert.match(navigationSource, /document\.querySelectorAll\("\[data-module-link\]"\)/);
  assert.match(navigationSource, /if \(!toggle\) return/);
  assert.match(uiConsistencyStylesSource, /\.language-picker > #languageSelect/);
});

test("tournament library reads and writes through the supplied local storage", () => {
  assert.match(tournamentLibrarySource, /storage\.readJson\(localStorage, storageKey\)/);
  assert.match(tournamentLibrarySource, /storage\.writeJson\(localStorage, storageKey, library\)/);
});

test("active navigation tabs do not render legacy underline decorations", () => {
  assert.doesNotMatch(componentsStylesSource, /\.subtab\.active::after/);
  assert.doesNotMatch(modulesStylesSource, /\.tab\.active::after/);
  assert.match(layoutStylesSource, /\.app-menu-toggle span/);
});

test("active app files do not reference archived assets", () => {
  const activeSources = [indexSource, serviceWorkerSource, stylesSource, fs.readFileSync(path.join(root, "app", "app.js"), "utf8")];
  assert.ok(activeSources.every((source) => !source.includes("assets/archive/")));
  assert.ok(activeSources.every((source) => !source.includes("docs/archive/")));
});

test("browser entrypoint and service worker use the same cache-busting versions", () => {
  assert.match(indexSource, /styles\/styles\.css\?v=padelstar-ui-96/);
  assert.match(indexSource, /app\/app\.js\?v=padelstar-session-39/);
  assert.match(indexSource, /app\/avatar-system\.js\?v=padelstar-avatar-system-1/);
  assert.match(indexSource, /app\/accent-system\.js\?v=padelstar-accent-system-1/);
  assert.match(indexSource, /app\/ui-feedback\.js\?v=padelstar-ui-feedback-1/);
  assert.match(indexSource, /app\/notification-system\.js\?v=padelstar-notification-system-1/);
  assert.match(indexSource, /app\/link-utils\.js\?v=padelstar-link-utils-1/);
  assert.match(indexSource, /app\/tournament-state\.js\?v=padelstar-tournament-state-1/);
  assert.match(indexSource, /app\/state-bootstrap\.js\?v=padelstar-state-bootstrap-1/);
  assert.match(indexSource, /app\/module-routing\.js\?v=padelstar-module-routing-1/);
  assert.match(indexSource, /app\/session-policy\.js\?v=padelstar-session-policy-1/);
  assert.match(serviceWorkerSource, /styles\/styles\.css\?v=padelstar-ui-96/);
  assert.match(serviceWorkerSource, /app\/app\.js\?v=padelstar-session-39/);
  assert.match(serviceWorkerSource, /app\/avatar-system\.js\?v=padelstar-avatar-system-1/);
  assert.match(serviceWorkerSource, /app\/accent-system\.js\?v=padelstar-accent-system-1/);
  assert.match(serviceWorkerSource, /app\/ui-feedback\.js\?v=padelstar-ui-feedback-1/);
  assert.match(serviceWorkerSource, /app\/notification-system\.js\?v=padelstar-notification-system-1/);
  assert.match(indexSource, /app\/profile-session\.js\?v=padelstar-profile-session-1/);
  assert.match(serviceWorkerSource, /app\/profile-session\.js\?v=padelstar-profile-session-1/);
  assert.match(serviceWorkerSource, /app\/link-utils\.js\?v=padelstar-link-utils-1/);
  assert.match(serviceWorkerSource, /app\/tournament-state\.js\?v=padelstar-tournament-state-1/);
  assert.match(serviceWorkerSource, /app\/state-bootstrap\.js\?v=padelstar-state-bootstrap-1/);
  assert.match(serviceWorkerSource, /app\/module-routing\.js\?v=padelstar-module-routing-1/);
  assert.match(serviceWorkerSource, /app\/session-policy\.js\?v=padelstar-session-policy-1/);
});

test("create form uses a generic default tournament name", () => {
  assert.match(indexSource, /data-i18n-placeholder="setup\.defaultTournamentName"/);
  assert.doesNotMatch(indexSource, /value="Risløkka Padel"/);
});

test("classic theme is the only available app theme", () => {
  assert.equal((indexSource.match(/data-theme-toggle/g) || []).length, 0);
  assert.match(indexSource, /<body class="landing-active" data-theme="classic">/);
  assert.match(themeSource, /function applyTheme\(/);
  assert.match(appMetaSource, /function registerServiceWorker\(/);
  assert.match(domElementsSource, /function create\(/);
  assert.doesNotMatch(themeSource, /coolSportsTheme|data-theme-toggle|data-cool-src/);
  assert.doesNotMatch(indexSource, /data-cool-src|Cool tema|cool sports-tema/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/themed\/cool-sports/);
});

test("stylesheet has no archived phase cascades", () => {
  assert.doesNotMatch(stylesSource, /PHASE 16|PHASE 17|PHASE 22|Review correction/);
  assert.doesNotMatch(stylesSource, /coolSportsTheme|cool sports-tema/);
});

test("stylesheet responsibilities are split into active layers", () => {
  assert.match(baseStylesSource, /DESIGN TOKENS/);
  assert.match(layoutStylesSource, /APP SHELL/);
  assert.match(componentsStylesSource, /TYPOGRAPHY/);
  assert.match(modulesStylesSource, /WORKSPACE/);
  assert.doesNotMatch(baseStylesSource, /APP SHELL/);
  assert.doesNotMatch(layoutStylesSource, /\n   WORKSPACE\n/);
});

test("service worker does not cache failed same-origin responses", () => {
  assert.match(serviceWorkerSource, /if \(!response \|\| !response\.ok\) return response;/);
  assert.match(serviceWorkerSource, /cache\.put\(event\.request, responseToCache\)/);
});

test("phase 4-6 modules are wired into the shared app shell", () => {
  assert.match(indexSource, /app\/player-statistics\.js\?v=padelstar-player-statistics-1/);
  assert.match(indexSource, /app\/tournament-insights\.js\?v=padelstar-insights-1/);
  assert.match(indexSource, /app\/historical-records\.js\?v=padelstar-history-1/);
  assert.match(indexSource, /value="groupsPlayoffs"/);
  assert.match(serviceWorkerSource, /app\/historical-records\.js\?v=padelstar-history-1/);
  assert.match(appSource, /PadelstarHistoricalRecords\.record/);
});

test("admin workspace keeps sharing and player management under control", () => {
  assert.equal((indexSource.match(/class="subtab/g) || []).length, 2);
  assert.match(indexSource, /data-admin-panel="control"[\s\S]*data-admin-panel="matches"/);
  assert.doesNotMatch(indexSource, /data-admin-panel="share"|data-admin-panel="players"/);
  assert.equal((indexSource.match(/data-admin-panel-section="control"/g) || []).length, 3);
  assert.match(indexSource, /class="admin-panel admin-integrated-panel" data-admin-panel-section="control"/);
});

test("module transitions support reduced motion and preserve focus intent", () => {
  assert.match(stylesSource, /prefers-reduced-motion: reduce/);
  assert.match(stylesSource, /\.app-module\.module-entering/);
  const appSource = fs.readFileSync(path.join(root, "app", "app.js"), "utf8");
  const effectsSource = fs.readFileSync(path.join(root, "app", "ui-effects.js"), "utf8");
  assert.match(appSource, /focusModuleHeading/);
  assert.match(effectsSource, /preventScroll: true/);
  assert.match(effectsSource, /flashMatchCards/);
});

test("status feedback has an accessible toast surface", () => {
  assert.match(indexSource, /id="appToast" role="status" aria-live="polite"/);
  assert.match(stylesSource, /\.app-toast\.is-visible/);
  assert.match(fs.readFileSync(path.join(root, "app", "app.js"), "utf8"), /function showToast/);
});

test("critical confirmations use an accessible dialog surface", () => {
  const appSource = fs.readFileSync(path.join(root, "app", "app.js"), "utf8");
  assert.match(indexSource, /<dialog class="app-confirm-dialog" id="appConfirmDialog"/);
  assert.match(indexSource, /aria-labelledby="appConfirmTitle"/);
  assert.match(indexSource, /aria-describedby="appConfirmMessage"/);
  assert.match(appSource, /function requestConfirmation\(message\)/);
  assert.match(uiFeedbackSource, /previouslyFocused\.focus\(\)/);
  assert.match(stylesSource, /\.app-confirm-dialog::backdrop/);
});

test("sync conflicts expose server refresh and local backup choices", () => {
  assert.match(indexSource, /id="conflictActions" role="group"/);
  assert.match(indexSource, /id="keepLocalBackupButton"/);
  const appSource = fs.readFileSync(path.join(root, "app", "app.js"), "utf8");
  assert.match(appSource, /keepLocalBackupButton\?\.addEventListener/);
  assert.match(appSource, /localBackupKept/);
  assert.match(appSource, /function pendingRemoteWriteCount\(\)/);
  assert.match(appSource, /function markSyncAttempt\(\)/);
  assert.match(appSource, /lastAttemptAt/);
});

test("browser smoke is wired into the Pages deployment gate", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "pages.yml"), "utf8");
  const smokeScript = fs.readFileSync(path.join(root, "scripts", "browser-smoke.sh"), "utf8");
  assert.match(workflow, /browser-smoke:/);
  assert.match(workflow, /needs: browser-smoke/);
  assert.match(smokeScript, /page\.route/);
  assert.match(smokeScript, /PADELSTAR_SMOKE_VIEWPORT/);
  assert.match(workflow, /viewport: \[desktop, medium, mobile\]/);
  assert.match(smokeScript, /horizontal overflow detected/);
  assert.match(smokeScript, /setup page width is inconsistent/);
  assert.match(smokeScript, /Browser smoke/);
});

test("new invite codes use the stronger eight-character format", () => {
  assert.match(utilitiesSource, /Array\.from\(\{ length: 8 \}/);
  assert.match(indexSource, /maxlength="8"/);
});

test("backup export uses the token-free state projection", () => {
  assert.match(backupFormatSource, /sanitizeState\(state\)/);
});

test("app shell uses optimized startup images", () => {
  assert.match(indexSource, /assets\/logos\/main_logo\.png/);
  assert.match(indexSource, /assets\/backgrounds\/bg_img-1600\.jpg/);
  assert.match(stylesSource, /assets\/backgrounds\/bg_img-1600\.jpg/);
  assert.match(serviceWorkerSource, /assets\/logos\/main_logo\.png/);
  assert.match(serviceWorkerSource, /assets\/backgrounds\/bg_img-1600\.jpg/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/padelstar_logo-1200\.png/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/padelstar_button-900\.png/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/zigonia-it_logo_gold\.png/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/bg_img-2200\.png/);
});

test("optimized startup image payload stays within the measured budget", () => {
  const startupImages = [
    "assets/backgrounds/bg_img-1600.jpg",
    "assets/logos/main_logo.png",
  ];
  const totalBytes = startupImages.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);

  assert.ok(totalBytes < 1_500_000, `startup image payload was ${totalBytes} bytes`);
});
