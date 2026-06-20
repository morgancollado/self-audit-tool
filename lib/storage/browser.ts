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

  // Read any previously chosen mode from durable prefs (only persistent mode
  // ever wrote one). Absent => start persistent unless storage isn't durable.
  let startMode: StorageMode = durable ? 'persistent' : 'ephemeral';
  let preferences: Preferences = { ...DEFAULT_PREFERENCES };
  if (durable) {
    const probe = StorageManager.create(backends, 'persistent');
    preferences = await probe.loadPreferences();
    if (preferences.storageMode) startMode = preferences.storageMode;
  }

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
