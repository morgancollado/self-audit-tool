// Run: npx tsx --test lib/remediate/progress.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { countGroupsTracked, summarizePlaybook } from './progress.ts';
import { AuditState, Remediation } from '../model/types.ts';
import { Broker } from '../content/types.ts';
import { groupBrokers } from './networks.ts';

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

test('countGroupsTracked: a group counts only when every member has an optout row', () => {
  const mk = (slug: string, network?: { key: string; name: string }): Broker => ({
    slug,
    jurisdiction: { country: 'us' },
    name: slug,
    category: 'people-search',
    exposesDeadnameRisk: 'high',
    optOut: { methods: ['web-form'], webFormUrl: 'https://x/optout', requiresId: false, steps: ['do it'] },
    network,
    lastVerified: '2026-01-01',
  });
  const net = { key: 'shared', name: 'Shared Backbone' };
  const groups = groupBrokers([mk('a', net), mk('b', net), mk('solo')]);
  const row = (refId: string, pillar: Remediation['pillar'] = 'optout'): Remediation => ({
    id: refId,
    pillar,
    refId,
    action: 'x',
    state: 'sent',
    updatedAt: '2026-06-01',
  });

  assert.equal(countGroupsTracked(groups, []), 0);
  assert.equal(countGroupsTracked(groups, [row('a')]), 0, 'half-tracked network does not count');
  assert.equal(countGroupsTracked(groups, [row('a'), row('b')]), 1);
  assert.equal(countGroupsTracked(groups, [row('a'), row('b'), row('solo')]), 2);
  assert.equal(countGroupsTracked(groups, [row('solo', 'platform')]), 0, 'only optout rows count');
});
