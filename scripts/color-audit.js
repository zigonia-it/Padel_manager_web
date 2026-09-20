#!/usr/bin/env node
// Developer tool: counts colour literals (hex, rgb(), rgba(), hsl(), named white/black) in the component stylesheets.
// Components must use var(--token) from styles/tokens.css. Allowed: transparent, currentColor, rgba(var(--player-accent-rgb), a)
// (a per-player colour set inline), and everything inside styles/tokens.css.
//   node scripts/color-audit.js        prints file:line for every literal, exits 1 if there is any
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const stylesDir = path.join(__dirname, "..", "styles");
const LITERAL = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|\b(?:rgb|rgba|hsl|hsla)\((?![^)]*var\(--player-accent-rgb\))[^)]*\)|(?<![\w-])(?:white|black)(?![\w-])/g;

function audit() {
  const found = [];
  for (const file of fs.readdirSync(stylesDir).filter((f) => f.endsWith(".css") && f !== "tokens.css").sort()) {
    const css = fs.readFileSync(path.join(stylesDir, file), "utf8");
    css.split("\n").forEach((line, index) => {
      const code = line.replace(/\/\*.*?\*\//g, "");
      // per-player gem definitions and the neutral 'white' inside a comment-free url() are not colours of the theme
      if (/^\s*--(player|gem|ds-avatar)/.test(code) || /url\(/.test(code)) return;
      const hits = code.match(LITERAL);
      if (hits) found.push({ file, line: index + 1, hits, text: code.trim().slice(0, 100) });
    });
  }
  return found;
}

module.exports = { audit };

if (require.main === module) {
  const found = audit();
  found.forEach((f) => console.log(`${f.file}:${f.line}  ${f.hits.join(" ")}  |  ${f.text}`));
  console.log(`${found.length} colour literal(s) outside styles/tokens.css`);
  process.exit(found.length ? 1 : 0);
}
