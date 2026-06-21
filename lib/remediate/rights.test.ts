// Run: npx tsx --test lib/remediate/rights.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { selectLaws, hasRegionalLaw } from './rights.ts';
import { Law } from '../content/types.ts';

const nationalUs: Law = {
  jurisdiction: { country: 'us' },
  appliesNationally: true,
  key: 'us-baseline',
  title: 'Baseline',
  summary: 's',
  disclaimer: 'd',
  lastVerified: '2026-06-01',
};
const ca: Law = {
  jurisdiction: { country: 'us', region: 'CA' },
  appliesNationally: false,
  key: 'us-ca',
  title: 'CCPA',
  summary: 's',
  disclaimer: 'd',
  lastVerified: '2026-06-01',
};
const tx: Law = {
  jurisdiction: { country: 'us', region: 'TX' },
  appliesNationally: false,
  key: 'us-tx',
  title: 'TDPSA',
  summary: 's',
  disclaimer: 'd',
  lastVerified: '2026-06-01',
};
const co: Law = { ...ca, jurisdiction: { country: 'co' }, appliesNationally: true, key: 'co-law', title: 'CO' };

const LAWS = [nationalUs, ca, tx, co];

test('SAFETY: a non-CA user never sees CCPA framing', () => {
  const out = selectLaws(LAWS, { country: 'us', region: 'TX' });
  const keys = out.map((l) => l.key);
  assert.ok(!keys.includes('us-ca'), 'CCPA must not surface to a Texas user');
  assert.ok(keys.includes('us-tx'), 'Texas law should surface');
  assert.ok(keys.includes('us-baseline'), 'national baseline always applies');
});

test('a CA user sees CCPA but not Texas law', () => {
  const out = selectLaws(LAWS, { country: 'us', region: 'CA' });
  const keys = out.map((l) => l.key);
  assert.deepEqual(keys.sort(), ['us-baseline', 'us-ca']);
});

test('no region: only national baseline, no invented state rights', () => {
  const out = selectLaws(LAWS, { country: 'us' });
  assert.deepEqual(out.map((l) => l.key), ['us-baseline']);
});

test('region-specific rights lead, national baseline follows', () => {
  const out = selectLaws(LAWS, { country: 'us', region: 'CA' });
  assert.equal(out[0].appliesNationally, false);
  assert.equal(out[out.length - 1].appliesNationally, true);
});

test('never falls back across countries', () => {
  const out = selectLaws(LAWS, { country: 'co' });
  assert.deepEqual(out.map((l) => l.key), ['co-law']);
});

test('hasRegionalLaw is true only with authored region content', () => {
  assert.equal(hasRegionalLaw(LAWS, { country: 'us', region: 'CA' }), true);
  assert.equal(hasRegionalLaw(LAWS, { country: 'us', region: 'NY' }), false);
  assert.equal(hasRegionalLaw(LAWS, { country: 'us' }), false);
});
