// IndexedDB backend for persistent audit state. A single object store keyed by
// string. Browser-only; guarded by isIndexedDbAvailable().

import { KeyValueBackend } from './backend';

export const DB_NAME = 'errata';
const STORE = 'kv';
const DB_VERSION = 1;

export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = fn(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request.result as T);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export class IndexedDbBackend implements KeyValueBackend {
  private dbPromise?: Promise<IDBDatabase>;

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) this.dbPromise = openDb();
    return this.dbPromise;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const db = await this.db();
    const value = await tx<T | undefined>(db, 'readonly', (s) => s.get(key));
    return value ?? undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = await this.db();
    await tx(db, 'readwrite', (s) => s.put(value, key));
  }

  async delete(key: string): Promise<void> {
    const db = await this.db();
    await tx(db, 'readwrite', (s) => s.delete(key));
  }

  async clear(): Promise<void> {
    const db = await this.db();
    await tx(db, 'readwrite', (s) => s.clear());
  }

  async keys(): Promise<string[]> {
    const db = await this.db();
    const keys = await tx<IDBValidKey[]>(db, 'readonly', (s) => s.getAllKeys());
    return keys.map(String);
  }

  /**
   * Close the cached connection. Panic-delete calls this before deleteDatabase()
   * so the open handle doesn't block the delete (a blocked delete is silently
   * deferred until the connection closes, leaving the DB on disk until reload).
   */
  close(): void {
    const pending = this.dbPromise;
    this.dbPromise = undefined;
    if (pending) pending.then((db) => db.close()).catch(() => {});
  }
}

/**
 * Hard-delete the entire database from disk. Panic-delete uses this so we don't
 * rely on the browser to GC an emptied store (scope/docs/04-data-model.md).
 */
export function deleteDatabase(): Promise<void> {
  return new Promise((resolve) => {
    if (!isIndexedDbAvailable()) return resolve();
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    // Resolve even on error/blocked — panic must not hang.
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}
