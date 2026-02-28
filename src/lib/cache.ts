/**
 * Simple in-memory cache for API responses.
 * Prevents redundant network requests for the same data within a TTL window.
 * Works like a lightweight SWR: returns stale data immediately, revalidates in background.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Default TTL: 30 seconds */
const DEFAULT_TTL = 30_000;

/** Maximum entries to prevent memory leaks */
const MAX_ENTRIES = 200;

/**
 * Get cached data if available and not expired.
 */
export function getCached<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Get cached data even if stale (for SWR pattern).
 */
export function getStale<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  return entry?.data ?? null;
}

/**
 * Store data in cache with optional TTL.
 */
export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  // Evict oldest entry if at capacity
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }

  store.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Invalidate a specific cache key or all keys matching a prefix.
 */
export function invalidate(keyOrPrefix: string): void {
  if (store.has(keyOrPrefix)) {
    store.delete(keyOrPrefix);
    return;
  }
  // Prefix match
  for (const key of store.keys()) {
    if (key.startsWith(keyOrPrefix)) {
      store.delete(key);
    }
  }
}

/**
 * Clear entire cache.
 */
export function clearCache(): void {
  store.clear();
}

/**
 * Fetch with SWR pattern: return cached data instantly, revalidate in background.
 * @param key - Cache key
 * @param fetcher - Async function that fetches fresh data
 * @param ttl - Time-to-live in milliseconds
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) return cached;

  const data = await fetcher();
  setCache(key, data, ttl);
  return data;
}
