/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { ConversationModel, ConversationDocument } from '../models/Conversation';
import { MessageModel, MessageDocument } from '../models/Message';
import { ListingDocument } from '../models/Listing';
import { UserDocument, UserModel } from '../models/User';
import { BlockedUserModel } from '../models/BlockedUser';
import { buildPagination, PaginationQuery } from '../utils/paginate';
import { getIO } from '../socket';
import { env } from '../config/env';
import { triggerAgentDashboard, triggerUserDashboard } from './dashboard.service';
import { createNotification } from './notification.service';

const isValidObjectId = (value: string): boolean => mongoose.Types.ObjectId.isValid(value);

async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const exists = await BlockedUserModel.exists({
    $or: [
      { blockerId, blockedId },
      { blockerId: blockedId, blockedId: blockerId }
    ]
  });
  return Boolean(exists);
}

/**
 * Get or create a conversation. listingId is required for property chats; use null for support/general agent chats (no listing).
 */
export async function getOrCreateConversation(
  listingId: string | null,
  userId: string,
  agentId: string
): Promise<ConversationDocument> {
  const [user, agent] = await Promise.all([
    UserModel.findById(userId, 'role name').lean(),
    UserModel.findById(agentId, 'role name').lean()
  ]);
  if (!user || !agent) {
    const error = new Error('User or agent not found');
    (error as any).status = 404;
    throw error;
  }
  if (agent.role !== 'agent') {
    const error = new Error('Agent id must belong to an agent account');
    (error as any).status = 400;
    throw error;
  }
  if (await isBlocked(userId, agentId)) {
    const error = new Error('Cannot start or continue this conversation');
    (error as any).status = 403;
    (error as any).code = 'BLOCKED';
    throw error;
  }
  const allowedUserRoles = ['user', 'admin'];
  if (user.role === 'agent' && listingId === null) {
    allowedUserRoles.push('agent');
  }
  if (!allowedUserRoles.includes(user.role)) {
    const error = new Error('Only users or admins can start a conversation');
    (error as any).status = 400;
    throw error;
  }

  const listingIdVal = listingId ? new mongoose.Types.ObjectId(listingId) : null;
  const conv = await ConversationModel.findOneAndUpdate(
    { listingId: listingIdVal, userId, agentId },
    { $setOnInsert: { listingId: listingIdVal, userId, agentId } },
    { new: true, upsert: true }
  );
  await emitConversationUpdate(String(conv._id));
  triggerUserDashboard(userId);
  triggerAgentDashboard(agentId);
  return conv;
}

function normalizeId(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
}

function formatPrice(price?: number, currency?: string) {
  if (price === undefined || price === null) return `${currency || 'KES'} 0`;
  return `${currency || 'KES'} ${Number(price).toLocaleString()}`;
}

function buildListingSnapshot(listing?: ListingDocument | null) {
  const fallbackImage =
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=60';
  const locationText =
    listing?.location?.area ||
    listing?.location?.city ||
    listing?.location?.address ||
    'Location';
  const images = listing?.images || [];
  const primary = images.find((img) => img.isPrimary)?.url || images[0]?.url || fallbackImage;

  return {
    title: listing?.title || 'Listing',
    price: formatPrice(listing?.price, listing?.currency),
    locationText,
    thumbUrl: primary
  };
}

function buildAgentSnapshot(agent: UserDocument | null | undefined, agentId: string) {
  return {
    id: agentId,
    name: agent?.name || 'Agent',
    avatarUrl: '',
    verified: agent?.agentVerification === 'verified'
  };
}

function buildUserSnapshot(user: UserDocument | null | undefined, userId: string) {
  return {
    id: userId,
    name: user?.name || 'Buyer',
    avatarUrl: '',
    role: user?.role || 'user'
  };
}

function getUnreadCount(unreadCountBy: any, userId: string): number {
  if (!unreadCountBy) return 0;
  if (typeof unreadCountBy.get === 'function') {
    return Number(unreadCountBy.get(userId) || 0);
  }
  return Number(unreadCountBy[userId] || 0);
}

function isPinned(pinnedBy: any, userId: string): boolean {
  if (!pinnedBy) return false;
  if (typeof pinnedBy.get === 'function') return Boolean(pinnedBy.get(userId));
  return Boolean(pinnedBy[userId]);
}

function isMuted(mutedBy: any, userId: string): boolean {
  if (!mutedBy) return false;
  if (typeof mutedBy.get === 'function') return Boolean(mutedBy.get(userId));
  return Boolean(mutedBy[userId]);
}

let _cachedAgentIds: string[] | null = null;
let _agentIdsCachedAt = 0;
const AGENT_IDS_TTL = 60_000;

async function getCachedAgentIds(): Promise<string[]> {
  const now = Date.now();
  if (_cachedAgentIds && now - _agentIdsCachedAt < AGENT_IDS_TTL) return _cachedAgentIds;
  const users = await UserModel.find({ role: 'agent' }).select('_id').lean();
  _cachedAgentIds = users.map((u) => String(u._id));
  _agentIdsCachedAt = now;
  return _cachedAgentIds;
}

export async function listConversations(userId: string, role?: string) {
  let query: any;
  if (role === 'agent') {
    try {
      const allAgentIds = await getCachedAgentIds();
      const ids = allAgentIds.includes(userId) ? allAgentIds : [...allAgentIds, userId];
      query = { $or: [{ agentId: { $in: ids } }, { userId }] };
    } catch {
      query = { $or: [{ agentId: userId }, { userId }] };
    }
  } else if (role === 'user') {
    query = { userId };
  } else if (role === 'admin') {
    query = {};
  } else {
    query = { $or: [{ userId }, { agentId: userId }] };
  }

  const items = await ConversationModel.find(query)
    .sort({ lastMessageAt: -1 })
    .populate('listingId', 'title price currency location images')
    .populate('agentId', 'name role agentVerification')
    .populate('userId', 'name role')
    .lean();

  const roleFiltered = items.filter((conv: any) => {
    if (role === 'agent') {
      const userRole = conv.userId?.role;
      return !userRole || userRole === 'user' || userRole === 'admin' || (userRole === 'agent' && normalizeId(conv.userId) === userId);
    }
    if (role === 'user') {
      const agentRole = conv.agentId?.role;
      return !agentRole || agentRole === 'agent';
    }
    if (role === 'admin') {
      return true;
    }
    return true;
  });

  const deduped = new Map<string, any>();
  roleFiltered.forEach((conv: any) => {
    const key = `${normalizeId(conv.listingId)}:${normalizeId(conv.userId)}:${normalizeId(conv.agentId)}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, conv);
      return;
    }
    const existingDate = existing.lastMessageAt ? new Date(existing.lastMessageAt).getTime() : 0;
    const currentDate = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;
    if (currentDate >= existingDate) {
      deduped.set(key, conv);
    }
  });

  const formatted = Array.from(deduped.values()).map((conv: any) => formatConversation(conv, userId));

  // Attach last message preview to each conversation in a single bulk query
  try {
    const convIds = formatted.map((c) => new mongoose.Types.ObjectId(c.id));
    if (convIds.length > 0) {
      const lastMessages = await MessageModel.aggregate([
        { $match: { conversationId: { $in: convIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$conversationId', content: { $first: '$content' }, type: { $first: '$type' }, senderType: { $first: '$senderType' } } }
      ]);
      const previewMap = new Map(lastMessages.map((m: any) => [String(m._id), m]));
      formatted.forEach((conv) => {
        const msg = previewMap.get(conv.id);
        if (msg) {
          (conv as any).lastMessagePreview = msg.type === 'text' && typeof msg.content === 'string'
            ? msg.content.slice(0, 80)
            : msg.type === 'attachment' ? 'Sent an attachment' : msg.type;
        }
      });
    }
  } catch {
    // previews are optional — don't fail the list
  }

  return formatted.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function formatConversation(conv: any, forUserId: string) {
  const listing = conv.listingId as ListingDocument | null | undefined;
  const agent = conv.agentId as UserDocument | null | undefined;
  const user = conv.userId as UserDocument | null | undefined;
  const listingIdVal = conv.listingId ? normalizeId(conv.listingId) : null;
  const agentId = normalizeId(conv.agentId);
  const userId = normalizeId(conv.userId);

  return {
    id: normalizeId(conv._id),
    listingId: listingIdVal ?? '',
    agentId,
    userId,
    status: conv.status,
    leadStage: conv.leadStage,
    lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : new Date().toISOString(),
    unreadCount: getUnreadCount(conv.unreadCountBy, forUserId),
    pinned: isPinned(conv.pinnedBy, forUserId),
    muted: isMuted(conv.mutedBy, forUserId),
    createdAt: conv.createdAt ? new Date(conv.createdAt).toISOString() : new Date().toISOString(),
    responseDueAt: buildResponseDue(conv, forUserId),
    listingSnapshot: listing ? buildListingSnapshot(listing) : null,
    agentSnapshot: buildAgentSnapshot(agent, agentId),
    userSnapshot: buildUserSnapshot(user, userId)
  };
}

function buildResponseDue(conv: any, forUserId: string) {
  const unread = getUnreadCount(conv.unreadCountBy, forUserId);
  if (unread === 0) return null;
  const last = conv.lastMessageAt ? new Date(conv.lastMessageAt) : new Date();
  // SLA: respond within 30 minutes to new unread messages
  return new Date(last.getTime() + 30 * 60 * 1000).toISOString();
}

export async function listMessages(
  conversationId: string,
  userId: string,
  query: PaginationQuery,
  role?: string
) {
  const { limit, skip } = buildPagination(query);
  if (!isValidObjectId(conversationId)) return [];
  const conv = await ConversationModel.findById(conversationId).select('userId agentId').lean();
  if (!conv) return [];
  const isParticipant = String(conv.userId) === userId || String(conv.agentId) === userId;
  if (!isParticipant && role !== 'admin' && role !== 'agent') {
    const error = new Error('Access denied');
    (error as any).status = 403;
    throw error;
  }
  const msgs = await MessageModel.find({ conversationId }).sort({ createdAt: 1 }).skip(skip).limit(limit);
  return msgs.map(formatMessage);
}

export async function sendMessage(
  conversationId: string,
  actorId: string,
  actorRole: string,
  type: string,
  content: unknown,
  clientTempId?: string
) {
  if (!isValidObjectId(conversationId)) {
    const error = new Error('Conversation not found');
    (error as any).status = 404;
    throw error;
  }
  
  const conv = await ConversationModel.findById(conversationId);
  if (!conv) {
    const error = new Error('Conversation not found');
    (error as any).status = 404;
    (error as any).code = 'NOT_FOUND';
    throw error;
  }

  const userIdStr = conv.userId?.toString();
  const agentIdStr = conv.agentId?.toString();
  if (userIdStr && agentIdStr && (await isBlocked(userIdStr, agentIdStr))) {
    const error = new Error('Cannot send messages in this conversation');
    (error as any).status = 403;
    (error as any).code = 'BLOCKED';
    throw error;
  }

  const isUserActor = actorId === userIdStr;
  const isAgentActor = actorId === agentIdStr;
  const isStaffOverride = !isUserActor && !isAgentActor && ['admin', 'agent'].includes(actorRole);
  const senderType = (isAgentActor || (isStaffOverride && actorRole !== 'user')) ? 'agent' : 'user';

  if (!isUserActor && !isAgentActor && !isStaffOverride) {
    const error = new Error('Caller is not part of this conversation');
    (error as any).status = 403;
    (error as any).code = 'FORBIDDEN';
    throw error;
  }
  
  if (clientTempId) {
    const existing = await MessageModel.findOne({ conversationId, clientTempId });
    if (existing) return existing;
  }

  const msg = await MessageModel.create({
    conversationId,
    senderType,
    type,
    content,
    status: 'sent',
    ...(clientTempId ? { clientTempId } : {})
  });

  // Side effects — never let these block or fail the message send
  try {
    const otherId = isUserActor ? agentIdStr : userIdStr;
    await ConversationModel.findByIdAndUpdate(conversationId, {
      $set: { lastMessageAt: new Date() },
      $inc: { [`unreadCountBy.${otherId}`]: 1 }
    });
    
    const io = getIO();
    if (io) {
      const targets = [`user:${conv.userId.toString()}`, `user:${conv.agentId.toString()}`];
      targets.forEach((room) => io.to(room).emit('message:new', formatMessage(msg)));
    }
    if (otherId && !isMuted(conv.mutedBy, otherId)) {
      createNotification(otherId, {
        title: 'New message',
        description: type === 'text' ? String(content).slice(0, 80) : type,
        type: 'message'
      }).catch((err) => console.error('[chat] notification failed', err));
    }
    emitConversationUpdate(String(conv._id)).catch(() => {});
    triggerUserDashboard(conv.userId.toString());
    triggerAgentDashboard(conv.agentId.toString());
  } catch (err) {
    console.error('[chat] sendMessage side effects failed', err);
  }

  return msg;
}

export async function markRead(conversationId: string, userId: string): Promise<void> {
  const now = new Date();
  await ConversationModel.findByIdAndUpdate(conversationId, {
    $set: {
      [`unreadCountBy.${userId}`]: 0,
      [`lastReadAtBy.${userId}`]: now
    }
  });
}

export async function updateConversation(
  conversationId: string,
  actorId: string,
  actorRole: string,
  data: Partial<{
    status: ConversationDocument['status'];
    leadStage: ConversationDocument['leadStage'];
    pinned: boolean;
    muted: boolean;
  }>
) {
  if (!isValidObjectId(conversationId)) {
    const error = new Error('Conversation not found');
    (error as any).status = 404;
    throw error;
  }

  const conv = await ConversationModel.findById(conversationId);
  if (!conv) {
    const error = new Error('Conversation not found');
    (error as any).status = 404;
    (error as any).code = 'NOT_FOUND';
    throw error;
  }

  const userIdStr = conv.userId?.toString();
  const agentIdStr = conv.agentId?.toString();
  const isParticipant = actorId === userIdStr || actorId === agentIdStr;
  if (!isParticipant && !['agent', 'admin'].includes(actorRole)) {
    const error = new Error('Caller is not part of this conversation');
    (error as any).status = 403;
    (error as any).code = 'FORBIDDEN';
    throw error;
  }

  const update: any = {};
  if (data.status) update.status = data.status;
  if (data.leadStage) update.leadStage = data.leadStage;
  if (typeof data.pinned === 'boolean') {
    update[`pinnedBy.${actorId}`] = data.pinned;
  }
   if (typeof data.muted === 'boolean') {
    update[`mutedBy.${actorId}`] = data.muted;
  }
  if (!Object.keys(update).length) return formatConversation(conv, actorId);

  const updated = await ConversationModel.findByIdAndUpdate(conversationId, update, { new: true })
    .populate('listingId', 'title price currency location images')
    .populate('agentId', 'name role agentVerification')
    .populate('userId', 'name role')
    .lean();
  if (!updated) return formatConversation(conv, actorId);
  await emitConversationUpdate(String(conv._id));
  return formatConversation(updated, actorId);
}

export function formatMessage(msg: MessageDocument | any) {
  return {
    id: normalizeId(msg._id),
    conversationId: normalizeId(msg.conversationId),
    senderType: msg.senderType,
    type: msg.type,
    content: msg.content,
    createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
    status: msg.status
  };
}

export async function emitConversationUpdate(conversationId: string) {
  const io = getIO();
  if (!io) return;
  const conv = await ConversationModel.findById(conversationId)
    .populate('listingId', 'title price currency location images')
    .populate('agentId', 'name role agentVerification')
    .populate('userId', 'name role')
    .lean();
  if (!conv) return;
  const userId = normalizeId(conv.userId);
  const agentId = normalizeId(conv.agentId);
  io.to(`user:${userId}`).emit('conversation:update', formatConversation(conv, userId));
  io.to(`user:${agentId}`).emit('conversation:update', formatConversation(conv, agentId));
}

export async function getConversationForUser(conversationId: string, userId: string) {
  const conv = await ConversationModel.findById(conversationId)
    .populate('listingId', 'title price currency location images')
    .populate('agentId', 'name role agentVerification')
    .populate('userId', 'name role')
    .lean();
  if (!conv) return null;
  return formatConversation(conv, userId);
}

const DEFAULT_AGENT_PASSWORD = process.env.SEED_PASSWORD || 'ChangeMe123!';

async function ensureSystemAgentAccount(
  name: 'Zeni Support' | 'Zeni Agent' | 'Zeni Admin',
  preferredEmail: string,
  fallbackEmail: string
): Promise<void> {
  const existing = await UserModel.findOne({
    role: 'agent',
    $or: [
      { name: new RegExp(`^${name}$`, 'i') },
      { emailOrPhone: preferredEmail },
      { email: preferredEmail },
      { emailOrPhone: fallbackEmail },
      { email: fallbackEmail }
    ]
  }).select('_id');
  if (existing) return;

  const createWithEmail = async (email: string) => {
    await UserModel.create({
      name,
      emailOrPhone: email,
      email,
      password: DEFAULT_AGENT_PASSWORD,
      role: 'agent',
      status: 'active',
      agentVerification: 'verified'
    });
  };

  try {
    await createWithEmail(preferredEmail);
    console.log(`[chat] Created ${name} user`);
    return;
  } catch (err: any) {
    if (err?.code !== 11000) throw err;
  }

  if (fallbackEmail && fallbackEmail !== preferredEmail) {
    try {
      await createWithEmail(fallbackEmail);
      console.log(`[chat] Created ${name} user (fallback email)`);
      return;
    } catch (err: any) {
      if (err?.code !== 11000) throw err;
    }
  }

  // Last-resort unique system email so chat bootstrap cannot get stuck on collisions.
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  const systemEmail = `${slug}-system-${Date.now()}@zeni.test`;
  await createWithEmail(systemEmail);
  console.log(`[chat] Created ${name} user (system email fallback)`);
}

/**
 * Create Zeni Support, Zeni Agent, and Zeni Admin users in the DB if they don't exist.
 * Called automatically when loading conversations so Messages works without running seed.
 * Never throws - logs and returns on error (e.g. duplicate key).
 */
export async function ensureWelcomeAgentsInDb(): Promise<void> {
  try {
    const supportEmail = env.zeniSupportEmail || 'support@zeni.test';
    const agentEmail = env.zeniAgentEmail || 'agent@zeni.test';
    const adminEmail = env.zeniAdminEmail || 'admin@zeni.test';
    await ensureSystemAgentAccount('Zeni Support', supportEmail, 'support@zeni.test');
    await ensureSystemAgentAccount('Zeni Agent', agentEmail, 'agent@zeni.test');
    await ensureSystemAgentAccount('Zeni Admin', adminEmail, 'admin@zeni.test');
  } catch (err: any) {
    if (err?.code === 11000) {
      console.log('[chat] Zeni Support/Agent/Admin users already exist (duplicate key)');
    } else {
      console.error('[chat] ensureWelcomeAgentsInDb failed', err);
    }
  }
}

async function findZeniSupportAgent(): Promise<{ _id: any; role: string } | null> {
  const supportEmail = env.zeniSupportEmail || 'support@zeni.test';
  let u = await UserModel.findOne({
    role: 'agent',
    $or: [{ emailOrPhone: supportEmail }, { email: supportEmail }]
  })
    .select('_id role')
    .lean();
  if (u) return u as { _id: any; role: string };
  u = await UserModel.findOne({ name: /^Zeni Support$/i, role: 'agent' }).select('_id role').lean();
  return u as { _id: any; role: string } | null;
}

async function findZeniMainAgent(): Promise<{ _id: any; role: string } | null> {
  const agentEmail = env.zeniAgentEmail || 'zeniagent.ke@gmail.com';
  let u = await UserModel.findOne({
    role: 'agent',
    $or: [
      { emailOrPhone: agentEmail },
      { email: agentEmail },
      { emailOrPhone: 'agent@zeni.test' }
    ]
  })
    .select('_id role')
    .lean();
  if (u) return u as { _id: any; role: string };
  u = await UserModel.findOne({ name: /^Zeni Agent$/i, role: 'agent' }).select('_id role').lean();
  if (u) return u as { _id: any; role: string };
  u = await UserModel.findOne({ role: 'agent', agentVerification: 'verified' }).select('_id role').sort({ createdAt: 1 }).lean();
  if (u) return u as { _id: any; role: string };
  u = await UserModel.findOne({ role: 'agent' }).select('_id role').sort({ createdAt: 1 }).lean();
  return u as { _id: any; role: string } | null;
}

async function getSystemAgentIds(): Promise<string[]> {
  const [support, agent, admin] = await Promise.all([
    findZeniSupportAgent(),
    findZeniMainAgent(),
    findZeniAdminAgent()
  ]);
  const ids = new Set<string>();
  if (support) ids.add(String(support._id));
  if (agent) ids.add(String(agent._id));
  if (admin) ids.add(String(admin._id));
  return Array.from(ids);
}

async function findZeniAdminAgent(): Promise<{ _id: any; role: string } | null> {
  const adminEmail = env.zeniAdminEmail || 'admin@zeni.test';
  let u = await UserModel.findOne({
    role: 'agent',
    $or: [
      { emailOrPhone: adminEmail },
      { email: adminEmail }
    ]
  })
    .select('_id role')
    .lean();
  if (u) return u as { _id: any; role: string };
  u = await UserModel.findOne({ name: /^Zeni Admin$/i, role: 'agent' }).select('_id role').lean();
  return u as { _id: any; role: string } | null;
}

/**
 * Create welcome conversations for a new user: Zeni Agent and Zeni Admin only.
 * Called after user registration. Safe to call multiple times (idempotent via getOrCreateConversation).
 */
export async function ensureWelcomeConversations(userId: string): Promise<void> {
  const [agentUser, adminAgent] = await Promise.all([
    findZeniMainAgent(),
    findZeniAdminAgent()
  ]);

  if (!agentUser && !adminAgent) {
    console.warn('[chat] No Zeni Agent or Zeni Admin users in DB. Run seed to create them.');
    return;
  }

  const createdIds = new Set<string>();

  // Zeni Agent conversation
  if (agentUser && agentUser.role === 'agent') {
    const id = String(agentUser._id);
    await getOrCreateConversation(null, userId, id);
    createdIds.add(id);
  }

  // Zeni Admin conversation (skip if same account as Zeni Agent)
  if (adminAgent && adminAgent.role === 'agent') {
    const id = String(adminAgent._id);
    if (!createdIds.has(id)) {
      await getOrCreateConversation(null, userId, id);
    }
  }
}

/**
 * Ensure agent has conversations with Zeni Support and Zeni Admin so they can message them.
 */
export async function ensureAgentSupportConversation(agentUserId: string): Promise<void> {
  const [supportUser, adminAgent] = await Promise.all([
    findZeniSupportAgent(),
    findZeniAdminAgent()
  ]);
  const createdIds = new Set<string>();
  if (supportUser && supportUser.role === 'agent') {
    const id = String(supportUser._id);
    if (id !== agentUserId) {
      await getOrCreateConversation(null, agentUserId, id);
      createdIds.add(id);
    }
  }
  if (adminAgent && adminAgent.role === 'agent') {
    const id = String(adminAgent._id);
    if (id !== agentUserId && !createdIds.has(id)) {
      await getOrCreateConversation(null, agentUserId, id);
    }
  }
}

/**
 * Ensure admin has conversations with Zeni Agent and Zeni Admin (support channel).
 */
export async function ensureAdminZeniAgentConversation(adminUserId: string): Promise<void> {
  const [mainAgent, adminAgent] = await Promise.all([
    findZeniMainAgent(),
    findZeniAdminAgent()
  ]);
  const createdIds = new Set<string>();
  if (mainAgent && mainAgent.role === 'agent') {
    const id = String(mainAgent._id);
    await getOrCreateConversation(null, adminUserId, id);
    createdIds.add(id);
  }
  if (adminAgent && adminAgent.role === 'agent') {
    const id = String(adminAgent._id);
    if (!createdIds.has(id)) {
      await getOrCreateConversation(null, adminUserId, id);
    }
  }
}
