import { useState, useCallback, useEffect } from 'react';

export interface RecentlyViewedItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrl?: string;
  neighborhood?: string;
  city?: string;
  beds?: number;
  purpose?: string;
}

const STORAGE_KEY = 'zeni_recently_viewed';
const MAX_ITEMS = 6;

function readStored(): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyViewedItem[];
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>(readStored);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStored());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const addViewed = useCallback((item: RecentlyViewedItem) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id);
      const updated = [item, ...filtered].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // storage full — ignore
      }
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { items, addViewed, clearAll };
}
