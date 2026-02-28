/**
 * Deduplicate an array of items by id (keeps first occurrence).
 * Items without a valid string id are excluded so they never produce duplicate keys.
 * Use when displaying listing/search results to avoid duplicates from API or pagination.
 */
export function dedupeById<T extends { id?: unknown }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = item.id;
    if (id == null || typeof id !== 'string' || id.trim() === '') return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Deduplicate by a custom key (keeps first occurrence per key).
 * Use for content-based deduplication when the same listing can appear with different ids.
 */
export function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Content key for listing-shaped objects (title + price + location). Same listing = same key even if id differs. */
export function getListingContentKey(item: {
  title?: string;
  price?: number;
  location?: { neighborhood?: string; city?: string };
}): string {
  const title = String(item.title ?? '').trim();
  const price = Number(item.price);
  const num = Number.isFinite(price) ? price : 0;
  const neighborhood = String(item.location?.neighborhood ?? '').trim();
  const city = String(item.location?.city ?? '').trim();
  return `${title}|${num}|${neighborhood}|${city}`;
}

/**
 * Deduplicate listings by content (title, price, neighborhood, city).
 * Use after dedupeById so the same property is not shown multiple times when the API returns duplicate rows with different ids.
 */
export function dedupeListingsByContent<T extends { title?: string; price?: number; location?: { neighborhood?: string; city?: string } }>(
  items: T[]
): T[] {
  return dedupeByKey(items, getListingContentKey);
}
