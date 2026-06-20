// Client-side data model (scope/docs/04-data-model.md). Nothing here ever leaves
// the device except a backup the user explicitly exports.

export const SCHEMA_VERSION = 1;

export type Country = 'us' | 'co';

/** Hierarchical jurisdiction — rights are sub-national in the US. */
export interface Jurisdiction {
  country: Country;
  /** e.g. "CA", "TX"; omit for nationwide. */
  region?: string;
}

/**
 * Optional, OFF-BY-DEFAULT identity. Storing a name/deadname is the honeypot we
 * avoid by default (R1); only persisted when the user explicitly opts in.
 */
export interface Identity {
  rememberNames: boolean;
  names?: string[];
  locationHints?: string[];
}

export type FindingSource = 'broker' | 'search' | 'platform' | 'records' | 'other';
export type Priority = 'high' | 'medium' | 'low';
export type FindingStatus = 'found' | 'in_progress' | 'resolved' | 'wont_fix';

export interface Finding {
  id: string;
  source: FindingSource;
  /** -> content item (e.g. broker slug) if applicable. */
  refId?: string;
  label: string;
  whatFound: string;
  /** First-class flag — the product's reason to exist. */
  exposesDeadname: boolean;
  priority: Priority;
  status: FindingStatus;
  /**
   * No-dead-end rule: a finding either resolves to an action or is honestly
   * marked unremediable (monitor-only with harm-reduction). The UI must never
   * render a finding with neither.
   */
  actionable: boolean;
  harmReduction?: string;
  notes?: string;
  createdAt: string;
}

export type Pillar = 'optout' | 'platform' | 'breach' | 'deadname';
export type RemediationState = 'todo' | 'sent' | 'confirmed' | 'blocked';

export interface Remediation {
  id: string;
  findingId?: string;
  pillar: Pillar;
  refId?: string;
  action: string;
  state: RemediationState;
  /** User-set reminder date (shown, never pushed). */
  recheckAt?: string;
  notes?: string;
  updatedAt: string;
}

export interface Progress {
  discoverCompletedSteps: string[];
  remediateCompletedSteps: string[];
  lastVisitedRoute?: string;
}

/** Top-level persisted document (single record keyed "audit"). */
export interface AuditState {
  schemaVersion: number;
  /** ISO date; coarse (no time-of-day) to minimize correlation. */
  createdAt: string;
  updatedAt: string;
  jurisdiction: Jurisdiction;
  identity?: Identity;
  findings: Finding[];
  remediations: Remediation[];
  progress: Progress;
}

export type StorageMode = 'persistent' | 'ephemeral';

/** Small, losable preferences (localStorage in persistent mode). */
export interface Preferences {
  storageMode?: StorageMode;
  locale?: string;
  jurisdiction?: Jurisdiction;
  contentWarnings: boolean;
  safetyIntroAcknowledged: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  contentWarnings: true,
  safetyIntroAcknowledged: false,
};
