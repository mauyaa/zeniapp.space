/* eslint-disable @typescript-eslint/no-explicit-any */
import { ListingModel } from '../models/Listing';
import { SavedListingModel } from '../models/SavedListing';
import { SavedSearchModel } from '../models/SavedSearch';

export async function recommendListings(userId: string, limit = 10) {
  const saved = await SavedListingModel.find({ userId }).select('listingId').lean();
  const savedIds = saved.map((s) => s.listingId);
  const filters: any[] = [];
  if (savedIds.length) {
    filters.push({ _id: { $in: savedIds } });
    const savedDocs = await ListingModel.find({ _id: { $in: savedIds } })
      .select('price location.city purpose')
      .lean();
    const cities = Array.from(new Set(savedDocs.map((d: any) => d.location?.city).filter(Boolean)));
    if (cities.length) filters.push({ 'location.city': { $in: cities } });
    const purposes = Array.from(new Set(savedDocs.map((d: any) => d.purpose).filter(Boolean)));
    if (purposes.length) filters.push({ purpose: { $in: purposes } });
    const prices = savedDocs.map((d: any) => d.price).filter(Boolean);
    if (prices.length) {
      const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      filters.push({ price: { $gte: avg * 0.8, $lte: avg * 1.2 } });
    }
  } else {
    const searches = await SavedSearchModel.find({ userId }).select('params').lean();
    const cities = Array.from(
      new Set(searches.map((s: any) => (s.params || {}).city).filter(Boolean))
    );
    if (cities.length) filters.push({ 'location.city': { $in: cities } });
  }

  const baseFilter: any = {
    status: 'live',
    $or: [
      { availabilityStatus: { $exists: false } },
      { availabilityStatus: { $in: ['available', 'under_offer'] } },
    ],
  };
  const finalFilter = filters.length ? { $and: [baseFilter, { $or: filters }] } : baseFilter;

  const items = await ListingModel.find(finalFilter)
    .select('_id title price currency purpose status verified images location agentId')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return items.map((l: any) => ({
    id: String(l._id),
    title: l.title,
    price: l.price,
    currency: l.currency,
    status: l.status,
    verified: l.verified,
    purpose: l.purpose,
    imageUrl: l.images?.find((img: any) => img.isPrimary)?.url || l.images?.[0]?.url || '',
    location: l.location,
    agentId: l.agentId,
  }));
}
