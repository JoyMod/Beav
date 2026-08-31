#!/usr/bin/env node

import assert from 'node:assert/strict';

const storage = {};
let fetchCalls = 0;
let alarmClears = 0;

globalThis.chrome = {
  storage: {
    local: {
      get: async (keys) => Object.fromEntries(keys.map((key) => [key, storage[key]])),
      set: async (values) => Object.assign(storage, values),
    },
  },
  alarms: {
    clear: async () => { alarmClears += 1; },
  },
};

globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error('local-only diagnostics must never call fetch');
};

const {
  PLUGIN_DIAGNOSTICS_QUEUE_KEY,
  PLUGIN_DIAGNOSTICS_RECENT_KEY,
  PLUGIN_FEEDBACK_ENDPOINT,
  drainPluginDiagnostics,
  reportPluginError,
} = await import('../src/background/diagnostics.js');

const report = await reportPluginError(new Error('capture failed'), { category: 'plugin.capture' });
assert.deepEqual(report, {
  success: true,
  skipped: true,
  reason: 'local_only',
  queued: 0,
});

storage[PLUGIN_DIAGNOSTICS_QUEUE_KEY] = [{ id: 'legacy-report' }];
storage[PLUGIN_DIAGNOSTICS_RECENT_KEY] = { legacy: { occurrences: 1 } };
const drained = await drainPluginDiagnostics();
assert.equal(drained.sent, 0);
assert.equal(drained.dropped, 1);
assert.equal(drained.queued, 0);
assert.deepEqual(storage[PLUGIN_DIAGNOSTICS_QUEUE_KEY], []);
assert.deepEqual(storage[PLUGIN_DIAGNOSTICS_RECENT_KEY], {});
assert.equal(PLUGIN_FEEDBACK_ENDPOINT, '');
assert.equal(fetchCalls, 0);
assert.equal(alarmClears, 1);

console.log(JSON.stringify({ ok: true, mode: 'local_only', fetchCalls }, null, 2));
