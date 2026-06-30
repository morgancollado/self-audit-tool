// Run: npx tsx --test lib/remediate/records.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { selectRecords } from './records.ts';
import { DeadnameRecord } from '../content/types.ts';

const global1: DeadnameRecord = {
  slug: 'web-archive',
  class: 'archive',
  permanence: 'high',
  whatItIs: 'x',
  actions: ['a'],
  lastVerified: '2026-06-01',
};
const usNational: DeadnameRecord = {
  slug: 'name-change',
  jurisdiction: { country: 'us' },
  class: 'name-change',
  exposesDeadnameRisk: 'high',
  permanence: 'high',
  whatItIs: 'x',
  actions: ['a'],
  lastVerified: '2026-06-01',
};
const usCa: DeadnameRecord = {
  slug: 'ca-court',
  jurisdiction: { country: 'us', region: 'CA' },
  class: 'court-record',
  exposesDeadnameRisk: 'high',
  permanence: 'high',
  whatItIs: 'x',
  actions: ['a'],
  lastVerified: '2026-06-01',
};
const co: DeadnameRecord = { ...usNational, slug: 'co-rec', jurisdiction: { country: 'co' } };

const RECORDS = [global1, usNational, usCa, co];

test('global records apply everywhere; never cross-country for scoped ones', () => {
  const out = selectRecords(RECORDS, { country: 'us' });
  const slugs = out.map((r) => r.slug);
  assert.ok(slugs.includes('web-archive'), 'global record applies');
  assert.ok(slugs.includes('name-change'), 'us national applies');
  assert.ok(!slugs.includes('co-rec'), 'colombia record must not show to a us user');
});

test('region-specific record shows only on exact region match', () => {
  const noRegion = selectRecords(RECORDS, { country: 'us' }).map((r) => r.slug);
  assert.ok(!noRegion.includes('ca-court'), 'CA record hidden when no region selected');

  const ca = selectRecords(RECORDS, { country: 'us', region: 'CA' }).map((r) => r.slug);
  assert.ok(ca.includes('ca-court'), 'CA record shows for a CA user');

  const tx = selectRecords(RECORDS, { country: 'us', region: 'TX' }).map((r) => r.slug);
  assert.ok(!tx.includes('ca-court'), 'CA record must not show to a TX user');
});

test('ordering: region-specific first, then national, then global', () => {
  const out = selectRecords(RECORDS, { country: 'us', region: 'CA' }).map((r) => r.slug);
  assert.deepEqual(out, ['ca-court', 'name-change', 'web-archive']);
});
