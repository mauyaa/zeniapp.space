import mongoose from 'mongoose';
import { ListingModel } from '../models/Listing';
import { ViewingRequestModel } from '../models/ViewingRequest';
import { ConversationModel } from '../models/Conversation';
import { UserModel } from '../models/User';
import { AuditLogModel } from '../models/AuditLog';
import { getIO } from '../socket';
import { triggerAgentDashboard, triggerAdminDashboard } from './dashboard.service';
import { createNotification } from './notification.service';

const MONTH_LABELS: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
};

export async function getAgentStats(agentId: string) {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const cutoffStale = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since12m = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const [
    activeListings,
    totalViewings,
    pendingViewings,
    newLeads,
    allLeads,
    leadStageCounts,
    staleListings,
    monthlyLeads
  ] = await Promise.all([
    ListingModel.countDocuments({ agentId, status: 'live' }),
    ViewingRequestModel.countDocuments({ agentId }),
    ViewingRequestModel.countDocuments({ agentId, status: 'requested' }),
    ConversationModel.countDocuments({
      agentId: agentId,
      lastMessageAt: { $gte: since7d }
    }),
    ConversationModel.countDocuments({ agentId }),
    ConversationModel.aggregate([
      { $match: { agentId: new mongoose.Types.ObjectId(agentId) } },
      { $group: { _id: '$leadStage', count: { $sum: 1 } } }
    ]),
    ListingModel.countDocuments({ agentId, status: 'live', createdAt: { $lte: cutoffStale } }),
    ConversationModel.aggregate([
      { $match: { agentId: new mongoose.Types.ObjectId(agentId), createdAt: { $gte: since12m } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])
  ]);

  const leadStageMap = leadStageCounts.reduce<Record<string, number>>((acc, cur: { _id: string; count: number }) => {
    acc[cur._id] = cur.count || 0;
    return acc;
  }, {});

  const viewings = totalViewings;
  const offers = leadStageMap.offer || 0;
  const closed = leadStageMap.closed || 0;

  const leadToViewing = allLeads ? Math.round((viewings / allLeads) * 100) : 0;
  const viewingToOffer = viewings ? Math.round((offers / viewings) * 100) : 0;
  const offerToClose = offers ? Math.round((closed / offers) * 100) : 0;

  const now = new Date();
  const trendMonths: { month: string; label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const found = (monthlyLeads as { _id: { year: number; month: number }; count: number }[]).find(
      (x) => x._id.year === year && x._id.month === month
    );
    trendMonths.push({
      month: key,
      label: MONTH_LABELS[month] || key,
      count: found ? found.count : 0
    });
  }

  return {
    listings: activeListings,
    viewings: totalViewings,
    conversations: allLeads,
    kpis: [
      { label: 'New Leads', value: String(newLeads), tone: 'emerald' },
      { label: 'Pending Viewings', value: String(pendingViewings), tone: 'amber' },
      { label: 'Active Listings', value: String(activeListings), tone: 'purple' }
    ],
    pipeline: [
      { stage: 'New', count: leadStageMap.new ?? 0 },
      { stage: 'Contacted', count: leadStageMap.contacted || 0 },
      { stage: 'Viewing', count: totalViewings },
      { stage: 'Offer', count: offers },
      { stage: 'Closed', count: closed }
    ],
    insights: [
      { label: 'Lead → Viewing', value: `${leadToViewing}%`, hint: `${viewings}/${allLeads || 1} leads` },
      { label: 'Viewing → Offer', value: `${viewingToOffer || 0}%`, hint: `${offers}/${viewings || 1} viewings` },
      { label: 'Offer → Close', value: `${offerToClose || 0}%`, hint: `${closed}/${offers || 1} offers` },
      { label: 'Stale listings', value: String(staleListings), hint: 'Live >30 days' }
    ],
    trend: trendMonths
  };
}

export async function getAgentAvailability(agentId: string) {
  const user = await UserModel.findById(agentId).select('availability');
  return user?.availability || 'active';
}

/**
 * Pause or resume an agent's account.
 * When pausing, archive live listings and remember them to restore on resume.
 */
export async function setAgentAvailability(agentId: string, availability: 'active' | 'paused') {
  const user = await UserModel.findById(agentId);
  if (!user || user.role !== 'agent') throw Object.assign(new Error('Agent not found'), { status: 404 });

  if (availability === user.availability) return user;

  if (availability === 'paused') {
    const liveListings = await ListingModel.find({ agentId, status: 'live' }).select('_id');
    const ids = liveListings.map((l) => l._id);
    if (ids.length) {
      await ListingModel.updateMany({ _id: { $in: ids } }, { status: 'archived' });
      user.autoArchivedListings = ids;
    }
  } else {
    const ids = user.autoArchivedListings || [];
    if (ids.length) {
      await ListingModel.updateMany({ _id: { $in: ids } }, { status: 'live' });
      user.autoArchivedListings = [];
    }
  }

  user.availability = availability;
  await user.save();

  await AuditLogModel.create({
    actorId: agentId,
    actorRole: 'agent',
    action: availability === 'paused' ? 'agent_pause' : 'agent_resume',
    entityType: 'user',
    entityId: agentId,
    after: { availability }
  });

  const io = getIO();
  if (io) {
    io.to(`user:${agentId}`).emit('agent:availability', { availability });
  }
  triggerAgentDashboard(agentId);
  triggerAdminDashboard();

  return user;
}

export async function getPayoutChecklist(agentId: string) {
  const user = await UserModel.findById(agentId).select('agentVerification verificationEvidence');
  if (!user) throw Object.assign(new Error('Agent not found'), { status: 404 });
  const hasKyc = user.agentVerification === 'verified' || (user.verificationEvidence || []).length > 0;
  return {
    items: [
      { id: 'kyc', label: 'Upload KYC/ID documents', done: hasKyc },
      { id: 'bank', label: 'Add payout bank account', done: false },
      { id: 'test', label: 'Run test payout (sandbox)', done: false }
    ]
  };
}

export async function runTestPayout(agentId: string) {
  const ref = `TEST-${Date.now().toString(36)}`;
  await AuditLogModel.create({
    actorId: agentId,
    actorRole: 'agent',
    action: 'payout_test',
    entityType: 'payout',
    entityId: ref,
    after: { amount: 1, currency: 'USD', status: 'simulated' }
  });
  await createNotification(agentId, {
    title: 'Test payout simulated',
    description: `Reference ${ref}`,
    type: 'payout'
  });
  return { status: 'simulated', reference: ref, amount: 1, currency: 'USD' };
}
