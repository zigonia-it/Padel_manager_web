const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const pages = ["index.html", "guide.html", "privacy.html", "tv.html", "service-worker.js"];
const REFERENCE = /((?:app|styles)\/[\w/.-]+\.(?:js|css))\?v=([\w-]+)/g;

// A file whose ?v= tag differs between two pages is served from the browser cache on one of them after a change,
// so every page and the service worker must ask for the same version of an asset.
test("every asset carries the same version tag on every page and in the service worker", () => {
  const seen = new Map();
  for (const page of pages) {
    const source = fs.readFileSync(path.join(root, page), "utf8");
    for (const [, file, version] of source.matchAll(REFERENCE)) {
      if (!seen.has(file)) seen.set(file, new Map());
      seen.get(file).set(page, version);
    }
  }
  const drift = [];
  for (const [file, byPage] of seen) {
    if (new Set(byPage.values()).size > 1) drift.push(`${file}: ${[...byPage].map(([page, version]) => `${page}=${version}`).join(", ")}`);
  }
  assert.deepEqual(drift, []);
});

test("every versioned asset that a page references exists and is precached", () => {
  const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const [, file] of index.matchAll(REFERENCE)) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`);
    assert.ok(worker.includes(`./${file}?v=`), `${file} is precached by the service worker`);
  }
});
