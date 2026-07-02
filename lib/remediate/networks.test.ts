// Run: npx tsx --test lib/remediate/networks.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Broker, BrokerNetwork } from '../content/types';
import { groupBrokers } from './networks.ts';
import { BROKERS } from '../content/brokers.ts';

function makeBroker(slug: string, network?: BrokerNetwork): Broker {
  return {
    slug,
    jurisdiction: { country: 'us' },
    name: slug.toUpperCase(),
    category: 'people-search',
    exposesDeadnameRisk: 'high',
    optOut: { methods: ['web-form'], webFormUrl: `https://${slug}.example/optout`, requiresId: false, steps: ['Submit the form.'] },
    network,
    lastVerified: '2026-01-01',
  };
}

const NET: BrokerNetwork = { key: 'shared', name: 'Shared Backbone', note: 'One request covers all.' };

test('standalone brokers become single-member groups keyed by slug', () => {
  const groups = groupBrokers([makeBroker('solo')]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, 'solo');
  assert.equal(groups[0].isNetwork, false);
  assert.equal(groups[0].members.length, 1);
  assert.equal(groups[0].representative.slug, 'solo');
});

test('networked brokers fold into one group with sorted members and a deterministic representative', () => {
  const groups = groupBrokers([makeBroker('zeta', NET), makeBroker('solo'), makeBroker('alpha', NET)]);
  assert.equal(groups.length, 2);
  const net = groups.find((g) => g.key === 'shared')!;
  assert.equal(net.isNetwork, true);
  assert.equal(net.name, 'Shared Backbone');
  assert.equal(net.note, 'One request covers all.');
  assert.deepEqual(net.members.map((m) => m.slug), ['alpha', 'zeta']);
  assert.equal(net.representative.slug, 'alpha');
});

test('group order follows first appearance in the input', () => {
  const groups = groupBrokers([makeBroker('solo'), makeBroker('zeta', NET), makeBroker('alpha', NET)]);
  assert.deepEqual(groups.map((g) => g.key), ['solo', 'shared']);
});

test('the shipped manifest folds into fewer tasks and every broker lands in exactly one group', () => {
  const groups = groupBrokers(BROKERS);
  assert.ok(groups.length < BROKERS.length, 'expected the networks to reduce the task count');
  const seen = new Set<string>();
  for (const g of groups) {
    assert.ok(g.members.includes(g.representative), `${g.key}: representative not among members`);
    for (const m of g.members) {
      assert.ok(!seen.has(m.slug), `${m.slug} appears in more than one group`);
      seen.add(m.slug);
    }
  }
  assert.equal(seen.size, BROKERS.length);
});
