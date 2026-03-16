import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import {
  searchListings,
  getListingResponse,
  createListing,
  updateListing,
  deleteListing,
  listAgentListings,
  getAgentListing,
  listSavedListings,
  saveListing,
  toggleAlert,
  recordListingLead,
} from '../services/listing.service';
import type { ListingSearchQuery, ListingUpsertData } from '../services/listing.service';
import { paginationSchema } from '../utils/validators';

export async function search(req: AuthRequest, res: Response) {
  const querySchema = z
    .object({
      purpose: z.enum(['rent', 'buy']).optional(),
      city: z.string().optional(),
      area: z.string().optional(),
      county: z.string().optional(),
      subCounty: z.string().optional(),
      q: z.string().min(2).max(80).optional(),
      minPrice: z.coerce.number().min(0).optional(),
      maxPrice: z.coerce.number().min(0).optional(),
      beds: z.coerce.number().min(0).optional(),
      baths: z.coerce.number().min(0).optional(),
      type: z.string().optional(),
      verifiedOnly: z.coerce.boolean().optional(),
      availabilityOnly: z.coerce.boolean().optional(),
      amenities: z.string().optional(),
      noCache: z.coerce.boolean().optional(),
      lng: z.coerce.number().optional(),
      lat: z.coerce.number().optional(),
      radiusKm: z.coerce.number().positive().optional(),
      minLng: z.coerce.number().optional(),
      minLat: z.coerce.number().optional(),
      maxLng: z.coerce.number().optional(),
      maxLat: z.coerce.number().optional(),
    })
    .merge(paginationSchema);

  const parsed = querySchema.parse(req.query);
  const result = await searchListings(parsed as ListingSearchQuery);
  // Allow short caching for public search results (30s fresh, 5min stale-while-revalidate)
  if (!req.user) {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
  }
  res.json(result);
}

export async function byId(req: AuthRequest, res: Response) {
  const item = await getListingResponse(req.params.id, req.user?.id);
  if (!item) return res.status(404).json({ code: 'NOT_FOUND', message: 'Listing not found' });
  res.json(item);
}

export async function saveToggle(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const out = await saveListing(userId, req.params.id);
  res.json(out);
}

export async function alertToggle(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const out = await toggleAlert(userId, req.params.id);
  res.json(out);
}

export async function savedList(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const items = await listSavedListings(userId);
  res.json({ items });
}

const listingBody = z.object({
  title: z.string(),
  category: z.string().max(60).optional(),
  description: z.string().optional(),
  price: z.number(),
  currency: z.string().default('KES'),
  purpose: z.enum(['rent', 'buy']).optional(),
  beds: z.number().optional(),
  baths: z.number().optional(),
  sqm: z.number().optional(),
  type: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  floorPlans: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url(),
        sizeBytes: z.number().optional(),
      })
    )
    .optional(),
  catalogueUrl: z.string().url().optional(),
  location: z.object({
    type: z.literal('Point').default('Point'),
    coordinates: z.tuple([z.number(), z.number()]).optional(), // optional: we auto-geocode if missing
    address: z.string().optional(),
    city: z.string().optional(),
    area: z.string().optional(),
    county: z.string().optional(),
    subCounty: z.string().optional(),
  }),
  images: z
    .array(z.object({ url: z.string(), isPrimary: z.boolean().optional() }))
    .max(15)
    .optional(),
  availabilityStatus: z.enum(['available', 'under_offer', 'sold', 'let']).optional(),
});

export async function createAgentListing(req: AuthRequest, res: Response) {
  const body = listingBody.parse(req.body);
  const payload = body as ListingUpsertData;
  const userId = req.user?.id;
  if (req.user?.agentVerification !== 'verified') {
    return res
      .status(403)
      .json({
        code: 'AGENT_UNVERIFIED',
        message: 'Agent verification required to create listings',
      });
  }
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const listing = await createListing(userId, payload);
  res.status(201).json(listing);
}

export async function updateAgentListing(req: AuthRequest, res: Response) {
  const body = listingBody.partial().parse(req.body);
  const payload = body as ListingUpsertData;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const listing = await updateListing(userId, req.params.id, payload);
  if (!listing) return res.status(404).json({ code: 'NOT_FOUND', message: 'Listing not found' });
  res.json(listing);
}

export async function deleteAgentListing(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const listing = await deleteListing(userId, req.params.id);
  if (!listing) return res.status(404).json({ code: 'NOT_FOUND', message: 'Listing not found' });
  res.json(listing);
}

export async function submitAgentListing(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (req.user?.agentVerification !== 'verified') {
    return res
      .status(403)
      .json({
        code: 'AGENT_UNVERIFIED',
        message: 'Agent verification required to submit listings',
      });
  }
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const listing = await updateListing(userId, req.params.id, { status: 'pending_review' });
  if (!listing) return res.status(404).json({ code: 'NOT_FOUND', message: 'Listing not found' });
  res.json(listing);
}

export async function listAgent(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const items = await listAgentListings(userId);
  res.json(items);
}

export async function getAgent(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { id } = z
    .object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') })
    .parse({ id: req.params.id });
  const item = await getAgentListing(userId, id);
  if (!item) return res.status(404).json({ code: 'NOT_FOUND', message: 'Listing not found' });
  res.json(item);
}

export async function recordLead(req: AuthRequest, res: Response) {
  const { id } = z
    .object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') })
    .parse({ id: req.params.id });
  const { source } = z.object({ source: z.enum(['whatsapp', 'message', 'call']) }).parse(req.body);
  const userId = req.user?.id; // Optional

  try {
    const leadId = await recordListingLead(id, source, userId);
    res.status(201).json({ success: true, leadId });
  } catch (err: unknown) {
    if ((err as { message?: string }).message === 'Listing not found') {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Listing not found' });
    }
    throw err;
  }
}
