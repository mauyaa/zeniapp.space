/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { ConversationModel } from '../models/Conversation';
import { ListingModel } from '../models/Listing';
import { SavedListingModel } from '../models/SavedListing';
import { InvoiceModel } from '../models/Invoice';
import { PaymentTransactionModel } from '../models/PaymentTransaction';
import { UserModel } from '../models/User';
import { getIO } from '../socket';
import { payStatuses, txStatuses } from '../utils/constants';

interface ConversationSummary {
  id: string;
  listingId?: string;
  lastMessageAt?: Date;
  unread: number;
  status: string;
  leadStage: string;
}

interface DashboardCounts {
  total: number;
  live: number;
  pending: number;
  archived: number;
}

function unboxValue(value: any, key: string) {
  if (!value) return 0;
  if (typeof value.get === 'function') {
    return Number(value.get(key)) || 0;
  }
  return Number(value[key]) || 0;
}

function mapGroup<T>(
  docs: { _id: string; count: number; amount?: number }[],
  defaults: Record<string, T>
) {
  const result: Record<string, T> = { ...defaults };
  docs.forEach((item) => {
    result[item._id] = (item as any).count ?? (item as any).amount ?? 0;
  });
  return result;
}

export async function getUserDashboardData(userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  const savedCountPromise = SavedListingModel.countDocuments({ userId: uid });
  const conversationsPromise = ConversationModel.find({ userId: uid })
    .sort({ lastMessageAt: -1 })
    .limit(5)
    .select('listingId lastMessageAt unreadCountBy status leadStage')
    .lean();
  const allConversationDocsPromise = ConversationModel.find({ userId: uid })
    .select('unreadCountBy')
    .lean();
  const invoiceAggregatePromise = InvoiceModel.aggregate([
    { $match: { userId: uid } },
    { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
  ]);
  const transactionsPromise = PaymentTransactionModel.aggregate([
    { $match: { userId: uid } },
    { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
  ]);

  const [savedCount, conversations, allConversations, invoiceGroups, transactionGroups] =
    await Promise.all([
      savedCountPromise,
      conversationsPromise,
      allConversationDocsPromise,
      invoiceAggregatePromise,
      transactionsPromise,
    ]);

  const conversationCount = await ConversationModel.countDocuments({ userId: uid });
  const unreadCount = allConversations.reduce(
    (sum, conv) => sum + unboxValue(conv.unreadCountBy, userId),
    0
  );
  const recent: ConversationSummary[] = conversations.map((conv) => ({
    id: String(conv._id),
    listingId: conv.listingId ? String(conv.listingId) : undefined,
    lastMessageAt: conv.lastMessageAt,
    unread: unboxValue(conv.unreadCountBy, userId),
    status: conv.status,
    leadStage: conv.leadStage,
  }));

  const invoiceCounts = mapGroup(
    invoiceGroups,
    payStatuses.reduce((acc, status) => ({ ...acc, [status]: 0 }), {} as Record<string, number>)
  );
  const invoiceTotal = invoiceGroups.reduce((sum, item) => sum + (item.count || 0), 0);

  const transactionCounts = mapGroup(
    transactionGroups,
    txStatuses.reduce((acc, status) => ({ ...acc, [status]: 0 }), {} as Record<string, number>)
  );

  const nextInvoice = await InvoiceModel.findOne({ userId: uid, status: 'unpaid' })
    .sort({ dueDate: 1 })
    .lean();

  return {
    saved: { total: savedCount },
    conversations: {
      total: conversationCount,
      unread: unreadCount,
      recent,
    },
    invoices: {
      total: invoiceTotal,
      counts: invoiceCounts,
      nextDue: nextInvoice?.dueDate ?? null,
    },
    transactions: {
      counts: transactionCounts,
    },
  };
}

export async function getAgentDashboardData(agentId: string) {
  const aid = new mongoose.Types.ObjectId(agentId);
  const listingGroups = await ListingModel.aggregate([
    { $match: { agentId: aid } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const listingCounts: DashboardCounts = {
    total: 0,
    live: 0,
    pending: 0,
    archived: 0,
  };
  listingGroups.forEach((group) => {
    listingCounts.total += group.count;
    if (group._id === 'live') listingCounts.live = group.count;
    if (group._id === 'pending_review') listingCounts.pending = group.count;
    if (group._id === 'archived') listingCounts.archived = group.count;
  });

  const conversationDocs = await ConversationModel.find({ agentId: aid })
    .sort({ lastMessageAt: -1 })
    .limit(5)
    .select('listingId lastMessageAt unreadCountBy leadStage status')
    .lean();
  const allAgentConversations = await ConversationModel.find({ agentId: aid })
    .select('unreadCountBy')
    .lean();
  const unread = allAgentConversations.reduce(
    (sum, conv) => sum + unboxValue(conv.unreadCountBy, agentId),
    0
  );
  const totalConversations = await ConversationModel.countDocuments({ agentId: aid });
  const recentConversations: ConversationSummary[] = conversationDocs.map((conv) => ({
    id: String(conv._id),
    listingId: conv.listingId ? String(conv.listingId) : undefined,
    lastMessageAt: conv.lastMessageAt,
    unread: unboxValue(conv.unreadCountBy, agentId),
    status: conv.status,
    leadStage: conv.leadStage,
  }));

  const newLeads = await ConversationModel.countDocuments({
    agentId: aid,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  });

  const liveListings = listingCounts.live;
  const pipeline = [
    { stage: 'New', count: newLeads },
    { stage: 'Contacted', count: 0 },
    { stage: 'Viewing', count: 0 },
    { stage: 'Offer', count: 0 },
    { stage: 'Closed', count: 0 },
  ];

  return {
    listings: listingCounts,
    conversations: {
      total: totalConversations,
      unread,
      recent: recentConversations,
    },
    kpis: [
      { label: 'Live Listings', value: String(liveListings), tone: 'emerald' },
      { label: 'Pending Review', value: String(listingCounts.pending), tone: 'amber' },
      { label: 'Conversations', value: String(totalConversations), tone: 'blue' },
      { label: 'New Leads', value: String(newLeads), tone: 'purple' },
    ],
    pipeline,
  };
}

export async function getAdminDashboardData() {
  const [users, agents, liveListings, pendingListings, recentAgents, recentListings] =
    await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ role: 'agent' }),
      ListingModel.countDocuments({ status: 'live' }),
      ListingModel.countDocuments({ status: 'pending_review' }),
      UserModel.find({ role: 'agent' })
        .select('name agentVerification status createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      ListingModel.find()
        .select('title price status agentId createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

  const invoiceGroups = await InvoiceModel.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const paidInvoices = invoiceGroups.find((item) => item._id === 'paid')?.count || 0;
  const pendingInvoices = invoiceGroups.find((item) => item._id === 'unpaid')?.count || 0;

  return {
    counts: {
      users,
      agents,
      liveListings,
      pendingListings,
      paidInvoices,
      pendingInvoices,
    },
    recentAgents,
    recentListings,
  };
}

function emitToRoom(room: string, event: string, payload: any) {
  const io = getIO();
  if (io) {
    io.to(room).emit(event, payload);
  }
}

export async function emitUserDashboard(userId: string) {
  const data = await getUserDashboardData(userId);
  emitToRoom(`user:${userId}`, 'dashboard:update', { role: 'user', payload: data });
  return data;
}

export async function emitAgentDashboard(agentId: string) {
  const data = await getAgentDashboardData(agentId);
  emitToRoom(`agent:${agentId}`, 'dashboard:update', { role: 'agent', payload: data });
  return data;
}

export async function emitAdminDashboard() {
  const data = await getAdminDashboardData();
  emitToRoom('role:admin', 'dashboard:update', { role: 'admin', payload: data });
  return data;
}

function safeEmit(handlerName: string, emitter: () => Promise<any>) {
  if (mongoose.connection.readyState !== 1) return;
  emitter().catch((err) => {
    if (
      err &&
      (err.name === 'MongoClientClosedError' || err.constructor?.name === 'MongoClientClosedError')
    ) {
      return;
    }
    console.error(`[Dashboard] ${handlerName} update failed`, err);
  });
}

export function triggerUserDashboard(userId: string) {
  safeEmit(`user:${userId}`, () => emitUserDashboard(userId));
}

export function triggerAgentDashboard(agentId: string) {
  safeEmit(`agent:${agentId}`, () => emitAgentDashboard(agentId));
}

export function triggerAdminDashboard() {
  safeEmit('admin', () => emitAdminDashboard());
}
/* eslint-disable @typescript-eslint/no-explicit-any */
