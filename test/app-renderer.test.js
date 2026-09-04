const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const filename = path.join(__dirname, "..", "app", "ui", "app-renderer.js");

test("app renderer preserves test-mode isolation and callback composition", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  let rendered = false;
  const renderer = context.window.PadelstarAppRenderer.create({
    isTestMode: () => true,
    getElements: () => ({}),
    getState: () => ({}),
    getAllMatches: () => [],
    translate: () => "",
    callbacks: { applyLanguage: () => { rendered = true; } },
  });
  assert.equal(renderer.render(), undefined);
  assert.equal(rendered, false);
});
