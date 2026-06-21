// Run: npx tsx --test lib/remediate/optout.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fillOptOutText, buildMailto, generateOptOut } from './optout.ts';
import { Broker, OptOutTemplate } from '../content/types.ts';

const template: OptOutTemplate = {
  key: 'optout-deletion-generic',
  formats: ['text', 'mailto', 'letter'],
  subject: 'Delete my data — {{brokerName}}',
  body: ['Hello {{brokerName}},', 'Name: {{name}}', 'Also listed under: {{aliases}}', 'Location: {{location}}', 'Thank you.'].join('\n'),
  placeholders: ['name', 'aliases', 'location', 'email', 'brokerName'],
  disclaimer: 'Not legal advice.',
};

const webFormBroker: Broker = {
  slug: 'spokeo',
  jurisdiction: { country: 'us' },
  name: 'Spokeo',
  category: 'people-search',
  exposesDeadnameRisk: 'high',
  optOut: { methods: ['web-form'], webFormUrl: 'https://x/optout', requiresId: false, optOutExposesLinkage: true, steps: ['do it'] },
  lastVerified: '2026-06-01',
};

const emailBroker: Broker = {
  ...webFormBroker,
  slug: 'mailbroker',
  name: 'MailBroker',
  optOut: { methods: ['email'], email: 'privacy@mailbroker.example', requiresId: false, optOutExposesLinkage: false, steps: ['email them'] },
};

test('fillOptOutText drops lines whose placeholder is blank, keeps plain lines', () => {
  const out = fillOptOutText(template.body, { brokerName: 'Spokeo', name: 'Alex Rivera' });
  assert.ok(out.includes('Hello Spokeo,'));
  assert.ok(out.includes('Name: Alex Rivera'));
  assert.ok(out.includes('Thank you.')); // plain line with a space is NOT dropped
  assert.ok(!out.includes('Also listed under'), 'blank aliases line should be dropped');
  assert.ok(!out.includes('Location:'), 'blank location line should be dropped');
});

test('fillOptOutText trims values', () => {
  assert.equal(fillOptOutText('Name: {{name}}', { name: '  Sam  ' }), 'Name: Sam');
});

test('buildMailto encodes spaces as %20, not +', () => {
  const url = buildMailto('a@b.com', 'Sub ject', 'Body line one');
  assert.ok(url.startsWith('mailto:a%40b.com?'));
  assert.ok(url.includes('subject=Sub%20ject'), url);
  assert.ok(!url.includes('+'), 'plus-encoding breaks some mail clients');
});

test('PARADOX: the former name is omitted by default', () => {
  const g = generateOptOut(webFormBroker, template, { name: 'Alex', aliases: 'Deadname' }, false);
  assert.equal(g.includesFormerName, false);
  assert.ok(!g.body.includes('Deadname'), 'deadname must not appear unless opted in');
  assert.ok(g.exposesLinkage, 'broker still flagged as linkage-exposing for the warning');
});

test('opting in writes the former name into the request', () => {
  const g = generateOptOut(webFormBroker, template, { name: 'Alex', aliases: 'Deadname' }, true);
  assert.equal(g.includesFormerName, true);
  assert.ok(g.body.includes('Also listed under: Deadname'));
});

test('mailto format only offered when the broker accepts email', () => {
  const webOnly = generateOptOut(webFormBroker, template, { name: 'Alex' }, false);
  assert.ok(!webOnly.formats.includes('mailto'));
  assert.equal(webOnly.mailtoUrl, undefined);

  const byEmail = generateOptOut(emailBroker, template, { name: 'Alex' }, false);
  assert.ok(byEmail.formats.includes('mailto'));
  assert.ok(byEmail.mailtoUrl?.startsWith('mailto:privacy%40mailbroker.example'));
});
