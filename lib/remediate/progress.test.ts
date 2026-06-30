// Run: npx tsx --test lib/remediate/progress.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { summarizePlaybook } from './progress.ts';
import { AuditState } from '../model/types.ts';

const empty: AuditState = {
  schemaVersion: 1,
  createdAt: '2026-06-01',
  updatedAt: '2026-06-01',
  jurisdiction: { country: 'us' },
  findings: [],
  remediations: [],
  progress: { discoverCompletedSteps: [], remediateCompletedSteps: [] },
};

test('null / empty state summarizes to zeros', () => {
  for (const s of [null, empty]) {
    const out = summarizePlaybook(s);
    assert.equal(out.findings, 0);
    assert.equal(out.totalRemediations, 0);
    assert.deepEqual(out.byPillar, { optout: 0, platform: 0, breach: 0, deadname: 0 });
  }
});

test('counts findings, deadname findings, and per-pillar / per-state remediations', () => {
  const state: AuditState = {
    ...empty,
    findings: [
      { id: '1', source: 'broker', label: 'Spokeo', whatFound: '', exposesDeadname: true, priority: 'high', status: 'resolved', actionable: true, createdAt: '2026-06-01' },
      { id: '2', source: 'search', label: 'blog', whatFound: '', exposesDeadname: false, priority: 'low', status: 'found', actionable: true, createdAt: '2026-06-01' },
    ],
    remediations: [
      { id: 'a', pillar: 'optout', action: 'x', state: 'sent', updatedAt: '2026-06-01' },
      { id: 'b', pillar: 'platform', action: 'y', state: 'confirmed', updatedAt: '2026-06-01' },
      { id: 'c', pillar: 'deadname', action: 'z', state: 'sent', updatedAt: '2026-06-01' },
    ],
    progress: { discoverCompletedSteps: ['s1', 's2'], remediateCompletedSteps: [] },
  };
  const out = summarizePlaybook(state);
  assert.equal(out.findings, 2);
  assert.equal(out.deadnameFindings, 1);
  assert.equal(out.resolvedFindings, 1);
  assert.equal(out.discoverStepsDone, 2);
  assert.equal(out.totalRemediations, 3);
  assert.deepEqual(out.byPillar, { optout: 1, platform: 1, breach: 0, deadname: 1 });
  assert.equal(out.byState.sent, 2);
  assert.equal(out.byState.confirmed, 1);
});
