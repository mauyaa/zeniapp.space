// Curated, license-friendly Kenyan home exteriors/interiors for placeholders/loading states.
export const KENYA_HOME_IMAGES = [
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80&sat=-20', // color-variant of same hero
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80'
];

let fallbackPointer = 0;

/**
 * Returns the next curated Kenyan home image for use as a safe placeholder.
 * Uses round-robin selection to avoid bias and keep results deterministic.
 */
export function getFallbackHomeImage(): string {
  const url = KENYA_HOME_IMAGES[fallbackPointer % KENYA_HOME_IMAGES.length];
  fallbackPointer += 1;
  return url;
}
