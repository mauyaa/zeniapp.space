/**
 * Offline cache for saved listings (IndexedDB).
 * When signal is lost (e.g. in Kitengela/Ruiru), user can still see saved listing photos and price.
 */

import { normalizeKenyaLatLng } from '../utils/geo';

const DB_NAME = 'zeni-saved-listings';
const STORE_NAME = 'listings';
const DB_VERSION = 1;

export type CachedListing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrl?: string;
  location?: { city?: string; neighborhood?: string; lat?: number; lng?: number };
  type?: string;
  beds?: number;
  baths?: number;
  savedAt: number;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function setCachedSavedListings(items: CachedListing[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.clear();
    const now = Date.now();
    for (const item of items) {
      store.put({ ...item, savedAt: now });
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB not available (private mode, etc.)
  }
}

export async function getCachedSavedListings(): Promise<CachedListing[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        db.close();
        resolve((req.result || []) as CachedListing[]);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

/** Add or update one listing in the cache (e.g. when user saves a listing). */
export async function cacheListingCard(item: {
  id: string;
  title: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  location?: { city?: string; neighborhood?: string; lat?: number; lng?: number };
  type?: string;
  beds?: number;
  baths?: number;
}): Promise<void> {
  const existing = await getCachedSavedListings();
  const [lat, lng] = normalizeKenyaLatLng(item.location?.lat, item.location?.lng);
  const entry: CachedListing = {
    ...item,
    currency: item.currency || 'KES',
    location: { ...item.location, lat, lng },
    savedAt: Date.now(),
  };
  const rest = existing.filter((e) => e.id !== item.id);
  await setCachedSavedListings([entry, ...rest]);
}

/** Remove one listing from cache (user unsaved). */
export async function uncacheListingCard(listingId: string): Promise<void> {
  const existing = await getCachedSavedListings();
  await setCachedSavedListings(existing.filter((e) => e.id !== listingId));
}

/** Convert CachedListing to a minimal Property-like shape for PropertyCard. */
export function cachedListingToProperty(c: CachedListing): {
  id: string;
  title: string;
  price: number;
  currency: string;
  purpose: 'rent' | 'buy';
  type: 'House' | 'Apartment' | 'Land' | 'Commercial';
  location: { neighborhood: string; city: string; lat: number; lng: number };
  features: { bedrooms: number; bathrooms: number; sqm: number };
  isVerified: boolean;
  imageUrl: string;
  agent: { name: string; image: string };
} {
  const [lat, lng] = normalizeKenyaLatLng(c.location?.lat, c.location?.lng);
  return {
    id: c.id,
    title: c.title,
    price: c.price,
    currency: c.currency,
    purpose: 'rent',
    type: (c.type as 'House' | 'Apartment' | 'Land' | 'Commercial') || 'Apartment',
    location: {
      neighborhood: c.location?.neighborhood ?? '',
      city: c.location?.city ?? '',
      lat,
      lng,
    },
    features: {
      bedrooms: c.beds ?? 0,
      bathrooms: c.baths ?? 0,
      sqm: 0,
    },
    isVerified: false,
    imageUrl: c.imageUrl ?? '',
    agent: { name: '', image: '' },
  };
}
