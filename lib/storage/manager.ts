// StorageManager owns the three storage modes and the panic-delete path.
//
//  • persistent — IndexedDB (audit) + localStorage (prefs)
//  • ephemeral  — in-memory only; nothing touches disk
//  • wiped      — the result of wipeAll(): every backend cleared + a hard
//                 platform-level delete so nothing is left for the browser to GC
//
// Backends are injected so the whole thing is testable in Node against memory
// doubles (the real browser backends are wired in createDefaultStorage()).

import { Preferences, StorageMode, DEFAULT_PREFERENCES } from '../model/types';
import { KeyValueBackend, MemoryBackend } from './backend';
import { AuditStore } from './audit-store';

const PREFS_KEY = 'prefs';

export interface StorageBackends {
  persistentAudit: KeyValueBackend;
  ephemeralAudit: KeyValueBackend;
  persistentPrefs: KeyValueBackend;
  ephemeralPrefs: KeyValueBackend;
  /** Platform-level hard wipe (delete IDB database, clear namespaced localStorage). */
  hardWipe: () => Promise<void>;
}

export class StorageManager {
  audit: AuditStore;
  private activePrefs: KeyValueBackend;
  private backends: StorageBackends;
  private _mode: StorageMode;

  private constructor(backends: StorageBackends, mode: StorageMode) {
    this.backends = backends;
    this._mode = mode;
    this.audit = new AuditStore(this.auditBackend());
    this.activePrefs = this.prefsBackend();
  }

  static create(backends: StorageBackends, initialMode: StorageMode = 'persistent'): StorageManager {
    return new StorageManager(backends, initialMode);
  }

  get mode(): StorageMode {
    return this._mode;
  }

  private auditBackend(): KeyValueBackend {
    return this._mode === 'persistent' ? this.backends.persistentAudit : this.backends.ephemeralAudit;
  }

  private prefsBackend(): KeyValueBackend {
    return this._mode === 'persistent' ? this.backends.persistentPrefs : this.backends.ephemeralPrefs;
  }

  async loadPreferences(): Promise<Preferences> {
    const stored = await this.activePrefs.get<Preferences>(PREFS_KEY);
    return { ...DEFAULT_PREFERENCES, ...(stored ?? {}) };
  }

  async savePreferences(prefs: Preferences): Promise<void> {
    await this.activePrefs.set(PREFS_KEY, prefs);
  }

  /**
   * Switch modes. Going persistent -> ephemeral can optionally wipe what was
   * already written to disk (the data model's "offer to wipe" behavior).
   */
  async setMode(next: StorageMode, opts: { wipeExisting?: boolean } = {}): Promise<void> {
    if (next === this._mode) return;
    const leavingPersistent = this._mode === 'persistent' && next === 'ephemeral';
    if (leavingPersistent && opts.wipeExisting) {
      await this.backends.persistentAudit.clear();
      await this.backends.persistentPrefs.clear();
      await this.backends.hardWipe();
    }
    this._mode = next;
    this.audit = new AuditStore(this.auditBackend());
    this.activePrefs = this.prefsBackend();
    // Persist the chosen mode only when it can actually persist (persistent).
    if (next === 'persistent') {
      const prefs = await this.loadPreferences();
      await this.savePreferences({ ...prefs, storageMode: 'persistent' });
    }
  }

  /**
   * PANIC-DELETE. Instant, unconfirmed by design. Clears every backend (active
   * and inactive) plus the platform-level hard wipe, so nothing survives in
   * either mode's store. The caller (UI) reloads to a neutral screen.
   */
  async wipeAll(): Promise<void> {
    // Panic must never throw or hang: settle every clear (one failing backend
    // must not abort the others) and run the hard wipe regardless. The caller
    // reloads to a neutral screen even if a step rejected.
    await Promise.allSettled([
      this.backends.persistentAudit.clear(),
      this.backends.ephemeralAudit.clear(),
      this.backends.persistentPrefs.clear(),
      this.backends.ephemeralPrefs.clear(),
    ]);
    try {
      await this.backends.hardWipe();
    } catch {
      /* best-effort: the stores above are already cleared */
    }
    // Reset in-memory store handles.
    this.audit = new AuditStore(this.auditBackend());
    this.activePrefs = this.prefsBackend();
  }
}

/** Build memory-only backends (ephemeral everywhere). Used as the SSR/no-storage fallback. */
export function memoryBackends(): StorageBackends {
  return {
    persistentAudit: new MemoryBackend(),
    ephemeralAudit: new MemoryBackend(),
    persistentPrefs: new MemoryBackend(),
    ephemeralPrefs: new MemoryBackend(),
    hardWipe: async () => {},
  };
}
