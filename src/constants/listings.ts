/** Property types for listings (residential, commercial, land). Keep in sync with server/src/utils/constants.ts listingTypes. */
export const LISTING_TYPES = [
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
] as const;

export type ListingType = (typeof LISTING_TYPES)[number];
