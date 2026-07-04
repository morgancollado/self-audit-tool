// Locale-aware content loaders. Content ships with the app (Decision 1:
// versioned in repo, no runtime egress) as per-locale merged manifests emitted
// by scripts/generate-content-manifest.mjs — base JSON + *.<locale>.json
// translation overlays, with `untranslated: true` stamped where a locale has no
// translation yet (surfaced honestly by the UI).
//
// Locale ≠ jurisdiction (scope/docs/03): `locale` picks the LANGUAGE of the
// prose; `country`/`jurisdiction` picks WHICH brokers/laws/records apply. The
// two never substitute for each other, and content NEVER falls back across
// countries (showing US law to a CO user would be wrong/dangerous).

import { Country, Jurisdiction } from '../model/types';
import { Broker, ContentLocale, DeadnameRecord, DiscoveryStep, Law, OptOutTemplate, Platform, QueryTemplate } from './types';
import { selectLaws } from '../remediate/rights';
import { selectRecords } from '../remediate/records';
import * as EN from './generated/en';
import * as ES from './generated/es';

const CONTENT: Record<ContentLocale, typeof EN> = { en: EN, es: ES };

/** Unknown/absent locales read the default catalog rather than throwing. */
function catalog(locale?: string): typeof EN {
  return CONTENT[locale as ContentLocale] ?? EN;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
// Easy wins first — encourage momentum (the inverse of priority order).
const DIFFICULTY_ORDER = { low: 0, medium: 1, high: 2 } as const;

/** Brokers for a country (no cross-country fallback). */
export function getBrokers(country: Country, locale?: string): Broker[] {
  return catalog(locale)
    .BROKERS.filter((b) => b.jurisdiction.country === country)
    .sort((a, b) => PRIORITY_ORDER[a.exposesDeadnameRisk] - PRIORITY_ORDER[b.exposesDeadnameRisk]);
}

export function getBroker(slug: string, locale?: string): Broker | undefined {
  return catalog(locale).BROKERS.find((b) => b.slug === slug);
}

/**
 * Discovery steps for a country: global steps (no jurisdiction) plus this
 * country's steps. Never another country's jurisdiction-scoped steps.
 */
export function getDiscoverySteps(country: Country, locale?: string): DiscoveryStep[] {
  return catalog(locale)
    .DISCOVERY_STEPS.filter((s) => !s.jurisdiction || s.jurisdiction.country === country)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

export function getQueryTemplates(locale?: string): QueryTemplate[] {
  return catalog(locale).QUERY_TEMPLATES;
}

export function getQueryTemplate(key: string, locale?: string): QueryTemplate | undefined {
  return catalog(locale).QUERY_TEMPLATES.find((q) => q.key === key);
}

/**
 * Opt-out output template (Phase 2) by key. NOTE: the letter's language should
 * serve the RECIPIENT, not the reader — a request to a US broker stays English
 * even in the Spanish UI, so translations of `subject`/`body` exist only where
 * the receiving jurisdiction reads that language (e.g. CO habeas-data letters).
 * Only the user-facing `disclaimer` is always localized.
 */
export function getOptOutTemplate(key: string, locale?: string): OptOutTemplate | undefined {
  return catalog(locale).OPTOUT_TEMPLATES.find((t) => t.key === key);
}

/**
 * Laws applicable to a jurisdiction (Phase 2). Region-specific rights are
 * surfaced ONLY to that region; never cross-country, never invented.
 */
export function getLaws(jurisdiction: Jurisdiction, locale?: string): Law[] {
  return selectLaws(catalog(locale).LAWS, jurisdiction);
}

/** Platform hardening + deadname-removal guides (jurisdiction-agnostic). */
export function getPlatforms(locale?: string): Platform[] {
  return [...catalog(locale).PLATFORMS].sort(
    (a, b) =>
      (DIFFICULTY_ORDER[a.difficulty ?? 'medium'] ?? 1) -
      (DIFFICULTY_ORDER[b.difficulty ?? 'medium'] ?? 1),
  );
}

export function getPlatform(slug: string, locale?: string): Platform | undefined {
  return catalog(locale).PLATFORMS.find((p) => p.slug === slug);
}

/**
 * Records-class guides (Phase 2): the deadname's most permanent homes. Global
 * records apply everywhere; region-specific ones surface ONLY on an exact region
 * match. Never cross-country.
 */
export function getRecords(jurisdiction: Jurisdiction, locale?: string): DeadnameRecord[] {
  return selectRecords(catalog(locale).RECORDS, jurisdiction);
}
