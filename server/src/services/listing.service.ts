/* eslint-disable @typescript-eslint/no-explicit-any */
import { FilterQuery } from 'mongoose';
import { ListingModel, ListingDocument } from '../models/Listing';
import { UserModel } from '../models/User';
import { SavedListingModel } from '../models/SavedListing';
import { LeadModel } from '../models/Lead';
import { buildPagination, PaginationQuery } from '../utils/paginate';
import { getIO } from '../socket';
import {
  get as cacheGet,
  set as cacheSet,
  cacheKey,
  invalidatePrefix,
} from '../utils/listingCache';
import { LISTING_MAX_IMAGES } from '../utils/constants';
import { triggerAdminDashboard, triggerAgentDashboard } from './dashboard.service';
import { createNotification } from './notification.service';

const DEFAULT_CENTER: [number, number] = [-1.2921, 36.8219]; // Nairobi CBD fallback

export interface ListingSearchQuery extends PaginationQuery {
  purpose?: 'rent' | 'buy';
  city?: string;
  area?: string;
  county?: string;
  subCounty?: string;
  q?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  beds?: string | number;
  baths?: string | number;
  type?: string;
  verifiedOnly?: boolean | string;
  availabilityOnly?: boolean | string;
  amenities?: string;
  noCache?: boolean | string;
  lng?: string | number;
  lat?: string | number;
  radiusKm?: string | number;
  minLng?: string | number;
  minLat?: string | number;
  maxLng?: string | number;
  maxLat?: string | number;
  commuteLat?: string | number;
  commuteLng?: string | number;
  commuteMins?: string | number;
}

export interface ListingSearchResult {
  id: string;
  title: string;
  category?: string;
  description?: string;
  price: number;
  currency: string;
  type?: string;
  purpose?: string;
  beds?: number;
  baths?: number;
  sqm?: number;
  amenities?: string[];
  verified: boolean;
  floorPlans?: { label: string; url: string; sizeBytes?: number }[];
  catalogueUrl?: string;
  location: {
    neighborhood?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
  imageUrl?: string;
  agent?: { id: string; name: string };
  availabilityStatus?: string;
  saved?: boolean;
  images?: { url?: string; isPrimary?: boolean }[];
}

function isValidCoordinate(lat?: number, lng?: number) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

function isWithinKenya(lat: number, lng: number) {
  return lat >= -5.2 && lat <= 5.2 && lng >= 33.8 && lng <= 42.4;
}

function geocodeKenya(area?: string): [number, number] | null {
  if (!area) return null;
  const key = area.trim().toLowerCase();
  const table: Record<string, [number, number]> = {
    ngong: [-1.353, 36.669],
    'ngong road': [-1.3, 36.78],
    karen: [-1.3367, 36.7189],
    kajiado: [-1.8537, 36.7766],
    westlands: [-1.2667, 36.8117],
    kilimani: [-1.2921, 36.7842],
    lavington: [-1.2812, 36.7754],
    riverside: [-1.275, 36.8],
    'upper hill': [-1.3004, 36.812],
    parklands: [-1.2648, 36.8147],
    runda: [-1.2185, 36.811],
    nairobi: [-1.2921, 36.8219],
    // Coast & other major towns
    lamu: [-2.2717, 40.902],
    'lamu county': [-2.2717, 40.902],
    'lamu town': [-2.2717, 40.902],
    malindi: [-3.2239, 40.1313],
    kilifi: [-3.6333, 39.85],
    watamu: [-3.3525, 40.0144],
    diani: [-4.2793, 39.592],
    mombasa: [-4.0435, 39.6682],
    kisumu: [-0.0917, 34.768],
    nakuru: [-0.3031, 36.08],
    eldoret: [0.5143, 35.2698],
    naivasha: [-0.7167, 36.431],
    thika: [-1.0381, 37.0738],
    machakos: [-1.5177, 37.2634],
    nyeri: [-0.4167, 36.95],
  };
  return table[key] || null;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371; // Earth radius km
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function normalizeLocation(
  location?: Partial<ListingDocument['location']>
): ListingDocument['location'] | undefined {
  if (!location) return location as ListingDocument['location'] | undefined;
  const coords = Array.isArray(location.coordinates)
    ? location.coordinates.slice(0, 2).map((c: any) => (typeof c === 'number' ? c : Number(c)))
    : [];
  let lng = coords?.[0];
  let lat = coords?.[1];

  if (isValidCoordinate(lat, lng) && !isWithinKenya(lat as number, lng as number)) {
    if (isValidCoordinate(lng, lat) && isWithinKenya(lng as number, lat as number)) {
      const tmp = lat;
      lat = lng;
      lng = tmp;
    }
  }

  const hasValid = isValidCoordinate(lat, lng) && isWithinKenya(lat as number, lng as number);
  const fallback =
    !hasValid &&
    geocodeKenya(
      location.area || location.city || (location as any).subCounty || (location as any).county
    );

  const finalLat = hasValid ? lat : fallback ? fallback[0] : undefined;
  const finalLng = hasValid ? lng : fallback ? fallback[1] : undefined;

  // If coordinates exist but are far from the geocoded hint, snap to the hint (helps fix mis-keyed Lamu vs Nairobi).
  if (hasValid && fallback) {
    const dist = haversineKm([lat as number, lng as number], [fallback[0], fallback[1]]);
    if (dist > 100) {
      // more than 100 km away from expected area: trust text hint
      lat = fallback[0];
      lng = fallback[1];
    }
  }

  const coordinates =
    isValidCoordinate(finalLat, finalLng) && isWithinKenya(finalLat as number, finalLng as number)
      ? [finalLng as number, finalLat as number]
      : coords && coords.length === 2
        ? [coords[0], coords[1]]
        : ([DEFAULT_CENTER[1], DEFAULT_CENTER[0]] as [number, number]); // fallback keeps listing mappable (lng, lat)

  return {
    type: 'Point',
    coordinates: coordinates as [number, number],
    address: location.address,
    city: location.city,
    area: location.area,
    county: (location as any).county,
    subCounty: (location as any).subCounty,
  } as ListingDocument['location'];
}

function mapListingDocument(
  listing: ListingDocument & { agentId?: { _id: string; name?: string } },
  extras?: Partial<Pick<ListingSearchResult, 'saved'>>
): ListingSearchResult {
  const coords = Array.isArray(listing.location?.coordinates)
    ? listing.location.coordinates.map((c: any) => (typeof c === 'number' ? c : Number(c)))
    : [];
  let lat = coords?.[1];
  let lng = coords?.[0];

  const hasValidCoords = isValidCoordinate(lat, lng);
  if (hasValidCoords) {
    // If coordinates fall outside Kenya but swapping fixes it, swap.
    if (!isWithinKenya(lat as number, lng as number)) {
      if (isValidCoordinate(lng, lat) && isWithinKenya(lng as number, lat as number)) {
        const swappedLat = lng;
        const swappedLng = lat;
        lat = swappedLat;
        lng = swappedLng;
      }
    }
  }

  if (!isValidCoordinate(lat, lng) || !isWithinKenya(lat as number, lng as number)) {
    const fallback = geocodeKenya(
      listing.location?.area ||
      listing.location?.city ||
      (listing as any).location?.subCounty ||
      (listing as any).location?.county
    );
    if (fallback) {
      [lat, lng] = fallback;
    }
  }

  // If stored coords are valid but far from the text-based geocode hint, snap to the hint.
  const hint = geocodeKenya(
    listing.location?.area ||
    listing.location?.city ||
    (listing as any).location?.subCounty ||
    (listing as any).location?.county
  );
  if (hint && isValidCoordinate(lat, lng) && isWithinKenya(lat as number, lng as number)) {
    const dist = haversineKm([lat as number, lng as number], hint);
    if (dist > 100) {
      lat = hint[0];
      lng = hint[1];
    }
  }

  if (!isValidCoordinate(lat, lng) || !isWithinKenya(lat as number, lng as number)) {
    // Last-resort fallback so listings without precise geo still appear on the map.
    lat = DEFAULT_CENTER[0];
    lng = DEFAULT_CENTER[1];
  }

  const primaryImage =
    listing.images?.find((img) => img.isPrimary)?.url ||
    listing.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=60';

  return {
    id: String(listing._id),
    title: listing.title,
    category: (listing as any).category,
    description: (listing as any).description,
    price: listing.price,
    currency: listing.currency,
    type: listing.type,
    purpose: listing.purpose,
    beds: listing.beds,
    baths: listing.baths,
    sqm: (listing as any).sqm,
    amenities: (listing as any).amenities,
    verified: listing.verified,
    floorPlans: (listing as any).floorPlans,
    catalogueUrl: (listing as any).catalogueUrl,
    availabilityStatus: (listing as any).availabilityStatus,
    location: {
      neighborhood: listing.location?.area,
      city: listing.location?.city,
      lat,
      lng,
    },
    imageUrl: primaryImage,
    images: (listing.images && listing.images.length > 0
      ? listing.images
      : [{ url: primaryImage }]) as any,
    agent: listing.agentId
      ? {
        id: String((listing as any).agentId?._id || listing.agentId),
        name: (listing as any).agentId?.name,
      }
      : undefined,
    ...extras,
  };
}

// Exported for scripts/tests
export { geocodeKenya, normalizeLocation };

const LISTING_SEARCH_CACHE_PREFIX = 'listing:search';

export async function searchListings(query: ListingSearchQuery) {
  const noCache =
    typeof query.noCache === 'string' ? query.noCache === 'true' : query.noCache === true;
  const key = cacheKey(LISTING_SEARCH_CACHE_PREFIX, query as unknown as Record<string, unknown>);
  const cached = !noCache
    ? cacheGet<{ items: ListingSearchResult[]; total: number; page: number; limit: number }>(key)
    : undefined;
  if (cached) return cached;

  const { page, limit, skip } = buildPagination(query);
  const filter: FilterQuery<ListingDocument> = {
    status: 'live',
    // Exclude support/placeholder listings from inventory and explore (they belong in Messages only)
    title: { $not: /^Zeni Support$/i },
    // Exclude sold/let so they don't appear in listings — they show under "Already bought" / "Already let"
    $or: [
      { availabilityStatus: { $exists: false } },
      { availabilityStatus: { $in: ['available', 'under_offer'] } },
    ],
  };

  if (query.q) {
    filter.$text = { $search: query.q };
  }

  if (query.purpose) filter.purpose = query.purpose;
  if (query.city) filter['location.city'] = query.city;
  if (query.area) filter['location.area'] = query.area;
  if (query.county) filter['location.county'] = query.county;
  if (query.subCounty) filter['location.subCounty'] = query.subCounty;
  const availabilityOnly =
    typeof query.availabilityOnly === 'string'
      ? query.availabilityOnly === 'true'
      : query.availabilityOnly === true;
  if (availabilityOnly) {
    filter.$or = [{ availabilityStatus: { $exists: false } }, { availabilityStatus: 'available' }];
  }

  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  if (query.beds) filter.beds = { $gte: Number(query.beds) };
  if (query.baths) filter.baths = { $gte: Number(query.baths) };
  if (query.type) filter.type = query.type;
  const verifiedOnly =
    typeof query.verifiedOnly === 'string'
      ? query.verifiedOnly === 'true'
      : query.verifiedOnly === true;
  if (verifiedOnly) filter.verified = true;
  if (query.amenities) filter.amenities = { $all: query.amenities.split(',') };

  if (query.lng && query.lat && query.radiusKm) {
    filter.location = {
      $geoWithin: {
        $centerSphere: [[Number(query.lng), Number(query.lat)], Number(query.radiusKm) / 6378.1],
      },
    } as any;
  } else if (query.commuteLat && query.commuteLng && query.commuteMins) {
    const avgSpeedKmh = 30; // rough city speed
    const radiusKm = (Number(query.commuteMins) / 60) * avgSpeedKmh;
    filter.location = {
      $geoWithin: {
        $centerSphere: [[Number(query.commuteLng), Number(query.commuteLat)], radiusKm / 6378.1],
      },
    } as any;
  } else if (
    query.minLng != null &&
    query.minLat != null &&
    query.maxLng != null &&
    query.maxLat != null
  ) {
    const minLng = Number(query.minLng);
    const minLat = Number(query.minLat);
    const maxLng = Number(query.maxLng);
    const maxLat = Number(query.maxLat);
    filter.location = {
      $geoWithin: {
        $box: [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
      },
    } as any;
  }

  // Use projection to select only needed fields for better performance
  const projection = {
    title: 1,
    category: 1,
    description: 1,
    price: 1,
    currency: 1,
    type: 1,
    purpose: 1,
    beds: 1,
    baths: 1,
    sqm: 1,
    amenities: 1,
    verified: 1,
    floorPlans: 1,
    catalogueUrl: 1,
    location: 1,
    images: 1,
    agentId: 1,
    createdAt: 1,
  };

  const [items, total] = await Promise.all([
    ListingModel.find(filter, projection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('agentId', 'name')
      .lean(),
    ListingModel.countDocuments(filter),
  ]);

  const mapped: ListingSearchResult[] = items.map((l) =>
    mapListingDocument(
      l as unknown as ListingDocument & { agentId?: { _id: string; name?: string } }
    )
  );

  const result = { items: mapped, total, page, limit };
  if (!noCache) cacheSet(key, result);
  return result;
}

export function getListing(id: string) {
  return ListingModel.findById(id).populate('agentId', 'name role').lean();
}

export async function getListingResponse(id: string, userId?: string) {
  const listing = await ListingModel.findById(id).populate('agentId', 'name role').lean();
  if (!listing) return null;
  let saved = false;
  if (userId) {
    saved = Boolean(await SavedListingModel.exists({ userId, listingId: listing._id }));
  }
  return mapListingDocument(
    listing as unknown as ListingDocument & { agentId?: { _id: string; name?: string } },
    { saved }
  );
}

/** Detect possible duplicate listings (same agent or across agents). Returns list of similar listing ids. */
export async function checkSimilarListings(
  agentId: string,
  title: string,
  location: { city?: string; area?: string; coordinates?: [number, number] },
  excludeId?: string
): Promise<{ sameAgent: string[]; crossAgent: string[] }> {
  const normalizedTitle = title.trim().toLowerCase().slice(0, 80);
  const filterSameAgent: FilterQuery<ListingDocument> = {
    agentId,
    status: { $in: ['draft', 'pending_review', 'live'] },
    $or: [
      { title: new RegExp(escapeRegex(normalizedTitle.slice(0, 30)), 'i') },
      { 'location.city': location.city, 'location.area': location.area },
    ],
  };
  if (excludeId) filterSameAgent._id = { $ne: excludeId };
  const sameAgent = await ListingModel.find(filterSameAgent)
    .distinct('_id')
    .then((ids) => ids.map(String));
  const filterCrossAgent: FilterQuery<ListingDocument> = {
    status: 'live',
    $or: [
      { title: new RegExp(escapeRegex(normalizedTitle.slice(0, 30)), 'i') },
      { 'location.city': location.city, 'location.area': location.area },
    ],
  };
  if (excludeId) filterCrossAgent._id = { $ne: excludeId };
  const crossAgent = await ListingModel.find(filterCrossAgent)
    .distinct('_id')
    .then((ids) => ids.map(String));
  return { sameAgent, crossAgent };
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createListing(agentId: string, data: Partial<ListingDocument>) {
  const images = (data.images || []).slice(0, LISTING_MAX_IMAGES);
  const location = normalizeLocation(data.location);
  return ListingModel.create({ ...data, location, images, agentId }).then(async (listing) => {
    invalidatePrefix(LISTING_SEARCH_CACHE_PREFIX);
    triggerAgentDashboard(agentId);
    triggerAdminDashboard();

    // Email agent: listing created
    try {
      const agent = await UserModel.findById(agentId).select('emailOrPhone name').lean();
      const email = agent?.emailOrPhone?.includes('@') ? agent.emailOrPhone : null;
      if (email) {
        const { sendMail, renderBrandEmail } = await import('./email.service');
        const firstName = (agent?.name || '').split(' ')[0] || 'there';
        const area = listing.location?.area || listing.location?.city || '';
        await sendMail(
          email,
          'Listing created — ZENI.',
          renderBrandEmail({
            title: 'Listing created',
            body: `Hi ${firstName},<br/>Your listing <strong>${listing.title}</strong>${area ? ` in ${area}` : ''} has been created successfully and is now ${listing.status === 'live' ? 'live' : 'pending review'}.`,
            ctaLabel: 'View my listings',
            ctaHref: (process.env.APP_URL || 'http://localhost:5173') + '/agent/listings',
          })
        );
      }
    } catch { /* don't block on email failure */ }

    return listing;
  });
}

export async function updateListing(agentId: string, id: string, data: Partial<ListingDocument>) {
  const before = await ListingModel.findOne({ _id: id, agentId }).lean();
  const payload = { ...data };
  if (payload.location) payload.location = normalizeLocation(payload.location);
  if (Array.isArray(payload.images)) payload.images = payload.images.slice(0, LISTING_MAX_IMAGES);
  const listing = await ListingModel.findOneAndUpdate({ _id: id, agentId }, payload, { new: true });
  if (listing) {
    invalidatePrefix(LISTING_SEARCH_CACHE_PREFIX);
    triggerAgentDashboard(agentId);
    triggerAdminDashboard();
    // Notify watchers on price or status change
    const priceChanged = before && data.price !== undefined && data.price !== before.price;
    const statusChanged = before && data.status && data.status !== before.status;
    if (priceChanged || statusChanged) {
      const watchers = await SavedListingModel.find({ listingId: listing._id, alert: true })
        .select('userId')
        .lean();
      if (watchers.length) {
        const { createNotification } = await import('./notification.service');
        await Promise.all(
          watchers.map((w) =>
            createNotification(String(w.userId), {
              title: priceChanged ? 'Price changed' : 'Status changed',
              description: `${listing.title} is now ${priceChanged ? listing.price : listing.status}`,
              type: 'listing',
            })
          )
        );

        // Email watchers about the change
        try {
          const { sendMail, renderBrandEmail } = await import('./email.service');
          const watcherUsers = await UserModel.find({ _id: { $in: watchers.map((w) => w.userId) } })
            .select('emailOrPhone name')
            .lean();
          const changeText = priceChanged
            ? `The price changed to <strong>KES ${listing.price}</strong>`
            : `The status changed to <strong>${listing.status}</strong>`;
          await Promise.all(
            watcherUsers
              .filter((u) => u.emailOrPhone?.includes('@'))
              .map((u) => {
                const firstName = (u.name || '').split(' ')[0] || 'there';
                return sendMail(
                  u.emailOrPhone,
                  `Update on ${listing.title} — ZENI.`,
                  renderBrandEmail({
                    title: priceChanged ? 'Price update' : 'Status update',
                    body: `Hi ${firstName},<br/>A listing you're watching has been updated.<br/><strong>${listing.title}</strong>: ${changeText}.`,
                    ctaLabel: 'View listing',
                    ctaHref: (process.env.APP_URL || 'http://localhost:5173') + `/listing/${listing._id}`,
                  })
                ).catch(() => { });
              })
          );
        } catch { /* don't block on email failure */ }
      }
    }
  }
  return listing;
}

export function deleteListing(agentId: string, id: string) {
  return ListingModel.findOneAndUpdate(
    { _id: id, agentId },
    { status: 'archived' },
    { new: true }
  ).then((listing) => {
    if (listing) {
      invalidatePrefix(LISTING_SEARCH_CACHE_PREFIX);
      triggerAgentDashboard(agentId);
      triggerAdminDashboard();
    }
    return listing;
  });
}

export async function listAgentListings(agentId: string) {
  return ListingModel.find({ agentId, status: { $ne: 'archived' } })
    .sort({ updatedAt: -1 })
    .lean();
}

export async function getAgentListing(agentId: string, id: string) {
  return ListingModel.findOne({ _id: id, agentId }).lean();
}

export async function listSavedListings(userId: string): Promise<ListingSearchResult[]> {
  const saved = await SavedListingModel.find({ userId })
    .select('listingId')
    .sort({ createdAt: -1 })
    .lean();
  if (!saved.length) return [];
  const ids = saved.map((s) => s.listingId);
  const listings = await ListingModel.find({
    _id: { $in: ids },
  })
    .populate('agentId', 'name')
    .lean();
  return listings.map((l) =>
    mapListingDocument(
      l as unknown as ListingDocument & { agentId?: { _id: string; name?: string } },
      { saved: true }
    )
  );
}

export async function saveListing(userId: string, listingId: string) {
  const saved = await SavedListingModel.findOne({ userId, listingId });
  if (saved) {
    await saved.deleteOne();
    const io = getIO();
    if (io) io.to(`user:${userId}`).emit('listing:saved', { listingId, saved: false });
    return { saved: false };
  }
  await SavedListingModel.create({ userId, listingId });
  const io = getIO();
  if (io) io.to(`user:${userId}`).emit('listing:saved', { listingId, saved: true });
  return { saved: true };
}

/** Nightly geo sanity sweep: snap obviously wrong listing coordinates to their area/city geocode. */
export async function runGeoSanitySweep(thresholdKm = 120) {
  const listings = await ListingModel.find({ status: 'live' })
    .select('_id title location area city subCounty county agentId')
    .lean();
  let fixed = 0;
  for (const l of listings) {
    const hint = geocodeKenya(
      (l as any).location?.area ||
      (l as any).area ||
      (l as any).city ||
      (l as any).subCounty ||
      (l as any).county
    );
    if (!hint) continue;
    const coords = Array.isArray((l as any).location?.coordinates)
      ? (l as any).location.coordinates
      : [];
    const lat = coords?.[1];
    const lng = coords?.[0];
    const hasValid = isValidCoordinate(lat, lng) && isWithinKenya(lat as number, lng as number);
    const dist = hasValid ? haversineKm([lat as number, lng as number], hint) : Infinity;
    if (!hasValid || dist > thresholdKm) {
      await ListingModel.findByIdAndUpdate(l._id, {
        $set: { 'location.coordinates': [hint[1], hint[0]] },
      });
      fixed += 1;
      try {
        await createNotification(String((l as any).agentId), {
          title: 'Location corrected',
          description: `We aligned "${(l as any).title || 'Listing'}" to ${hint[0].toFixed(3)}, ${hint[1].toFixed(3)} based on its area.`,
          type: 'listing',
        });
      } catch {
        /* ignore notification failures */
      }
    }
  }
  if (fixed) invalidatePrefix(LISTING_SEARCH_CACHE_PREFIX);

  // Notify admins daily with a summary if anything changed
  if (fixed) {
    const admins = await UserModel.find({ role: 'admin' }).select('_id').lean();
    const summary = `Geo sanity sweep corrected ${fixed} of ${listings.length} live listings.`;
    await Promise.all(
      admins.map((admin) =>
        createNotification(String(admin._id), {
          title: 'Geo sanity sweep',
          description: summary,
          type: 'system',
        }).catch(() => undefined)
      )
    );
  }

  return { scanned: listings.length, fixed };
}

export async function toggleAlert(userId: string, listingId: string) {
  // Use findOneAndUpdate with aggregation pipeline for atomic toggle
  const result = await SavedListingModel.findOneAndUpdate(
    { userId, listingId },
    [
      {
        $set: {
          alert: { $not: { $ifNull: ['$alert', false] } },
          userId: userId,
          listingId: listingId,
        },
      },
    ],
    { upsert: true, new: true }
  );

  const io = getIO();
  if (io) io.to(`user:${userId}`).emit('listing:alert', { listingId, alert: result.alert });
  return { alert: result.alert };
}

export async function recordListingLead(
  listingId: string,
  source: 'whatsapp' | 'message' | 'call',
  userId?: string
) {
  const fullListing = await ListingModel.findById(listingId).select('agentId title location').lean();
  if (!fullListing) throw new Error('Listing not found');

  const lead = await LeadModel.create({
    listingId,
    agentId: fullListing.agentId,
    source,
    userId,
  });

  // Email agent about new inquiry
  try {
    const { sendMail, renderBrandEmail } = await import('./email.service');
    const agent = await UserModel.findById(fullListing.agentId).select('emailOrPhone name').lean();
    const email = agent?.emailOrPhone?.includes('@') ? agent.emailOrPhone : null;
    if (email) {
      const firstName = (agent?.name || '').split(' ')[0] || 'there';
      const sourceLabel = source === 'whatsapp' ? 'WhatsApp' : source === 'call' ? 'phone call' : 'message';
      let inquirerInfo = 'A potential client';
      if (userId) {
        const inquirer = await UserModel.findById(userId).select('name').lean();
        if (inquirer?.name) inquirerInfo = `<strong>${inquirer.name}</strong>`;
      }
      await sendMail(
        email,
        `New inquiry on ${(fullListing as any).title || 'your listing'} — ZENI.`,
        renderBrandEmail({
          title: 'New lead',
          body: `Hi ${firstName},<br/>${inquirerInfo} is interested in <strong>${(fullListing as any).title || 'your listing'}</strong> via ${sourceLabel}. Respond quickly to increase your chances!`,
          ctaLabel: 'View leads',
          ctaHref: (process.env.APP_URL || 'http://localhost:5173') + '/agent/leads',
        })
      );
    }
  } catch { /* don't block on email failure */ }

  return String(lead._id);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
