const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

function fakeDocument({ supported = true } = {}) {
  const handlers = {};
  const dialog = { open: false, handlers: {}, addEventListener(name, fn) { this.handlers[name] = fn; }, close() { this.open = false; this.handlers.close?.(); } };
  if (supported) dialog.showModal = function () { this.open = true; };
  const frame = { attrs: {}, title: "", handlers: {}, addEventListener(name, fn) { this.handlers[name] = fn; }, removeAttribute(name) { delete this.attrs[name]; }, set src(value) { this.attrs.src = value; }, get src() { return this.attrs.src; } };
  const title = { textContent: "" };
  const nodes = { "#infoDialog": dialog, "#infoDialogFrame": frame, "#infoDialogTitle": title };
  return { dialog, frame, title, handlers, document: { activeElement: null, querySelector: (selector) => nodes[selector] ?? null, addEventListener: (name, fn) => { handlers[name] = fn; }, readyState: "complete" } };
}

function load(doc) {
  const context = { console, window: null };
  context.window = context;
  context.location = { origin: "https://padelstar.app" };
  context.addEventListener = () => {};
  context.document = { ...doc.document, readyState: "loading", addEventListener() {} }; // no auto-bind while loading
  vm.createContext(context);
  vm.runInContext(read("app", "info-dialog.js"), context);
  return context.PadelstarInfoDialog;
}

test("a guide or privacy link opens the popup with the embedded page and prevents navigation", () => {
  const fake = fakeDocument();
  const api = load(fake).create({ document: fake.document });
  api.bind();
  let prevented = false;
  const link = { dataset: { infoDialog: "privacy" }, textContent: " Personvern " };
  fake.handlers.click({ target: { closest: () => link }, defaultPrevented: false, button: 0, preventDefault: () => { prevented = true; } });
  assert.equal(fake.dialog.open, true);
  assert.equal(fake.frame.src, "privacy.html?embed=1");
  assert.equal(fake.frame.title, "Personvern");
  assert.equal(prevented, true);
  fake.dialog.close();
  assert.equal(fake.frame.src, undefined, "the frame is emptied when the popup closes");
});

test("modified clicks and unsupported browsers keep the normal link", () => {
  const fake = fakeDocument();
  const api = load(fake).create({ document: fake.document });
  api.bind();
  let prevented = false;
  const link = { dataset: { infoDialog: "guide" }, textContent: "Guide" };
  fake.handlers.click({ target: { closest: () => link }, defaultPrevented: false, button: 0, ctrlKey: true, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(fake.dialog.open, false);
  const old = fakeDocument({ supported: false });
  const unsupported = load(old).create({ document: old.document });
  assert.equal(unsupported.open("guide", "x"), false);
  assert.equal(unsupported.supported, false);
});

test("the popup is wired in: link markers, dialog without an outer X, X inside the pages' card, same-origin framing only", () => {
  const html = read("index.html");
  assert.match(html, /href="guide\.html" data-info-dialog="guide"/);
  assert.match(html, /href="privacy\.html" data-info-dialog="privacy"/);
  assert.match(html, /<dialog class="info-dialog" id="infoDialog"/);
  assert.doesNotMatch(html, /id="infoDialogClose"/);
  for (const page of ["guide.html", "privacy.html"]) {
    const source = read(page);
    assert.match(source, /class="embedded-close"/, `${page} has its own X`);
    assert.match(source, /padelstar-close-info/);
    assert.match(source, /classList\.add\("embedded"\)/);
  }
  assert.match(read("styles", "info-dialog.css"), /\.info-dialog\s*\{[^}]*border:\s*0/);
  const vercel = read("vercel.json");
  assert.match(vercel, /frame-ancestors 'self'/);
  assert.doesNotMatch(vercel, /frame-ancestors 'none'/);
  assert.match(read("service-worker.js"), /app\/info-dialog\.js/);
});
