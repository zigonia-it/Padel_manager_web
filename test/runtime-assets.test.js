const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const tv = fs.readFileSync(path.join(root, "tv.html"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");

function localPaths(source, pattern) {
  return [...source.matchAll(pattern)].map((match) => match[1].split("?")[0]).filter((value) => !value.startsWith("#") && !value.startsWith("/") && !/^[a-z]+:/i.test(value));
}

function assertFilesExist(paths, label) {
  for (const relativePath of paths) assert.equal(fs.existsSync(path.join(root, relativePath)), true, `${label} refers to missing ${relativePath}`);
}

test("HTML runtime references resolve to files", () => {
  assertFilesExist(localPaths(index, /(?:src|href)="([^"]+)"/g), "HTML");
  assertFilesExist(localPaths(tv, /(?:src|href)="([^"]+)"/g), "TV HTML");
});

test("service worker precache references resolve to files", () => {
  assertFilesExist(localPaths(serviceWorker, /"(\.\/[^"\n]+)"/g), "service worker");
});

test("archived design references are not runtime dependencies", () => {
  assert.equal(/(?:src|href)="[^"]*Visual redesign\//i.test(index), false);
  assert.equal(/(?:src|href)="[^"]*assets\/archive\//i.test(index), false);
});
