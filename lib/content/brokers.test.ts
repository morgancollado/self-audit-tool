// Run: npx tsx --test lib/content/brokers.test.ts
//
// Data-integrity guard over the generated broker manifest. The manifest casts
// JSON through `as unknown as Broker[]`, and tsc can't see inside that cast, so
// these assertions are the type/safety boundary the CI JSON-Schema validator
// can't reach at runtime. They duplicate a few schema rules ON PURPOSE: this is
// the belt to the validator's suspenders, and it fails loudly if a broker ships
// with the safety-critical fields wrong even when the schema passes.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BROKERS } from './brokers.ts';

const CATEGORIES = new Set([
  'people-search',
  'credit-bureau',
  'marketing',
  'background-check',
  'consulta-de-datos',
  'other',
]);
const RISK = new Set(['high', 'medium', 'low']);
const SLUG_RE = /^[a-z0-9-]+$/;

test('manifest is non-empty', () => {
  assert.ok(BROKERS.length > 0, 'expected at least one broker');
});

test('every broker has a well-formed identity and shape', () => {
  for (const b of BROKERS) {
    assert.match(b.slug, SLUG_RE, `bad slug: ${b.slug}`);
    assert.ok(b.name && b.name.trim().length > 0, `${b.slug}: missing name`);
    assert.ok(CATEGORIES.has(b.category), `${b.slug}: bad category ${b.category}`);
    assert.ok(RISK.has(b.exposesDeadnameRisk), `${b.slug}: bad exposesDeadnameRisk`);
    assert.ok(typeof b.lastVerified === 'string' && b.lastVerified.length > 0, `${b.slug}: missing lastVerified`);
  }
});

test('every broker carries a non-empty opt-out action (no dead-end)', () => {
  for (const b of BROKERS) {
    assert.ok(Array.isArray(b.optOut.methods) && b.optOut.methods.length > 0, `${b.slug}: no methods`);
    assert.ok(typeof b.optOut.requiresId === 'boolean', `${b.slug}: requiresId must be boolean`);
    assert.ok(Array.isArray(b.optOut.steps) && b.optOut.steps.length > 0, `${b.slug}: opt-out has no steps`);
  }
});

test('contact method implies the matching contact field', () => {
  for (const b of BROKERS) {
    const m = b.optOut.methods;
    if (m.includes('email')) assert.ok(b.optOut.email, `${b.slug}: email method without an email address`);
    if (m.includes('web-form')) assert.ok(b.optOut.webFormUrl, `${b.slug}: web-form method without a webFormUrl`);
    if (m.includes('mail')) assert.ok(b.optOut.mailingAddress, `${b.slug}: mail method without a mailingAddress`);
  }
});

test('R13: a linkage-exposing opt-out must offer leave-it guidance', () => {
  for (const b of BROKERS) {
    if (b.optOut.optOutExposesLinkage === true) {
      assert.ok(
        b.optOut.leaveItGuidance && b.optOut.leaveItGuidance.trim().length > 0,
        `${b.slug}: optOutExposesLinkage=true but no leaveItGuidance (R13)`,
      );
    }
  }
});

test('slugs are unique across the manifest', () => {
  const seen = new Set<string>();
  for (const b of BROKERS) {
    assert.ok(!seen.has(b.slug), `duplicate slug in manifest: ${b.slug}`);
    seen.add(b.slug);
  }
});
