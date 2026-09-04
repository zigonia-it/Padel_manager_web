const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const filename = path.join(__dirname, "..", "app", "bootstrap", "dom-elements.js");

function loadElements() {
  const selectors = [];
  const document = {
    querySelector: (selector) => {
      selectors.push(selector);
      return { selector };
    },
  };
  const context = vm.createContext({ document, window: {} });
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  return { elements: context.window.PadelstarDomElements.create({ document }), selectors };
}

test("DOM registry resolves every app-owned reference once and stays immutable", () => {
  const { elements, selectors } = loadElements();

  assert.equal(elements.startView.selector, "#startView");
  assert.equal(elements.profileLightPanel.selector, ".profile-light-panel");
  assert.equal(elements.playerMatches.selector, "#playerMatches");
  assert.equal(elements.closeSetScoreButton.selector, "#closeSetScoreButton");
  assert.equal(Object.keys(elements).length, selectors.length);
  assert.equal(new Set(selectors).size, selectors.length);
  assert.equal(Object.isFrozen(elements), true);
});
