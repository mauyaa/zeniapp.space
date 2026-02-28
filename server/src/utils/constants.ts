export const roles = ['user', 'agent', 'admin', 'finance'] as const;
export type Role = (typeof roles)[number];
export const agentStatuses = ['unverified', 'pending', 'verified', 'rejected'] as const;
export const listingStatuses = ['draft', 'pending_review', 'live', 'rejected', 'archived'] as const;
/** Property types for listings (residential, commercial, land). */
export const listingTypes = [
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
  'Other'
] as const;
export type ListingType = (typeof listingTypes)[number];
export const conversationStatuses = ['active', 'scheduled', 'closed'] as const;
export const leadStages = ['new', 'contacted', 'viewing', 'offer', 'closed'] as const;
export const reportCategories = ['scam', 'abuse', 'duplicates', 'spam', 'other'] as const;
export const reportSeverities = ['low', 'medium', 'high'] as const;
export const payStatuses = ['unpaid', 'partial', 'paid', 'overdue', 'cancelled'] as const;
export const txStatuses = ['pending', 'paid', 'failed', 'reversed'] as const;
export const viewingStatuses = [
  'requested',
  'confirmed',
  'declined',
  'completed',
  'canceled',
  'no_show'
] as const;
/** Minimum hours from now before a viewing slot can be requested (EAT). */
export const VIEWING_LEAD_TIME_HOURS = 24;
/** Max confirmed viewings per agent per calendar day. */
export const VIEWING_MAX_PER_AGENT_PER_DAY = 8;
/** Listing media limits. */
export const LISTING_MAX_IMAGES = 15;
export const LISTING_MAX_VIDEOS = 0;
export const LISTING_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const listingAvailabilityStatuses = ['available', 'under_offer', 'sold', 'let'] as const;
export const listingRejectionCodes = ['photo_quality', 'missing_docs', 'policy_violation', 'duplicate', 'other'] as const;

/** EARB (Estate Agents Registration Board) Kenya — portal for manual license verification. */
export const EARB_VERIFY_URL = 'https://earb.go.ke';

