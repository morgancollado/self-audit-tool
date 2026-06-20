// High-level store for the single AuditState document. Small enough to load,
// mutate, and persist as one record (keyed "audit"), matching the data model.

import { AuditState, Jurisdiction, SCHEMA_VERSION } from '../model/types';
import { newAuditState, today } from '../model/factory';
import { KeyValueBackend } from './backend';
import { migrate } from './migrate';

const AUDIT_KEY = 'audit';

export class AuditStore {
  private backend: KeyValueBackend;

  constructor(backend: KeyValueBackend) {
    this.backend = backend;
  }

  async load(): Promise<AuditState | undefined> {
    const raw = await this.backend.get<AuditState>(AUDIT_KEY);
    if (!raw) return undefined;
    return migrate(raw);
  }

  /** Load the existing doc or create one for this jurisdiction. */
  async init(jurisdiction: Jurisdiction): Promise<AuditState> {
    const existing = await this.load();
    if (existing) return existing;
    const fresh = newAuditState(jurisdiction);
    await this.save(fresh);
    return fresh;
  }

  async save(state: AuditState): Promise<void> {
    await this.backend.set(AUDIT_KEY, state);
  }

  /** Apply a mutation, bump updatedAt, persist, and return the new state. */
  async update(mutator: (draft: AuditState) => void): Promise<AuditState> {
    const current = await this.load();
    if (!current) throw new Error('AuditStore.update called before init()');
    mutator(current);
    current.updatedAt = today();
    current.schemaVersion = SCHEMA_VERSION;
    await this.save(current);
    return current;
  }

  /** Remove just the audit document (keeps the backend usable). */
  async wipe(): Promise<void> {
    await this.backend.delete(AUDIT_KEY);
  }
}
