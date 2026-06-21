// Bundled content index. Content ships with the app (Decision 1: versioned in
// repo, no runtime egress). For M1 the set is small enough to import explicitly;
// a generated manifest can replace this when the dataset grows.

import { Country, Jurisdiction } from '../model/types';
import { Broker, DeadnameRecord, DiscoveryStep, Law, OptOutTemplate, Platform, QueryTemplate } from './types';
import { selectLaws } from '../remediate/rights';
import { selectRecords } from '../remediate/records';
import { LAWS } from './laws';

import recNameChange from '../../content/records/us/name-change.json';
import recNameChangeCourtCa from '../../content/records/us-CA/name-change-court.json';
import recNameChangeSealingNy from '../../content/records/us-NY/name-change-sealing.json';
import recNameChangeSealingIl from '../../content/records/us-IL/name-change-sealing.json';
import recNameChangeSealingWa from '../../content/records/us-WA/name-change-sealing.json';
import recNameChangeSealingTx from '../../content/records/us-TX/name-change-sealing.json';
import recNameChangeSealingPa from '../../content/records/us-PA/name-change-sealing.json';
import recNameChangeSealingMa from '../../content/records/us-MA/name-change-sealing.json';
import recNameChangeSealingMi from '../../content/records/us-MI/name-change-sealing.json';
import recNameChangeSealingNj from '../../content/records/us-NJ/name-change-sealing.json';
import recWebArchive from '../../content/records/global/web-archive.json';
import recSearchCache from '../../content/records/global/search-cache.json';

import optoutDeletionGeneric from '../../content/templates/optout-deletion-generic.json';

import pGoogle from '../../content/platforms/google.json';
import pInstagram from '../../content/platforms/instagram.json';
import pX from '../../content/platforms/x.json';
import pLinkedin from '../../content/platforms/linkedin.json';
import pTiktok from '../../content/platforms/tiktok.json';
import pReddit from '../../content/platforms/reddit.json';

import spokeo from '../../content/brokers/us/spokeo.json';
import whitepages from '../../content/brokers/us/whitepages.json';
import beenverified from '../../content/brokers/us/beenverified.json';

import dBrokersPeopleSearch from '../../content/discovery/us/brokers-people-search.json';
import dSearchEngines from '../../content/discovery/global/search-engines.json';
import dPlatformsSelf from '../../content/discovery/global/platforms-self-search.json';
import dReverseImage from '../../content/discovery/global/reverse-image.json';

import qNameCity from '../../content/queries/name-city.json';
import qDeadnameCity from '../../content/queries/deadname-city.json';
import qDeadnameEmployer from '../../content/queries/deadname-employer.json';
import qNameOrDeadname from '../../content/queries/name-or-deadname.json';
import qDeadnamePlain from '../../content/queries/deadname-plain.json';

const BROKERS = [spokeo, whitepages, beenverified] as unknown as Broker[];

const DISCOVERY_STEPS = [
  dBrokersPeopleSearch,
  dSearchEngines,
  dPlatformsSelf,
  dReverseImage,
] as unknown as DiscoveryStep[];

const QUERY_TEMPLATES = [
  qNameOrDeadname,
  qDeadnameCity,
  qDeadnameEmployer,
  qDeadnamePlain,
  qNameCity,
] as unknown as QueryTemplate[];

const OPTOUT_TEMPLATES = [optoutDeletionGeneric] as unknown as OptOutTemplate[];

const PLATFORMS = [pGoogle, pInstagram, pX, pLinkedin, pTiktok, pReddit] as unknown as Platform[];

const RECORDS = [
  recNameChange,
  recNameChangeCourtCa,
  recNameChangeSealingNy,
  recNameChangeSealingIl,
  recNameChangeSealingWa,
  recNameChangeSealingTx,
  recNameChangeSealingPa,
  recNameChangeSealingMa,
  recNameChangeSealingMi,
  recNameChangeSealingNj,
  recWebArchive,
  recSearchCache,
] as unknown as DeadnameRecord[];

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
// Easy wins first — encourage momentum (the inverse of priority order).
const DIFFICULTY_ORDER = { low: 0, medium: 1, high: 2 } as const;

/** Brokers for a country (no cross-country fallback). */
export function getBrokers(country: Country): Broker[] {
  return BROKERS.filter((b) => b.jurisdiction.country === country).sort(
    (a, b) => PRIORITY_ORDER[a.exposesDeadnameRisk] - PRIORITY_ORDER[b.exposesDeadnameRisk],
  );
}

export function getBroker(slug: string): Broker | undefined {
  return BROKERS.find((b) => b.slug === slug);
}

/**
 * Discovery steps for a country: global steps (no jurisdiction) plus this
 * country's steps. Never another country's jurisdiction-scoped steps.
 */
export function getDiscoverySteps(country: Country): DiscoveryStep[] {
  return DISCOVERY_STEPS.filter((s) => !s.jurisdiction || s.jurisdiction.country === country).sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
}

export function getQueryTemplates(): QueryTemplate[] {
  return QUERY_TEMPLATES;
}

export function getQueryTemplate(key: string): QueryTemplate | undefined {
  return QUERY_TEMPLATES.find((q) => q.key === key);
}

/** Opt-out output template (Phase 2) by key. */
export function getOptOutTemplate(key: string): OptOutTemplate | undefined {
  return OPTOUT_TEMPLATES.find((t) => t.key === key);
}

/**
 * Laws applicable to a jurisdiction (Phase 2). Region-specific rights are
 * surfaced ONLY to that region; never cross-country, never invented.
 */
export function getLaws(jurisdiction: Jurisdiction): Law[] {
  return selectLaws(LAWS, jurisdiction);
}

/** Platform hardening + deadname-removal guides (jurisdiction-agnostic). */
export function getPlatforms(): Platform[] {
  return [...PLATFORMS].sort(
    (a, b) =>
      (DIFFICULTY_ORDER[a.difficulty ?? 'medium'] ?? 1) -
      (DIFFICULTY_ORDER[b.difficulty ?? 'medium'] ?? 1),
  );
}

export function getPlatform(slug: string): Platform | undefined {
  return PLATFORMS.find((p) => p.slug === slug);
}

/**
 * Records-class guides (Phase 2): the deadname's most permanent homes. Global
 * records apply everywhere; region-specific ones surface ONLY on an exact region
 * match. Never cross-country.
 */
export function getRecords(jurisdiction: Jurisdiction): DeadnameRecord[] {
  return selectRecords(RECORDS, jurisdiction);
}
