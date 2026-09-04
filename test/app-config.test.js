const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function loadConfigModules({ configured, meta = {} } = {}) {
  const window = {
    PADELSTAR_SUPABASE: configured,
    PADEL_MANAGER_SUPABASE: null,
  };
  const document = {
    querySelector: (selector) => {
      const name = selector.match(/^meta\[name="([^"]+)"\]$/)?.[1];
      return name && meta[name] ? { content: meta[name] } : null;
    },
  };
  window.document = document;
  const context = vm.createContext({ document, window });
  for (const relativePath of ["app/config/storage-keys.js", "app/config/supabase-config.js"]) {
    const filename = path.join(root, relativePath);
    vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  }
  return context.window;
}

test("storage key registry keeps current and legacy keys in one immutable boundary", () => {
  const keys = loadConfigModules().PadelstarStorageKeys;

  assert.equal(keys.storageKey, "padelstar-demo");
  assert.equal(keys.recoveryStorageKey, "padelstar-demo-last-good");
  assert.equal(keys.legacyStorageKey, "padel-manager-demo");
  assert.equal(keys.tournamentLibraryStorageKey, "padelstar-tournament-library");
  assert.equal(Object.isFrozen(keys), true);
});

test("Supabase config prefers runtime config and falls back to meta tags", () => {
  const configured = { url: "https://runtime.example", anonKey: "runtime-key" };
  const runtimeWindow = loadConfigModules({ configured });
  assert.deepEqual(runtimeWindow.PadelstarSupabaseConfig.create({}), configured);

  const metaWindow = loadConfigModules({
    meta: {
      "padelstar-supabase-url": "https://meta.example ",
      "padelstar-supabase-anon-key": " meta-key ",
    },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(metaWindow.PadelstarSupabaseConfig.create())), {
    url: "https://meta.example",
    anonKey: "meta-key",
  });
});
