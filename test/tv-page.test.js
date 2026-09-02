const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const tv = fs.readFileSync(path.join(root, "tv.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles", "tv.css"), "utf8");
const tvMode = fs.readFileSync(path.join(root, "app", "tv-mode.js"), "utf8");

test("TV mode has a dedicated responsive page", () => {
  for (const id of ["tvLiveMatches", "tvNextMatches", "tvStandings", "tvClock", "tvExitButton"]) {
    assert.match(tv, new RegExp(`id="${id}"`));
  }
  assert.match(tv, /styles\/tv\.css/);
  assert.match(tv, /app\/tv-mode\.js/);
  assert.match(tv, /assets\/logos\/tv-brand\.png/);
  assert.match(tv, /assets\/icons\/Games@0\.5x\.png/);
  assert.match(tv, /assets\/icons\/Match win@0\.5x\.png/);
  assert.match(app, /tv\.html\$\{inviteCode\}/);
  assert.match(css, /grid-template-columns:\s*1\.08fr\s+1\.03fr\s+1\.08fr/);
  assert.match(css, /\.tv-title-wrap \{ position: absolute; left: 50%; transform: translateX\(-50%\)/);
  assert.match(css, /\.tv-header-lines \{ display: none; \}/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /body\s*\{\s*overflow:\s*hidden/);
  assert.match(tvMode, /standingPlayer/);
  assert.match(tvMode, /tv-standing-player/);
  assert.doesNotMatch(tvMode, /tv-team-player/);
});
