// localStorage backend for small preferences. Namespaced so clear()/keys() only
// ever touch Errata's own keys. Browser-only; guarded by isLocalStorageAvailable().

import { KeyValueBackend } from './backend';

export const PREFIX = 'errata:';

export function isLocalStorageAvailable(): boolean {
  try {
    const probe = '__errata_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export class LocalStorageBackend implements KeyValueBackend {
  async get<T>(key: string): Promise<T | undefined> {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // localStorage is shared and externally writable; a corrupt/tampered value
      // must read as absent rather than throw and brick the load path.
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(PREFIX + key);
  }

  async clear(): Promise<void> {
    for (const k of this.rawKeys()) localStorage.removeItem(k);
  }

  async keys(): Promise<string[]> {
    return this.rawKeys().map((k) => k.slice(PREFIX.length));
  }

  private rawKeys(): string[] {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) out.push(k);
    }
    return out;
  }
}
