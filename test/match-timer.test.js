const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function cardApi(settings = {}) {
  const context = { console, structuredClone };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app", "match-card.js"), "utf8"), context);
  return context.PadelstarMatchCard.create({
    currentLocalRole: () => "admin",
    escapeAttribute: (v) => String(v),
    escapeHtml: (v) => String(v),
    getState: () => ({ settings }),
    translate: (key) => key,
  });
}

const timedMatch = (extra = {}) => ({ id: "m1", state: "playing", startedAt: "2026-09-19T10:00:00.000Z", rules: { timedMinutes: 10 }, ...extra });
const fakeElement = (dataset) => ({ dataset, textContent: "", classes: new Set(), classList: { toggle(name, on) { on ? this.owner.classes.add(name) : this.owner.classes.delete(name); } } });
function fakeRoot(elements) {
  elements.forEach((el) => { el.classList.owner = el; });
  return { querySelectorAll: () => elements };
}

test("a timed match shows its countdown; untimed matches show nothing", () => {
  const { timerMarkup } = cardApi();
  assert.match(timerMarkup(timedMatch()), /data-timer-minutes="10"/);
  assert.equal(timerMarkup({ id: "m1", state: "playing" }), "");
  assert.equal(timerMarkup(timedMatch({ state: "waiting" })), "", "the clock only shows while the match is playing");
});

test("a match that ended on time shows the reason", () => {
  const { timerMarkup } = cardApi();
  assert.match(timerMarkup(timedMatch({ state: "finished", endReason: "timeExpired" })), /match\.timeExpired/);
});

test("a deciding game replaces the countdown with a label", () => {
  const { timerMarkup } = cardApi();
  const html = timerMarkup(timedMatch({ decidingGame: true }));
  assert.match(html, /match\.decidingGame/);
  assert.match(html, /data-deciding="true"/);
});

test("countdown ticks down, highlights the last minute and never goes negative", () => {
  const { updateTimers } = cardApi();
  const el = fakeElement({ timerStart: "2026-09-19T10:00:00.000Z", timerMinutes: "10" });
  const at = (seconds) => Date.parse("2026-09-19T10:00:00.000Z") + seconds * 1000;
  const tick = (seconds) => updateTimers(fakeRoot([el]), at(seconds));
  tick(0);
  assert.equal(el.textContent, "10:00");
  tick(60);
  assert.equal(el.textContent, "09:00");
  assert.ok(!el.classes.has("match-timer-warning"));
  tick(539);
  assert.equal(el.textContent, "01:01");
  assert.ok(!el.classes.has("match-timer-warning"), "more than a minute left");
  tick(540);
  assert.equal(el.textContent, "01:00");
  assert.ok(el.classes.has("match-timer-warning"), "the last minute is highlighted");
  tick(570);
  assert.equal(el.textContent, "00:30");
  tick(600);
  assert.match(el.textContent, /^00:00 · /);
  assert.ok(el.classes.has("match-timer-expired"));
  assert.ok(!el.classes.has("match-timer-warning"));
  tick(9999);
  assert.match(el.textContent, /^00:00 · /, "never negative");
});

test("a timer that has not started yet shows the full time", () => {
  const { updateTimers } = cardApi();
  const el = fakeElement({ timerStart: "", timerMinutes: "15" });
  updateTimers(fakeRoot([el]), Date.now());
  assert.equal(el.textContent, "15:00");
});

test("a deciding-game label is left alone by the ticker", () => {
  const { updateTimers } = cardApi();
  const el = fakeElement({ timerStart: "2026-09-19T10:00:00.000Z", timerMinutes: "10", deciding: "true" });
  el.textContent = "label";
  updateTimers(fakeRoot([el]), Date.parse("2026-09-19T11:00:00.000Z"));
  assert.equal(el.textContent, "label");
});
