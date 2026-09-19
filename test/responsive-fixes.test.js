const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(path.join(__dirname, "..", "styles", "responsive.css"), "utf8");

test("on phones the account forms are a proper column (found in a layout check of the sign-in screen)", () => {
  const block = css.slice(css.indexOf("@media (max-width: 760px)", css.indexOf("The account forms")));
  assert.match(block, /\.account-auth-panel \.inline-form\s*\{[^}]*align-items:\s*stretch/);
  assert.match(block, /\.account-auth-panel \.inline-form > label\s*\{[^}]*flex:\s*0 0 auto/, "a label must not keep flex: 1 1 220px, which is a 220px height in a column");
});

test("the phone header gives the notification bell its own column and touch targets stay at least 32px", () => {
  assert.match(css, /\.topbar-actions:has\(> \.notification-bell:not\(\.hidden\)\)/);
  assert.match(css, /\.footer-links a\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /input\[readonly\]\s*\{[^}]*min-height:\s*44px/);
});
