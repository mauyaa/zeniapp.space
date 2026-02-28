import React, { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, MapPin, AlertTriangle, MessageCircle,
  FileDown, BookOpen, ShieldCheck, Share2, Flag, Phone
} from 'lucide-react';
import { api, fetchListing, toggleSaveListing, type ListingCard } from '../lib/api';
import { listingDetailUrl, listingLqipUrl } from '../lib/cloudinary';
import { useToast } from '../context/ToastContext';
import { useChat } from '../context/ChatContext';
import { Button } from '../components/ui/Button';
import { useListingSEO } from '../hooks/useListingSEO';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { ImageGallery } from '../components/listings/ImageGallery';
import { NeighborhoodTrust } from '../components/listings/NeighborhoodTrust';
import { ReportListingModal } from '../components/listings/ReportListingModal';
import { properties as mockProperties, type Property } from '../utils/mockData';
import { normalizeKenyaLatLng } from '../utils/geo';
import { MortgageCalculator } from '../components/listings/MortgageCalculator';

const PropertyMap = lazy(() =>
  import('../components/PropertyMap').then((m) => ({ default: m.PropertyMap }))
);

type ListingDetail = ListingCard & {
  purpose?: 'rent' | 'buy';
  type?: string;
  amenities?: string[];
  floorPlans?: { url: string; label: string; sizeBytes?: number }[];
  catalogueUrl?: string;
  agent?: { id?: string; name?: string; image?: string; phone?: string };
  verified?: boolean;
  beds?: number;
  baths?: number;
  sqm?: number;
  saved?: boolean;
  images?: { url?: string; isPrimary?: boolean }[];
  updatedAt?: string;
};

function formatPrice(price: number, currency: string, isRent: boolean): string {
  const sym = currency?.startsWith('KES') || currency === 'KES' ? 'KES' : currency || 'KES';
  if (isRent) return `${sym} ${(price / 1000).toFixed(0)}K/mo`;
  if (price >= 1_000_000) return `${sym} ${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `${sym} ${(price / 1_000).toFixed(0)}K`;
  return `${sym} ${price.toLocaleString()}`;
}

function timeAgo(dateStr?: string): string | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days} days ago`;
  if (days < 30) return `Updated ${Math.floor(days / 7)} week${days >= 14 ? 's' : ''} ago`;
  return `Updated ${Math.floor(days / 30)} month${days >= 60 ? 's' : ''} ago`;
}

function mapPropertyToListingDetail(p: Property): ListingDetail {
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    currency: p.currency,
    purpose: p.purpose,
    type: p.type,
    description: p.description,
    location: {
      neighborhood: p.location.neighborhood,
      city: p.location.city,
      lat: p.location.lat,
      lng: p.location.lng,
    },
    beds: p.features?.bedrooms,
    baths: p.features?.bathrooms,
    sqm: p.features?.sqm,
    amenities: p.amenities,
    catalogueUrl: p.catalogueUrl,
    floorPlans: p.floorPlans?.map((f) => ({ label: f.label, url: f.url })),
    verified: p.isVerified,
    imageUrl: p.imageUrl,
    agent: {
      name: p.agent?.name,
      image: p.agent?.image,
    },
  };
}

const AGENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=60';

export function PropertyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { push } = useToast();
  const { startConversation, setActiveConversation } = useChat();
  const { addViewed } = useRecentlyViewed();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) { setLoading(false); setError(true); return; }
    const ac = new AbortController();
    setLoading(true);
    setError(false);
    fetchListing(id, { signal: ac.signal })
      .then((data) => {
        const detail = data as ListingDetail;
        setListing(detail);
        setSaved(detail.saved ?? false);
        // Track recently viewed
        addViewed({
          id: detail.id,
          title: detail.title,
          price: detail.price,
          currency: detail.currency,
          imageUrl: detail.imageUrl,
          neighborhood: detail.location?.neighborhood,
          city: detail.location?.city,
          beds: detail.beds,
          purpose: detail.purpose,
        });
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        const fallback = mockProperties.find((p) => p.id === id);
        if (fallback) {
          const detail = mapPropertyToListingDetail(fallback);
          setListing(detail);
          setSaved(detail.saved ?? false);
          addViewed({
            id: detail.id,
            title: detail.title,
            price: detail.price,
            currency: detail.currency,
            imageUrl: detail.imageUrl,
            neighborhood: detail.location?.neighborhood,
            city: detail.location?.city,
            beds: detail.beds,
            purpose: detail.purpose,
          });
          setError(false);
          return;
        }
        setListing(null);
        setError(true);
        push({ title: 'Not found', description: 'Listing unavailable', tone: 'error' });
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [id, push, addViewed]);

  const onSave = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await toggleSaveListing(id);
      setSaved(res.saved);
      push({
        title: res.saved ? 'Saved' : 'Removed',
        description: res.saved ? 'Added to your favorites' : 'Removed from favorites',
        tone: 'success',
      });
    } catch {
      push({ title: 'Failed', description: 'Could not update favorite', tone: 'error' });
    } finally {
      setSaving(false);
    }
  }, [id, push]);

  const onMessage = useCallback(async () => {
    if (!listing?.agent?.id) {
      push({ title: 'Missing agent', description: 'Cannot start chat without agent id', tone: 'error' });
      return;
    }
    try {
      const conv = await startConversation(listing.id, listing.agent.id);
      setActiveConversation(conv.id);
      navigate(`/app/messages/${conv.id}`);
    } catch {
      push({ title: 'Failed', description: 'Could not start conversation', tone: 'error' });
    }
  }, [listing?.id, listing?.agent?.id, startConversation, setActiveConversation, navigate, push]);

  const onShare = useCallback(async () => {
    const url = window.location.href;
    const text = listing?.title ?? 'Check out this listing on Zeni';
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); return; } catch { /* fallthrough */ }
    }
    // WhatsApp fallback
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    window.open(wa, '_blank', 'noopener');
  }, [listing?.title]);

  const onWhatsApp = useCallback(async () => {
    try {
      if (listing?.id) {
        await api.recordLead(listing.id, 'whatsapp');
      }
    } catch (err) {
      console.error('Lead tracking failed', err);
    }

    const phone = (listing as ListingDetail)?.agent?.phone;
    const message = encodeURIComponent(
      `Hi, I'm interested in your listing: ${listing?.title ?? ''} — ${window.location.href}`
    );
    const waUrl = phone
      ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank', 'noopener');
  }, [listing]);

  const handleBack = useCallback(() => navigate(-1), [navigate]);
  const handleRequestViewing = useCallback(() => {
    if (listing?.id) navigate(`/explore?listing=${listing.id}`);
  }, [listing?.id, navigate]);
  const mapOnSelect = useCallback(() => { }, []);

  const { purpose, isRent, propertyType, locationLine } = useMemo(() => {
    if (!listing) return { purpose: 'buy' as const, isRent: false, propertyType: 'Property', locationLine: '' };
    const p =
      (listing as ListingDetail).purpose ??
      (String((listing as ListingDetail).category || '').toLowerCase().includes('rent') ? 'rent' : 'buy');
    return {
      purpose: p,
      isRent: p === 'rent',
      propertyType: (listing as ListingDetail).type || (listing as ListingDetail).category || 'Property',
      locationLine:
        [listing.location?.neighborhood, listing.location?.city].filter(Boolean).join(', ') || 'Kenya',
    };
  }, [listing]);

  useListingSEO(
    listing
      ? {
        id: listing.id,
        title: listing.title,
        price: listing.price,
        currency: listing.currency,
        imageUrl: listing.imageUrl,
        location: listing.location,
        purpose,
      }
      : null
  );

  // Build full image array from images[] or fall back to imageUrl
  const images: string[] = useMemo(() => {
    if (!listing) return [];
    const extra = (listing as ListingDetail).images;
    if (Array.isArray(extra) && extra.length > 0) {
      return extra.map((img) => listingDetailUrl(img?.url)).filter(Boolean) as string[];
    }
    return listing.imageUrl ? [listingDetailUrl(listing.imageUrl)] : [];
  }, [listing]);

  const priceDisplay = listing ? formatPrice(listing.price, listing.currency || 'KES', isRent) : '';
  const updatedLabel = timeAgo((listing as ListingDetail)?.updatedAt);

  const mapProps: Property[] = useMemo(() => {
    if (!listing || !listing.location) return [];
    const [lat, lng] = normalizeKenyaLatLng(
      listing.location.lat ?? listing.location.coordinates?.[1],
      listing.location.lng ?? listing.location.coordinates?.[0]
    );
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [
      {
        id: listing.id,
        title: listing.title,
        price: listing.price,
        currency: listing.currency,
        purpose,
        type: ((listing as ListingDetail).type as Property['type']) || 'Apartment',
        agentId: listing.agent?.id,
        location: {
          neighborhood: listing.location.neighborhood || '',
          city: listing.location.city || '',
          lat: lat as number,
          lng: lng as number,
        },
        features: {
          bedrooms: listing.beds ?? 0,
          bathrooms: listing.baths ?? 0,
          sqm: listing.sqm ?? 0,
        },
        isVerified: Boolean(listing.verified),
        imageUrl: listing.imageUrl || '',
        agent: {
          name: listing.agent?.name || 'Agent',
          image: listing.agent?.image || AGENT_PLACEHOLDER,
        },
      },
    ];
  }, [listing, purpose]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-200 animate-pulse" aria-hidden />
        <p className="text-sm font-mono text-zinc-500">Loading property…</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center px-4">
        <p className="text-lg font-serif font-semibold text-zinc-900">Listing not found</p>
        <p className="text-sm text-zinc-500">This listing may have been removed or the link is invalid.</p>
        <Link
          to="/explore"
          className="inline-flex items-center justify-center h-11 px-6 text-xs font-mono font-semibold uppercase tracking-widest rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Back to search
        </Link>
      </div>
    );
  }

  const isVerified = Boolean(listing.verified);
  const verificationLabel = isVerified ? 'Verified' : listing.verified === false ? 'Unverified' : 'Pending Verification';
  const neighborhood = listing.location?.neighborhood;

  return (
    <>
      {/* Report modal */}
      <ReportListingModal
        listingId={listing.id}
        listingTitle={listing.title}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 lg:flex-row pb-24 md:pb-8">
        {/* === LEFT COLUMN === */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Back + actions bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm font-mono text-zinc-500 hover:text-zinc-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 rounded-xl"
              aria-label="Back to previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onShare}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded-lg px-3 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Share listing"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
              <button
                onClick={() => setReportOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-red-600 border border-zinc-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                aria-label="Report this listing"
              >
                <Flag className="h-3.5 w-3.5" />
                Report
              </button>
            </div>
          </div>

          <article className="bg-white overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
            {/* Image Gallery */}
            <div className="p-4 pb-0">
              <ImageGallery
                images={images}
                alt={listing.title}
                lqipUrl={(src) => listingLqipUrl(src)}
              />
            </div>

            {/* Trust strip */}
            <div
              className={`mx-4 mt-4 border rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono ${isVerified
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-700'
                : 'bg-amber-50/90 border-amber-200/60 text-amber-700'
                }`}
            >
              <div className="flex items-center gap-2">
                {isVerified ? (
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" aria-hidden />
                ) : (
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden />
                )}
                <span className="font-semibold uppercase tracking-widest">{verificationLabel}</span>
                {isVerified && (
                  <span className="text-emerald-600 normal-case tracking-normal"> — ID &amp; documents checked</span>
                )}
              </div>
              {updatedLabel && (
                <span className="text-zinc-400 ml-4 flex-shrink-0">{updatedLabel}</span>
              )}
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* Title + price */}
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest rounded-md ${isRent ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-white'
                        }`}
                    >
                      {isRent ? 'For Rent' : 'For Sale'}
                    </span>
                    <span className="bg-zinc-100 text-zinc-600 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest rounded-md">
                      {propertyType}
                    </span>
                  </div>
                  <h1 className="text-2xl lg:text-4xl font-serif font-semibold text-zinc-900 leading-tight tracking-tight">
                    {listing.title}
                  </h1>
                  <div className="mt-2 flex items-center gap-2 text-sm font-mono text-zinc-500">
                    <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden />
                    {locationLine}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl lg:text-3xl font-mono font-semibold text-zinc-900">{priceDisplay}</p>
                </div>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-3 gap-4 border border-zinc-200 rounded-xl p-5 bg-zinc-50/50">
                <div className="text-center sm:text-left">
                  <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Beds</div>
                  <p className="text-xl font-mono font-semibold text-zinc-900 mt-1">{listing.beds ?? '—'}</p>
                </div>
                <div className="text-center sm:text-left border-l border-zinc-200">
                  <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Baths</div>
                  <p className="text-xl font-mono font-semibold text-zinc-900 mt-1">{listing.baths ?? '—'}</p>
                </div>
                <div className="text-center sm:text-left border-l border-zinc-200">
                  <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Area</div>
                  <p className="text-xl font-mono font-semibold text-zinc-900 mt-1">
                    {listing.sqm != null ? `${listing.sqm} m²` : '—'}
                  </p>
                </div>
              </div>

              {listing.description?.trim() ? (
                <div className="space-y-2 border-t border-zinc-200 pt-6">
                  <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">Description</h2>
                  <p className="text-zinc-700 leading-relaxed whitespace-pre-line">{listing.description.trim()}</p>
                </div>
              ) : null}

              <p className="text-xs font-mono text-zinc-400 border-l-2 border-zinc-200 pl-3">
                Anti-scam: verify documents, meet at the property, use in-app chat, and never pay cash before
                viewing.
              </p>

              {listing.amenities?.length ? (
                <div className="space-y-3 border-t border-zinc-200 pt-6">
                  <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">Amenities</h2>
                  <div className="flex flex-wrap gap-2">
                    {listing.amenities.map((a: string, idx: number) => (
                      <span
                        key={`${a}-${idx}`}
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-mono text-zinc-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {listing.floorPlans?.length || listing.catalogueUrl ? (
                <div className="space-y-3 border border-zinc-200 rounded-xl p-5 bg-zinc-50/50">
                  <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <FileDown className="h-4 w-4" />
                    Documents
                  </h2>
                  {listing.floorPlans?.map((plan, idx) => (
                    <a
                      key={`${plan.url}-${idx}`}
                      href={plan.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-mono text-zinc-900 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <FileDown className="h-4 w-4 text-zinc-500" />
                        {plan.label}
                      </span>
                      {plan.sizeBytes && (
                        <span className="text-xs text-zinc-400">{Math.round(plan.sizeBytes / 1024)} KB</span>
                      )}
                    </a>
                  ))}
                  {listing.catalogueUrl && (
                    <a
                      href={listing.catalogueUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 text-xs font-mono font-semibold uppercase tracking-widest rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    >
                      <BookOpen className="h-4 w-4" />
                      Open catalogue
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          </article>

          {/* Neighbourhood trust block */}
          <NeighborhoodTrust neighborhood={neighborhood} />

          {/* Map */}
          {mapProps.length > 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
              <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4" />
                Location
              </h2>
              <div className="h-72 overflow-hidden rounded-xl border border-zinc-200">
                <Suspense
                  fallback={
                    <div className="h-full w-full flex items-center justify-center bg-zinc-100 text-zinc-500 text-sm font-mono">
                      Loading map…
                    </div>
                  }
                >
                  <PropertyMap properties={mapProps} selectedId={listing.id} onSelect={mapOnSelect} />
                </Suspense>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
              <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4" />
                Location
              </h2>
              <p className="text-sm text-zinc-500">{locationLine}</p>
            </div>
          )}
        </div>

        {/* === RIGHT SIDEBAR === */}
        <aside className="w-full lg:max-w-[340px] space-y-4">
          {/* Agent card */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-5">
              <img
                src={listing.agent?.image || AGENT_PLACEHOLDER}
                alt={listing.agent?.name || 'Agent'}
                className="h-14 w-14 rounded-xl object-cover border border-zinc-200"
                loading="lazy"
                decoding="async"
              />
              <div>
                <div className="font-serif font-semibold text-zinc-900">{listing.agent?.name || 'Agent'}</div>
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mt-0.5">Listing agent</div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={onMessage}
                variant="zeni-primary"
                size="zeni-md"
                className="w-full"
                leftIcon={<MessageCircle className="h-4 w-4" />}
              >
                Message
              </Button>
              <button
                onClick={onWhatsApp}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1DAA55] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50"
                aria-label="Chat on WhatsApp"
              >
                {/* WhatsApp icon (inline SVG) */}
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Chat on WhatsApp
              </button>
              <div className="flex gap-2">
                <Button
                  onClick={onSave}
                  disabled={saving}
                  variant={saved ? 'zeni-primary' : 'zeni-secondary'}
                  size="zeni-md"
                  className="flex-1"
                >
                  {saved ? 'Saved ♥' : 'Save'}
                </Button>
                <button
                  onClick={handleRequestViewing}
                  className="flex-1 h-11 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                >
                  Book viewing
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs font-mono text-zinc-400">
            Safety: verify documents, meet at the property, keep payments digital. Report suspicious activity from
            the listing.
          </p>

          {/* Mortgage calculator — only for sale listings */}
          {listing.purpose !== 'rent' && listing.price > 0 && (
            <MortgageCalculator price={listing.price} />
          )}

          <Link
            to="/explore"
            className="flex items-center justify-center h-12 px-5 text-xs font-mono font-semibold uppercase tracking-widest rounded-xl w-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Back to search
          </Link>
        </aside>

        {/* === STICKY MOBILE BOTTOM BAR === */}
        <div className="fixed bottom-0 left-0 right-0 z-30 flex gap-2 p-4 bg-white border-t border-zinc-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden">
          <Button
            onClick={onMessage}
            variant="zeni-primary"
            size="md"
            className="flex-1 h-12 rounded-xl"
            leftIcon={<MessageCircle className="h-4 w-4" aria-hidden />}
          >
            Message
          </Button>
          <button
            onClick={onWhatsApp}
            className="flex-1 h-12 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1DAA55] transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50"
            aria-label="Chat on WhatsApp"
          >
            <Phone className="h-4 w-4" aria-hidden />
            WhatsApp
          </button>
          <button
            onClick={handleRequestViewing}
            className="flex-shrink-0 h-12 px-4 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Viewing
          </button>
        </div>
      </div>
    </>
  );
}

export default PropertyDetailsPage;
