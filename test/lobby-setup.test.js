const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("the lobby has its own add-players and court forms, wired to the same handlers as the Styring tab", () => {
  const html = read("index.html");
  const lobby = html.slice(html.indexOf('id="lobbyPanel"'), html.indexOf('data-admin-panel-section="control"', html.indexOf('id="lobbyPanel"')));
  assert.match(lobby, /id="lobbyAddPlayerForm"[\s\S]*name="playerName"/);
  assert.match(lobby, /id="lobbyCourtNamesForm"[\s\S]*name="courtCount"[\s\S]*id="lobbyCourtNamesList"/);
  const events = read("app", "admin-form-events.js");
  assert.match(events, /elements\.addPlayerForm\?\.addEventListener\("submit", submitAddPlayers\)/);
  assert.match(events, /elements\.lobbyAddPlayerForm\?\.addEventListener\("submit", submitAddPlayers\)/);
  assert.match(events, /elements\.courtNamesForm\?\.addEventListener\("submit", submitCourtNames\)/);
  assert.match(events, /elements\.lobbyCourtNamesForm\?\.addEventListener\("submit", submitCourtNames\)/);
  const refs = read("app", "bootstrap", "dom-elements.js");
  for (const id of ["lobbyAddPlayerForm", "lobbyCourtNamesForm", "lobbyCourtNamesList"]) assert.match(refs, new RegExp(`${id}: document\\.querySelector`));
});

function listElement(active = false) {
  const el = { innerHTML: "", dataset: {}, children: [], contains: () => active };
  return el;
}
function courtSettings(elements, state, activeElement = null) {
  const context = { console, document: { activeElement } };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read("app", "court-settings.js"), context);
  return context.PadelstarCourtSettings.create({ elements, getState: () => state, translate: (k) => (k === "common.court" ? "Bane" : k), escapeAttribute: String, escapeHtml: String });
}

test("court names render in both the Styring tab and the lobby, with the same lock", () => {
  const form = () => ({ elements: { courtCount: { disabled: false, value: "" } }, querySelector: () => ({ disabled: false }) });
  const elements = { courtNamesList: listElement(), courtNamesForm: form(), lobbyCourtNamesList: listElement(), lobbyCourtNamesForm: form() };
  const state = { rounds: [], status: "Klar", courts: [{ courtNumber: 1, name: "Center" }, { courtNumber: 2, name: "" }] };
  courtSettings(elements, state).renderCourtNames();
  for (const list of [elements.courtNamesList, elements.lobbyCourtNamesList]) {
    assert.equal((list.innerHTML.match(/name="courtName"/g) ?? []).length, 2);
    assert.match(list.innerHTML, /value="Center"/);
    assert.doesNotMatch(list.innerHTML, /disabled/);
  }
  assert.equal(elements.lobbyCourtNamesForm.elements.courtCount.value, "2", "the count follows the tournament");
  state.rounds = [{}];
  courtSettings(elements, state).renderCourtNames();
  assert.match(elements.lobbyCourtNamesList.innerHTML, /disabled/, "locked once the tournament has started, also in the lobby");
});

test("typing in a court name is not overwritten by a re-render", () => {
  const list = listElement(true);
  list.children = [{}, {}];
  list.dataset.locked = "false";
  list.innerHTML = "<typing>";
  const elements = { courtNamesList: list, courtNamesForm: null };
  courtSettings(elements, { rounds: [], status: "Klar", courts: [{ courtNumber: 1 }, { courtNumber: 2 }] }, {}).renderCourtNames();
  assert.equal(list.innerHTML, "<typing>");
});

test("the lobby texts exist in both languages", () => {
  const i18n = vm.createContext({ window: {} });
  vm.runInContext(read("app", "translations.js"), i18n);
  for (const language of ["nb", "en"]) for (const key of ["lobby.addPlayers", "lobby.courts", "lobby.saveCourts"]) assert.ok(i18n.window.PadelstarTranslations[language][key], `${language} ${key}`);
});
