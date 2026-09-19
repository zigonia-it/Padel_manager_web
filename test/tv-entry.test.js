const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("TV Mode always opens in a new tab and never navigates the app away", () => {
  const app = read("app", "app.js");
  assert.match(app, /function openTvMode\(\)[\s\S]*window\.open\(`tv\.html\$\{inviteCode\}`, "_blank", "noopener"\)/);
  // a blocked pop-up falls back to the current tab, only from inside openTvMode
  assert.equal((app.match(/window\.location\.href = `tv\.html/g) ?? []).length, 1);
  assert.match(app, /if \(playerAction === "spectate"\) \{\s*openTvMode\(\);/);
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
