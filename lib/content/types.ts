// TypeScript shapes for content-as-data (mirrors content/schema/*.json).

import { Country, Jurisdiction, Priority } from '../model/types';

export type QueryVar = 'name' | 'deadname' | 'city' | 'employer' | 'aliases';
export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'any';

export interface QueryTemplate {
  key: string;
  label: string;
  engine: SearchEngine;
  template: string;
  placeholders: QueryVar[];
  deadnameAware: boolean;
  notes?: string;
}

export type DiscoveryCategory = 'broker' | 'search' | 'platform' | 'records';

export interface DiscoveryStep {
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

export interface OptOutTemplate {
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

export interface Broker {
  slug: string;
  jurisdiction: Jurisdiction;
  name: string;
  category: string;
  exposesDeadnameRisk: Priority;
  searchUrl?: string;
  optOut: BrokerOptOut;
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

export interface Platform {
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
export interface DeadnameRecord {
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

export interface Law {
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
