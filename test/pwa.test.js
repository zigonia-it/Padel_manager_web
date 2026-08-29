const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const serviceWorkerSource = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const stylesSource = fs.readFileSync(path.join(root, "styles", "styles.css"), "utf8");

test("service worker claims updates and keeps a navigation fallback", () => {
  assert.match(serviceWorkerSource, /padelstar-v61/);
  assert.match(serviceWorkerSource, /profile-manager\.js/);
  assert.match(serviceWorkerSource, /self\.skipWaiting\(\)/);
  assert.match(serviceWorkerSource, /self\.clients\.claim\(\)/);
  assert.match(serviceWorkerSource, /event\.request\.mode === "navigate"/);
  assert.match(serviceWorkerSource, /caches\.match\("\.\/index\.html"\)/);
  assert.match(serviceWorkerSource, /"\.\/privacy\.html"/);
});

test("browser entrypoint uses the organized app and styles directories", () => {
  assert.match(indexSource, /href="styles\/styles\.css/);
  assert.match(indexSource, /src="app\/translations\.js/);
  assert.match(indexSource, /src="app\/app\.js/);
  assert.match(serviceWorkerSource, /"\.\/styles\/styles\.css/);
  assert.match(serviceWorkerSource, /"\.\/app\/app\.js/);
});

test("service worker does not cache failed same-origin responses", () => {
  assert.match(serviceWorkerSource, /if \(!response \|\| !response\.ok\) return response;/);
  assert.match(serviceWorkerSource, /cache\.put\(event\.request, responseToCache\)/);
});

test("app shell uses optimized startup images", () => {
  assert.match(indexSource, /assets\/padelstar_logo-480\.png/);
  assert.match(indexSource, /assets\/padelstar_logo-360\.png/);
  assert.match(indexSource, /assets\/bg_img-1600\.jpg/);
  assert.match(indexSource, /assets\/padelstar_button-540\.png/);
  assert.match(indexSource, /assets\/zigonia-it_logo_gold-512\.png/);
  assert.match(stylesSource, /assets\/bg_img-1600\.jpg/);
  assert.match(serviceWorkerSource, /assets\/padelstar_logo-480\.png/);
  assert.match(serviceWorkerSource, /assets\/padelstar_logo-360\.png/);
  assert.match(serviceWorkerSource, /assets\/padelstar_button-540\.png/);
  assert.match(serviceWorkerSource, /assets\/zigonia-it_logo_gold-512\.png/);
  assert.match(serviceWorkerSource, /assets\/bg_img-1600\.png/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/padelstar_logo-1200\.png/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/padelstar_button-900\.png/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/zigonia-it_logo_gold\.png/);
  assert.doesNotMatch(serviceWorkerSource, /assets\/bg_img-2200\.png/);
});

test("optimized startup image payload stays within the measured budget", () => {
  const startupImages = [
    "assets/bg_img-1600.png",
    "assets/padelstar_logo-480.png",
    "assets/padelstar_logo-360.png",
    "assets/padelstar_button-540.png",
    "assets/zigonia-it_logo_gold-512.png",
  ];
  const totalBytes = startupImages.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);

  assert.ok(totalBytes < 1_500_000, `startup image payload was ${totalBytes} bytes`);
});
