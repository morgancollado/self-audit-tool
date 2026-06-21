// Schema migrations. A small ordered set of pure functions runs on load/import
// when the stored version is older. Never silently drop user data; if a
// migration can't proceed, throw so the UI can offer raw-state export
// (scope/docs/04-data-model.md).

import { AuditState, SCHEMA_VERSION } from '../model/types';

type Migration = (state: any) => any;

// Index i upgrades a vN document to v(N+1). Empty today (we're at v1); the first
// real migration goes at MIGRATIONS[1].
const MIGRATIONS: Record<number, Migration> = {};

export function migrate(input: any): AuditState {
  let state = input;
  let version: number = typeof state?.schemaVersion === 'number' ? state.schemaVersion : 1;

  if (version > SCHEMA_VERSION) {
    throw new Error(
      `Backup is from a newer version (v${version}) than this app supports (v${SCHEMA_VERSION}).`,
    );
  }

  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`No migration from schema v${version}.`);
    state = step(state);
    version += 1;
    state.schemaVersion = version;
  }

  return state as AuditState;
}
