#!/usr/bin/env node
// Developer tool: bumps the cache-busting version (?v=padelstar-<name>-<n>) of every asset that changed compared with
// origin/main, in every page, the service worker and the tests that pin it, and bumps the service worker's cacheName once.
// An asset whose version already differs from origin/main was bumped on this branch and is left alone.
//   node scripts/bump-asset-versions.js          bump
//   node scripts/bump-asset-versions.js --check  exit 1 if a changed asset still has its origin/main version
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const sh = (cmd) => execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const check = process.argv.includes("--check");
const base = process.env.BASE_REF ?? "origin/main";

const changed = new Set([
  ...sh(`git diff --name-only ${base}`).split("\n"),
  ...sh("git ls-files --others --exclude-standard").split("\n"),
].filter((file) => /^(app|styles)\/.+\.(js|css)$/.test(file) && fs.existsSync(path.join(root, file))));

const pages = ["index.html", "guide.html", "privacy.html", "tv.html", "admin.html", "service-worker.js"];
const versionOf = (text, file) => text.match(new RegExp(`${file.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\?v=(padelstar-[a-z0-9-]+?)-(\\d+)`)) ;
let stale = [];
let bumped = 0;
for (const file of [...changed].sort()) {
  for (const page of pages) {
    const current = fs.readFileSync(path.join(root, page), "utf8");
    const now = versionOf(current, file);
    if (!now) continue;
    let before = null;
    try { before = versionOf(sh(`git show ${base}:${page}`), file); } catch { /* new file or page */ }
    if (before && before[1] === now[1] && before[2] === now[2]) {
      if (check) { stale.push(`${file} (${page}: ${now[1]}-${now[2]})`); continue; }
      const next = Number(now[2]) + 1;
      const ref = new RegExp(`(${file.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\?v=)${now[1]}-${now[2]}\\b`, "g");
      for (const target of [...pages, ...fs.readdirSync(path.join(root, "test")).filter((f) => f.endsWith(".js")).map((f) => `test/${f}`)]) {
        const full = path.join(root, target);
        if (!fs.existsSync(full)) continue;
        const text = fs.readFileSync(full, "utf8");
        const updated = text.replace(ref, `$1${now[1]}-${next}`);
        if (updated !== text) fs.writeFileSync(full, updated);
      }
      // tests that pin the version: the plain path (app/x.js?v=...) and the regex-escaped one (app\\/x\\.js\\?v=...), for this file only
      const escaped = file.replace(/\//g, "\\/").replace(/\./g, "\\.");
      for (const f of fs.readdirSync(path.join(root, "test")).filter((name) => name.endsWith(".js"))) {
        const full = path.join(root, "test", f);
        const text = fs.readFileSync(full, "utf8");
        const updated = text.split(`${escaped}\\?v=${now[1]}-${now[2]}`).join(`${escaped}\\?v=${now[1]}-${next}`);
        if (updated !== text) fs.writeFileSync(full, updated);
      }
      bumped += 1;
      console.log(`bumped ${file}: ${now[1]}-${now[2]} -> ${now[1]}-${next}`);
    }
  }
}
if (check) {
  if (stale.length) { console.error(`assets changed but not version-bumped:\n  ${stale.join("\n  ")}`); process.exit(1); }
  console.log("all changed assets have a new version");
} else if (bumped) {
  const sw = path.join(root, "service-worker.js");
  const text = fs.readFileSync(sw, "utf8");
  let baseCache = null;
  try { baseCache = sh(`git show ${base}:service-worker.js`).match(/cacheName = "padelstar-v(\d+)"/)?.[1]; } catch { /* ignore */ }
  const current = text.match(/cacheName = "padelstar-v(\d+)"/)?.[1];
  if (current && baseCache && current === baseCache) {
    fs.writeFileSync(sw, text.replace(`padelstar-v${current}`, `padelstar-v${Number(current) + 1}`));
    for (const f of fs.readdirSync(path.join(root, "test")).filter((name) => name.endsWith(".js"))) {
      const full = path.join(root, "test", f);
      const source = fs.readFileSync(full, "utf8");
      if (source.includes(`padelstar-v${current}`)) fs.writeFileSync(full, source.split(`padelstar-v${current}`).join(`padelstar-v${Number(current) + 1}`));
    }
    console.log(`cacheName padelstar-v${current} -> v${Number(current) + 1}`);
  }
}
