const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const test = require('node:test');

function setup(choice = 'guest') {
  const context = vm.createContext({ window: {}, FormData: class { constructor(form) { this.form = form; } get(key) { return this.form.values[key] ?? ''; } } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/tournament-entry.js'), 'utf8'), context);
  let user = null, state = { players: [] };
  const calls = [];
  const form = { values: { tournamentName: 'Test', inviteCode: 'ABCD', playerName: 'Ada' }, reportValidity: () => true, reset() {} };
  const deps = {
    getAdminAuthUser: async () => user, getClient: () => ({}), requestAccountChoice: async kind => { calls.push(`choice:${kind}`); return choice; },
    showAccount: mode => calls.push(mode), createInviteCode: () => 'ABCD', parsePlayerNames: () => [],
    createTournament: () => ({ id: 't1', players: [] }), getProfile: () => null,
    setState: value => { state = value; }, getState: () => state, setLocalRole: () => {},
    saveState: () => {}, createRemoteTournament: async () => calls.push('remote:create'),
    showWorkspace: () => {}, render: () => {}, randomAvatarId: () => 'smash',
    loadRemoteTournamentByInvite: async () => true, hasTournamentForInvite: () => true,
    joinRemoteTournament: async () => { calls.push('remote:join'); state.players.push({ id: 'p1', name: 'Ada' }); return true; },
    findPlayerByName: () => state.players[0], syncJoinPreview: () => {},
  };
  return { entry: context.window.PadelstarTournamentEntry.create(deps), calls, setUser: value => { user = value; }, event: { preventDefault() {}, currentTarget: form } };
}

test('guest creation and joining still use the shared database', async () => {
  const create = setup(); await create.entry.handleCreate(create.event);
  assert.deepEqual(create.calls, ['choice:create', 'remote:create']);
  const join = setup(); await join.entry.handleJoin(join.event);
  assert.deepEqual(join.calls, ['choice:join', 'remote:join']);
});
test('login preserves the pending form and resumes it only once after authentication', async () => {
  const h = setup('signin'); await h.entry.handleCreate(h.event);
  assert.deepEqual(h.calls, ['choice:create', 'signin']);
  h.setUser({ id: 'account' }); await h.entry.resumePendingEntry(); await h.entry.resumePendingEntry();
  assert.deepEqual(h.calls, ['choice:create', 'signin', 'remote:create']);
});
test('cancel never creates or joins, authenticated players skip the choice', async () => {
  const cancelled = setup('cancel'); await cancelled.entry.handleCreate(cancelled.event);
  assert.deepEqual(cancelled.calls, ['choice:create']);
  const account = setup(); account.setUser({ id: 'account' }); await account.entry.handleJoin(account.event);
  assert.deepEqual(account.calls, ['remote:join']);
});
