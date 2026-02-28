import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Search, Sparkles, Heart, Compass, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchSavedSearches, fetchSavedListings, toggleSaveListing } from '../../lib/api';
import type { ListingCard } from '../../lib/api/listings';
import { setCachedSavedListings, getCachedSavedListings, cachedListingToProperty, uncacheListingCard } from '../../lib/savedListingsCache';
import type { CachedListing } from '../../lib/savedListingsCache';
import { dedupeById, dedupeListingsByContent } from '../../utils/dedupeById';
import { cn } from '../../utils/cn';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCardGrid } from '../../components/ui/Skeleton';
import { PageTransition } from '../../components/ui/PageTransition';
import { PropertyCard } from '../../components/PropertyCard';
import type { Property } from '../../utils/mockData';
import { normalizeKenyaLatLng } from '../../utils/geo';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=60';

function listingCardToProperty(listing: ListingCard): Property {
  const [lat, lng] = normalizeKenyaLatLng(
    listing.location?.lat ??
      ((listing as any).location?.coordinates?.[1] as number | undefined),
    listing.location?.lng ??
      ((listing as any).location?.coordinates?.[0] as number | undefined)
  );
  return {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    description: listing.description,
    price: listing.price,
    currency: listing.currency,
    purpose: (listing as { purpose?: string }).purpose === 'buy' ? 'buy' : 'rent',
    type: (listing.type as Property['type']) || 'Apartment',
    location: {
      neighborhood: listing.location?.neighborhood ?? '',
      city: listing.location?.city ?? '',
      lat,
      lng
    },
    features: { bedrooms: listing.beds ?? 0, bathrooms: listing.baths ?? 0, sqm: listing.sqm ?? 0 },
    amenities: listing.amenities,
    isVerified: Boolean(listing.verified),
    imageUrl: listing.imageUrl || listing.agent?.image || FALLBACK_IMG,
    agent: { name: listing.agent?.name ?? 'Agent', image: listing.agent?.image || FALLBACK_IMG }
  };
}

type SavedSearch = {
  id: string;
  name: string;
  params: Record<string, unknown>;
  createdAt?: string;
};

type Tab = 'searches' | 'listings';

export function SavedPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('searches');
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedListings, setSavedListings] = useState<(ListingCard | CachedListing)[]>([]);
  const [savedListingsLoading, setSavedListingsLoading] = useState(false);
  const [savedListingsFromCache, setSavedListingsFromCache] = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'city'>('city');
  const [quickBarItems, setQuickBarItems] = useState<CachedListing[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchSavedSearches()
      .then((res) => setSavedSearches(res.items || []))
      .catch(() => setSavedSearches([]))
      .finally(() => setLoading(false));
  }, []);

  const loadSavedListings = useCallback(() => {
    setSavedListingsLoading(true);
    setSavedListingsFromCache(false);
    fetchSavedListings()
      .then((res) => {
        const raw = res.items ?? [];
        const items = dedupeListingsByContent(dedupeById(raw));
        setSavedListings(items);
        setQuickBarItems(
          items.slice(0, 12).map((l) => ({
            id: l.id,
            title: l.title,
            price: l.price,
            currency: l.currency,
            imageUrl: l.imageUrl,
            location: l.location,
            type: l.type,
            beds: l.beds,
            baths: l.baths,
            savedAt: Date.now()
          }))
        );
        setCachedSavedListings(items.map((l) => ({
          id: l.id,
          title: l.title,
          price: l.price,
          currency: l.currency,
          imageUrl: l.imageUrl,
          location: l.location,
          type: l.type,
          beds: l.beds,
          baths: l.baths,
          savedAt: Date.now()
        }))).catch(() => { /* ignore */ });
      })
      .catch(() => {
        getCachedSavedListings().then((cached) => {
          setSavedListings(cached);
          setSavedListingsFromCache(cached.length > 0);
        });
      })
      .finally(() => setSavedListingsLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'listings') loadSavedListings();
  }, [tab, loadSavedListings]);

  const handleUnsaveListing = useCallback(async (listingId: string) => {
    try {
      await toggleSaveListing(listingId);
      await uncacheListingCard(listingId);
      setSavedListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, saved: false } : l)));
    } catch {
      // keep UI as is
    }
  }, []);

  const buildSearchUrl = (saved: SavedSearch) => {
    const query = new URLSearchParams();
    Object.entries(saved.params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (key === 'verifiedOnly') {
        if (value === true || value === 'true') query.set(key, 'true');
        return;
      }
      query.set(key, String(value));
    });
    const queryString = query.toString();
    return queryString ? `/app/explore?${queryString}` : '/app/explore';
  };

  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Updated today';
    if (diffDays === 1) return 'Updated yesterday';
    if (diffDays < 7) return `Updated ${diffDays} days ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used for search description display
  const _describeSearch = (params: Record<string, unknown>) => {
    const parts: string[] = [];
    if (params.purpose) parts.push(String(params.purpose) === 'buy' ? 'For sale' : 'For rent');
    if (params.type) parts.push(String(params.type));
    if (params.beds) parts.push(`${params.beds}+ bed`);
    if (params.minPrice || params.maxPrice) {
      const min = params.minPrice ? `${params.minPrice}` : '0';
      const max = params.maxPrice ? `${params.maxPrice}` : '∞';
      parts.push(`${min}–${max}`);
    }
    if (params.verifiedOnly) parts.push('Verified only');
    return parts.length > 0 ? parts.join(' · ') : 'Custom filter set';
  };

  return (
    <PageTransition className="fade-in max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h2 className="text-3xl font-serif text-black">Saved Collections</h2>
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
            <button
              type="button"
              onClick={() => setTab('searches')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                tab === 'searches' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              Saved searches
            </button>
            <button
              type="button"
              onClick={() => setTab('listings')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                tab === 'listings' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              Saved listings
            </button>
          </div>
          {tab === 'searches' && (
            <button
              type="button"
              onClick={() => navigate('/app/explore')}
              className="text-xs font-bold uppercase tracking-widest border-b border-black pb-1 hover:opacity-70 transition-opacity"
            >
              Create New List
            </button>
          )}
        </div>
      </div>

      {tab === 'listings' && (
        <>
          {savedListingsFromCache && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 text-sm">
              <WifiOff className="h-4 w-4 flex-shrink-0" />
              <span>You're viewing cached saved listings. Reconnect to sync.</span>
            </div>
          )}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Sparkles className="h-4 w-4" />
                <span>Saved Board · Pinterest-style grouping</span>
              </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Group by</span>
              <button
                type="button"
                onClick={() => setGroupBy((prev) => (prev === 'city' ? 'none' : 'city'))}
                className="rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest hover:border-black transition-colors"
              >
                {groupBy === 'city' ? 'City' : 'None'}
              </button>
            </div>
          </div>
          {savedListingsLoading ? (
            <SkeletonCardGrid count={6} />
          ) : savedListings.length === 0 ? (
            <EmptyState
              variant="light"
              size="lg"
              illustration="favorites"
              title="No saved listings yet"
              subtitle="Tap the heart on any listing in Explore or Inventory to save it. You can view saved listings even when offline."
              action={{ label: 'Explore listings', onClick: () => navigate('/app/explore'), variant: 'primary' }}
            />
          ) : (
            (() => {
              const quick = quickBarItems.length ? quickBarItems : savedListings.slice(0, 12) as CachedListing[];
              const buckets =
                groupBy === 'city'
                  ? savedListings.reduce<Record<string, (ListingCard | CachedListing)[]>>((acc, item) => {
                      const isCached = 'savedAt' in item;
                      const property = isCached
                        ? cachedListingToProperty(item as CachedListing)
                        : listingCardToProperty(item as ListingCard);
                      const city = property.location.city || 'Unspecified';
                      if (!acc[city]) acc[city] = [];
                      acc[city].push(item);
                      return acc;
                    }, {})
                  : { All: savedListings };

              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {quick.map((item) => {
                      const property = 'savedAt' in item ? cachedListingToProperty(item) : listingCardToProperty(item as ListingCard);
                      return (
                        <button
                          key={property.id}
                          onClick={() => navigate(`/app/inventory?listing=${property.id}`)}
                          className="flex-shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:border-black transition-colors flex items-center gap-2"
                        >
                          <img src={property.imageUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                          <span className="line-clamp-1 max-w-[140px] text-left">{property.title}</span>
                        </button>
                      );
                    })}
                  </div>
                  {Object.entries(buckets).map(([city, items]) => (
                    <div key={city} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Bookmark className="h-4 w-4 text-zinc-500" />
                        <h3 className="text-sm font-semibold text-zinc-800">{city}</h3>
                        <span className="text-[11px] text-zinc-500">({items.length})</span>
                      </div>
                      <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        initial="hidden"
                        animate="show"
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                      >
                        {items.map((item) => {
                          const isCached = 'savedAt' in item;
                          const property = isCached
                            ? cachedListingToProperty(item as CachedListing)
                            : listingCardToProperty(item as ListingCard);
                          return (
                            <motion.div
                              key={property.id}
                              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                              transition={{ duration: 0.25 }}
                            >
                              <PropertyCard
                                property={property}
                                saved
                                onSaveToggle={() => handleUnsaveListing(property.id)}
                                onClick={() => navigate(`/app/inventory?listing=${property.id}`)}
                              />
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </>
      )}

      {tab === 'searches' && (
        <>
      {/* Saved searches grid */}
      {loading ? (
        <SkeletonCardGrid count={3} />
      ) : savedSearches.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            variant="light"
            size="lg"
            illustration="search"
            title="No saved searches yet"
            subtitle="Create a search in Explore, then save it for quick access here."
            action={{ label: 'Explore listings', onClick: () => navigate('/app/explore'), variant: 'primary' }}
          />

          {/* How it works — guide cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50 text-blue-600 mb-3">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-1">Search & filter</h3>
              <p className="text-xs text-zinc-500">Use Explore to set your preferred location, price, and features.</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-50 text-amber-600 mb-3">
                <Bookmark className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-1">Save your search</h3>
              <p className="text-xs text-zinc-500">Hit "Save search" to keep your filters for instant access.</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-1">Get notified</h3>
              <p className="text-xs text-zinc-500">New matches appear in your dashboard automatically.</p>
            </div>
          </div>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {savedSearches.map((search) => {
            const itemCount = 1;
            const collageImages = [
              'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
              'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
            ];
            return (
              <motion.button
                key={search.id}
                type="button"
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.25 }}
                className="group w-full text-left bg-transparent border-0 p-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 rounded-2xl"
                onClick={() => navigate(buildSearchUrl(search))}
              >
                <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white hover-lift">
                  {/* Image collage: large left, 2 cells right (image + "+N") */}
                  <div className="h-64 grid grid-cols-2 gap-1 p-1 bg-gray-100">
                    <img
                      src={collageImages[0]}
                      alt=""
                      className="w-full h-full object-cover rounded-tl-xl rounded-bl-xl"
                    />
                    <div className="grid grid-rows-2 gap-1">
                      <img
                        src={collageImages[1]}
                        alt=""
                        className="w-full h-full object-cover rounded-tr-xl"
                      />
                      <div className="bg-gray-100 rounded-br-xl flex items-center justify-center text-xs font-bold text-gray-400">
                        {itemCount > 2 ? `+${itemCount - 2}` : itemCount === 1 ? '1' : '2'}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-black group-hover:underline truncate">
                      {search.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {itemCount} {itemCount === 1 ? 'search' : 'searches'} • {formatDateShort(search.createdAt)}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Bottom tips — always visible when user has searches */}
      {!loading && savedSearches.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-4 bg-zinc-50 border border-zinc-100 rounded-xl p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-500 flex-shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 mb-1">Tip: Save individual listings too</h3>
              <p className="text-xs text-zinc-500">
                Tap the heart on any listing card to save it. Your favorites sync across all your devices.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 bg-zinc-50 border border-zinc-100 rounded-xl p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 mb-1">Tip: Refine and re-save</h3>
              <p className="text-xs text-zinc-500">
                Open a saved search, adjust filters, and save again to keep your criteria fresh.
              </p>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </PageTransition>
  );
}
