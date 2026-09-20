// 0.10 milestone: decisions of 2026-09-20 (privacy services section, TV on phones, cups, corrections, invitations, system log, merged workspace).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("the privacy page ends with a section naming the services used, in both shipped languages", () => {
  const html = read("privacy.html");
  const i18n = read("app", "privacy-i18n.js");
  const section = html.slice(html.indexOf('data-privacy-i18n="services"'));
  assert.ok(section.length > 0, "the services heading exists");
  assert.ok(html.indexOf('data-privacy-i18n="services"') > html.indexOf('data-privacy-i18n="status"'), "at the bottom, after the consent section");
  const keys = [...html.matchAll(/data-privacy-i18n="([A-Za-z]+)"/g)].map((m) => m[1]);
  for (const language of ["nb", "en"]) {
    const start = i18n.indexOf(`\n    ${language}: {`);
    const block = i18n.slice(start, i18n.indexOf("\n    },", start));
    for (const key of keys) assert.match(block, new RegExp(`\\b${key}:`), `${language} has ${key}`);
  }
  for (const name of ["Supabase", "Vercel", "Resend", "jsDelivr", "flagcdn.com", "quickchart.io"]) assert.match(section, new RegExp(name));
});

test("TV Mode is in the phone's bottom tab bar and its page fits a phone", () => {
  const html = read("index.html");
  const tabs = html.match(/<nav class="workspace-bottom-tabs[\s\S]*?<\/nav>/)[0];
  assert.match(tabs, /id="tvModeBottomButton"[^>]*data-action="tv-mode"/);
  assert.match(read("app", "bootstrap", "app-events.js"), /tvModeBottomButton\?\.addEventListener\("click", callbacks\.toggleTvModeFromMenu\)/);
  const css = read("styles", "tv.css");
  const phone = css.slice(css.lastIndexOf("@media (max-width: 700px)"));
  assert.match(phone, /\.tv-columns, \.tv-columns\.tv-idle \{ grid-template-rows: none/, "panels grow with their content");
  assert.match(phone, /\.tv-match-card \{ overflow: visible; \}/, "names are not clipped");
  assert.match(phone, /\.tv-header-end \{ flex-direction: column/, "the switch and the clock stack so the header fits 375px");
});
