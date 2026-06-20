// Bundled content index. Content ships with the app (Decision 1: versioned in
// repo, no runtime egress). For M1 the set is small enough to import explicitly;
// a generated manifest can replace this when the dataset grows.

import { Country } from '../model/types';
import { Broker, DiscoveryStep, QueryTemplate } from './types';

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

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

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
