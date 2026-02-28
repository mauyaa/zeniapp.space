import mongoose from 'mongoose';
import { ListingModel } from '../models/Listing';
import { createNotification } from '../services/notification.service';
import { triggerAdminDashboard, triggerAgentDashboard } from '../services/dashboard.service';

/**
 * Sweeps the database for 'live' listings that haven't been updated in 30 days.
 * Pauses them and notifies the agent to verify availability.
 */
export async function runStalenessSweep() {
    console.log('[staleness] Running 30-day listing staleness sweep...');

    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - 30);

    const staleListings = await ListingModel.find({
        status: 'live',
        updatedAt: { $lt: staleThreshold },
    }).select('_id title agentId').lean();

    if (staleListings.length === 0) {
        console.log('[staleness] No stale listings found.');
        return;
    }

    console.log(`[staleness] Found ${staleListings.length} stale listings. Pausing...`);

    // Bulk update to paused
    const ids = staleListings.map(l => l._id);
    await ListingModel.updateMany({ _id: { $in: ids } }, { $set: { status: 'paused' } });

    // Notify each agent
    const agentIds = new Set<string>();

    for (const listing of staleListings) {
        const agentIdStr = String(listing.agentId);
        agentIds.add(agentIdStr);

        await createNotification(agentIdStr, {
            title: 'Listing auto-paused',
            description: `Your listing "${listing.title}" has not been updated in 30 days and was automatically paused. Please verify it is still available and un-pause it.`,
            type: 'system',
            actionUrl: `/agent/listings/${listing._id}/edit`,
        });
    }

    // Trigger cache & dashboard updates once
    const { invalidatePrefix } = await import('../utils/listingCache');
    invalidatePrefix('listing:search');

    agentIds.forEach(id => triggerAgentDashboard(id));
    triggerAdminDashboard();

    console.log(`[staleness] Sweep complete. Paused ${staleListings.length} listings across ${agentIds.size} agents.`);
}

// In production, run this daily at 2AM.
if (require.main === module) {
    // To allow manual runs:
    import('../app') // Initialize mongoose connection
        .then(() => runStalenessSweep())
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
