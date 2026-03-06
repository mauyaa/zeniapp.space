import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, PanInfo, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Bookmark, MapPin, MessageCircle } from 'lucide-react';
import { listingDetailUrl } from '../../lib/cloudinary';
import { formatCurrency } from '../../lib/format';
import type { Property } from '../../utils/mockData';
import { ViewingRequestForm } from './ViewingRequestForm';
import { PropertyMap } from '../PropertyMap';

interface Props {
  open: boolean;
  property: Property | null;
  onClose: () => void;
  onViewingsSubmit?: (payload: { date: string; note?: string }) => Promise<void> | void;
  onSave?: (property: Property) => void;
  onShare?: (property: Property) => void;
  onMessage?: (property: Property) => void;
  /** When user taps "Buy now" / "Pay for property" (for buy or rent) — navigates to pay flow with listing id and price. */
  onBuy?: (property: Property) => void;
  isSaved?: boolean;
}

type DetailTab = 'description' | 'features' | 'map';

export function ListingDrawer({
  open,
  property,
  onClose,
  onViewingsSubmit,
  onSave,
  onMessage,
  onBuy,
  isSaved = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewingFormRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<DetailTab>('description');
  const [showViewingForm, setShowViewingForm] = useState(false);

  const FOCUSABLE_SELECTOR =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  const getFocusables = (container: HTMLElement | null): HTMLElement[] => {
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
    );
  };

  useEffect(() => {
    if (open && containerRef.current) {
      previousActiveRef.current = document.activeElement as HTMLElement | null;
      const focusables = getFocusables(containerRef.current);
      const first = focusables[0];
      if (first) setTimeout(() => first.focus(), 0);
    } else if (!open && previousActiveRef.current) {
      previousActiveRef.current.focus();
      previousActiveRef.current = null;
    }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !containerRef.current) return;
    const focusables = getFocusables(containerRef.current);
    if (!focusables.length) return;
    const current = document.activeElement as HTMLElement;
    const idx = focusables.indexOf(current);
    if (idx === -1) return;
    if (e.shiftKey) {
      if (idx === 0) {
        e.preventDefault();
        focusables[focusables.length - 1].focus();
      }
      return;
    }
    if (idx === focusables.length - 1) {
      e.preventDefault();
      focusables[0].focus();
    }
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setActiveTab('description');
    setShowViewingForm(false);
  }, [open, property?.id]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x > 120 || info.velocity.x > 650) onClose();
    },
    [onClose]
  );

  const openViewingForm = () => {
    setShowViewingForm(true);
    requestAnimationFrame(() => {
      viewingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const mapReady =
    Boolean(property?.location) &&
    Number.isFinite(property?.location?.lat) &&
    Number.isFinite(property?.location?.lng) &&
    (property?.location?.lat ?? 0) !== 0 &&
    (property?.location?.lng ?? 0) !== 0;

  const mapItems = useMemo(() => {
    if (!property || !mapReady) return [];
    return [property];
  }, [property, mapReady]);

  if (!property) return null;

  const heroImage = property.imageUrl
    ? listingDetailUrl(property.imageUrl)
    : 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=60';
  const categoryLabel =
    property.category?.trim() || (property.isVerified ? 'Premium Listing' : 'Listing');
  const locationLabel = [property.location.neighborhood, property.location.city]
    .filter(Boolean)
    .join(', ');
  const isRent =
    property.purpose === 'rent' ||
    (property.currency || '').toLowerCase().includes('mo') ||
    (property.category || '').toLowerCase().includes('rent');
  const priceLabel = `${formatCurrency(property.price, property.currency)}${isRent ? ' per month' : ''}`;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-40 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={containerRef}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 300 }
            }
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            onKeyDown={handleKeyDown}
            className="relative h-full w-full sm:my-auto sm:mr-4 sm:h-[78vh] sm:max-w-[360px] overflow-hidden bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.22)] sm:rounded-[24px] flex flex-col"
          >
            <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="relative">
                <img
                  className="h-[260px] sm:h-[220px] w-full object-cover bg-zinc-100"
                  src={heroImage}
                  alt={property.title}
                />
                <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 w-10 rounded-full border border-white/20 bg-white/90 text-zinc-800 backdrop-blur grid place-items-center shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:bg-white transition-colors"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSave?.(property)}
                    disabled={!onSave}
                    className="h-10 w-10 rounded-full border border-white/20 bg-white/90 text-zinc-800 backdrop-blur grid place-items-center shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:bg-white transition-colors disabled:opacity-60"
                    aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
                  >
                    <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="px-5 py-6">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                  {categoryLabel}
                </span>
                <h2
                  id="drawer-title"
                  className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-zinc-900"
                >
                  {property.title}
                </h2>
                <div className="mt-2 mb-5 flex items-center gap-1.5 text-sm text-zinc-500">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{locationLabel || 'Kenya'}</span>
                </div>

                <div className="mb-5">
                  <div className="text-[20px] font-bold text-zinc-900">{priceLabel}</div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-600 mt-1">
                    {isRent ? 'Monthly rent' : 'Sale price'}
                  </div>
                </div>

                <div className="mb-5 flex items-center justify-between border-y border-zinc-100 py-4">
                  <div>
                    <span className="mb-1 block text-[11px] text-zinc-500">Bedrooms</span>
                    <span className="text-[15px] font-semibold text-zinc-900">
                      {property.features.bedrooms}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-[11px] text-zinc-500">Bathrooms</span>
                    <span className="text-[15px] font-semibold text-zinc-900">
                      {property.features.bathrooms}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-[11px] text-zinc-500">Square Ft</span>
                    <span className="text-[15px] font-semibold text-zinc-900">
                      {property.features.sqm ? property.features.sqm.toLocaleString() : '—'}
                    </span>
                  </div>
                </div>

                <div className="mb-4 flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('description')}
                    className={`text-sm font-semibold transition-colors ${
                      activeTab === 'description'
                        ? 'text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    Description
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('features')}
                    className={`text-sm font-semibold transition-colors ${
                      activeTab === 'features'
                        ? 'text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    Features
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('map')}
                    className={`text-sm font-semibold transition-colors ${
                      activeTab === 'map' ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    Map
                  </button>
                </div>

                {activeTab === 'description' && (
                  <p className="mb-6 text-[14px] leading-relaxed text-zinc-500">
                    {property.description?.trim() ||
                      'Experience elevated living in this thoughtfully designed home with bright natural light, clean finishes, and practical flow for everyday comfort.'}
                  </p>
                )}

                {activeTab === 'features' && (
                  <div className="mb-6 space-y-3">
                    {property.amenities?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {property.amenities.map((amenity) => (
                          <span
                            key={amenity}
                            className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-700"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Spacious layout, natural light, and prime neighborhood access.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'map' && (
                  <div className="mb-6">
                    {mapReady ? (
                      <div className="h-48 overflow-hidden rounded-2xl border border-zinc-200">
                        <PropertyMap
                          properties={mapItems}
                          selectedId={property.id}
                          onSelect={() => null}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Map coordinates are not available for this listing yet.
                      </p>
                    )}
                  </div>
                )}

                {showViewingForm && (
                  <div ref={viewingFormRef} className="pb-4">
                    <ViewingRequestForm onSubmit={onViewingsSubmit} listingTitle={property.title} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-black/[0.03] bg-white/85 px-5 pb-5 pt-4 backdrop-blur-[10px]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onMessage?.(property)}
                  disabled={!onMessage}
                  className="h-12 w-12 rounded-2xl border border-zinc-200 bg-zinc-50 grid place-items-center text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-60"
                  aria-label="Message agent"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={openViewingForm}
                  className="h-12 flex-1 rounded-2xl bg-zinc-900 px-4 text-[15px] font-semibold text-white transition-transform active:scale-[0.99]"
                >
                  Schedule Viewing
                </button>
              </div>
              {onBuy && (property.purpose === 'buy' || property.purpose === 'rent') && (
                <button
                  type="button"
                  onClick={() => onBuy(property)}
                  className="h-12 w-full rounded-2xl bg-emerald-600 px-4 text-[15px] font-semibold text-white hover:bg-emerald-700 transition-colors active:scale-[0.99]"
                >
                  {property.purpose === 'buy' ? 'Buy now — Pay for property' : 'Pay first month'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
