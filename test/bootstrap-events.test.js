const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const filename = path.join(__dirname, "..", "app", "bootstrap", "app-events.js");

function makeElement() {
  const handlers = new Map();
  return {
    handlers,
    addEventListener: (eventName, handler) => handlers.set(eventName, handler),
  };
}

test("bootstrap event module binds direct app controls to explicit callbacks", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  const names = [
    "profileForm", "createAccountAuthButton", "adminAccountAuthButton", "playerResultForm",
    "tvModeButton", "tvModeMenuButton", "deleteProfileButton", "cancelProfileDeletionButton",
    "profileHistoryFilter", "adminMatchFilter", "playerMatchFilter", "adminParticipatesInput",
    "createAdminSignInLinkButton", "languageSelect", "refreshRemoteButton", "keepLocalBackupButton",
    "endTournamentButton", "resetTournamentButton",
  ];
  const elements = Object.fromEntries(names.map((name) => [name, makeElement()]));
  const callbacks = Object.fromEntries(names.map((name) => [
    name === "adminParticipatesInput" ? "syncAdminPlayerChoice" : name,
    () => name,
  ]));

  context.window.PadelstarBootstrapEvents.bind({ elements, callbacks });
  assert.deepEqual(
    [...elements.profileForm.handlers.keys()], ["submit"],
  );
  assert.deepEqual(
    Object.values(elements).map((element) => [...element.handlers.keys()][0]),
    ["submit", "click", "click", "submit", "click", "click", "click", "click", "change", "change", "change", "change", "click", "change", "click", "click", "click", "click"],
  );
});
