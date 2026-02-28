import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchListings, fetchListing, type ListingCard, type ListingSearchParams } from '../../lib/api';
import { formatCompactPrice } from '../../lib/format';
import { PropertyMap } from '../../components/PropertyMap';
import { ListingDrawer } from '../../components/listings/ListingDrawer';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { createViewingRequest, getKycStatus, toggleSaveListing } from '../../lib/api';
import { cacheListingCard, uncacheListingCard } from '../../lib/savedListingsCache';
import { dedupeById, dedupeByKey, dedupeListingsByContent, getListingContentKey } from '../../utils/dedupeById';
import type { Property } from '../../utils/mockData';

const fallbackImage = 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=60';

type PropertyWithMeta = Property & { saved?: boolean };

function toProperty(listing: ListingCard): PropertyWithMeta {
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
      lat: listing.location?.lat ?? 0,
      lng: listing.location?.lng ?? 0
    },
    features: {
      bedrooms: listing.beds ?? 0,
      bathrooms: listing.baths ?? 0,
      sqm: listing.sqm ?? 0
    },
    floorPlans: listing.floorPlans?.map((p) => ({ label: p.label, url: p.url })),
    amenities: listing.amenities,
    catalogueUrl: listing.catalogueUrl,
    isVerified: Boolean(listing.verified),
    imageUrl: listing.imageUrl || listing.agent?.image || fallbackImage,
    agent: {
      name: listing.agent?.name || 'Agent',
      image: listing.agent?.image || fallbackImage
    },
    saved: listing.saved
  };
}

function isValidCoord(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function InventoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { push } = useToast();
  const { startConversation, setActiveConversation } = useChat();
  const [listings, setListings] = useState<PropertyWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PropertyWithMeta | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('Rental');
  const [reduceMotion, setReduceMotion] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const searchPayload = useMemo<ListingSearchParams>(() => ({
    purpose: typeFilter === 'Rental' ? 'rent' : 'buy',
    limit: 24,
    page
  }), [page, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchListings(searchPayload)
      .then((res) => {
        if (cancelled) return;
        const raw = res.items || [];
        const excludeSupport = raw.filter(
          (item) => !/^Zeni Support$/i.test(item.title || '')
        );
        const byId = dedupeById(excludeSupport);
        const byContent = dedupeListingsByContent(byId);
        const next = byContent.map(toProperty);
        setListings((prev) => {
          if (page === 1) return next;
          const existingIds = new Set(prev.map((p) => p.id));
          const newOnly = next.filter((p) => !existingIds.has(p.id));
          const combined = [...prev, ...newOnly];
          return dedupeByKey(combined, (p) => getListingContentKey(p));
        });
        setTotal(res.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) setListings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [searchPayload, page]);

  useEffect(() => {
    document.body.classList.add('loaded');
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const on = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', on);
    return () => {
      mq.removeEventListener('change', on);
      document.body.classList.remove('loaded');
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    const found = listings.find((l) => l.id === selectedId);
    if (found) {
      setSelectedDetail(found);
      return;
    }
    setSelectedDetail(null);
  }, [selectedId, listings]);

  // Sync selection from `?listing=` query param (deep-link from Saved page).
  const selectedFromQuery = searchParams.get('listing');
  useEffect(() => {
    if (selectedFromQuery && selectedFromQuery !== selectedId) {
      setSelectedId(selectedFromQuery);
    }
  }, [selectedFromQuery, selectedId]);

  // If the selected listing isn't in the current list (e.g., different filter/page),
  // fetch it directly so the drawer can still render details.
  useEffect(() => {
    if (!selectedId) return;
    if (listings.some((l) => l.id === selectedId)) return;
    let cancelled = false;
    fetchListing(selectedId)
      .then((data) => {
        if (cancelled || !data) return;
        const property = toProperty(data as ListingCard);
        setListings((prev) => dedupeById([property, ...prev]));
        setSelectedDetail(property);
      })
      .catch(() => {
        /* ignore missing listing; keep UI as-is */
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, listings]);

  const mapItems = useMemo(
    () => listings.filter((l) => isValidCoord(l.location.lat, l.location.lng)),
    [listings]
  );

  const selectListing = useCallback(
    (id: string | null) => {
      if (!id) {
        setSelectedId(null);
        setSelectedDetail(null);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('listing');
          return next;
        });
        return;
      }
      setSelectedId(id);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('listing', id);
        return next;
      });
    },
    [setSearchParams]
  );

  const handleSaveListing = useCallback(async (id: string) => {
    const item = listings.find((l) => l.id === id);
    try {
      const result = await toggleSaveListing(id);
      setListings((prev) => prev.map((i) => (i.id === id ? { ...i, saved: result.saved } : i)));
      if (selectedDetail?.id === id) setSelectedDetail((d) => (d ? { ...d, saved: result.saved } : null));
      if (result.saved && item) {
        cacheListingCard({
          id: item.id,
          title: item.title,
          price: item.price,
          currency: item.currency,
          imageUrl: item.imageUrl,
          location: item.location,
          type: item.type,
          beds: item.features.bedrooms,
          baths: item.features.bathrooms
        }).catch(() => { /* ignore */ });
      } else {
        uncacheListingCard(id).catch(() => { /* ignore */ });
      }
    } catch {
      push({ title: 'Save failed', description: 'Could not update.', tone: 'error' });
    }
  }, [push, selectedDetail, listings]);

  const handleMessage = useCallback(async (property: PropertyWithMeta) => {
    if (!property.agentId) {
      push({ title: 'Missing agent', description: 'No agent assigned.', tone: 'error' });
      return;
    }
    try {
      const conversation = await startConversation(property.id, property.agentId);
      setActiveConversation(conversation.id);
      window.location.href = `/app/messages/${conversation.id}`;
    } catch {
      push({ title: 'Could not start chat', tone: 'error' });
    }
  }, [push, startConversation, setActiveConversation]);

  const handleBuy = useCallback(
    (property: PropertyWithMeta) => {
      const purpose = property.purpose === 'buy' ? 'property_purchase' : 'rent';
      const params = new URLSearchParams({
        purpose,
        referenceId: property.id,
        amount: String(Math.round(property.price))
      });
      navigate(`/pay/payments?${params.toString()}`);
    },
    [navigate]
  );

  const handleViewing = useCallback(async (payload: { date: string; note?: string }) => {
    if (!selectedDetail?.agentId) {
      push({ title: 'Cannot request viewing', tone: 'error' });
      return;
    }
    try {
      const response = await createViewingRequest({
        listingId: selectedDetail.id,
        agentId: selectedDetail.agentId,
        date: payload.date,
        note: payload.note
      });
      const viewingId = response._id || (response as { id?: string }).id;
      if (response.needsViewingFee && response.viewingFeeAmount && viewingId) {
        try {
          const kyc = await getKycStatus();
          if (kyc.status !== 'verified') {
            push({
              title: 'Identity verification required',
              description: 'Verify your identity in your profile to make payments.',
              tone: 'error'
            });
            navigate('/app/profile?kyc=required');
            return;
          }
        } catch {
          push({ title: 'Could not verify identity', description: 'Complete verification in your profile to pay.', tone: 'error' });
          navigate('/app/profile?kyc=required');
          return;
        }
        push({
          title: 'Pay viewing fee',
          description: `KES ${response.viewingFeeAmount} secures your viewing. You'll be redirected to pay.`,
          tone: 'success'
        });
        selectListing(null);
        const params = new URLSearchParams({
          purpose: 'viewing_fee',
          referenceId: String(viewingId),
          amount: String(response.viewingFeeAmount)
        });
        window.location.href = `/pay/payments?${params.toString()}`;
      } else {
        push({ title: 'Viewing requested', tone: 'success' });
      }
    } catch {
      push({ title: 'Request failed', tone: 'error' });
    }
  }, [selectedDetail, push, navigate, selectListing]);

  const loadMore = () => setPage((p) => p + 1);

  return (
    <div className="fade-in text-neutral-900 selection:bg-neutral-900 selection:text-white flex h-full min-h-[520px] overflow-hidden bg-gray-100 rounded-xl">
      <style>{`
        .scroll-pane::-webkit-scrollbar { width: 5px; }
        .scroll-pane::-webkit-scrollbar-track { background: transparent; }
        .scroll-pane::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 3px; }
        .scroll-pane::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
      `}</style>

      <div
        ref={scrollRef}
        className="w-full md:w-[450px] h-full flex flex-col flex-shrink-0 bg-white border-r border-gray-200 shadow-xl overflow-hidden"
        id="scroll-container"
      >
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-serif text-2xl text-black">Available Inventory</h2>
            <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded text-sm font-semibold tabular-nums min-w-[2rem] text-center" title={total > 0 ? `Showing ${listings.length} of ${total}` : undefined}>
              {loading ? '—' : listings.length}
            </span>
          </div>
          <div className="flex gap-2 mt-4">
            <button
  type="button"
  onClick={() => setTypeFilter('Rental')}
  className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-sm transition-colors ${
    typeFilter === 'Rental'
      ? 'bg-green-500 text-white'
      : 'text-gray-500 hover:bg-green-50 hover:text-green-600'
  }`}
>
  Rent
</button>
<button
  type="button"
  onClick={() => setTypeFilter('Residential')}
  className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-sm transition-colors ${
    typeFilter === 'Residential'
      ? 'bg-green-500 text-white'
      : 'text-gray-500 hover:bg-green-50 hover:text-green-600'
  }`}
>
  Buy
</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-pane p-4 space-y-4">
          {loading && listings.length === 0 ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 flex gap-4 animate-pulse">
                  <div className="w-28 h-28 bg-gray-200 rounded-md flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            listings.map((item, index) => {
              const specs = [
                `${item.features.bedrooms} Bed`,
                `${item.features.bathrooms} Bath`,
                item.features.sqm ? `${item.features.sqm} sqm` : item.location?.neighborhood || item.type
              ].filter(Boolean).join(' • ');
              return (
                <button
                  key={item.id}
                  type="button"
                  className="property-card group w-full bg-white border border-gray-200 rounded-lg p-3 hover:border-black transition-all cursor-pointer flex gap-4 text-left"
                  style={!reduceMotion ? { animationDelay: `${index * 0.03}s` } : undefined}
                  onClick={() => selectListing(item.id)}
                  onMouseEnter={() => setHoverId(item.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <div className="w-28 h-28 bg-gray-200 rounded-md overflow-hidden relative flex-shrink-0">
                    <img
                      src={item.imageUrl || fallbackImage}
                      alt={item.title}
                      className="card-img w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {item.isVerified && (
                      <div className="absolute top-1 left-1 bg-white/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-gray-700 rounded">
                        Verified
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <h3 className="font-serif text-lg leading-tight mb-1 group-hover:underline truncate">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2 truncate">{specs}</p>
                    <p className="font-mono text-sm font-bold text-black">
                      {formatCompactPrice(item.price, item.currency)}
                    </p>
                  </div>
                </button>
              );
            })
          )}

          {!loading && listings.length > 0 && listings.length < total && (
            <div className="pt-4">
              <button
                type="button"
                onClick={loadMore}
                className="w-full py-2.5 text-xs font-bold uppercase tracking-widest border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block flex-1 h-full bg-gray-100 border-l border-gray-200 relative min-w-0">
        <div className="absolute inset-0">
          <PropertyMap
            properties={mapItems}
            selectedId={hoverId || selectedId}
            onSelect={(id) => selectListing(id)}
          />
        </div>
        <div className="absolute bottom-12 left-12 right-12 bg-white/90 backdrop-blur p-6 border border-black/5 shadow-xl pointer-events-none">
          <div className="flex justify-between items-end">
            <div>
              <h4 className="font-bold mb-1">Kenya Region</h4>
              <p className="font-mono text-xs text-neutral-500">36.8219° E, 1.2921° S</p>
            </div>
            <div className="flex gap-2">
              <span className="w-8 h-8 border border-black/20 flex items-center justify-center text-xs">+</span>
              <span className="w-8 h-8 border border-black/20 flex items-center justify-center text-xs">−</span>
            </div>
          </div>
        </div>
      </div>

      <ListingDrawer
        open={Boolean(selectedDetail)}
        property={selectedDetail}
        onClose={() => selectListing(null)}
        onSave={(p) => p && handleSaveListing(p.id)}
        onMessage={(p) => p && handleMessage(p)}
        onShare={() => undefined}
        onBuy={handleBuy}
        onViewingsSubmit={handleViewing}
        isSaved={selectedDetail?.saved}
      />
    </div>
  );
}
