import crypto from 'crypto';
import { SavedListingModel } from '../models/SavedListing';
import { SavedListingShareModel } from '../models/SavedListingShare';
import { ListingModel } from '../models/Listing';

export async function createShareSnapshot(userId: string) {
  const saved = await SavedListingModel.find({ userId }).select('listingId').lean();
  const listingIds = saved.map((s) => s.listingId);
  const token = crypto.randomBytes(10).toString('hex');
  await SavedListingShareModel.findOneAndUpdate(
    { ownerId: userId },
    { ownerId: userId, listingIds, token },
    { upsert: true, new: true }
  );
  return { token, count: listingIds.length };
}

export async function getSharedShortlist(token: string) {
  const share = await SavedListingShareModel.findOne({ token }).lean();
  if (!share) return null;
  const listings = await ListingModel.find({ _id: { $in: share.listingIds } })
    .select('_id title price currency purpose status verified images location')
    .lean();
  return {
    ownerId: share.ownerId,
    listings: listings.map((l) => ({
      id: String(l._id),
      title: l.title,
      price: l.price,
      currency: l.currency,
      status: l.status,
      verified: l.verified,
      imageUrl:
        (Array.isArray(l.images)
          ? (l.images as Array<{ isPrimary?: boolean; url?: string }>).find((i) => i?.isPrimary)?.url ||
            (l.images as Array<{ url?: string }>)[0]?.url
          : '') || '',
      location: l.location
    }))
  };
}
