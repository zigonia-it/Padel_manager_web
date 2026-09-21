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
  const context = { console, window: null, setTimeout: () => 0, clearTimeout: () => {} };
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
  assert.match(html, /<button class="info-dialog-close" id="infoDialogClose"[\s\S]*<iframe class="info-dialog-frame" id="infoDialogFrame" title=""><\/iframe>/, "the X belongs to the dialog, outside the frame, and the frame is not lazy");
  assert.doesNotMatch(html, /id="infoDialogFrame"[^>]*loading="lazy"/);
  for (const page of ["guide.html", "privacy.html"]) {
    const source = read(page);
    assert.match(source, /class="embedded-close"/, `${page} keeps its own X for the Escape/postMessage path`);
    assert.match(source, /padelstar-close-info/);
    assert.match(source, /classList\.add\("embedded"\)/);
  }
  assert.match(read("styles", "info-dialog.css"), /\.info-dialog\s*\{[^}]*border:\s*0/);
  assert.match(read("styles", "info-dialog.css"), /\.info-dialog-close \{[^}]*position: absolute;[^}]*z-index: 3/, "the X is above the frame");
  assert.match(read("styles", "privacy.css"), /html\.embedded \.embedded-close \{ display: none; \}/, "no second X inside the popup");
  const vercel = read("vercel.json");
  assert.match(vercel, /frame-ancestors 'self'/);
  assert.doesNotMatch(vercel, /frame-ancestors 'none'/);
  assert.match(read("service-worker.js"), /app\/info-dialog\.js/);
});


// --- a blank popup can never trap a phone user (0.16.1) ---
function withTimers(fake, options = {}) {
  const timers = [];
  const navigated = [];
  const closeButton = { handlers: {}, addEventListener(name, fn) { this.handlers[name] = fn; } };
  const original = fake.document.querySelector;
  fake.document.querySelector = (selector) => (selector === "#infoDialogClose" ? closeButton : original(selector));
  const api = load(fake).create({ document: fake.document, navigate: (url) => navigated.push(url), setTimer: (fn, ms) => { timers.push({ fn, ms, cleared: false }); return timers.length - 1; }, clearTimer: (id) => { if (timers[id]) timers[id].cleared = true; } });
  api.bind();
  return { api, timers, navigated, closeButton };
}
function openPrivacy(fake) {
  fake.handlers.click({ target: { closest: () => ({ dataset: { infoDialog: "privacy" }, textContent: "Personvern" }) }, defaultPrevented: false, button: 0, preventDefault() {} });
}

test("the dialog's own X closes the popup, whatever the page in the frame does", () => {
  const fake = fakeDocument();
  const { closeButton } = withTimers(fake);
  openPrivacy(fake);
  assert.equal(fake.dialog.open, true);
  closeButton.handlers.click();
  assert.equal(fake.dialog.open, false);
  assert.equal(fake.frame.src, undefined);
});

test("a page that never loads: after the wait the popup closes and the page opens as an ordinary page", () => {
  const fake = fakeDocument();
  const { timers, navigated } = withTimers(fake);
  openPrivacy(fake);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].ms, 8000);
  timers[0].fn();
  assert.equal(fake.dialog.open, false);
  assert.deepEqual(navigated, ["privacy.html"]);
});

test("a page that loads correctly cancels the wait; a frame that shows something else falls back at once", () => {
  const good = fakeDocument();
  const a = withTimers(good);
  openPrivacy(good);
  good.frame.contentDocument = { querySelector: (s) => (s === ".privacy-document" ? {} : null) };
  good.frame.contentWindow = { focus() {} };
  good.frame.handlers.load();
  assert.equal(a.timers[0].cleared, true);
  assert.equal(good.dialog.open, true);
  assert.deepEqual(a.navigated, []);

  const wrong = fakeDocument();
  const b = withTimers(wrong);
  openPrivacy(wrong);
  wrong.frame.contentDocument = { querySelector: () => null };
  wrong.frame.handlers.load();
  assert.equal(wrong.dialog.open, false, "an empty or wrong page is not left on the screen");
  assert.deepEqual(b.navigated, ["privacy.html"]);

  const blank = fakeDocument();
  const c = withTimers(blank);
  openPrivacy(blank);
  blank.frame.contentDocument = null;
  blank.frame.handlers.load();
  assert.deepEqual(c.navigated, ["privacy.html"]);
});

test("closing the popup cancels the wait, and the frame's load when its source is removed does nothing", () => {
  const fake = fakeDocument();
  const { timers, navigated } = withTimers(fake);
  openPrivacy(fake);
  fake.dialog.close();
  assert.equal(timers[0].cleared, true);
  fake.frame.handlers.load();
  timers[0].fn && null;
  assert.deepEqual(navigated, []);
});
