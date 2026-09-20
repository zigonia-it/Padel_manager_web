const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("TV Mode always opens in a new tab and never navigates the app away", () => {
  const app = read("app", "app.js");
  // "noopener" makes window.open return null even on success, which used to look like a blocked pop-up and navigated the app as well
  assert.match(app, /function openTvMode\(\)[\s\S]*window\.open\(`tv\.html\$\{inviteCode\}`, "_blank"\)/);
  assert.doesNotMatch(app, /window\.open\([^)]*noopener/);
  // a blocked pop-up falls back to the current tab, only from inside openTvMode
  assert.equal((app.match(/window\.location\.href = `tv\.html/g) ?? []).length, 1);
  assert.match(app, /if \(playerAction === "spectate"\) \{\s*openTvMode\(\);/);
});

test("openTvMode: an opened window leaves the app where it is; only a blocked pop-up falls back to this tab", () => {
  const source = read("app", "app.js").match(/function openTvMode\(\) \{[\s\S]*?\n\}\n/)[0];
  const run = (openResult) => {
    const win = { location: { href: "index.html" }, opened: [], open(url, target, features) { this.opened.push([url, target, features]); return openResult; } };
    new Function("window", "state", `${source}; openTvMode();`)(win, { inviteCode: "AB CD" });
    return win;
  };
  const popup = { opener: "app" };
  let win = run(popup);
  assert.equal(win.location.href, "index.html", "the app stays where it is");
  assert.deepEqual(win.opened, [["tv.html?spectate=AB%20CD", "_blank", undefined]], "one window, no features string");
  assert.equal(popup.opener, null, "the new window cannot reach back to the app");
  win = run(null);
  assert.equal(win.location.href, "tv.html?spectate=AB%20CD", "a blocked pop-up falls back to this tab");
});

test("TV Mode has a Lys/Mørk switch that uses the app's color choice and the same tokens", () => {
  const html = read("tv.html");
  assert.match(html, /id="tvThemeToggle"[\s\S]*data-theme-option="light"[\s\S]*data-theme-option="dark"/);
  assert.match(html, /<script>\(function\(\)\{try\{var t=localStorage\.getItem\("padelstar-theme"\)/, "the saved choice is applied before the first paint");
  assert.match(html, /styles\/tokens\.css\?v=padelstar-tokens-\d+/);
  assert.match(html, /app\/color-mode\.js\?v=padelstar-color-mode-\d+/);
  assert.match(read("app", "tv-mode.js"), /PadelstarColorMode\?\.create\(\{ document, storage: global\.localStorage \}\)\.bind\(\)/);
  const worker = read("service-worker.js");
  assert.match(worker, /styles\/tokens\.css\?v=padelstar-tokens-\d+/);
  const tv = read("styles", "tv.css");
  assert.match(tv, /:root \{ --ink: var\(--ink-heading\)/, "TV's own variables are aliases of the shared tokens");
  assert.doesNotMatch(tv, /#[0-9a-fA-F]{3,8}\b/, "no hex colours in the TV stylesheet");
});

test("the TV Mode button sits at the bottom of the side rail", () => {
  const html = read("index.html");
  const rail = html.match(/<nav class="workspace-rail[\s\S]*?<\/nav>/)[0];
  assert.match(rail, /id="tvModeRailButton"[^>]*data-action="tv-mode"/);
  assert.ok(rail.lastIndexOf('id="tvModeRailButton"') > rail.lastIndexOf("data-rail-target"), "after the other items");
  const css = read("styles", "workspace-nav.css");
  assert.match(css, /\.workspace-rail-tv\s*\{[^}]*margin-top:\s*auto/);
  assert.match(read("app", "bootstrap", "app-events.js"), /tvModeRailButton\?\.addEventListener\("click"/);
});

test("the side rail is sized to the visible window so the pinned TV Mode button never needs scrolling", () => {
  const rail = read("app", "workspace-rail.js");
  assert.match(rail, /function fitRailToViewport\(\)/);
  assert.match(rail, /window\.innerHeight - top - RAIL_BOTTOM_GAP/);
  assert.match(rail, /addEventListener\("resize", scheduleFit\)/);
  assert.match(rail, /addEventListener\("scroll", scheduleFit, \{ passive: true \}\)/);
  const css = read("styles", "workspace-nav.css");
  assert.match(css, /\.workspace-rail\s*\{[^}]*overflow-y:\s*auto;[^}]*max-height:\s*calc\(100dvh/);
  assert.doesNotMatch(css, /min-height:\s*calc\(100vh - 150px\)/, "the old fixed minimum height overflowed short windows");
});
