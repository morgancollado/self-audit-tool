// Run: npx tsx --test lib/storage/backup.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { encryptJson, decryptJson } from './crypto.ts';
import { serializeBackup, parseBackup, isEncryptedBackup, mergeAudit } from './backup.ts';
import { AuditState } from '../model/types.ts';

const state: AuditState = {
  schemaVersion: 1,
  createdAt: '2026-06-01',
  updatedAt: '2026-06-01',
  jurisdiction: { country: 'us', region: 'CA' },
  findings: [
    { id: 'f1', source: 'broker', label: 'Spokeo', whatFound: '', exposesDeadname: true, priority: 'high', status: 'found', actionable: true, createdAt: '2026-06-01' },
  ],
  remediations: [
    { id: 'r1', pillar: 'optout', action: 'sent', state: 'sent', updatedAt: '2026-06-01' },
  ],
  progress: { discoverCompletedSteps: ['s1'], remediateCompletedSteps: [] },
};

test('crypto: AES-GCM round-trips through a passphrase', async () => {
  const env = await encryptJson({ hello: 'world', n: 42 }, 'correct horse');
  const back = await decryptJson(env, 'correct horse');
  assert.deepEqual(back, { hello: 'world', n: 42 });
});

test('crypto: the wrong passphrase fails to decrypt (does not return garbage)', async () => {
  const env = await encryptJson({ secret: 'deadname' }, 'right');
  await assert.rejects(() => decryptJson(env, 'wrong'), /Wrong passphrase/);
});

test('encrypted export does not contain the plaintext deadname', async () => {
  const text = await serializeBackup(
    { ...state, identity: { rememberNames: true, names: ['Deadname McTest'] } } as AuditState,
    { passphrase: 'pw' },
  );
  assert.ok(isEncryptedBackup(text), 'should be flagged encrypted');
  assert.ok(!text.includes('Deadname McTest'), 'the deadname must not be readable in an encrypted backup');
});

test('encrypted round-trip restores the exact state', async () => {
  const text = await serializeBackup(state, { passphrase: 'hunter2' });
  const { state: out, wasEncrypted } = await parseBackup(text, 'hunter2');
  assert.equal(wasEncrypted, true);
  assert.deepEqual(out, state);
});

test('encrypted import without a passphrase is rejected calmly', async () => {
  const text = await serializeBackup(state, { passphrase: 'hunter2' });
  await assert.rejects(() => parseBackup(text), /encrypted/);
});

test('plaintext export round-trips and is readable', async () => {
  const text = await serializeBackup(state, {});
  assert.equal(isEncryptedBackup(text), false);
  const { state: out, wasEncrypted } = await parseBackup(text);
  assert.equal(wasEncrypted, false);
  assert.deepEqual(out, state);
});

test('malformed input is rejected with a calm error', async () => {
  await assert.rejects(() => parseBackup('not json'), /valid JSON/);
  await assert.rejects(() => parseBackup('{"errataBackup":1,"encrypted":false,"state":{}}'), /recognizable/);
});

test('decrypt rejects an out-of-band iteration count (no KDF-hang from a hostile file)', async () => {
  const env = await encryptJson({ secret: 'deadname' }, 'pw');
  await assert.rejects(() => decryptJson({ ...env, iterations: 5_000_000_000 }, 'pw'), /damaged|different app/);
  await assert.rejects(() => decryptJson({ ...env, iterations: 1 }, 'pw'), /damaged|different app/);
});

test('an encrypted backup with a missing/garbled envelope is rejected calmly', async () => {
  const noEnvelope = JSON.stringify({ errataBackup: 1, encrypted: true });
  await assert.rejects(() => parseBackup(noEnvelope, 'pw'), /missing or unreadable/);
  const garbled = JSON.stringify({ errataBackup: 1, encrypted: true, envelope: { salt: 'not-base64-!!' } });
  await assert.rejects(() => parseBackup(garbled, 'pw'), /missing or unreadable/);
});

test('a newer-schema backup is refused (no silent data loss)', async () => {
  const text = await serializeBackup({ ...state, schemaVersion: 999 }, {});
  await assert.rejects(() => parseBackup(text), /newer version/);
});

test('merge unions findings, remediations, and progress by id without duplicates', () => {
  const incoming: AuditState = {
    ...state,
    findings: [
      state.findings[0], // duplicate id f1 — must not double
      { id: 'f2', source: 'search', label: 'blog', whatFound: '', exposesDeadname: false, priority: 'low', status: 'found', actionable: true, createdAt: '2026-06-02' },
    ],
    remediations: [{ id: 'r2', pillar: 'platform', action: 'x', state: 'confirmed', updatedAt: '2026-06-02' }],
    progress: { discoverCompletedSteps: ['s1', 's2'], remediateCompletedSteps: ['m1'] },
  };
  const merged = mergeAudit(state, incoming);
  assert.deepEqual(merged.findings.map((f) => f.id), ['f1', 'f2']);
  assert.deepEqual(merged.remediations.map((r) => r.id), ['r1', 'r2']);
  assert.deepEqual(merged.progress.discoverCompletedSteps.sort(), ['s1', 's2']);
  assert.deepEqual(merged.progress.remediateCompletedSteps, ['m1']);
});
