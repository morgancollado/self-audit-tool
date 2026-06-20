// Browser wiring: build real backends with graceful fallback, and detect the
// starting mode. If durable storage isn't available (private mode, locked-down
// browser), we fall back to memory and behave as ephemeral — failing safe.

import { StorageMode, Preferences, DEFAULT_PREFERENCES } from '../model/types';
import { MemoryBackend } from './backend';
import { IndexedDbBackend, isIndexedDbAvailable, deleteDatabase } from './indexeddb';
import { LocalStorageBackend, isLocalStorageAvailable } from './local';
import { StorageBackends, StorageManager, memoryBackends } from './manager';

export interface DefaultStorage {
  manager: StorageManager;
  /** Whether durable storage actually exists in this browser. */
  durable: boolean;
  preferences: Preferences;
}

function realBackends(): StorageBackends {
  const persistentAudit = isIndexedDbAvailable() ? new IndexedDbBackend() : new MemoryBackend();
  const persistentPrefs = isLocalStorageAvailable() ? new LocalStorageBackend() : new MemoryBackend();
  return {
    persistentAudit,
    ephemeralAudit: new MemoryBackend(),
    persistentPrefs,
    ephemeralPrefs: new MemoryBackend(),
    hardWipe: async () => {
      await deleteDatabase();
      if (isLocalStorageAvailable()) await new LocalStorageBackend().clear();
    },
  };
}

export async function createDefaultStorage(): Promise<DefaultStorage> {
  const durable = isIndexedDbAvailable() && isLocalStorageAvailable();
  const backends = durable ? realBackends() : memoryBackends();

  // Read previously saved prefs. This is a localStorage READ only — it never
  // opens IndexedDB and writes nothing, so a first-time visitor on a shared or
  // monitored device leaves no trace here. (Constructing the backends is lazy;
  // IndexedDB is not opened until something actually reads/writes audit state.)
  let preferences: Preferences = { ...DEFAULT_PREFERENCES };
  if (durable) {
    const probe = StorageManager.create(backends, 'persistent');
    preferences = await probe.loadPreferences();
  }

  // The pre-consent default is ALWAYS ephemeral. We must not open IndexedDB or
  // request persistent storage until the user has seen the safety intro and
  // explicitly chosen to save on this device — otherwise we'd create the named
  // `errata` database (and possibly a persist grant) before they've had the
  // chance to pick session-only mode. Only a returning user who already
  // consented and chose to save starts persistent (their data already exists).
  const consentedPersistent =
    durable && preferences.safetyIntroAcknowledged && preferences.storageMode === 'persistent';
  const startMode: StorageMode = consentedPersistent ? 'persistent' : 'ephemeral';

  const manager = StorageManager.create(backends, startMode);
  return { manager, durable, preferences };
}

/**
 * Request that the browser keep our storage from being silently evicted (iOS
 * Safari evicts IndexedDB after ~7 days of no use — R18). Best-effort.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignore */
  }
  return false;
}
