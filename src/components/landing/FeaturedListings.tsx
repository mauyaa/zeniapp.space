import React from 'react';
import { Link } from 'react-router-dom';

// Place listing imagery in /public/landing: listing-1.jpg, listing-2.jpg, listing-3.jpg
const listings = [
  {
    id: 'listing-1',
    price: 'KES 210K / mo',
    location: 'Kilimani',
    image: '/landing/listing-1.jpg',
    badge: 'Verified'
  },
  {
    id: 'listing-2',
    price: 'KES 52M',
    location: 'Riverside',
    image: '/landing/listing-2.jpg',
    badge: 'New'
  },
  {
    id: 'listing-3',
    price: 'KES 135K / mo',
    location: 'Westlands',
    image: '/landing/listing-3.jpg',
    badge: 'Verified'
  }
];

export function FeaturedListings() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted))]">Featured listings</div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-[rgb(var(--text))]">
            Featured listings with verified details.
          </h2>
          <p className="mt-3 text-base text-[rgb(var(--muted))] max-w-xl">
            Illustrative Kenya-area listings. Sign in to explore live inventory on the map.
          </p>
        </div>
        <Link to="/login" className="text-sm text-[rgb(var(--accent))] underline underline-offset-4">
          Request a viewing &rarr;
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="group overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-1"
          >
            <div className="relative h-56 overflow-hidden">
              <img
                src={listing.image}
                alt={listing.location}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
              <span className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/90 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--text))]">
                {listing.badge}
              </span>
              <div className="absolute bottom-4 left-4 text-lg font-light text-white">{listing.price}</div>
            </div>
            <div className="px-5 py-4">
              <div className="text-lg font-semibold text-[rgb(var(--text))]">{listing.location}</div>
              <div className="mt-2 text-sm text-[rgb(var(--muted))]">Illustrative · Kenya area</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
