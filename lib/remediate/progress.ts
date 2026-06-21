// Playbook progress summary (Phase 2 / M2). Pure function over the local audit
// state — no I/O. Powers the consolidated deadname-removal playbook's at-a-glance
// status. Reads only what's already on the device; summarizes nothing that leaves it.

import { AuditState, Pillar, RemediationState } from '../model/types';

export interface PlaybookSummary {
  findings: number;
  deadnameFindings: number;
  resolvedFindings: number;
  discoverStepsDone: number;
  byPillar: Record<Pillar, number>;
  byState: Record<RemediationState, number>;
  totalRemediations: number;
}

const ZERO_PILLARS: Record<Pillar, number> = { optout: 0, platform: 0, breach: 0, deadname: 0 };
const ZERO_STATES: Record<RemediationState, number> = { todo: 0, sent: 0, confirmed: 0, blocked: 0 };

export function summarizePlaybook(state: AuditState | null): PlaybookSummary {
  const findings = state?.findings ?? [];
  const remediations = state?.remediations ?? [];

  const byPillar = { ...ZERO_PILLARS };
  const byState = { ...ZERO_STATES };
  for (const r of remediations) {
    byPillar[r.pillar] += 1;
    byState[r.state] += 1;
  }

  return {
    findings: findings.length,
    deadnameFindings: findings.filter((f) => f.exposesDeadname).length,
    resolvedFindings: findings.filter((f) => f.status === 'resolved').length,
    discoverStepsDone: state?.progress.discoverCompletedSteps.length ?? 0,
    byPillar,
    byState,
    totalRemediations: remediations.length,
  };
}
