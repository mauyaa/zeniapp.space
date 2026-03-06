/**
 * Quick, DB-free simulation to prove our geo snapping logic works:
 * - Swap lat/lng when needed
 * - Snap far-away coordinates to the area/city geocode (e.g., Lamu typed as Nairobi)
 * - Fill missing coords with geocoded fallback
 *
 * Run: cd server && npx ts-node scripts/geo-simulation.ts
 */

import { normalizeLocation, geocodeKenya } from '../src/services/listing.service';

type Input = {
  title: string;
  city?: string;
  area?: string;
  coords?: [number, number]; // [lng, lat]
};

const samples: Input[] = [
  {
    title: 'Lamu Beach Villa (coords mistakenly Nairobi)',
    city: 'Lamu',
    area: 'Lamu',
    coords: [36.8219, -1.2921], // Nairobi
  },
  {
    title: 'Langata Apartment (correct)',
    city: 'Nairobi',
    area: 'Langata',
    coords: [36.7683, -1.3627],
  },
  {
    title: 'Malindi Cottage (missing coords)',
    city: 'Malindi',
    area: 'Malindi',
    coords: undefined,
  },
  {
    title: 'Kisumu Bungalow (swapped lat/lng)',
    city: 'Kisumu',
    area: 'Kisumu',
    coords: [-0.0917, 34.7680].reverse() as [number, number], // intentionally swapped
  },
];

function fmtCoords(label: string | undefined, coords?: [number, number]) {
  return `${label ?? '—'}: ${coords ? `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}` : 'none'}`;
}

console.log('Geo simulation — before/after');
console.log('--------------------------------------------');

samples.forEach((s) => {
  const before = {
    type: 'Point' as const,
    coordinates: s.coords,
    city: s.city,
    area: s.area,
  };

  const after = normalizeLocation(before);
  const hint = geocodeKenya(s.area || s.city || '');

  console.log(`\n${s.title}`);
  console.log(`  Hint geocode: ${hint ? `${hint[0]}, ${hint[1]}` : 'none'}`);
  console.log(`  Before: ${fmtCoords(s.area, s.coords)}`);
  console.log(
    `  After : ${fmtCoords(s.area, (after?.coordinates as [number, number] | undefined))}`
  );
});

console.log('\nIf "After" matches the hint for bad/missing coords, snapping works as expected.\n');
