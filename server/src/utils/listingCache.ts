/**
 * Optional in-memory cache for listing search results.
 * Keeps API responses lightweight and improves mobile experience by reducing repeated DB hits.
 * TTL and max size are conservative; for production scale consider Redis.
 */

// Short TTL so newly approved listings show up on maps quickly
const TTL_MS = 5 * 1000; // 5 seconds
const MAX_ENTRIES = 200;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function prune() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if ((entry as CacheEntry<unknown>).expiresAt <= now) cache.delete(key);
  }
  while (cache.size > MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
}

export function cacheKey(prefix: string, query: Record<string, unknown>): string {
  const normalized = JSON.stringify(
    Object.keys(query)
      .sort()
      .reduce(
        (acc, k) => {
          const v = query[k];
          if (v !== undefined && v !== '') acc[k] = v;
          return acc;
        },
        {} as Record<string, unknown>
      )
  );
  return `${prefix}:${normalized}`;
}

export function get<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

export function set<T>(key: string, data: T, ttlMs = TTL_MS): void {
  if (cache.size >= MAX_ENTRIES) prune();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidatePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix + ':')) cache.delete(key);
  }
}
