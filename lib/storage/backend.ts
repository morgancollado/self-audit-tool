// Storage backend abstraction. The same store logic runs over any backend, so
// persistent (IndexedDB/localStorage) and ephemeral (in-memory) modes share one
// code path (scope/docs/03-architecture.md, /04-data-model.md).

export interface KeyValueBackend {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  /** Remove everything this backend owns. */
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

/**
 * In-memory backend. Used for ephemeral/session-only mode (nothing touches
 * disk) and as the test double. Values are structured-cloned on write so callers
 * can't mutate stored state by reference.
 */
export class MemoryBackend implements KeyValueBackend {
  private map = new Map<string, string>();

  async get<T>(key: string): Promise<T | undefined> {
    const raw = this.map.get(key);
    return raw === undefined ? undefined : (JSON.parse(raw) as T);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.map.set(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async clear(): Promise<void> {
    this.map.clear();
  }

  async keys(): Promise<string[]> {
    return [...this.map.keys()];
  }

  /** Test/inspection helper: how many keys are held. */
  get size(): number {
    return this.map.size;
  }
}
