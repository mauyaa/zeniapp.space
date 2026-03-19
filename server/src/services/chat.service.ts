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

const chatLogsInTest =
  process.env.CHAT_DEBUG_IN_TEST === 'true' || process.env.REQUEST_LOG_IN_TEST === 'true';
const shouldLogChat = env.nodeEnv !== 'test' || chatLogsInTest;

const chatLog = (...args: unknown[]) => {
  if (!shouldLogChat) return;
  console.log(...args);
};

const chatError = (...args: unknown[]) => {
  if (!shouldLogChat) return;
  console.error(...args);
};

const isValidObjectId = (value: string): boolean => mongoose.Types.ObjectId.isValid(value);

async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const exists = await BlockedUserModel.exists({
    $or: [
      { blockerId, blockedId },
      { blockerId: blockedId, blockedId: blockerId },
    ],
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
    UserModel.findById(agentId, 'role name').lean(),
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

function normalizeLabel(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getSystemConversationKey(name?: string | null): 'zeni-admin' | 'zeni-agent' | null {
  const normalized = normalizeLabel(name);
  if (
    normalized === 'zeni support' ||
    normalized === 'zeni admin' ||
    normalized === 'zei admin' ||
    normalized === 'support' ||
    normalized === 'admin' ||
    normalized === 'customer support'
  ) {
    return 'zeni-admin';
  }
  if (normalized === 'zeni agent' || normalized === 'demo agent') {
    return 'zeni-agent';
  }
  return null;
}

function getUserSystemConversationKey(name?: string | null): 'zeni-admin' | 'zeni-agent' | null {
  return normalizeLabel(name) === 'agent' ? 'zeni-agent' : getSystemConversationKey(name);
}

async function resolveConversationActorContext(
  conv: { userId?: any; agentId?: any },
  actorId: string,
  actorRole?: string
): Promise<{
  userIdStr: string;
  agentIdStr: string;
  actingParticipantId: string;
  senderType: 'user' | 'agent';
  otherId: string;
} | null> {
  const userIdStr = normalizeId(conv.userId);
  const agentIdStr = normalizeId(conv.agentId);

  if (actorId === userIdStr) {
    return {
      userIdStr,
      agentIdStr,
      actingParticipantId: userIdStr,
      senderType: 'user',
      otherId: agentIdStr,
    };
  }

  if (actorId === agentIdStr) {
    return {
      userIdStr,
      agentIdStr,
      actingParticipantId: agentIdStr,
      senderType: 'agent',
      otherId: userIdStr,
    };
  }

  if (actorRole === 'admin') {
    const adminAccount = await findZeniAdminAccount();
    if (adminAccount && agentIdStr === adminAccount.id) {
      return {
        userIdStr,
        agentIdStr,
        actingParticipantId: agentIdStr,
        senderType: 'agent',
        otherId: userIdStr,
      };
    }
  }

  return null;
}

function shouldIncludeConversationForRole(conv: any, userId: string, role?: string): boolean {
  if (role === 'agent') {
    const userRole = conv.userId?.role;
    if (!userRole || userRole === 'user' || userRole === 'admin') {
      return true;
    }
    return (
      userRole === 'agent' &&
      normalizeId(conv.userId) === userId &&
      getSystemConversationKey(conv.agentId?.name) === 'zeni-admin'
    );
  }

  if (role === 'user') {
    const agentRole = conv.agentId?.role;
    return !agentRole || agentRole === 'agent';
  }

  if (role === 'admin') {
    if (conv.userId?.role === 'user') {
      return getSystemConversationKey(conv.agentId?.name) === 'zeni-admin';
    }
    return (
      conv.userId?.role === 'admin' &&
      normalizeId(conv.userId) === userId &&
      getSystemConversationKey(conv.agentId?.name) !== 'zeni-admin'
    );
  }

  return true;
}

function conversationDedupKey(conv: any, role?: string): string {
  const listingKey = normalizeId(conv.listingId);
  const userKey = normalizeId(conv.userId);
  const agentKey = normalizeId(conv.agentId);
  const systemKey = getSystemConversationKey(conv.agentId?.name);

  if (role === 'user') {
    const userSystemKey = getUserSystemConversationKey(conv.agentId?.name);
    if (userSystemKey) return `user:${userKey}:system:${userSystemKey}`;
    return `user:${userKey}:agent:${agentKey}`;
  }

  if (role === 'agent') {
    const userRole = conv.userId?.role;
    if (userRole === 'user') return `agent:${agentKey}:user:${userKey}`;
    if (userRole === 'admin') {
      return getSystemConversationKey(conv.userId?.name) === 'zeni-admin'
        ? 'system:zeni-admin'
        : `agent:${agentKey}:admin:${userKey}`;
    }
    if (systemKey) return `system:${systemKey}`;
    return `agent:${userKey}:agent:${agentKey}`;
  }

  if (role === 'admin') {
    if (systemKey) return `admin:${userKey}:system:${systemKey}`;
    return `admin:${userKey}:agent:${agentKey}`;
  }

  return `${listingKey}:${userKey}:${agentKey}`;
}

function formatPrice(price?: number, currency?: string) {
  if (price === undefined || price === null) return `${currency || 'KES'} 0`;
  return `${currency || 'KES'} ${Number(price).toLocaleString()}`;
}

function buildListingSnapshot(listing?: ListingDocument | null) {
  const fallbackImage =
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=60';
  const locationText =
    listing?.location?.area || listing?.location?.city || listing?.location?.address || 'Location';
  const images = listing?.images || [];
  const primary = images.find((img) => img.isPrimary)?.url || images[0]?.url || fallbackImage;

  return {
    title: listing?.title || 'Listing',
    price: formatPrice(listing?.price, listing?.currency),
    locationText,
    thumbUrl: primary,
  };
}

function buildAgentSnapshot(agent: UserDocument | null | undefined, agentId: string) {
  return {
    id: agentId,
    name: agent?.name || 'Agent',
    avatarUrl: '',
    verified: agent?.agentVerification === 'verified',
  };
}

function buildUserSnapshot(user: UserDocument | null | undefined, userId: string) {
  return {
    id: userId,
    name: user?.name || 'Buyer',
    avatarUrl: '',
    role: user?.role || 'user',
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

function logChatSideEffectError(scope: string, err: unknown): void {
  if (env.nodeEnv === 'test') {
    const message = err instanceof Error ? err.message : String(err ?? '');
    if (message.includes('MongoClientClosedError') || message.includes('client was closed')) {
      return;
    }
  }
  console.error(`[chat] ${scope}`, err);
}

export async function listConversations(userId: string, role?: string) {
  const adminAccount = role === 'admin' ? await findZeniAdminAccount() : null;
  let query: any;
  if (role === 'agent') {
    // Agents should only see threads they participate in (as the agent or as the user when
    // talking to support/admin). Including every agent's conversations was causing duplicate
    // buyers to appear in the inbox and dashboard widgets.
    query = { $or: [{ agentId: userId }, { userId }] };
  } else if (role === 'user') {
    query = { userId };
  } else if (role === 'admin') {
    query = {
      $or: [{ agentId: userId }, { userId }, ...(adminAccount ? [{ agentId: adminAccount.id }] : [])],
    };
  } else {
    query = { $or: [{ userId }, { agentId: userId }] };
  }

  const items = await ConversationModel.find(query)
    .sort({ lastMessageAt: -1 })
    .populate('listingId', 'title price currency location images')
    .populate('agentId', 'name role agentVerification')
    .populate('userId', 'name role')
    .lean();

  const roleFiltered = items.filter((conv: any) => shouldIncludeConversationForRole(conv, userId, role));

  const deduped = new Map<string, any>();
  roleFiltered.forEach((conv: any) => {
    const key = conversationDedupKey(conv, role);
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

  const formatted = Array.from(deduped.values()).map((conv: any) => {
    const isAdminSupportConversation =
      role === 'admin' &&
      adminAccount &&
      normalizeId(conv.agentId) === adminAccount.id &&
      conv.userId?.role === 'user';

    return formatConversation(
      conv,
      isAdminSupportConversation
        ? { unreadFor: adminAccount.id, prefsFor: userId }
        : userId
    );
  });

  // Attach last message preview to each conversation in a single bulk query
  try {
    const convIds = formatted.map((c) => new mongoose.Types.ObjectId(c.id));
    if (convIds.length > 0) {
      const lastMessages = await MessageModel.aggregate([
        { $match: { conversationId: { $in: convIds } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$conversationId',
            content: { $first: '$content' },
            type: { $first: '$type' },
            senderType: { $first: '$senderType' },
          },
        },
      ]);
      const previewMap = new Map(lastMessages.map((m: any) => [String(m._id), m]));
      formatted.forEach((conv) => {
        const msg = previewMap.get(conv.id);
        if (msg) {
          (conv as any).lastMessagePreview =
            msg.type === 'text' && typeof msg.content === 'string'
              ? msg.content.slice(0, 80)
              : msg.type === 'attachment'
                ? 'Sent an attachment'
                : msg.type;
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

type ConversationViewer =
  | string
  | {
      unreadFor: string;
      prefsFor?: string;
    };

function resolveConversationViewer(viewer: ConversationViewer) {
  if (typeof viewer === 'string') {
    return { unreadFor: viewer, prefsFor: viewer };
  }
  return {
    unreadFor: viewer.unreadFor,
    prefsFor: viewer.prefsFor || viewer.unreadFor,
  };
}

export function formatConversation(conv: any, viewer: ConversationViewer) {
  const { unreadFor, prefsFor } = resolveConversationViewer(viewer);
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
    lastMessageAt: conv.lastMessageAt
      ? new Date(conv.lastMessageAt).toISOString()
      : new Date().toISOString(),
    unreadCount: getUnreadCount(conv.unreadCountBy, unreadFor),
    pinned: isPinned(conv.pinnedBy, prefsFor),
    muted: isMuted(conv.mutedBy, prefsFor),
    createdAt: conv.createdAt ? new Date(conv.createdAt).toISOString() : new Date().toISOString(),
    responseDueAt: buildResponseDue(conv, unreadFor),
    listingSnapshot: listing ? buildListingSnapshot(listing) : null,
    agentSnapshot: buildAgentSnapshot(agent, agentId),
    userSnapshot: buildUserSnapshot(user, userId),
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
  const actorContext = await resolveConversationActorContext(conv, userId, role);
  if (!actorContext) {
    const error = new Error('Access denied');
    (error as any).status = 403;
    throw error;
  }
  const msgs = await MessageModel.find({ conversationId })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);
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

  const actorContext = await resolveConversationActorContext(conv, actorId, actorRole);
  if (!actorContext) {
    const error = new Error('Caller is not part of this conversation');
    (error as any).status = 403;
    (error as any).code = 'FORBIDDEN';
    throw error;
  }

  const senderType = actorContext.senderType;

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
    ...(clientTempId ? { clientTempId } : {}),
  });

  // Side effects — never let these block or fail the message send
  try {
    const otherId = actorContext.otherId;
    const update: Record<string, unknown> = { $set: { lastMessageAt: new Date() } };
    if (otherId) {
      update.$inc = { [`unreadCountBy.${otherId}`]: 1 };
    }
    await ConversationModel.findByIdAndUpdate(conversationId, update);

    const io = getIO();
    if (io) {
      const adminAccount = await findZeniAdminAccount();
      const targets = new Set([
        `user:${conv.userId.toString()}`,
        `user:${conv.agentId.toString()}`,
      ]);
      if (adminAccount && agentIdStr === adminAccount.id) {
        targets.add('role:admin');
      }
      targets.forEach((room) => io.to(room).emit('message:new', formatMessage(msg)));
    }
    if (otherId && !isMuted(conv.mutedBy, otherId)) {
      createNotification(otherId, {
        title: 'New message',
        description: type === 'text' ? String(content).slice(0, 80) : type,
        type: 'message',
      }).catch((err) => logChatSideEffectError('notification failed', err));
    }
    emitConversationUpdate(String(conv._id)).catch((err) =>
      logChatSideEffectError('emitConversationUpdate failed', err)
    );
    triggerUserDashboard(conv.userId.toString());
    triggerAgentDashboard(conv.agentId.toString());
  } catch (err) {
    logChatSideEffectError('sendMessage side effects failed', err);
  }

  return msg;
}

export async function markRead(
  conversationId: string,
  userId: string,
  role?: string
): Promise<void> {
  if (!isValidObjectId(conversationId)) return;
  const conv = await ConversationModel.findById(conversationId).select('userId agentId').lean();
  if (!conv) return;
  const actorContext = await resolveConversationActorContext(conv, userId, role);
  if (!actorContext) return;
  const now = new Date();
  await ConversationModel.findByIdAndUpdate(conversationId, {
    $set: {
      [`unreadCountBy.${actorContext.actingParticipantId}`]: 0,
      [`lastReadAtBy.${actorContext.actingParticipantId}`]: now,
    },
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

  const actorContext = await resolveConversationActorContext(conv, actorId, actorRole);
  if (!actorContext) {
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
  if (!updated) {
    return formatConversation(
      conv,
      actorRole === 'admin' && actorContext.actingParticipantId !== actorId
        ? { unreadFor: actorContext.actingParticipantId, prefsFor: actorId }
        : actorId
    );
  }
  await emitConversationUpdate(String(conv._id));
  return formatConversation(
    updated,
    actorRole === 'admin' && actorContext.actingParticipantId !== actorId
      ? { unreadFor: actorContext.actingParticipantId, prefsFor: actorId }
      : actorId
  );
}

export function formatMessage(msg: MessageDocument | any) {
  return {
    id: normalizeId(msg._id),
    conversationId: normalizeId(msg.conversationId),
    senderType: msg.senderType,
    type: msg.type,
    content: msg.content,
    createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
    status: msg.status,
  };
}

export async function emitConversationUpdate(conversationId: string) {
  const io = getIO();
  if (!io) return;
  const adminAccount = await findZeniAdminAccount();
  const conv = await ConversationModel.findById(conversationId)
    .populate('listingId', 'title price currency location images')
    .populate('agentId', 'name role agentVerification')
    .populate('userId', 'name role')
    .lean();
  if (!conv) return;
  const conversationUser = conv.userId as unknown as UserDocument | null | undefined;
  const userId = normalizeId(conv.userId);
  const agentId = normalizeId(conv.agentId);
  io.to(`user:${userId}`).emit('conversation:update', formatConversation(conv, userId));
  io.to(`user:${agentId}`).emit('conversation:update', formatConversation(conv, agentId));
  if (adminAccount && agentId === adminAccount.id && conversationUser?.role === 'user') {
    io.to('role:admin').emit(
      'conversation:update',
      formatConversation(conv, { unreadFor: adminAccount.id })
    );
  }
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
      { email: fallbackEmail },
    ],
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
      agentVerification: 'verified',
    });
  };

  try {
    await createWithEmail(preferredEmail);
    chatLog(`[chat] Created ${name} user`);
    return;
  } catch (err: any) {
    if (err?.code !== 11000) throw err;
  }

  if (fallbackEmail && fallbackEmail !== preferredEmail) {
    try {
      await createWithEmail(fallbackEmail);
      chatLog(`[chat] Created ${name} user (fallback email)`);
      return;
    } catch (err: any) {
      if (err?.code !== 11000) throw err;
    }
  }

  // Last-resort unique system email so chat bootstrap cannot get stuck on collisions.
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  const systemEmail = `${slug}-system-${Date.now()}@zeni.test`;
  await createWithEmail(systemEmail);
  chatLog(`[chat] Created ${name} user (system email fallback)`);
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
      chatLog('[chat] Zeni Support/Agent/Admin users already exist (duplicate key)');
    } else {
      chatError('[chat] ensureWelcomeAgentsInDb failed', err);
    }
  }
}

async function findZeniMainAgent(): Promise<{ _id: any; role: string } | null> {
  const agentEmail = env.zeniAgentEmail || 'zeniagent.ke@gmail.com';
  let u = await UserModel.findOne({
    role: 'agent',
    $or: [{ emailOrPhone: agentEmail }, { email: agentEmail }, { emailOrPhone: 'agent@zeni.test' }],
  })
    .select('_id role')
    .lean();
  if (u) return u as { _id: any; role: string };
  u = await UserModel.findOne({ name: /^Zeni Agent$/i, role: 'agent' })
    .select('_id role')
    .lean();
  if (u) return u as { _id: any; role: string };
  u = await UserModel.findOne({ role: 'agent', agentVerification: 'verified' })
    .select('_id role')
    .sort({ createdAt: 1 })
    .lean();
  if (u) return u as { _id: any; role: string };
  u = await UserModel.findOne({ role: 'agent' }).select('_id role').sort({ createdAt: 1 }).lean();
  return u as { _id: any; role: string } | null;
}

async function findZeniAdminAccount(): Promise<{ id: string; name: string } | null> {
  const adminEmail = env.zeniAdminEmail || 'admin@zeni.test';
  // Conversations expect the counterpart to be an agent-style system account.
  // Use the dedicated "Zeni Admin" agent account and never fall back to a real admin user.
  const u = await UserModel.findOne({
    role: 'agent',
    $or: [{ emailOrPhone: adminEmail }, { email: adminEmail }, { name: /^Zeni Admin$/i }],
  })
    .select('_id name')
    .lean();

  if (u) return { id: String(u._id), name: String(u.name) };

  return null;
}

/**
 * Create welcome conversations for a new user: Zeni Agent and Zeni Admin only.
 * Called after user registration. Safe to call multiple times (idempotent via getOrCreateConversation).
 */
export async function ensureWelcomeConversations(userId: string): Promise<void> {
  const [user, agentUser, adminAccount] = await Promise.all([
    UserModel.findById(userId).select('name role'),
    findZeniMainAgent(),
    findZeniAdminAccount(),
  ]);

  if (!user) return;

  const firstName = user.name.split(' ')[0];

  // 1. Zeni Agent Welcome
  if (agentUser) {
    const aid = String(agentUser._id);
    const conv = await getOrCreateConversation(null, userId, aid);
    const hasMessages = await MessageModel.exists({ conversationId: conv._id });
    if (!hasMessages) {
      await sendMessage(
        String(conv._id),
        aid,
        'agent',
        'text',
        `Jambo ${firstName}! I'm your Zeni Agent. I'll be helping you find and verify the best properties across Kenya. Feel free to ask me anything about our listings!`
      );
    }
  }

  // 2. Zeni Admin Welcome
  if (adminAccount) {
    const aid = adminAccount.id;
    const conv = await getOrCreateConversation(null, userId, aid);
    const hasMessages = await MessageModel.exists({ conversationId: conv._id });
    if (!hasMessages) {
      await sendMessage(
        String(conv._id),
        aid,
        'admin',
        'text',
        `Welcome to ZENI, ${firstName}. I'm the Zeni Admin. I'm here to ensure your experience is secure and professional. If you have any feedback or reported issues, you can reach me here directly.`
      );
    }
  }
}

/** Ensure agent has a single internal Zeni Admin conversation. */
export async function ensureAgentSupportConversation(agentUserId: string): Promise<void> {
  const adminAccount = await findZeniAdminAccount();
  if (adminAccount) {
    const id = adminAccount.id;
    if (id !== agentUserId) {
      await getOrCreateConversation(null, agentUserId, id);
    }
  }
}

/** Ensure admin has a single internal Zeni Agent conversation. */
export async function ensureAdminZeniAgentConversation(adminUserId: string): Promise<void> {
  const mainAgent = await findZeniMainAgent();
  if (mainAgent && mainAgent.role === 'agent') {
    const id = String(mainAgent._id);
    if (id !== adminUserId) {
      await getOrCreateConversation(null, adminUserId, id);
    }
  }
}
