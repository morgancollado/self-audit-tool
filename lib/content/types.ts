// TypeScript shapes for content-as-data (mirrors content/schema/*.json).

import { Country, Jurisdiction, Priority } from '../model/types';

/** UI/content language — a separate axis from jurisdiction (scope/docs/03). */
export type ContentLocale = 'en' | 'es';

/**
 * Fields every content item gains from the localization pipeline
 * (scripts/generate-content-manifest.mjs). `baseLocale` is authored in the base
 * JSON (default 'en'); `untranslated` is stamped at build time on items served
 * to a locale they have no translation for, so the UI can say so honestly.
 */
export interface Localized {
  baseLocale?: ContentLocale;
  untranslated?: boolean;
}

export type QueryVar = 'name' | 'deadname' | 'city' | 'employer' | 'aliases';
export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'any';

export interface QueryTemplate extends Localized {
  key: string;
  label: string;
  engine: SearchEngine;
  template: string;
  placeholders: QueryVar[];
  deadnameAware: boolean;
  notes?: string;
}

export type DiscoveryCategory = 'broker' | 'search' | 'platform' | 'records';

export interface DiscoveryStep extends Localized {
  slug: string;
  jurisdiction?: Jurisdiction;
  category: DiscoveryCategory;
  title: string;
  why: string;
  instructions: string[];
  deadnameAware: boolean;
  deadnamePrompts?: string[];
  queryTemplateKeys?: string[];
  refIds?: string[];
  priority: Priority;
  lastVerified: string;
}

export type OptOutFormat = 'text' | 'mailto' | 'letter';
export type TemplateVar = 'name' | 'aliases' | 'location' | 'email' | 'brokerName';

export interface OptOutTemplate extends Localized {
  key: string;
  formats: OptOutFormat[];
  subject: string;
  body: string;
  placeholders?: TemplateVar[];
  disclaimer: string;
}

export interface BrokerOptOut {
  methods: ('web-form' | 'email' | 'mail' | 'phone')[];
  webFormUrl?: string | null;
  email?: string | null;
  mailingAddress?: string | null;
  requiresId: boolean;
  optOutExposesLinkage?: boolean;
  leaveItGuidance?: string;
  steps: string[];
  templateKey?: string;
}

/**
 * How much one request to a network's backbone is verified to cover:
 *  - 'single-submission' — one submission verifiably removes every member site
 *    (e.g. the PeopleConnect suppression center); tracking marks them all sent.
 *  - 'shared-backbone' — the sites share data and a privacy contact, but only
 *    the representative's own removal is verified; siblings are tracked as
 *    re-check to-dos, never as sent (a false "sent" is worse than an extra task).
 */
export type NetworkCoverage = 'single-submission' | 'shared-backbone';

/**
 * A shared opt-out backbone (e.g. the PeopleConnect suppression center serves
 * several sibling sites). Presentation-level grouping only: remediations stay
 * keyed by broker slug (scope/docs/04-data-model.md).
 */
export interface BrokerNetwork {
  key: string;
  name: string;
  note?: string;
  coverage: NetworkCoverage;
  /** Exactly one member per network fronts the shared request (validator-enforced). */
  representative?: boolean;
}

export interface Broker extends Localized {
  slug: string;
  jurisdiction: Jurisdiction;
  name: string;
  category: string;
  exposesDeadnameRisk: Priority;
  searchUrl?: string;
  optOut: BrokerOptOut;
  network?: BrokerNetwork;
  notes?: string;
  attribution?: string;
  sourceUrl?: string;
  lastVerified: string;
}

export type { Country };

export interface SpecialMechanism {
  key: string;
  title: string;
  summary: string;
  /** Operational status, e.g. when a not-yet-live mechanism actually starts. */
  status?: string;
  url?: string;
}

export interface PlatformDeadnameRemoval {
  supported: boolean;
  tool?: string;
  url?: string;
  steps: string[];
  limits?: string;
  escalation?: string;
}

export interface Platform extends Localized {
  slug: string;
  name: string;
  deadnameRemoval?: PlatformDeadnameRemoval;
  hardening: { steps: string[] };
  difficulty?: Priority;
  lastVerified: string;
}

export type RecordClass =
  | 'court-record'
  | 'name-change'
  | 'school'
  | 'licensing-board'
  | 'byline'
  | 'archive'
  | 'search-cache'
  | 'breach'
  | 'other';

/**
 * A deadname appearing in an institutional / public record (named DeadnameRecord
 * to avoid clashing with the TS built-in `Record`). No-dead-end rule: either
 * `actions` is non-empty, or it's an explicit high-permanence `monitorOnly` item
 * with `harmReduction` (enforced by record.schema.json + content validation).
 */
export interface DeadnameRecord extends Localized {
  slug: string;
  jurisdiction?: Jurisdiction;
  class: RecordClass;
  exposesDeadnameRisk?: Priority;
  permanence: Priority;
  whatItIs: string;
  actions?: string[];
  monitorOnly?: boolean;
  harmReduction?: string;
  sealedPetitionAvailable?: boolean;
  disclaimer?: string;
  lastVerified: string;
}

export interface Law extends Localized {
  jurisdiction: Jurisdiction;
  /** If false, the right is region-specific and must NOT be shown to other regions. */
  appliesNationally: boolean;
  key: string;
  title: string;
  summary: string;
  authorizedAgent?: boolean;
  specialMechanisms?: SpecialMechanism[];
  disclaimer: string;
  lastVerified: string;
}
