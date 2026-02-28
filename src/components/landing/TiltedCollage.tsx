import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { CollageControls } from './CollageControls';

type ListingPreview = {
  badge: 'Verified' | 'New';
  price: string;
  location: string;
  image: string;
};

type CollageSet = {
  mapImage: string;
  listings: ListingPreview[];
};

// Place these images in /public/landing:
// map-preview.jpg, home-1.jpg ... home-9.jpg
const collageSets: CollageSet[] = [
  {
    mapImage: '/landing/map-preview.jpg',
    listings: [
      { badge: 'Verified', price: 'KES 180K / mo', location: 'Kilimani', image: '/landing/home-1.jpg' },
      { badge: 'New', price: 'KES 52M', location: 'Riverside', image: '/landing/home-2.jpg' },
      { badge: 'Verified', price: 'KES 220K / mo', location: 'Westlands', image: '/landing/home-3.jpg' }
    ]
  },
  {
    mapImage: '/landing/map-preview.jpg',
    listings: [
      { badge: 'New', price: 'KES 95K / mo', location: 'Kileleshwa', image: '/landing/home-4.jpg' },
      { badge: 'Verified', price: 'KES 38M', location: 'Lavington', image: '/landing/home-5.jpg' },
      { badge: 'Verified', price: 'KES 310K / mo', location: 'Gigiri', image: '/landing/home-6.jpg' }
    ]
  },
  {
    mapImage: '/landing/map-preview.jpg',
    listings: [
      { badge: 'Verified', price: 'KES 70M', location: 'Runda', image: '/landing/home-7.jpg' },
      { badge: 'New', price: 'KES 140K / mo', location: 'Karen', image: '/landing/home-8.jpg' },
      { badge: 'Verified', price: 'KES 250K / mo', location: 'Kilimani', image: '/landing/home-9.jpg' }
    ]
  }
];

export function TiltedCollage() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const collage = useMemo(() => collageSets[active], [active]);

  const swap = (nextIndex: number) => {
    if (nextIndex === active) return;
    if (reduceMotion) {
      setActive(nextIndex);
      return;
    }
    setVisible(false);
    window.setTimeout(() => {
      setActive(nextIndex);
      setVisible(true);
    }, 180);
  };

  const handlePrev = () => swap((active - 1 + collageSets.length) % collageSets.length);
  const handleNext = () => swap((active + 1) % collageSets.length);

  return (
    <div className="relative">
      <div
        className={clsx(
          'relative min-h-[360px] transition-all duration-500',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        )}
      >
        <div
          className="relative w-[86%] overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
          style={{ transform: reduceMotion ? 'none' : 'rotate(-6deg)' }}
        >
          <div className="flex items-center justify-between px-4 pt-4 text-xs text-[rgb(var(--muted))]">
            <span className="uppercase tracking-[0.2em]">Map preview</span>
            <span className="text-[rgb(var(--accent))]">Sample</span>
          </div>
          <img
            src={collage.mapImage}
            alt="Map preview"
            loading="lazy"
            decoding="async"
            className="h-48 w-full object-cover"
          />
          <div className="border-t border-[rgb(var(--border))] px-4 py-3 text-xs text-[rgb(var(--muted))]">
            <div className="space-y-3">
              {collage.listings.map((listing, index) => (
                <div key={`map-${listing.location}-${index}`} className="space-y-1">
                  <div className="text-sm font-semibold text-[rgb(var(--text))]">{listing.location}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface2))] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--text))]">
                      {listing.badge}
                    </span>
                    <span>{listing.price}</span>
                  </div>
                  <div>Sample listing preview</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {collage.listings.map((listing, index) => {
          const positions = [
            'left-10 top-32',
            'right-2 top-14',
            'left-24 top-56'
          ];
          const rotations = ['rotate(4deg)', 'rotate(-3deg)', 'rotate(2deg)'];
          return (
            <div
              key={`${listing.location}-${index}`}
              className={clsx(
                'absolute w-[58%] sm:w-[46%] bounce-card-trigger',
                positions[index]
              )}
              style={{ transform: reduceMotion ? 'none' : rotations[index] }}
            >
              <div className="bounce-card w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-[0_16px_30px_rgba(15,23,42,0.12)]">
                <div className="relative h-28 overflow-hidden rounded-t-2xl">
                  <img
                    src={listing.image}
                    alt={listing.location}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/90 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--text))]">
                    {listing.badge}
                  </span>
                  <div className="absolute bottom-2 left-3 text-xs text-white">{listing.price}</div>
                </div>
                <div className="px-3 py-3 text-xs text-[rgb(var(--muted))]">
                  <div className="text-sm font-semibold text-[rgb(var(--text))]">{listing.location}</div>
                  <div>Sample listing preview</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-[rgb(var(--muted))]">
        <span>Replace images in /public/landing</span>
        <CollageControls onPrev={handlePrev} onNext={handleNext} />
      </div>
    </div>
  );
}
