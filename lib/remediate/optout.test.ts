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

test('buildMailto encodes spaces as %20, not +, and leaves the address verbatim', () => {
  const url = buildMailto('a@b.com', 'Sub ject', 'Body line one');
  assert.ok(url.startsWith('mailto:a@b.com?'), url);
  assert.ok(url.includes('subject=Sub%20ject'), url);
  assert.ok(!url.includes('+'), 'plus-encoding breaks some mail clients');
});

const underCurrent = (includeOtherName = false) => ({ listedUnder: 'current' as const, includeOtherName });
const underFormer = (includeOtherName = false) => ({ listedUnder: 'former' as const, includeOtherName });

test('PARADOX: neither name is broadcast by default (listing under current name)', () => {
  const g = generateOptOut(webFormBroker, template, { name: 'Alex', aliases: 'Deadname' }, underCurrent());
  assert.equal(g.includesFormerName, false);
  assert.equal(g.includesCurrentName, true, 'the current name is the listing key, so it is present');
  assert.ok(!g.body.includes('Deadname'), 'former name must not appear unless opted in');
  assert.ok(g.exposesLinkage, 'broker still flagged as linkage-exposing for the warning');
});

test('opting in writes the former name in as the "also listed under" name', () => {
  const g = generateOptOut(webFormBroker, template, { name: 'Alex', aliases: 'Deadname' }, underCurrent(true));
  assert.equal(g.includesFormerName, true);
  assert.ok(g.body.includes('Also listed under: Deadname'));
});

test('INVERSE PARADOX: a listing under the former name does not disclose the current name by default', () => {
  // The record is filed under the deadname, so the request must carry it to match;
  // but the *current* name (the linkage) must stay out unless opted in.
  const g = generateOptOut(webFormBroker, template, { name: 'Alex', aliases: 'Deadname' }, underFormer());
  assert.ok(g.body.includes('Name: Deadname'), 'the former name keys the request (the listing is under it)');
  assert.ok(!g.body.includes('Alex'), 'the current name must not appear unless opted in');
  assert.equal(g.includesFormerName, true);
  assert.equal(g.includesCurrentName, false);
});

test('opting in under a former-name listing adds the current name as the linkage', () => {
  const g = generateOptOut(webFormBroker, template, { name: 'Alex', aliases: 'Deadname' }, underFormer(true));
  assert.ok(g.body.includes('Name: Deadname'));
  assert.ok(g.body.includes('Also listed under: Alex'));
  assert.equal(g.includesCurrentName, true);
});

test('missingPrimaryName is flagged when the keying name is blank', () => {
  const g = generateOptOut(webFormBroker, template, { aliases: 'Deadname' }, underCurrent());
  assert.equal(g.missingPrimaryName, true, 'no current name entered, listing keyed on current');
  const g2 = generateOptOut(webFormBroker, template, { name: 'Alex' }, underCurrent());
  assert.equal(g2.missingPrimaryName, false);
});

test('mailto format only offered when the broker accepts email', () => {
  const webOnly = generateOptOut(webFormBroker, template, { name: 'Alex' }, underCurrent());
  assert.ok(!webOnly.formats.includes('mailto'));
  assert.equal(webOnly.mailtoUrl, undefined);

  const byEmail = generateOptOut(emailBroker, template, { name: 'Alex' }, underCurrent());
  assert.ok(byEmail.formats.includes('mailto'));
  assert.ok(byEmail.mailtoUrl?.startsWith('mailto:privacy@mailbroker.example'));
});
