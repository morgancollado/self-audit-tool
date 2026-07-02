// High-level store for the single AuditState document. Small enough to load,
// mutate, and persist as one record (keyed "audit"), matching the data model.

import { AuditState, Jurisdiction, SCHEMA_VERSION } from '../model/types';
import { newAuditState, today } from '../model/factory';
import { KeyValueBackend } from './backend';
import { migrate } from './migrate';

const AUDIT_KEY = 'audit';

export class AuditStore {
  private backend: KeyValueBackend;
  // update() is read-modify-write, and both backends hand back copies — two
  // concurrent updates would each load the same snapshot and the last save would
  // silently drop the other's change. Chain every update behind this promise so
  // each one reads the state its predecessor wrote.
  private updates: Promise<unknown> = Promise.resolve();

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

  /**
   * Apply a mutation, bump updatedAt, persist, and return the new state.
   * Updates are serialized: concurrent callers run one after another, never
   * against the same loaded snapshot (no lost updates).
   */
  async update(mutator: (draft: AuditState) => void): Promise<AuditState> {
    const run = async (): Promise<AuditState> => {
      const current = await this.load();
      if (!current) throw new Error('AuditStore.update called before init()');
      mutator(current);
      current.updatedAt = today();
      current.schemaVersion = SCHEMA_VERSION;
      await this.save(current);
      return current;
    };
    // Run after the previous update settles — even if it rejected (a failed
    // update must not wedge every later one).
    const result = this.updates.then(run, run);
    this.updates = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  /** Remove just the audit document (keeps the backend usable). */
  async wipe(): Promise<void> {
    await this.backend.delete(AUDIT_KEY);
  }
}
