/**
 * Saved search alerts: for each user with alertsEnabled and not snoozed,
 * run the saved search and send a notification if new listings match.
 * Call from cron or a queue worker (e.g. every 6–24 hours).
 */
import { SavedSearchModel } from '../models/SavedSearch';
import { searchListings } from '../services/listing.service';
import { createNotification } from '../services/notification.service';
import type { ListingSearchQuery } from '../services/listing.service';

const MAX_ALERTS_PER_RUN = 200;

export async function runSavedSearchAlerts(): Promise<{ processed: number; notified: number }> {
  const now = new Date();
  const searches = await SavedSearchModel.find({
    alertsEnabled: true,
    $or: [{ snoozeUntil: { $exists: false } }, { snoozeUntil: null }, { snoozeUntil: { $lt: now } }]
  })
    .limit(MAX_ALERTS_PER_RUN)
    .lean();

  let notified = 0;
  for (const search of searches) {
    try {
      const params = (search.params || {}) as Record<string, unknown>;
      const query: ListingSearchQuery = {
        page: 1,
        limit: 10,
        ...params
      };
      const result = await searchListings(query);
      if (result.items.length > 0) {
        await createNotification(String(search.userId), {
          title: 'New listings match your search',
          description: `${result.items.length} new listing(s) match "${search.name}".`,
          type: 'saved_search',
          actionUrl: `/app/explore?${new URLSearchParams(params as Record<string, string>).toString()}`
        });
        notified++;
      }
    } catch (err) {
      console.error('[savedSearchAlerts]', search._id, err);
    }
  }
  return { processed: searches.length, notified };
}
