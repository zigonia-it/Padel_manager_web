const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const filename = path.join(__dirname, "..", "app", "core", "session-controller.js");

test("session controller joins a new player through the supplied player boundaries", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  const created = { id: "p1", name: "Ada" };
  let added = false;
  const controller = context.window.PadelstarSessionController.create({
    getState: () => ({ settings: {} }),
    findPlayerByName: () => null,
    addPlayer: () => { added = true; return created; },
    linkProfileToPlayer: (player) => ({ ...player, profileId: "profile-1" }),
  });
  assert.deepEqual(controller.joinTournament("Ada", "avatar-1"), { id: "p1", name: "Ada", profileId: "profile-1", guest: false, participantType: "player" });
  assert.equal(added, true);
});
