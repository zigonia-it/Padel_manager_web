const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const path = require('node:path');

function harness(overrides = {}) {
  const context = vm.createContext({ window: {}, structuredClone, Date });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/tournament-finalization.js'), 'utf8'), context);
  const state = { id: 't1', adminToken: 'secret', revision: 4, status: 'Runde pågår', rounds: [] };
  const commits = [], errors = [], calls = [];
  const deps = {
    getState: () => state,
    isShared: () => true,
    isOnline: () => true,
    flushWrites: async () => true,
    call: async (name, payload) => {
      calls.push({ name, payload });
      return { data: { id: 't1', outcome: 'completed', deleted: true, statisticsSaved: true } };
    },
    commit: async result => commits.push(result),
    reportError: error => errors.push(error),
    ...overrides,
  };
  return { controller: context.window.PadelstarTournamentFinalization.create(deps), state, commits, errors, calls };
}

test('shared finalization waits for persisted results and server statistics before commit', async () => {
  let release;
  const h = harness({ flushWrites: () => new Promise(resolve => { release = resolve; }) });
  const operation = h.controller.finalize();
  assert.equal(h.commits.length, 0);
  assert.equal(h.calls.length, 0);
  h.state.revision = 5;
  release(true);
  assert.equal(await operation, true);
  assert.equal(h.calls[0].payload.p_expected_revision, 5);
  assert.equal(h.commits[0].statisticsSaved, true);
});

test('offline, unsaved scores, RPC error and missing acknowledgement preserve active data', async () => {
  for (const overrides of [
    { isOnline: () => false },
    { flushWrites: async () => false },
    { call: async () => ({ error: new Error('statistics write failed') }) },
    { call: async () => ({ data: { id: 't1', deleted: true } }) },
  ]) {
    const h = harness(overrides);
    const before = structuredClone(h.state);
    assert.equal(await h.controller.finalize(), false);
    assert.deepEqual(h.state, before);
    assert.equal(h.commits.length, 0);
    assert.equal(h.errors.length, 1);
  }
});

test('duplicate clicks share one request and uncertain failure can be retried', async () => {
  let release, requests = 0;
  const h = harness({ call: () => {
    requests++;
    return new Promise(resolve => { release = resolve; });
  } });
  const first = h.controller.finalize();
  assert.equal(first, h.controller.finalize());
  await new Promise(resolve => setImmediate(resolve));
  release({ error: new Error('response lost') });
  assert.equal(await first, false);
  const retry = h.controller.finalize();
  await new Promise(resolve => setImmediate(resolve));
  release({ data: { id: 't1', outcome: 'completed', deleted: true, statisticsSaved: true } });
  assert.equal(await retry, true);
  assert.equal(requests, 2);
  assert.equal(h.commits.length, 1);
});

test('local cancellation works without network and never claims server statistics were saved', async () => {
  const h = harness({ isShared: () => false, isOnline: () => false });
  h.state.rounds = [{ status: 'active', matches: [{ state: 'playing' }, { state: 'finished' }] }];
  assert.equal(await h.controller.finalize('cancelled'), true);
  assert.equal(h.calls.length, 0);
  const result = h.commits[0];
  assert.equal(result.statisticsSaved, false);
  assert.equal(result.localOnly, true);
  assert.equal(result.state.rounds[0].matches[0].state, 'cancelled');
  assert.equal(result.state.rounds[0].matches[1].state, 'finished');
  assert.equal(h.state.status, 'Runde pågår');
});


test('lost response retries the persisted intent without attempting to save a deleted tournament', async () => {
  let intent = null, flushes = 0, requests = 0;
  const h = harness({
    getIntent: () => intent,
    saveIntent: value => { intent = value; },
    clearIntent: () => { intent = null; },
    flushWrites: async () => ++flushes === 1,
    call: async (_name, payload) => {
      requests++;
      assert.equal(payload.p_expected_revision, 4);
      assert.equal(payload.p_outcome, 'completed');
      if (requests === 1) throw new Error('response lost after deletion');
      return { data: { id: 't1', outcome: 'completed', deleted: true, statisticsSaved: true } };
    },
  });
  assert.equal(await h.controller.finalize(), false);
  assert.equal(intent.id, 't1');
  h.state.revision = 5;
  assert.equal(await h.controller.finalize('cancelled'), true);
  assert.equal(flushes, 1);
  assert.equal(intent, null);
  assert.equal(h.commits.length, 1);
});
