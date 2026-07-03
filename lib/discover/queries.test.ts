// Run: npx tsx --test lib/discover/queries.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fillTemplate, buildEngineUrl, generateQueries } from './queries.ts';
import { QueryTemplate } from '../content/types.ts';

test('fillTemplate substitutes and trims', () => {
  assert.equal(fillTemplate('"{{name}}" "{{city}}"', { name: 'Alex Rivera', city: ' Austin ' }), '"Alex Rivera" "Austin"');
});

test('fillTemplate returns null when any term is missing or blank', () => {
  assert.equal(fillTemplate('"{{deadname}}" "{{city}}"', { city: 'Austin' }), null);
  assert.equal(fillTemplate('"{{deadname}}"', { deadname: '   ' }), null);
});

test('buildEngineUrl encodes the query and defaults any->privacy engine', () => {
  assert.equal(buildEngineUrl('google', '"a b"'), 'https://www.google.com/search?q=%22a%20b%22');
  assert.ok(buildEngineUrl('any', 'x').startsWith('https://duckduckgo.com/?q='));
  assert.ok(buildEngineUrl('duckduckgo', 'x').startsWith('https://duckduckgo.com/?q='));
});

test('SAFETY: a deadname-aware query never reaches a profiling engine', () => {
  // Even when the template names google, deadnameAware forces the privacy engine.
  const url = buildEngineUrl('google', '"Deadname"', true);
  assert.ok(url.startsWith('https://duckduckgo.com/?q='), url);
  assert.ok(!url.includes('google.com'), 'the deadname must never be routed to google');
});

const templates: QueryTemplate[] = [
  { key: 'name-city', label: 'name+city', engine: 'google', template: '"{{name}}" "{{city}}"', placeholders: ['name', 'city'], deadnameAware: false },
  { key: 'deadname-city', label: 'deadname+city', engine: 'google', template: '"{{deadname}}" "{{city}}"', placeholders: ['deadname', 'city'], deadnameAware: true },
  { key: 'deadname-employer', label: 'deadname+employer', engine: 'google', template: '"{{deadname}}" "{{employer}}"', placeholders: ['deadname', 'employer'], deadnameAware: true },
];

test('generateQueries skips incomplete templates', () => {
  // No employer -> the deadname-employer query is skipped.
  const out = generateQueries(templates, { name: 'A', city: 'Austin', deadname: 'B' });
  assert.deepEqual(out.map((q) => q.key).sort(), ['deadname-city', 'name-city']);
});

test('generateQueries puts deadname-aware queries first', () => {
  const out = generateQueries(templates, { name: 'A', city: 'Austin', deadname: 'B', employer: 'C' });
  assert.equal(out.length, 3);
  assert.equal(out[0].deadnameAware, true);
  assert.equal(out[out.length - 1].deadnameAware, false);
});

test('generateQueries emits clickable urls', () => {
  const out = generateQueries(templates, { deadname: 'B', city: 'Austin' });
  assert.ok(out[0].url.includes('q='));
});

test('generateQueries routes every deadname-aware query to duckduckgo', () => {
  const out = generateQueries(templates, { name: 'A', city: 'Austin', deadname: 'B', employer: 'C' });
  for (const q of out.filter((x) => x.deadnameAware)) {
    assert.equal(q.engine, 'duckduckgo', `${q.key} must resolve to duckduckgo`);
    assert.ok(q.url.startsWith('https://duckduckgo.com/?q='), q.url);
  }
});

test('DENIABILITY: the former name is masked in display but kept in the real query', () => {
  const out = generateQueries(templates, { city: 'Austin', deadname: 'Jordan Vale' });
  const dn = out.find((q) => q.key === 'deadname-city')!;
  // The real (clipboard) query still carries the former name...
  assert.ok(dn.query.includes('Jordan Vale'), 'clipboard payload keeps the real query');
  // ...but nothing rendered on screen does.
  const shown = dn.display.map((s) => s.text).join('');
  assert.ok(!shown.includes('Jordan Vale'), 'the former name must never be rendered');
  assert.ok(
    dn.display.some((s) => s.masked && s.text === 'former name'),
    'the deadname slot renders a masked "former name" placeholder',
  );
  // A non-deadname query renders verbatim.
  const plain = generateQueries(templates, { name: 'Alex Real', city: 'Austin' }).find((q) => q.key === 'name-city')!;
  assert.equal(plain.display.map((s) => s.text).join(''), '"Alex Real" "Austin"');
});
