const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const filename = path.join(__dirname, "..", "app", "core", "utilities.js");

function loadUtilities(random = Math.random, document = {}) {
  const context = vm.createContext({ Math, window: {}, document });
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  return context.window.PadelstarUtilities.create({ document: context.document, random });
}

test("utilities escape HTML and attributes without allowing markup injection", () => {
  const utilities = loadUtilities();
  const value = `<'&\" >`;
  assert.equal(utilities.escapeHtml(value), "&lt;&#039;&amp;&quot; &gt;");
  assert.equal(utilities.escapeAttribute(value), utilities.escapeHtml(value));
});

test("utilities create fixed-format invite codes and deterministic slugs", () => {
  const utilities = loadUtilities(() => 0);
  assert.equal(utilities.createInviteCode(), "AAAAAAAA");
  assert.equal(utilities.createInviteCode().length, 8);
  assert.equal(utilities.slugify("  Vålerenga & Friends / 2026  "), "valerenga-friends-2026");
  assert.equal(utilities.slugify("!!!"), "padelstar");
});

test("appendEmptyText creates the shared empty-state element", () => {
  const created = [];
  const document = { createElement: (tagName) => {
    const element = { tagName, className: "", textContent: "" };
    created.push(element);
    return element;
  } };
  const container = { append: (element) => { container.element = element; } };
  const utilities = loadUtilities(Math.random, document);
  utilities.appendEmptyText(container, "Ingen resultater");
  assert.equal(container.element.tagName, "p");
  assert.equal(container.element.className, "hint");
  assert.equal(container.element.textContent, "Ingen resultater");
});
