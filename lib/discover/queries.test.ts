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

test('buildEngineUrl encodes the query and defaults any->google', () => {
  assert.equal(buildEngineUrl('google', '"a b"'), 'https://www.google.com/search?q=%22a%20b%22');
  assert.ok(buildEngineUrl('any', 'x').startsWith('https://www.google.com/search?q='));
  assert.ok(buildEngineUrl('duckduckgo', 'x').startsWith('https://duckduckgo.com/?q='));
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
  assert.ok(out[0].url.includes('search?q='));
});
