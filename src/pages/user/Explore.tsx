import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  ChevronDown,
  ChevronUp,
  GitCompare,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import {
  createSavedSearch,
  createViewingRequest,
  fetchListing,
  getKycStatus,
  searchListings,
  toggleSaveListing,
  type ListingCard,
  type ListingSearchParams,
} from '../../lib/api';
import { cacheListingCard, uncacheListingCard } from '../../lib/savedListingsCache';
import { ListingDrawer } from '../../components/listings/ListingDrawer';
import { PropertyCard, PropertyCardSkeleton } from '../../components/PropertyCard';
const PropertyMap = lazy(() =>
  import('../../components/PropertyMap').then((m) => ({ default: m.PropertyMap }))
);
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { useVirtualizer } from '@tanstack/react-virtual';
import { listingThumbUrl } from '../../lib/cloudinary';
import { useDebounce } from '../../hooks/useDebounce';
import { trackEvent } from '../../lib/analytics';
import { formatCompactPrice } from '../../lib/format';
import { cn } from '../../utils/cn';
import { dedupeById, dedupeListingsByContent } from '../../utils/dedupeById';
import { normalizeKenyaLatLng } from '../../utils/geo';
import type { Property } from '../../utils/mockData';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { CompareModal } from '../../components/listings/CompareModal';
import { PriceRangeSlider } from '../../components/ui/PriceRangeSlider';

const LIST_ROW_HEIGHT = 180;
const LIST_OVERSCAN = 2;

const fallbackImage =
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=60';

type SortKey = 'recommended' | 'price-asc' | 'price-desc';

type PropertyWithMeta = Property & {
  saved?: boolean;
  score?: number;
};

type Filters = {
  purpose?: 'rent' | 'buy';
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  type?: string;
  verifiedOnly: boolean;
  amenities?: string[];
};

const defaultFilters: Filters = {
  verifiedOnly: true,
  amenities: [],
};

/** All Kenya-relevant amenity filter pills */
const AMENITY_OPTIONS: { key: string; label: string; icon: string }[] = [
  { key: 'dsq', label: 'DSQ', icon: '🏠' },
  { key: 'borehole', label: 'Borehole water', icon: '💧' },
  { key: 'generator', label: 'Generator', icon: '⚡' },
  { key: 'fiber', label: 'Fiber internet', icon: '📶' },
  { key: 'ensuite', label: 'Ensuite', icon: '🛁' },
  { key: 'furnished', label: 'Furnished', icon: '🛋️' },
  { key: 'gym', label: 'Gym', icon: '🏋️' },
  { key: 'pool', label: 'Pool', icon: '🏊' },
  { key: 'cctv', label: 'CCTV', icon: '📹' },
  { key: 'lift', label: 'Lift/Elevator', icon: '🔼' },
];

const filterKeys = [
  'purpose',
  'minPrice',
  'maxPrice',
  'beds',
  'baths',
  'type',
  'verifiedOnly',
  'amenities',
  'q',
] as const;
const propertyTypes = [
  'Apartment',
  'House',
  'Villa',
  'Townhouse',
  'Studio',
  'Penthouse',
  'Commercial',
  'Office',
  'Retail',
  'Warehouse',
  'Land',
  'Other',
];

function toProperty(listing: ListingCard): PropertyWithMeta {
  const [lat, lng] = normalizeKenyaLatLng(
    listing.location?.lat ?? listing.location?.coordinates?.[1],
    listing.location?.lng ?? listing.location?.coordinates?.[0]
  );
  return {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    description: listing.description,
    price: listing.price,
    currency: listing.currency,
    purpose: (listing.purpose as Property['purpose']) || 'rent',
    type: (listing.type as Property['type']) || 'Apartment',
    agentId: listing.agent?.id,
    location: {
      neighborhood: listing.location?.neighborhood || '',
      city: listing.location?.city || '',
      lat,
      lng,
    },
    features: {
      bedrooms: listing.beds ?? 0,
      bathrooms: listing.baths ?? 0,
      sqm: listing.sqm ?? 0,
    },
    floorPlans: listing.floorPlans?.map((plan) => ({ label: plan.label, url: plan.url })),
    amenities: listing.amenities,
    catalogueUrl: listing.catalogueUrl,
    isVerified: Boolean(listing.verified),
    imageUrl: listing.imageUrl || listing.agent?.image || fallbackImage,
    images: listing.images || [{ url: listing.imageUrl || fallbackImage }],
    agent: {
      name: listing.agent?.name || 'Agent',
      image: listing.agent?.image || fallbackImage,
    },
    saved: listing.saved,
  };
}

function parseIntOrUndefined(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function hasFilterParams(searchParams: URLSearchParams): boolean {
  return filterKeys.some((key) => searchParams.has(key));
}

export function ExplorePage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const { startConversation, setActiveConversation } = useChat();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [sort, setSort] = useState<SortKey>('recommended');

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [resultMode, setResultMode] = useState<'recommended' | 'all'>('recommended');
  const [mapBounds, setMapBounds] = useState<{
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } | null>(null);
  const [searchThisArea, setSearchThisArea] = useState(false);

  const [items, setItems] = useState<PropertyWithMeta[]>([]);
  const [recommended, setRecommended] = useState<PropertyWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [, setSavingSearch] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PropertyWithMeta | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Compare state (max 3 listings)
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const { items: recentlyViewed } = useRecentlyViewed();

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  const compareProperties = useMemo(
    () =>
      compareIds
        .map((id) => [...items, ...recommended].find((i) => i.id === id))
        .filter(Boolean) as PropertyWithMeta[],
    [compareIds, items, recommended]
  );

  const hydratedFromUrl = useRef(false);

  const updateUrlParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) next.delete(key);
        else next.set(key, value);
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    const listingId = searchParams.get('listing');
    setSelectedId(listingId || null);

    if (!hydratedFromUrl.current || hasFilterParams(searchParams)) {
      setFilters({
        purpose:
          searchParams.get('purpose') === 'buy'
            ? 'buy'
            : searchParams.get('purpose') === 'rent'
              ? 'rent'
              : undefined,
        minPrice: parseIntOrUndefined(searchParams.get('minPrice')),
        maxPrice: parseIntOrUndefined(searchParams.get('maxPrice')),
        beds: parseIntOrUndefined(searchParams.get('beds')),
        baths: parseIntOrUndefined(searchParams.get('baths')),
        type: searchParams.get('type') || undefined,
        verifiedOnly: searchParams.get('verifiedOnly') === 'true',
      });
      setQuery(searchParams.get('q') || '');
      hydratedFromUrl.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!hydratedFromUrl.current) return;
    const normalized = debouncedQuery.trim();
    const next = new URLSearchParams(searchParams);
    if (normalized) next.set('q', normalized);
    else next.delete('q');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [debouncedQuery, searchParams, setSearchParams]);

  // Prefer recommended as the primary feed when available.
  useEffect(() => {
    if (recommended.length > 0) {
      setResultMode('recommended');
    } else {
      setResultMode('all');
    }
  }, [recommended.length]);

  const searchPayload = useMemo(() => {
    const payload: ListingSearchParams = {
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      beds: filters.beds,
      baths: filters.baths,
      type: filters.type,
      verifiedOnly: filters.verifiedOnly,
      limit: 8,
    };

    if (searchThisArea && mapBounds) {
      payload.minLat = mapBounds.minLat;
      payload.maxLat = mapBounds.maxLat;
      payload.minLng = mapBounds.minLng;
      payload.maxLng = mapBounds.maxLng;
    }

    if (filters.purpose) {
      payload.purpose = filters.purpose;
    }

    const normalizedSearch = debouncedQuery.trim();
    if (normalizedSearch) {
      payload.q = normalizedSearch;
    }

    return payload;
  }, [debouncedQuery, filters, mapBounds, searchThisArea]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    searchListings(searchPayload)
      .then((res) => {
        if (cancelled) return;
        const raw = res.items || [];
        const excludeSupport = raw.filter((item) => !/^Zeni Support$/i.test(item.title || ''));
        const unique = dedupeListingsByContent(dedupeById(excludeSupport));
        setItems(unique.map(toProperty));
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchPayload, fetchKey]);

  useEffect(() => {
    let cancelled = false;
    setLoadingRecommended(true);
    // Contextual recs: reuse current filters/search for tighter suggestions
    const recPayload: ListingSearchParams = {
      ...searchPayload,
      page: 1,
      limit: 6,
    };
    searchListings(recPayload)
      .then((res) => {
        if (cancelled) return;
        const raw = res.items || [];
        const excludeSupport = raw.filter((item) => !/^Zeni Support$/i.test(item.title || ''));
        const unique = dedupeListingsByContent(dedupeById(excludeSupport));
        setRecommended(unique.slice(0, 6).map(toProperty));
      })
      .catch(() => {
        if (!cancelled) setRecommended([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecommended(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchPayload]);

  useEffect(() => {
    const onFocus = () => setFetchKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    const found = [...items, ...recommended].find((item) => item.id === selectedId);
    if (found) {
      setSelectedDetail(found);
      return;
    }
    fetchListing(selectedId)
      .then((listing) => setSelectedDetail(toProperty(listing)))
      .catch(() => setSelectedDetail(null));
  }, [items, recommended, selectedId]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    const source = resultMode === 'recommended' && recommended.length > 0 ? recommended : items;
    const filtered = normalizedQuery
      ? source.filter((item) => {
          const haystack = [
            item.title,
            item.location.neighborhood,
            item.location.city,
            item.agent.name,
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : source;

    const withScore = filtered.map((item) => ({
      ...item,
      score:
        (item.saved ? 3 : 0) + (item.isVerified ? 2 : 0) + (item.features.bedrooms > 0 ? 1 : 0),
    }));

    if (sort === 'price-asc') return withScore.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return withScore.sort((a, b) => b.price - a.price);
    return withScore.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [debouncedQuery, items, recommended, sort, resultMode]);

  const listScrollRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(visibleItems.length / 2);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => listScrollRef.current,
    estimateSize: () => LIST_ROW_HEIGHT,
    overscan: LIST_OVERSCAN,
  });

  const handleSaveListing = async (id: string) => {
    const item = items.find((l) => l.id === id) ?? recommended.find((l) => l.id === id);
    try {
      const result = await toggleSaveListing(id);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, saved: result.saved } : i)));
      setRecommended((prev) => prev.map((i) => (i.id === id ? { ...i, saved: result.saved } : i)));
      if (selectedDetail?.id === id)
        setSelectedDetail((d) => (d ? { ...d, saved: result.saved } : null));
      if (result.saved && item) {
        cacheListingCard({
          id: item.id,
          title: item.title,
          price: item.price,
          currency: item.currency,
          imageUrl: item.imageUrl,
          location: item.location,
          type: item.type,
          beds: item.features?.bedrooms ?? 0,
          baths: item.features?.bathrooms ?? 0,
        }).catch(() => {
          /* ignore */
        });
      } else {
        uncacheListingCard(id).catch(() => {
          /* ignore */
        });
      }
    } catch {
      push({
        title: 'Save failed',
        description: 'Could not update this listing right now.',
        tone: 'error',
      });
    }
  };

  const handleMessage = async (property: PropertyWithMeta) => {
    if (!property.agentId) {
      push({
        title: 'Missing agent',
        description: 'This listing has no assigned agent yet.',
        tone: 'error',
      });
      return;
    }
    try {
      const conversation = await startConversation(property.id, property.agentId);
      setActiveConversation(conversation.id);
      navigate(`/app/messages/${conversation.id}`);
    } catch {
      push({ title: 'Could not start chat', description: 'Try again in a moment.', tone: 'error' });
    }
  };

  const handleViewing = async (payload: { date: string; note?: string }) => {
    if (!selectedDetail?.agentId) {
      push({
        title: 'Missing agent',
        description: 'Cannot request viewing for this listing.',
        tone: 'error',
      });
      return;
    }
    try {
      const response = await createViewingRequest({
        listingId: selectedDetail.id,
        agentId: selectedDetail.agentId,
        date: payload.date,
        note: payload.note,
      });
      const viewingId = response._id || (response as { id?: string }).id;
      trackEvent({
        name: 'viewing_requested',
        payload: {
          listingId: selectedDetail.id,
          viewingId: String(viewingId),
          hasFee: Boolean(response.needsViewingFee),
        },
      });
      if (response.needsViewingFee && response.viewingFeeAmount && viewingId) {
        try {
          const kyc = await getKycStatus();
          if (kyc.status !== 'verified') {
            push({
              title: 'Identity verification required',
              description: 'Verify your identity in your profile to make payments.',
              tone: 'error',
            });
            navigate('/app/profile?kyc=required', { replace: false });
            return;
          }
        } catch {
          push({
            title: 'Could not verify identity',
            description: 'Complete verification in your profile to pay.',
            tone: 'error',
          });
          navigate('/app/profile?kyc=required', { replace: false });
          return;
        }
        push({
          title: 'Pay viewing fee',
          description: `KES ${response.viewingFeeAmount} secures your viewing. You'll be redirected to pay.`,
          tone: 'success',
        });
        setSelectedId(null);
        setSelectedDetail(null);
        const params = new URLSearchParams({
          purpose: 'viewing_fee',
          referenceId: String(viewingId),
          amount: String(response.viewingFeeAmount),
        });
        navigate(`/pay/payments?${params.toString()}`, { replace: false });
      } else {
        push({
          title: 'Viewing requested',
          description: 'The agent will confirm shortly.',
          tone: 'success',
        });
      }
    } catch {
      push({
        title: 'Request failed',
        description: 'Could not submit your viewing request.',
        tone: 'error',
      });
    }
  };

  const handleBuy = useCallback(
    async (property: PropertyWithMeta) => {
      try {
        const kyc = await getKycStatus();
        if (kyc.status !== 'verified') {
          push({
            title: 'Identity verification required',
            description: 'Verify your identity in your profile to buy or pay for property.',
            tone: 'error',
          });
          navigate('/app/profile?kyc=required');
          return;
        }
      } catch {
        push({
          title: 'Could not verify identity',
          description: 'Complete verification in your profile to pay.',
          tone: 'error',
        });
        navigate('/app/profile?kyc=required');
        return;
      }
      const purpose = property.purpose === 'buy' ? 'property_purchase' : 'rent';
      const params = new URLSearchParams({
        purpose,
        referenceId: property.id,
        amount: String(Math.round(property.price)),
      });
      navigate(`/pay/payments?${params.toString()}`);
    },
    [navigate, push]
  );

  const handleShare = async (property: PropertyWithMeta) => {
    const url = `${window.location.origin}/app/explore?listing=${property.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: property.title, text: 'Check out this listing', url });
        return;
      } catch {
        // no-op
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      push({
        title: 'Link copied',
        description: 'Listing link copied to clipboard.',
        tone: 'success',
      });
    } catch {
      push({ title: 'Share failed', description: 'Could not copy listing link.', tone: 'error' });
    }
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setQuery('');
    updateUrlParams({
      purpose: null,
      minPrice: null,
      maxPrice: null,
      beds: null,
      baths: null,
      type: null,
      verifiedOnly: null,
      q: null,
    });
  };

  const handleSaveSearch = async () => {
    const name = window.prompt('Name this search', 'My saved search');
    if (!name?.trim()) return;
    setSavingSearch(true);
    try {
      await createSavedSearch({
        name: name.trim(),
        params: { ...filters, q: debouncedQuery.trim() || undefined },
      });
      push({ title: 'Search saved', description: 'Open it later from Saved.', tone: 'success' });
    } catch {
      push({ title: 'Could not save', description: 'Try a shorter search name.', tone: 'error' });
    } finally {
      setSavingSearch(false);
    }
  };

  const hasActiveFilters =
    filters.purpose !== defaultFilters.purpose ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.beds != null ||
    filters.baths != null ||
    filters.type != null ||
    filters.verifiedOnly !== defaultFilters.verifiedOnly ||
    debouncedQuery.trim() !== '' ||
    false;

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (filters.purpose)
    activeChips.push({
      key: 'purpose',
      label: filters.purpose === 'buy' ? 'Buy' : 'Rent',
      onRemove: () => setFilters((p) => ({ ...p, purpose: undefined })),
    });
  if (filters.minPrice != null)
    activeChips.push({
      key: 'minPrice',
      label: `Min ${filters.minPrice}`,
      onRemove: () => setFilters((p) => ({ ...p, minPrice: undefined })),
    });
  if (filters.maxPrice != null)
    activeChips.push({
      key: 'maxPrice',
      label: `Max ${filters.maxPrice}`,
      onRemove: () => setFilters((p) => ({ ...p, maxPrice: undefined })),
    });
  if (filters.beds != null)
    activeChips.push({
      key: 'beds',
      label: `${filters.beds}+ beds`,
      onRemove: () => setFilters((p) => ({ ...p, beds: undefined })),
    });
  if (filters.baths != null)
    activeChips.push({
      key: 'baths',
      label: `${filters.baths}+ baths`,
      onRemove: () => setFilters((p) => ({ ...p, baths: undefined })),
    });
  if (filters.type)
    activeChips.push({
      key: 'type',
      label: filters.type,
      onRemove: () => setFilters((p) => ({ ...p, type: undefined })),
    });
  if (filters.verifiedOnly)
    activeChips.push({
      key: 'verified',
      label: 'Verified only',
      onRemove: () => setFilters((p) => ({ ...p, verifiedOnly: false })),
    });
  const trimmedQuery = debouncedQuery.trim();
  if (trimmedQuery)
    activeChips.push({
      key: 'q',
      label: `"${trimmedQuery.slice(0, 12)}${trimmedQuery.length > 12 ? '...' : ''}"`,
      onRemove: () => setQuery(''),
    });

  return (
    <div className="fade-in max-w-7xl mx-auto space-y-8">
      {/* Hero: centered title + search bar + filter pills (design spec) */}
      <section className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-serif text-black mb-4">Find your next place.</h2>
        <p className="text-gray-500 text-sm mb-8">Search by location, amenity, or agency name.</p>
        <div className="max-w-2xl mx-auto w-full relative mb-8">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setFetchKey((k) => k + 1);
              }
            }}
            placeholder="Try '2 Bed in Westlands with Gym'..."
            className="w-full pl-12 pr-14 py-4 bg-white border border-gray-200 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
            aria-label="Search listings"
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <button
              type="button"
              onClick={() => setFetchKey((k) => k + 1)}
              className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors"
              aria-label="Search"
            >
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setFilters((p) => ({ ...p, minPrice: undefined, maxPrice: undefined }))}
            className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold uppercase tracking-wide hover:border-black transition-colors"
          >
            Price Range
          </button>
          <button
            type="button"
            onClick={() => setFilters((p) => ({ ...p, beds: undefined }))}
            className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold uppercase tracking-wide hover:border-black transition-colors"
          >
            Bedrooms
          </button>
          <button
            type="button"
            onClick={() => setFilters((p) => ({ ...p, type: undefined }))}
            className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold uppercase tracking-wide hover:border-black transition-colors"
          >
            Amenities
          </button>
          <button
            type="button"
            onClick={() => setFilters((p) => ({ ...p, verifiedOnly: !p.verifiedOnly }))}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors',
              filters.verifiedOnly
                ? 'bg-black text-white border-black'
                : 'bg-white border-gray-200 hover:border-black'
            )}
          >
            Verified Only
          </button>
        </div>
      </section>

      {/* Compact toolbar: results count, Filters toggle, Sort */}
      <div
        id="filter-bar"
        className="sticky top-0 z-20 flex flex-col gap-3 bg-[#F9FAFB]/95 backdrop-blur-sm -mx-1 px-1 pt-1 pb-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-1">
            <span
              className="text-sm font-medium text-gray-600 whitespace-nowrap"
              aria-live="polite"
            >
              {loading
                ? '…'
                : `${visibleItems.length} result${visibleItems.length !== 1 ? 's' : ''}`}
            </span>
            <div className="flex items-center gap-2" aria-hidden />
            <div className="relative hidden sm:block flex-1 max-w-[240px]">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setFetchKey((k) => k + 1);
                  }
                }}
                placeholder="Search keyword..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                aria-label="Sticky search listings"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
            <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-3 sm:px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors',
                  filtersOpen
                    ? 'bg-black text-white border-black'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                )}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden />
                <span className="hidden xs:inline">Filters</span>
                {activeChips.length > 0 && (
                  <span
                    className={cn(
                      'min-w-[1.25rem] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold',
                      filtersOpen ? 'bg-white/20' : 'bg-gray-200 text-gray-700'
                    )}
                  >
                    {activeChips.length}
                  </span>
                )}
                {filtersOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveSearch}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:border-gray-400 hover:text-gray-800 transition-colors bg-white"
                title="Save this search"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Save</span>
              </button>

              {compareIds.length >= 2 && (
                <button
                  type="button"
                  onClick={() => setCompareOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">({compareIds.length})</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-[10px] sm:text-xs font-semibold text-gray-700 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="recommended">Recom.</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
              </select>

              <div className="flex bg-gray-100 rounded-xl p-0.5">
                <button
                  type="button"
                  className={cn(
                    'px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-all',
                    viewMode === 'list'
                      ? 'bg-white shadow-sm text-black'
                      : 'text-gray-500 hover:text-black'
                  )}
                  onClick={() => setViewMode('list')}
                >
                  List
                </button>
                <button
                  type="button"
                  className={cn(
                    'px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-all',
                    viewMode === 'map'
                      ? 'bg-white shadow-sm text-black'
                      : 'text-gray-500 hover:text-black'
                  )}
                  onClick={() => setViewMode('map')}
                >
                  Map
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active filter chips — always visible when any are set */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="rounded-full p-0.5 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  aria-label={`Remove ${chip.label} filter`}
                >
                  <X className="w-3 h-3" aria-hidden />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-gray-500 hover:text-black underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Expandable filters panel */}
        <div
          id="explore-filters-panel"
          role="region"
          aria-label="Search and filters"
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out',
            filtersOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                  Purpose
                </label>
                <select
                  value={filters.purpose || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      purpose: (e.target.value || undefined) as 'rent' | 'buy' | undefined,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  aria-label="Purpose"
                >
                  <option value="">Any</option>
                  <option value="rent">Rent</option>
                  <option value="buy">Buy</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                  Property type
                </label>
                <select
                  value={filters.type || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, type: e.target.value || undefined }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  aria-label="Property type"
                >
                  <option value="">Any type</option>
                  {propertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              {/* Price Range Slider — replaces two separate number inputs */}
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                  Price range (KES)
                </label>
                <PriceRangeSlider
                  min={0}
                  max={500_000}
                  step={5_000}
                  valueMin={filters.minPrice ?? 0}
                  valueMax={filters.maxPrice ?? 500_000}
                  onChangeMin={(v) =>
                    setFilters((prev) => ({ ...prev, minPrice: v > 0 ? v : undefined }))
                  }
                  onChangeMax={(v) =>
                    setFilters((prev) => ({ ...prev, maxPrice: v < 500_000 ? v : undefined }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                  Bedrooms
                </label>
                <select
                  value={filters.beds ?? ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      beds: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  aria-label="Bedrooms"
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <option key={v} value={v}>
                      {v}+
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                  Bathrooms
                </label>
                <select
                  value={filters.baths ?? ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      baths: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  aria-label="Bathrooms"
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4].map((v) => (
                    <option key={v} value={v}>
                      {v}+
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))
                }
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors',
                  filters.verifiedOnly
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400'
                )}
                aria-pressed={filters.verifiedOnly}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Verified only
              </button>
              <button type="button" disabled className="hidden" />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ml-auto text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black underline"
                >
                  Reset all
                </button>
              )}
            </div>

            {/* Amenities — Kenya-specific (DSQ, borehole, generator, fiber…) */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                Amenities
              </label>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((opt) => {
                  const active = (filters.amenities ?? []).includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => {
                          const existing = prev.amenities ?? [];
                          return {
                            ...prev,
                            amenities: active
                              ? existing.filter((k) => k !== opt.key)
                              : [...existing, opt.key],
                          };
                        })
                      }
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors',
                        active
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400'
                      )}
                      aria-pressed={active}
                    >
                      <span aria-hidden>{opt.icon}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* For You carousel always first */}
      {recommended.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
            <Sparkles className="w-4 h-4 text-amber-600" /> For you (based on your current filters)
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  updateUrlParams({ listing: item.id });
                  setResultMode('recommended');
                }}
                className="rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-black transition-all"
              >
                <div className="w-full h-28 rounded-md overflow-hidden bg-gray-100">
                  <img
                    src={listingThumbUrl(item.imageUrl) || fallbackImage}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-2 line-clamp-1 text-sm font-serif font-semibold text-black">
                  {item.title}
                </div>
                <div className="text-xs font-mono text-gray-600">
                  {formatCompactPrice(item.price, item.currency)}
                  {(item.purpose === 'rent' ||
                    (item.category || '').toLowerCase().includes('rent')) &&
                    ' per month'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Show full results list only when no recommendations to show */}
      {recommended.length === 0 &&
        (loadError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-6 text-center">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Couldn&apos;t load listings.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => setFetchKey((k) => k + 1)}
              className="mt-4 rounded-xl bg-amber-600 text-white px-4 py-2 text-sm font-semibold hover:bg-amber-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <PropertyCardSkeleton key={`explore-loading-${idx}`} variant="compact" />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <EmptyState
            variant="light"
            size="lg"
            illustration="search"
            title="No listings found"
            subtitle={
              hasActiveFilters
                ? "Try adjusting your filters, expanding your search area, or removing 'Verified only'."
                : 'No listings available right now — check back soon.'
            }
            action={
              hasActiveFilters
                ? { label: 'Clear all filters', onClick: resetFilters, variant: 'primary' }
                : undefined
            }
          />
        ) : (
          <div>
            {/* Recently viewed strip */}
            {recentlyViewed.length > 0 && !loading && (
              <div className="mb-6">
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 mb-3">
                  Recently viewed
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                  {recentlyViewed.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/listing/${item.id}`)}
                      className="flex-shrink-0 flex items-center gap-2 border border-zinc-200 rounded-xl bg-white px-3 py-2 hover:border-black transition-all snap-start text-left"
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-800 truncate max-w-[120px]">
                          {item.title}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-400 truncate">
                          {item.neighborhood || item.city || 'Kenya'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div
                ref={listScrollRef}
                className="overflow-auto max-h-[60vh] min-h-[360px] rounded-lg border border-zinc-200 bg-zinc-50/50"
                aria-label="Listing results"
              >
                <div
                  className="relative w-full"
                  style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const i0 = virtualRow.index * 2;
                    const i1 = i0 + 1;
                    const item0 = visibleItems[i0];
                    const item1 = visibleItems[i1];
                    return (
                      <div
                        key={virtualRow.key}
                        className="absolute left-0 top-0 grid w-full gap-4 md:grid-cols-2 pr-2"
                        style={{
                          transform: `translateY(${virtualRow.start}px)`,
                          minHeight: `${virtualRow.size}px`,
                        }}
                      >
                        {item0 ? (
                          <div className="flex flex-col rounded-lg overflow-hidden border border-zinc-200 bg-zeni-surface">
                            <PropertyCard
                              property={item0}
                              variant="compact"
                              isSelected={selectedId === item0.id}
                              onClick={() => {
                                setSelectedId(item0.id);
                                updateUrlParams({ listing: item0.id });
                              }}
                              saved={item0.saved}
                              onSaveToggle={() => handleSaveListing(item0.id)}
                              onContact={() => handleMessage(item0)}
                            />
                            <div className="flex items-center gap-2 border-t border-zinc-100 px-2.5 py-1.5 bg-zinc-50/50">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCompare(item0.id);
                                }}
                                className={cn(
                                  'inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1.5 rounded-lg border transition-colors',
                                  compareIds.includes(item0.id)
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                    : comparing_disabled(compareIds, item0.id)
                                      ? 'border-zinc-200 text-zinc-300 cursor-not-allowed'
                                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'
                                )}
                                disabled={comparing_disabled(compareIds, item0.id)}
                                title={
                                  compareIds.includes(item0.id)
                                    ? 'Remove from compare'
                                    : compareIds.length >= 3
                                      ? 'Max 3 listings'
                                      : 'Add to compare'
                                }
                              >
                                <GitCompare className="w-3 h-3" />
                                {compareIds.includes(item0.id) ? 'Comparing' : 'Compare'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShare(item0);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 hover:border-zeni-foreground hover:text-zeni-foreground transition-colors"
                                aria-label="Share listing"
                                title="Share"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
                              <Button
                                type="button"
                                variant="zeni-primary"
                                size="zeni-sm"
                                className="ml-auto"
                                onClick={() => {
                                  setSelectedId(item0.id);
                                  updateUrlParams({ listing: item0.id });
                                }}
                              >
                                Open
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        {item1 ? (
                          <div className="flex flex-col rounded-lg overflow-hidden border border-zinc-200 bg-zeni-surface">
                            <PropertyCard
                              property={item1}
                              variant="compact"
                              isSelected={selectedId === item1.id}
                              onClick={() => {
                                setSelectedId(item1.id);
                                updateUrlParams({ listing: item1.id });
                              }}
                              saved={item1.saved}
                              onSaveToggle={() => handleSaveListing(item1.id)}
                              onContact={() => handleMessage(item1)}
                            />
                            <div className="flex items-center gap-2 border-t border-zinc-100 px-2.5 py-1.5 bg-zinc-50/50">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCompare(item1.id);
                                }}
                                className={cn(
                                  'inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1.5 rounded-lg border transition-colors',
                                  compareIds.includes(item1.id)
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                    : comparing_disabled(compareIds, item1.id)
                                      ? 'border-zinc-200 text-zinc-300 cursor-not-allowed'
                                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'
                                )}
                                disabled={comparing_disabled(compareIds, item1.id)}
                              >
                                <GitCompare className="w-3 h-3" />
                                {compareIds.includes(item1.id) ? 'Comparing' : 'Compare'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShare(item1);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 hover:border-zeni-foreground hover:text-zeni-foreground transition-colors"
                                aria-label="Share listing"
                                title="Share"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
                              <Button
                                type="button"
                                variant="zeni-primary"
                                size="zeni-sm"
                                className="ml-auto"
                                onClick={() => {
                                  setSelectedId(item1.id);
                                  updateUrlParams({ listing: item1.id });
                                }}
                              >
                                Open
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {viewMode === 'map' && (
                <div className="h-[70vh] min-h-[400px] rounded-lg border border-zinc-200 overflow-hidden relative">
                  <div className="absolute top-4 left-4 z-[400] bg-white rounded-xl shadow-md p-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="search_area"
                      checked={searchThisArea}
                      onChange={(e) => setSearchThisArea(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <label
                      htmlFor="search_area"
                      className="text-sm font-semibold text-gray-800 cursor-pointer"
                    >
                      Search this map area
                    </label>
                  </div>
                  <Suspense fallback={<div className="h-full w-full bg-zinc-100 animate-pulse" />}>
                    <PropertyMap
                      properties={items}
                      selectedId={selectedId}
                      onSelect={(id: string) => {
                        setSelectedId(id);
                        updateUrlParams({ listing: id });
                      }}
                      onBoundsChange={(b: { center: [number, number]; radiusKm: number }) => {
                        if (!searchThisArea) return;
                        // Estimate a basic box from center and radiusKm (1 deg ~ 111km)
                        const degOffset = b.radiusKm / 111;
                        setMapBounds({
                          minLat: b.center[0] - degOffset,
                          maxLat: b.center[0] + degOffset,
                          minLng: b.center[1] - degOffset,
                          maxLng: b.center[1] + degOffset,
                        });
                      }}
                    />
                  </Suspense>
                </div>
              )}

              {recommended.length > 0 && !loadingRecommended && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-600" /> For you (based on your current
                    filters)
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {recommended.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(item.id);
                          updateUrlParams({ listing: item.id });
                        }}
                        className="rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-black transition-all"
                      >
                        <div className="w-full h-28 rounded-md overflow-hidden bg-gray-100">
                          <img
                            src={listingThumbUrl(item.imageUrl) || fallbackImage}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="mt-2 line-clamp-1 text-sm font-serif font-semibold text-black">
                          {item.title}
                        </div>
                        <div className="text-xs font-mono text-gray-600">
                          {formatCompactPrice(item.price, item.currency)}
                          {(item.purpose === 'rent' ||
                            (item.category || '').toLowerCase().includes('rent')) &&
                            ' per month'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

      <CompareModal
        properties={compareProperties}
        onRemove={(id) => setCompareIds((prev) => prev.filter((i) => i !== id))}
        onClose={() => {
          setCompareOpen(false);
        }}
        open={compareOpen}
      />

      <ListingDrawer
        open={Boolean(selectedDetail)}
        property={selectedDetail}
        onClose={() => {
          setSelectedId(null);
          updateUrlParams({ listing: null });
        }}
        onSave={(property) => handleSaveListing(property.id)}
        onMessage={(property) => property && handleMessage(property)}
        onShare={(property) => property && handleShare(property)}
        onBuy={handleBuy}
        onViewingsSubmit={handleViewing}
        isSaved={selectedDetail?.saved}
      />
    </div>
  );
}

/** Helper: should compare button be disabled? (max 3, unless already selected) */
function comparing_disabled(ids: string[], id: string) {
  return ids.length >= 3 && !ids.includes(id);
}
