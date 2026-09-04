const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const filename = path.join(__dirname, "..", "app", "bootstrap", "app-init.js");

test("app initialization preserves the dependency-safe startup order", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  const steps = [];
  const step = (name) => () => steps.push(name);
  const names = [
    "installGlobalHandlers", "initializeNavigation", "applyTheme", "activateSupabase", "bindSupabaseReady",
    "syncLanguageOptions", "syncCreateFormDefaults", "syncJoinFormFromProfile", "syncJoinPreview", "renderProfile",
    "prefillInviteCodeFromUrl", "syncCopyrightYear", "registerServiceWorker", "initializePwaInstall",
    "syncConnectionStatus", "bindAccountAuth", "refreshAccountAuth", "showRecoveryNotice", "bindBootstrapEvents",
    "bindTournamentEntry", "bindAdminFormEvents", "bindWorkspaceEvents", "bindGlobalEvents",
  ];
  const callbacks = Object.fromEntries(names.map((name) => [name, step(name)]));

  context.window.PadelstarAppInit.create({ callbacks }).initialize();
  assert.deepEqual(steps, names);
});
