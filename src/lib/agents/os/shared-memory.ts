// src/lib/agents/os/shared-memory.ts
// Shared memory — persistent knowledge store that all agents can read/write.
// In-memory for now, can be backed by Supabase later.

// ─── Shared Memory ──────────────────────────────────────────────────────────────

class SharedMemory {
  private store = new Map<string, unknown>();
  private timestamps = new Map<string, string>();

  /** Set a value */
  set<T>(key: string, value: T): void {
    this.store.set(key, value);
    this.timestamps.set(key, new Date().toISOString());
  }

  /** Get a value */
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  /** Get a value with fallback */
  getOrDefault<T>(key: string, fallback: T): T {
    const value = this.store.get(key);
    return value !== undefined ? value as T : fallback;
  }

  /** Check if key exists */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /** Delete a key */
  delete(key: string): void {
    this.store.delete(key);
    this.timestamps.delete(key);
  }

  /** Append to a set (useful for known_industries, known_companies) */
  addToSet(key: string, value: string): void {
    const existing = this.getOrDefault<Set<string>>(key, new Set());
    existing.add(value);
    this.set(key, existing);
  }

  /** Check if value is in a set */
  isInSet(key: string, value: string): boolean {
    const set = this.get<Set<string>>(key);
    return set ? set.has(value) : false;
  }

  /** Increment a counter */
  increment(key: string, amount = 1): number {
    const current = this.getOrDefault<number>(key, 0);
    const next = current + amount;
    this.set(key, next);
    return next;
  }

  /** Get when a key was last updated */
  getTimestamp(key: string): string | undefined {
    return this.timestamps.get(key);
  }

  /** Get all keys */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /** Get summary of stored data */
  summary(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of this.store.keys()) {
      const val = this.store.get(key);
      if (val instanceof Set) {
        result[key] = `Set(${val.size})`;
      } else if (Array.isArray(val)) {
        result[key] = `Array(${val.length})`;
      } else if (typeof val === 'number') {
        result[key] = String(val);
      } else if (typeof val === 'string') {
        result[key] = val.length > 50 ? val.slice(0, 50) + '...' : val;
      } else {
        result[key] = typeof val as string;
      }
    }
    return result;
  }

  /** Clear all (for testing) */
  reset(): void {
    this.store.clear();
    this.timestamps.clear();
  }
}

// Singleton
export const sharedMemory = new SharedMemory();
