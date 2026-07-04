// Colombia content integrity: the no-cross-country rule (showing US law to a
// CO user — or vice versa — is wrong/dangerous, scope/docs/03), plus the CO
// dataset's own invariants: verified broker routes, resolvable templates, and
// bilingual availability (Spanish-first base + English overlays).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBroker,
  getBrokers,
  getDiscoverySteps,
  getLaws,
  getOptOutTemplate,
  getRecords,
} from './data.ts';

test('CO brokers exist and are jurisdiction-scoped to Colombia', () => {
  const co = getBrokers('co');
  assert.ok(co.length >= 4, 'expected the Colombian broker set');
  for (const b of co) assert.equal(b.jurisdiction.country, 'co', `${b.slug} leaked into co`);
  const slugs = co.map((b) => b.slug);
  for (const expected of ['truecaller', 'getcontact', 'datacredito', 'transunion-co']) {
    assert.ok(slugs.includes(expected), `missing CO broker '${expected}'`);
  }
});

test('no cross-country broker leakage in either direction', () => {
  for (const b of getBrokers('us')) assert.equal(b.jurisdiction.country, 'us');
  const usSlugs = new Set(getBrokers('us').map((b) => b.slug));
  for (const b of getBrokers('co')) assert.ok(!usSlugs.has(b.slug));
});

test('CO laws surface only to CO, US laws never to CO', () => {
  const coLaws = getLaws({ country: 'co' });
  assert.ok(coLaws.length > 0, 'Colombia must have authored rights content');
  for (const l of coLaws) assert.equal(l.jurisdiction.country, 'co', `${l.key} shown to a CO user`);
  assert.ok(coLaws.some((l) => l.key === 'co-habeas-data'));

  const caLaws = getLaws({ country: 'us', region: 'CA' });
  assert.ok(caLaws.length > 0);
  for (const l of caLaws) assert.equal(l.jurisdiction.country, 'us', `${l.key} shown to a US user`);
});

test('CO records = CO + global, never US records (and vice versa)', () => {
  const co = getRecords({ country: 'co' });
  const coSlugs = co.map((r) => r.slug);
  for (const expected of ['name-change-co', 'gender-marker-co', 'cedula-update-co', 'web-archive', 'search-cache']) {
    assert.ok(coSlugs.includes(expected), `missing CO record '${expected}'`);
  }
  for (const r of co) {
    assert.ok(!r.jurisdiction || r.jurisdiction.country === 'co', `${r.slug} crossed into co`);
  }
  const us = getRecords({ country: 'us', region: 'CA' });
  for (const r of us) {
    assert.ok(!r.jurisdiction || r.jurisdiction.country === 'us', `${r.slug} crossed into us`);
  }
});

test('CO discovery steps = CO + global, with resolvable refIds', () => {
  const steps = getDiscoverySteps('co');
  const slugs = steps.map((s) => s.slug);
  assert.ok(slugs.includes('co-caller-id-apps'));
  assert.ok(slugs.includes('co-public-sources'));
  assert.ok(slugs.includes('search-engines'), 'global steps must still apply');
  assert.ok(!slugs.includes('brokers-people-search'), 'the US broker step must not show in CO');
  for (const s of steps) {
    assert.ok(!s.jurisdiction || s.jurisdiction.country === 'co', `${s.slug} crossed into co`);
    for (const r of s.refIds ?? []) assert.ok(getBroker(r), `refId '${r}' does not resolve`);
  }
});

test('CO reclamo templates resolve in both locales and stay Spanish (recipient language)', () => {
  for (const key of ['reclamo-supresion-co', 'reclamo-rectificacion-co']) {
    for (const locale of ['en', 'es']) {
      const t = getOptOutTemplate(key, locale);
      assert.ok(t, `${key} missing in ${locale}`);
      // The letter serves the Colombian recipient: Spanish in BOTH catalogs.
      assert.match(t!.body, /Ley 1581 de 2012/);
      assert.match(t!.body, /Superintendencia de Industria y Comercio/);
    }
  }
  // Credit-bureau entries point at the rectification letter.
  assert.equal(getBroker('datacredito')!.optOut.templateKey, 'reclamo-rectificacion-co');
});

test('CO content is bilingual: Spanish-first base with English overlays applied', () => {
  for (const slug of ['truecaller', 'getcontact', 'datacredito', 'transunion-co']) {
    assert.ok(!getBroker(slug, 'es')!.untranslated, `${slug} untranslated in es`);
    assert.ok(!getBroker(slug, 'en')!.untranslated, `${slug} untranslated in en`);
  }
  const coLawEn = getLaws({ country: 'co' }, 'en').find((l) => l.key === 'co-habeas-data');
  assert.ok(coLawEn && !coLawEn.untranslated, 'co-habeas-data untranslated in en');
  assert.match(coLawEn!.summary, /constitutional right/);
});
