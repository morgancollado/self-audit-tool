// Run: node lib/storage/storage.test.ts   (Node >=22.18 strips types natively)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MemoryBackend } from './backend.ts';
import { AuditStore } from './audit-store.ts';
import { StorageManager, StorageBackends } from './manager.ts';
import { migrate } from './migrate.ts';
import { newFinding } from '../model/factory.ts';
import { SCHEMA_VERSION } from '../model/types.ts';

function testBackends() {
  const b: StorageBackends = {
    persistentAudit: new MemoryBackend(),
    ephemeralAudit: new MemoryBackend(),
    persistentPrefs: new MemoryBackend(),
    ephemeralPrefs: new MemoryBackend(),
    hardWipeCalls: 0,
    hardWipe: async () => {
      (b as any).hardWipeCalls++;
    },
  } as StorageBackends & { hardWipeCalls: number };
  return b as StorageBackends & {
    persistentAudit: MemoryBackend;
    ephemeralAudit: MemoryBackend;
    persistentPrefs: MemoryBackend;
    ephemeralPrefs: MemoryBackend;
    hardWipeCalls: number;
  };
}

test('MemoryBackend round-trips and clears', async () => {
  const b = new MemoryBackend();
  await b.set('k', { a: 1 });
  assert.deepEqual(await b.get('k'), { a: 1 });
  assert.deepEqual(await b.keys(), ['k']);
  await b.clear();
  assert.equal(await b.get('k'), undefined);
  assert.equal(b.size, 0);
});

test('MemoryBackend stores by value, not reference', async () => {
  const b = new MemoryBackend();
  const obj = { a: 1 };
  await b.set('k', obj);
  obj.a = 999;
  assert.deepEqual(await b.get('k'), { a: 1 });
});

test('AuditStore.init creates a versioned doc; update bumps + persists', async () => {
  const store = new AuditStore(new MemoryBackend());
  const state = await store.init({ country: 'us', region: 'CA' });
  assert.equal(state.schemaVersion, SCHEMA_VERSION);
  assert.equal(state.jurisdiction.region, 'CA');
  assert.deepEqual(state.findings, []);

  await store.update((d) => {
    d.findings.push(newFinding({ source: 'broker', label: 'Spokeo', whatFound: 'name history', exposesDeadname: true, priority: 'high' }));
  });
  const reloaded = await store.load();
  assert.equal(reloaded?.findings.length, 1);
  assert.equal(reloaded?.findings[0].actionable, true); // default
});

test('AuditStore.update before init throws (no silent data creation)', async () => {
  const store = new AuditStore(new MemoryBackend());
  await assert.rejects(() => store.update(() => {}), /before init/);
});

test('ephemeral mode writes NOTHING to the persistent (disk) backend', async () => {
  const b = testBackends();
  const mgr = StorageManager.create(b, 'ephemeral');
  await mgr.audit.init({ country: 'us' });
  await mgr.audit.update((d) => {
    d.findings.push(newFinding({ source: 'search', label: 'Google', whatFound: 'deadname result', exposesDeadname: true, priority: 'medium' }));
  });
  await mgr.savePreferences({ contentWarnings: true, safetyIntroAcknowledged: true });

  // The disk backends must be untouched.
  assert.equal(b.persistentAudit.size, 0, 'persistent audit must stay empty in ephemeral mode');
  assert.equal(b.persistentPrefs.size, 0, 'persistent prefs must stay empty in ephemeral mode');
  // The ephemeral backend holds the data.
  assert.equal(b.ephemeralAudit.size, 1);
});

test('panic wipeAll clears every backend and hard-wipes', async () => {
  const b = testBackends();
  const mgr = StorageManager.create(b, 'persistent');
  await mgr.audit.init({ country: 'us' });
  await mgr.savePreferences({ contentWarnings: true, safetyIntroAcknowledged: true, storageMode: 'persistent' });
  // also put something in the ephemeral side to prove both are cleared
  await b.ephemeralAudit.set('x', 1);
  assert.ok(b.persistentAudit.size > 0);

  await mgr.wipeAll();

  assert.equal(b.persistentAudit.size, 0);
  assert.equal(b.persistentPrefs.size, 0);
  assert.equal(b.ephemeralAudit.size, 0);
  assert.equal(b.ephemeralPrefs.size, 0);
  assert.equal(b.hardWipeCalls, 1, 'hard platform wipe must run');
});

test('panic is resilient: one failing backend still clears the rest and hard-wipes', async () => {
  const b = testBackends();
  // Simulate a backend whose clear() rejects (e.g. an IndexedDB error mid-panic).
  (b.persistentAudit as { clear: () => Promise<void> }).clear = async () => {
    throw new Error('backend clear failed');
  };
  const mgr = StorageManager.create(b, 'persistent');
  await b.ephemeralAudit.set('x', 1);
  await b.persistentPrefs.set('p', 1);

  // Must not throw — the panic UI reloads regardless and the user must not be
  // left thinking nothing happened.
  await assert.doesNotReject(() => mgr.wipeAll());

  // The other backends were still cleared and the hard wipe still ran.
  assert.equal(b.ephemeralAudit.size, 0);
  assert.equal(b.persistentPrefs.size, 0);
  assert.equal(b.hardWipeCalls, 1, 'hard wipe runs even when a backend.clear rejects');
});

test('switch persistent -> ephemeral with wipeExisting clears disk', async () => {
  const b = testBackends();
  const mgr = StorageManager.create(b, 'persistent');
  await mgr.audit.init({ country: 'us' });
  assert.ok(b.persistentAudit.size > 0);

  await mgr.setMode('ephemeral', { wipeExisting: true });

  assert.equal(mgr.mode, 'ephemeral');
  assert.equal(b.persistentAudit.size, 0, 'existing disk data wiped on switch');
  assert.equal(b.hardWipeCalls, 1);
});

test('migrate rejects a future schema version', () => {
  assert.throws(() => migrate({ schemaVersion: SCHEMA_VERSION + 1 }), /newer version/);
});

test('migrate passes through a current-version doc', () => {
  const doc = { schemaVersion: SCHEMA_VERSION, findings: [], remediations: [] };
  assert.equal(migrate(doc).schemaVersion, SCHEMA_VERSION);
});
