// Regression tests for the 0.9.1 bug batch: resuming your own tournaments from any device, the language picker on iOS,
// the phone menu drawer, and the light theme's cascade.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("the language picker is not a <label>: tapping the custom menu must not also open the native select (iOS)", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /<label[^>]*class="language-picker/);
  assert.match(html, /<div class="language-picker">[\s\S]*?<select id="languageSelect"[\s\S]*?<details class="language-menu"/);
  assert.match(html, /<span class="language-current-name"><\/span>/, "the drawer shows the language name next to the flag");
});

test("the phone menu drawer is one column with full-width rows and a two-part theme switch", () => {
  const css = read("styles", "responsive.css");
  const block = css.slice(css.indexOf("Phase 31: the phone menu drawer"));
  assert.match(block, /@media \(max-width: 900px\)/);
  assert.match(block, /menu-drawer \.app-menu \{|\.app-menu \{\s*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(block, /\.menu-drawer \.theme-toggle \{[^}]*grid-template-columns: repeat\(2/);
  assert.match(block, /\.menu-drawer \.language-options \{[^}]*position: static/, "the language list opens inside the drawer");
  assert.match(block, /max-height: calc\(100dvh - 96px\)/, "a short phone can scroll the drawer");
  assert.match(block, /background: rgb\(7, 17, 32\)/, "an opaque drawer: the page behind it does not show through");
});

test("a signed-in owner can open an active tournament from the profile list on any device", () => {
  const ui = read("app", "profile-ui.js");
  assert.match(ui, /data-owned-tournament-id="\$\{escapeHtml\(tournament\.id\)\}"/);
  assert.match(ui, /resume\.continueAdmin/);
  const events = read("app", "workspace-events.js");
  assert.match(events, /for \(const list of \[elements\.activeTournamentsList, elements\.finishedTournamentsList\]\)/);
  assert.match(events, /callbacks\.openOwnedTournament/);
  const app = read("app", "app.js");
  assert.match(app, /async function openOwnedTournament\(tournamentId\)/);
  assert.match(app, /"open_owned_tournament", \{ p_tournament_id: tournamentId \}/);
  assert.match(app, /state\.adminToken = data\.adminToken/);
  assert.match(app, /openOwnedTournament: \(tournamentId\) => openOwnedTournament\(tournamentId\)/);
  const migration = read("supabase", "migrations", "20260920150000_open_owned_tournament.sql");
  assert.match(migration, /owner_user_id = auth\.uid\(\)/, "ownership is decided in the database");
  assert.match(migration, /revoke all on function public\.open_owned_tournament\(uuid\) from public, anon/);
  assert.match(migration, /grant execute on function public\.open_owned_tournament\(uuid\) to authenticated/);
  const i18n = read("app", "translations.js");
  assert.match(i18n, /"profile\.openTournamentFailed"/);
});

test("the empty account status chip is not drawn, and the join preview's gem keeps its centred initials", () => {
  assert.match(read("styles", "ui-consistency.css"), /\.status-chip:empty \{ display: none; \}/);
  const components = read("styles", "components.css");
  assert.match(components, /\.join-preview div > span,/);
  assert.doesNotMatch(components, /\.join-preview span,/, "the label rule no longer reaches the avatar's own spans");
});

test("the tooling that keeps versions honest exists", () => {
  assert.ok(fs.existsSync(path.join(root, "scripts", "bump-asset-versions.js")));
  assert.ok(fs.existsSync(path.join(root, "scripts", "theme-parity-audit.js")));
  assert.match(read("scripts", "ui-audit.js"), /window\.__parity/);
});

test("the lobby lists a remove button per player, using the same rule and function as Styring", () => {
  const lobby = read("app", "lobby.js");
  assert.match(lobby, /data-remove-player="\$\{escapeHtml\(player\.id\)\}"/);
  assert.match(lobby, /actions\.removePlayerAria/);
  assert.match(lobby, /state\.rounds\.length > 0/, "disabled once the schedule has started");
  assert.match(lobby, /removePlayer\(button\.dataset\.removePlayer\)/);
  assert.match(read("app", "app.js"), /removePlayer: \(playerId\) => removePlayer\(playerId\),\n  render: \(\) => render\(\),/);
  assert.match(read("styles", "lobby.css"), /\.lobby-players-card \.danger-button/);
});

test("Styring has a way back to the lobby (rail and phone tabs) while the tournament has not started", () => {
  const html = read("index.html");
  for (const nav of [html.match(/<nav class="workspace-rail[\s\S]*?<\/nav>/)[0], html.match(/<nav class="workspace-bottom-tabs[\s\S]*?<\/nav>/)[0]]) {
    assert.match(nav, /data-rail-target="lobby"/);
    assert.ok(nav.indexOf('data-rail-target="lobby"') < nav.indexOf('data-rail-target="control"'), "Lobby comes first");
    assert.match(nav, /class="workspace-rail-item hidden" data-rail-target="lobby"/, "hidden until it applies");
  }
  const rail = read("app", "workspace-rail.js");
  assert.match(rail, /target === "lobby"\) \{\s*showModule\("lobby"\)/);
  assert.match(rail, /isLobbyAvailable/);
  assert.match(read("app", "app.js"), /isLobbyAvailable: \(\) => isCurrentUserAdmin\(\) && \(state\.rounds \?\? \[\]\)\.length === 0 && state\.status !== "Avsluttet"/);
});
