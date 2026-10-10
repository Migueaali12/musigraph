// ── Tiny in-memory TTL cache with LRU eviction ─────────────────────────────
// Server-side only. Keeps repeated SPARQL queries (same action + params +
// language + provider) from hitting the public endpoints over and over.

interface CacheEntry<T> {
  value: T
  expires: number
}

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>()

  constructor(
    private readonly maxEntries: number = 300,
    private readonly defaultTtlMs: number = 3_600_000
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expires) {
      this.store.delete(key)
      return undefined
    }
    // Refresh recency for LRU eviction
    this.store.delete(key)
    this.store.set(key, entry)
    return entry.value
  }

  set(key: string, value: T, ttlMs: number = this.defaultTtlMs): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
    this.store.set(key, { value, expires: Date.now() + ttlMs })
  }
}
