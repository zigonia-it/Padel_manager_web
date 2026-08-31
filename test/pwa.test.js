const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const serviceWorkerSource = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const stylesSource = fs.readFileSync(path.join(root, "styles", "styles.css"), "utf8");
const responsiveStylesSource = fs.readFileSync(path.join(root, "styles", "responsive.css"), "utf8");
const navigationSource = fs.readFileSync(path.join(root, "app", "navigation.js"), "utf8");
const privacySource = fs.readFileSync(path.join(root, "privacy.html"), "utf8");
const privacyI18nSource = fs.readFileSync(path.join(root, "app", "privacy-i18n.js"), "utf8");

test("service worker claims updates and keeps a navigation fallback", () => {
  assert.match(serviceWorkerSource, /padelstar-v91/);
  assert.match(serviceWorkerSource, /profile-manager\.js/);
  assert.match(serviceWorkerSource, /self\.skipWaiting\(\)/);
  assert.match(serviceWorkerSource, /self\.clients\.claim\(\)/);
  assert.match(serviceWorkerSource, /event\.request\.mode === "navigate"/);
  assert.match(serviceWorkerSource, /caches\.match\("\.\/index\.html"\)/);
  assert.match(serviceWorkerSource, /"\.\/privacy\.html"/);
});

test("browser entrypoint uses the organized app and styles directories", () => {
  assert.match(indexSource, /href="styles\/styles\.css/);
  assert.match(indexSource, /href="styles\/responsive\.css/);
  assert.match(indexSource, /src="app\/translations\.js/);
  assert.match(indexSource, /src="app\/app\.js/);
  assert.match(serviceWorkerSource, /"\.\/styles\/styles\.css/);
  assert.match(serviceWorkerSource, /"\.\/styles\/responsive\.css/);
  assert.match(privacySource, /href="styles\/privacy\.css/);
  assert.match(serviceWorkerSource, /"\.\/styles\/privacy\.css/);
  assert.match(privacySource, /src="app\/privacy-i18n\.js/);
  assert.match(serviceWorkerSource, /"\.\/app\/privacy-i18n\.js/);
  assert.match(serviceWorkerSource, /"\.\/app\/app\.js/);
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

test("responsive navigation has one shared hamburger owner", () => {
  assert.match(indexSource, /id="appMenuToggle"/);
  assert.match(navigationSource, /app-menu-open/);
  assert.match(navigationSource, /event\.key === "Escape"/);
  assert.match(navigationSource, /data-module-link/);
  assert.match(responsiveStylesSource, /\.menu-drawer/);
  assert.match(responsiveStylesSource, /@media \(max-width: 900px\)/);
  assert.doesNotMatch(indexSource, /id="mobile-header-overrides"/);
});

test("active app files do not reference archived assets", () => {
  const activeSources = [indexSource, serviceWorkerSource, stylesSource, fs.readFileSync(path.join(root, "app", "app.js"), "utf8")];
  assert.ok(activeSources.every((source) => !source.includes("assets/archive/")));
  assert.ok(activeSources.every((source) => !source.includes("docs/archive/")));
});

test("browser entrypoint and service worker use the same cache-busting versions", () => {
  assert.match(indexSource, /styles\/styles\.css\?v=padelstar-ui-35/);
  assert.match(indexSource, /app\/app\.js\?v=padelstar-session-14/);
  assert.match(serviceWorkerSource, /styles\/styles\.css\?v=padelstar-ui-35/);
  assert.match(serviceWorkerSource, /app\/app\.js\?v=padelstar-session-14/);
});

test("classic theme is the only available app theme", () => {
  const appSource = fs.readFileSync(path.join(root, "app", "app.js"), "utf8");
  assert.equal((indexSource.match(/data-theme-toggle/g) || []).length, 0);
  assert.match(indexSource, /<body data-theme="classic">/);
  assert.match(appSource, /function applyTheme\(/);
  assert.doesNotMatch(appSource, /coolSportsTheme|data-theme-toggle|data-cool-src/);
  assert.doesNotMatch(indexSource, /data-cool-src|Cool tema|cool sports-tema/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/themed\/cool-sports/);
});

test("service worker does not cache failed same-origin responses", () => {
  assert.match(serviceWorkerSource, /if \(!response \|\| !response\.ok\) return response;/);
  assert.match(serviceWorkerSource, /cache\.put\(event\.request, responseToCache\)/);
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
  assert.match(appSource, /previouslyFocused\.focus\(\)/);
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
  assert.match(smokeScript, /Browser smoke/);
});

test("new invite codes use the stronger eight-character format", () => {
  const appSource = fs.readFileSync(path.join(root, "app", "app.js"), "utf8");
  assert.match(appSource, /Array\.from\(\{ length: 8 \}/);
  assert.match(indexSource, /maxlength="8"/);
});

test("backup export uses the token-free state projection", () => {
  const appSource = fs.readFileSync(path.join(root, "app", "app.js"), "utf8");
  assert.match(appSource, /function exportBackup\(\) \{\s+const exportedState = sanitizeSharedState\(state\);/);
});

test("app shell uses optimized startup images", () => {
  assert.match(indexSource, /assets\/main_logo\.png/);
  assert.match(indexSource, /assets\/bg_img-1600\.jpg/);
  assert.match(indexSource, /assets\/zigonia_logo\.png/);
  assert.match(stylesSource, /assets\/bg_img-1600\.jpg/);
  assert.match(serviceWorkerSource, /assets\/main_logo\.png/);
  assert.match(serviceWorkerSource, /assets\/zigonia_logo\.png/);
  assert.match(serviceWorkerSource, /assets\/bg_img-1600\.png/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/padelstar_logo-1200\.png/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/padelstar_button-900\.png/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/zigonia-it_logo_gold\.png/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/bg_img-2200\.png/);
});

test("optimized startup image payload stays within the measured budget", () => {
  const startupImages = [
    "assets/bg_img-1600.png",
    "assets/main_logo.png",
    "assets/zigonia_logo.png",
  ];
  const totalBytes = startupImages.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);

  assert.ok(totalBytes < 1_500_000, `startup image payload was ${totalBytes} bytes`);
});
