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

// REGRESSION (grouped tracker controls): update() is read-modify-write, so
// un-serialized concurrent updates would each load the same snapshot and the
// last save would win — a 6-row network group's "Remove" left 5 rows behind and
// its status change landed on 1 of 6. update() must chain concurrent callers.
test('concurrent updates are serialized — none lost', async () => {
  const store = new AuditStore(new MemoryBackend());
  await store.init({ country: 'us' });
  const slugs = ['a', 'b', 'c', 'd', 'e', 'f'];
  await store.update((d) => {
    for (const slug of slugs) {
      d.remediations.push({
        id: slug,
        pillar: 'optout',
        refId: slug,
        action: `Opt-out request to ${slug}`,
        state: 'sent',
        updatedAt: '2026-01-01',
      });
    }
  });

  // Fire all six updates without awaiting between them (the UI's worst case).
  await Promise.all(
    slugs.map((slug) =>
      store.update((d) => {
        const row = d.remediations.find((r) => r.id === slug);
        if (row) row.state = 'confirmed';
      }),
    ),
  );
  const afterUpdate = await store.load();
  assert.equal(
    afterUpdate!.remediations.filter((r) => r.state === 'confirmed').length,
    6,
    'every concurrent status update must land',
  );

  await Promise.all(
    slugs.map((slug) =>
      store.update((d) => {
        d.remediations = d.remediations.filter((r) => r.id !== slug);
      }),
    ),
  );
  const afterRemove = await store.load();
  assert.equal(afterRemove!.remediations.length, 0, 'every concurrent removal must land');
});

test('a rejected update does not wedge later ones', async () => {
  const store = new AuditStore(new MemoryBackend());
  await store.init({ country: 'us' });
  await assert.rejects(
    store.update(() => {
      throw new Error('boom');
    }),
  );
  const after = await store.update((d) => {
    d.remediations.push({
      id: 'x',
      pillar: 'optout',
      refId: 'x',
      action: 'Opt-out request to x',
      state: 'sent',
      updatedAt: '2026-01-01',
    });
  });
  assert.equal(after.remediations.length, 1);
});
