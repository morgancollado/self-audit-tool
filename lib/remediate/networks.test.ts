// Run: npx tsx --test lib/remediate/networks.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Broker, BrokerNetwork } from '../content/types';
import { groupBrokers, groupTrackInputs } from './networks.ts';
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

const NET: BrokerNetwork = {
  key: 'shared',
  name: 'Shared Backbone',
  note: 'One request covers all.',
  coverage: 'single-submission',
};

test('standalone brokers become single-member groups keyed by slug', () => {
  const groups = groupBrokers([makeBroker('solo')]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, 'solo');
  assert.equal(groups[0].isNetwork, false);
  assert.equal(groups[0].members.length, 1);
  assert.equal(groups[0].representative.slug, 'solo');
});

test('networked brokers fold into one group with sorted members and the flagged representative', () => {
  // zeta carries the representative flag: the content's choice must win over
  // slug order, so adding an alphabetically-earlier member can never silently
  // swap which site's opt-out route the card uses.
  const groups = groupBrokers([
    makeBroker('zeta', { ...NET, representative: true }),
    makeBroker('solo'),
    makeBroker('alpha', NET),
  ]);
  assert.equal(groups.length, 2);
  const net = groups.find((g) => g.key === 'shared')!;
  assert.equal(net.isNetwork, true);
  assert.equal(net.name, 'Shared Backbone');
  assert.equal(net.note, 'One request covers all.');
  assert.equal(net.coverage, 'single-submission');
  assert.deepEqual(net.members.map((m) => m.slug), ['alpha', 'zeta']);
  assert.equal(net.representative.slug, 'zeta');
});

test('without a representative flag the first member by slug is the deterministic fallback', () => {
  const groups = groupBrokers([makeBroker('zeta', NET), makeBroker('alpha', NET)]);
  assert.equal(groups[0].representative.slug, 'alpha');
});

test('group order follows first appearance in the input', () => {
  const groups = groupBrokers([makeBroker('solo'), makeBroker('zeta', NET), makeBroker('alpha', NET)]);
  assert.deepEqual(groups.map((g) => g.key), ['solo', 'shared']);
});

test('groupTrackInputs: single-submission marks every member sent', () => {
  const groups = groupBrokers([makeBroker('beta', { ...NET, representative: true }), makeBroker('alpha', NET)]);
  const inputs = groupTrackInputs(groups[0], new Map([['alpha', 'finding-1']]));
  assert.deepEqual(
    inputs.map((i) => ({ refId: i.refId, state: i.state, findingId: i.findingId })),
    [
      { refId: 'alpha', state: 'sent', findingId: 'finding-1' },
      { refId: 'beta', state: 'sent', findingId: undefined },
    ],
  );
  for (const i of inputs) assert.match(i.action, /^Opt-out request to /);
});

test('groupTrackInputs: shared-backbone marks only the representative sent, siblings become re-check to-dos', () => {
  // The honesty rule: an unverified family-wide removal must never record a
  // sibling as "sent" — a false sent leaves a deadname up while the user
  // believes it handled.
  const SHARED: BrokerNetwork = { key: 'fam', name: 'Family', coverage: 'shared-backbone' };
  const groups = groupBrokers([
    makeBroker('lead', { ...SHARED, representative: true }),
    makeBroker('aside', SHARED),
  ]);
  const inputs = groupTrackInputs(groups[0], new Map());
  const lead = inputs.find((i) => i.refId === 'lead')!;
  const aside = inputs.find((i) => i.refId === 'aside')!;
  assert.equal(lead.state, 'sent');
  assert.equal(lead.action, 'Opt-out request to LEAD');
  assert.equal(aside.state, 'todo');
  assert.equal(aside.action, 'Re-check ASIDE after the LEAD request');
});

test('groupTrackInputs: a standalone broker is one sent row', () => {
  const groups = groupBrokers([makeBroker('solo')]);
  const inputs = groupTrackInputs(groups[0], new Map());
  assert.deepEqual(
    inputs.map((i) => ({ refId: i.refId, state: i.state })),
    [{ refId: 'solo', state: 'sent' }],
  );
});

test('the shipped manifest folds into fewer tasks and every broker lands in exactly one group', () => {
  const groups = groupBrokers(BROKERS);
  assert.ok(groups.length < BROKERS.length, 'expected the networks to reduce the task count');
  const seen = new Set<string>();
  for (const g of groups) {
    assert.ok(g.members.includes(g.representative), `${g.key}: representative not among members`);
    if (g.isNetwork) {
      assert.ok(
        g.representative.network?.representative,
        `${g.key}: representative must be the content-flagged member, not a slug-order accident`,
      );
    }
    for (const m of g.members) {
      assert.ok(!seen.has(m.slug), `${m.slug} appears in more than one group`);
      seen.add(m.slug);
    }
  }
  assert.equal(seen.size, BROKERS.length);
});
