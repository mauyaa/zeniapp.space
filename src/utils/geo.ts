export type LatLng = { lat?: number; lng?: number };

const KENYA_BOUNDS = {
  minLat: -5.2,
  maxLat: 5.2,
  minLng: 33.8,
  maxLng: 42.4
};

const DEFAULT_CENTER: [number, number] = [-1.2921, 36.8219]; // Kenya CBD

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isWithinKenya(lat?: number, lng?: number): boolean {
  return (
    isFiniteNumber(lat) &&
    isFiniteNumber(lng) &&
    lat >= KENYA_BOUNDS.minLat &&
    lat <= KENYA_BOUNDS.maxLat &&
    lng >= KENYA_BOUNDS.minLng &&
    lng <= KENYA_BOUNDS.maxLng
  );
}

/**
 * Normalize lat/lng coming from server or cache:
 * - prefer given order if inside Kenya
 * - swap if swapped version lands inside Kenya
 * - otherwise fall back to Kenya center
 */
export function normalizeKenyaLatLng(lat?: number, lng?: number): [number, number] {
  if (isWithinKenya(lat, lng)) return [lat as number, lng as number];
  if (isWithinKenya(lng, lat)) return [lng as number, lat as number];
  return DEFAULT_CENTER;
}

export function normalizeLocation<T extends { lat?: number; lng?: number }>(loc: T): T {
  const [lat, lng] = normalizeKenyaLatLng(loc.lat, loc.lng);
  return { ...loc, lat, lng };
}
