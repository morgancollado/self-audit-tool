// Backup serialize / parse for export-import (scope/docs/04-data-model.md).
// Encrypted by DEFAULT: the backup can contain the deadname and typically lands
// in a cloud-synced Downloads folder, so a plaintext export is an explicit,
// warned opt-out only. Import detects encrypted vs plaintext, runs schema
// migrations, validates shape, and rejects anything unrecognizable calmly.

import { AuditState } from '../model/types';
import { migrate } from './migrate';
import { EncryptedEnvelope, decryptJson, encryptJson } from './crypto';

export const BACKUP_FORMAT = 1;

export type ImportMode = 'replace' | 'merge';

/**
 * Serialize the audit state to a backup string. A non-empty passphrase produces
 * an encrypted envelope (the default path); an empty/omitted passphrase produces
 * a plaintext backup (the warned opt-out).
 */
export async function serializeBackup(state: AuditState, opts: { passphrase?: string }): Promise<string> {
  if (opts.passphrase && opts.passphrase.trim() !== '') {
    const envelope = await encryptJson(state, opts.passphrase);
    return JSON.stringify({ errataBackup: BACKUP_FORMAT, encrypted: true, envelope }, null, 2);
  }
  return JSON.stringify({ errataBackup: BACKUP_FORMAT, encrypted: false, state }, null, 2);
}

/** True if the text is one of our backups and it's encrypted (drives the passphrase prompt). */
export function isEncryptedBackup(text: string): boolean {
  try {
    const o = JSON.parse(text);
    return !!o && typeof o === 'object' && o.encrypted === true;
  } catch {
    return false;
  }
}

function assertAuditShape(o: unknown): asserts o is AuditState {
  const x = o as Partial<AuditState> | null;
  if (
    !x ||
    typeof x !== 'object' ||
    !Array.isArray(x.findings) ||
    !Array.isArray(x.remediations) ||
    typeof x.progress !== 'object' ||
    !x.jurisdiction
  ) {
    throw new Error('This file isn’t a recognizable Errata backup.');
  }
}

/**
 * Parse a backup string into a validated, migrated AuditState. Detects encrypted
 * vs plaintext; tolerates a bare AuditState object (a hand-edited or legacy file).
 */
export async function parseBackup(
  text: string,
  passphrase?: string,
): Promise<{ state: AuditState; wasEncrypted: boolean }> {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This file isn’t valid JSON — it may not be an Errata backup.');
  }

  let raw: unknown;
  let wasEncrypted = false;
  if (parsed && parsed.encrypted === true) {
    wasEncrypted = true;
    if (!passphrase || passphrase.trim() === '') {
      throw new Error('This backup is encrypted — enter its passphrase to import it.');
    }
    raw = await decryptJson(parsed.envelope as EncryptedEnvelope, passphrase);
  } else if (parsed && parsed.encrypted === false && parsed.state) {
    raw = parsed.state;
  } else {
    raw = parsed; // tolerate a bare AuditState
  }

  assertAuditShape(raw);
  const state = migrate(raw); // schemaVersion check + ordered migrations
  return { state, wasEncrypted };
}

/**
 * Merge an imported backup into the current state: union findings and
 * remediations by id (existing wins on collision), union the progress step lists,
 * and keep the current jurisdiction/createdAt. Pure — the caller persists.
 */
export function mergeAudit(current: AuditState, incoming: AuditState): AuditState {
  const haveFinding = new Set(current.findings.map((f) => f.id));
  const haveRemediation = new Set(current.remediations.map((r) => r.id));
  return {
    ...current,
    findings: [...current.findings, ...incoming.findings.filter((f) => !haveFinding.has(f.id))],
    remediations: [
      ...current.remediations,
      ...incoming.remediations.filter((r) => !haveRemediation.has(r.id)),
    ],
    progress: {
      discoverCompletedSteps: [
        ...new Set([
          ...current.progress.discoverCompletedSteps,
          ...incoming.progress.discoverCompletedSteps,
        ]),
      ],
      remediateCompletedSteps: [
        ...new Set([
          ...current.progress.remediateCompletedSteps,
          ...incoming.progress.remediateCompletedSteps,
        ]),
      ],
      lastVisitedRoute: current.progress.lastVisitedRoute ?? incoming.progress.lastVisitedRoute,
    },
  };
}
