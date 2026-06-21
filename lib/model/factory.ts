// Constructors + defaults for model objects. Keep timestamps coarse (date-only)
// to avoid sub-day correlation (scope/docs/04-data-model.md).

import {
  AuditState,
  Finding,
  Jurisdiction,
  Remediation,
  SCHEMA_VERSION,
} from './types';

export function newId(): string {
  return crypto.randomUUID();
}

/** Coarse, date-only timestamp (YYYY-MM-DD). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newAuditState(jurisdiction: Jurisdiction): AuditState {
  const ts = today();
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: ts,
    updatedAt: ts,
    jurisdiction,
    findings: [],
    remediations: [],
    progress: { discoverCompletedSteps: [], remediateCompletedSteps: [] },
  };
}

export type NewFindingInput = Omit<Finding, 'id' | 'createdAt' | 'actionable' | 'status'> &
  Partial<Pick<Finding, 'actionable' | 'status'>>;

export function newFinding(input: NewFindingInput): Finding {
  return {
    id: newId(),
    createdAt: today(),
    status: input.status ?? 'found',
    actionable: input.actionable ?? true,
    ...input,
  };
}

export type NewRemediationInput = Omit<Remediation, 'id' | 'updatedAt' | 'state'> &
  Partial<Pick<Remediation, 'state'>>;

export function newRemediation(input: NewRemediationInput): Remediation {
  return {
    id: newId(),
    updatedAt: today(),
    state: input.state ?? 'todo',
    ...input,
  };
}
