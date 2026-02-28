import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MapPin, BedDouble, Bath, Maximize2, Heart, FileDown } from 'lucide-react';
import clsx from 'clsx';
import { listingThumbUrl } from '../lib/cloudinary';
import type { Property } from '../utils/mockData';

interface PropertyCardProps {
  property: Property;
  isSelected?: boolean;
  onClick?: () => void;
  saved?: boolean;
  onSaveToggle?: () => void;
  onContact?: () => void;
  loading?: boolean;
  variant?: 'default' | 'compact';
}

function formatPrice(property: Property) {
  const baseCurrency = property.currency.includes('/')
    ? property.currency.split('/')[0]
    : property.currency;
  return `${baseCurrency} ${property.price.toLocaleString()}`;
}

function formatUnit(property: Property) {
  if (property.currency.includes('/')) {
    const unit = property.currency.split('/')[1];
    return unit ? `/${unit}` : '';
  }
  return property.purpose === 'rent' ? '/ mo' : '';
}

function formatLocation(property: Property) {
  const neighborhood = property.location.neighborhood;
  const city = property.location.city;
  return [neighborhood, city].filter(Boolean).join(', ');
}

export function PropertyCard({
  property,
  isSelected,
  onClick,
  saved,
  onSaveToggle,
  onContact,
  loading,
  variant = 'default'
}: PropertyCardProps) {
  const reduceMotion = useReducedMotion();

  if (loading) {
    return <PropertyCardSkeleton />;
  }

  const statusLabel = property.purpose === 'rent' ? 'For Rent' : 'For Sale';
  const isCompact = variant === 'compact';

  return (
    <motion.article
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      className={clsx(
        'group cursor-pointer flex flex-col bg-zeni-surface border border-zinc-200 rounded-lg overflow-hidden transition-shadow duration-300',
        'hover:border-zinc-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
        isSelected && 'ring-2 ring-zeni-foreground border-zeni-foreground'
      )}
      aria-label={`${property.title}, ${formatPrice(property)}`}
    >
      {/* Image block with overlay for badges */}
      <div className="relative w-full aspect-video overflow-hidden bg-zinc-100">
        <img
          src={listingThumbUrl(property.imageUrl)}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-sm bg-zeni-foreground/90 px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-widest text-white">
            {statusLabel}
          </span>
          {property.isVerified && (
            <span className="flex items-center gap-1.5 rounded-sm bg-zeni-surface/95 backdrop-blur-sm border border-zinc-200/80 px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-widest text-zeni-signal-live">
              <span className="zeni-dot-live" />
              Verified
            </span>
          )}
        </div>
        {onSaveToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveToggle();
            }}
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-md bg-zeni-surface/95 backdrop-blur-sm border border-zinc-200/80 text-zinc-600 hover:border-zeni-foreground hover:text-zeni-foreground transition-colors"
            aria-label={saved ? 'Remove from saved' : 'Save listing'}
          >
            <Heart className={clsx('h-4 w-4', saved && 'fill-rose-500 text-rose-500')} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-serif font-semibold text-zeni-foreground leading-tight group-hover:text-zinc-700 transition-colors line-clamp-1">
              {property.title}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-mono text-zinc-500">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{formatLocation(property) || 'Kenya'}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-base font-mono font-semibold text-zeni-foreground">
              {formatPrice(property)}
            </p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{formatUnit(property)}</p>
          </div>
        </div>

        {!isCompact && (
          <>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-zinc-500">
              <span className="flex items-center gap-1.5">
                <BedDouble className="h-3.5 w-3.5 text-zinc-400" />
                {property.features.bedrooms} Beds
              </span>
              <span className="flex items-center gap-1.5">
                <Bath className="h-3.5 w-3.5 text-zinc-400" />
                {property.features.bathrooms} Baths
              </span>
              <span className="flex items-center gap-1.5">
                <Maximize2 className="h-3.5 w-3.5 text-zinc-400" />
                {property.features.sqm} m²
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
              {property.floorPlans?.length ? (
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                  <FileDown className="h-3 w-3" />
                  {property.floorPlans.length} floor plan{property.floorPlans.length !== 1 ? 's' : ''}
                </div>
              ) : (
                <span className="text-[11px] font-mono text-zinc-300">—</span>
              )}
              {onContact && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onContact();
                  }}
                  className="text-[10px] font-mono font-semibold uppercase tracking-widest text-zeni-foreground hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Message agent
                </button>
              )}
              {onClick && !onContact && (
                <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-zeni-foreground">
                  View details
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </motion.article>
  );
}

export function PropertyCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const isCompact = variant === 'compact';
  return (
    <div
      className={clsx(
        'flex bg-zeni-surface border border-zinc-200 rounded-lg overflow-hidden',
        isCompact ? 'flex-row' : 'flex-col'
      )}
    >
      <div className={clsx(
        "zeni-skeleton-shimmer",
        isCompact ? "w-2/5 aspect-[3/2] flex-shrink-0" : "w-full aspect-video"
      )} />
      <div className="flex flex-1 flex-col p-4 gap-2">
        <div className="flex justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-5 zeni-skeleton-shimmer rounded w-3/4" />
            <div className="h-3 zeni-skeleton-shimmer rounded w-1/2" />
          </div>
          <div className="h-5 zeni-skeleton-shimmer rounded w-20" />
        </div>
        <div className="flex gap-4">
          <div className="h-3 zeni-skeleton-shimmer rounded w-16" />
          <div className="h-3 zeni-skeleton-shimmer rounded w-16" />
          <div className="h-3 zeni-skeleton-shimmer rounded w-14" />
        </div>
        <div className="pt-3 border-t border-zinc-100">
          <div className="h-3 zeni-skeleton-shimmer rounded w-24" />
        </div>
      </div>
    </div>
  );
}
