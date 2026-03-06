/* eslint-disable @typescript-eslint/no-explicit-any */
import { Parser } from 'json2csv';
import { UserModel } from '../models/User';
import { ListingModel } from '../models/Listing';
import { AuditLogModel } from '../models/AuditLog';
import { ReportModel } from '../models/Report';
import { invalidatePrefix } from '../utils/listingCache';
import { getIO } from '../socket';
import { triggerAdminDashboard, triggerAgentDashboard } from './dashboard.service';
import { revokeAllSessionsForUser } from './auth.service';

export function listAllUsers() {
  return UserModel.find()
    .select('name role status emailOrPhone agentVerification createdAt')
    .sort({ createdAt: -1 });
}

export async function updateUserStatusService(
  actorId: string,
  targetUserId: string,
  status: 'active' | 'suspended' | 'banned'
) {
  const before = await UserModel.findById(targetUserId);
  if (!before) return null;

  // Prevent accidental lockout of the last admin account
  if (before.role === 'admin' && status !== 'active') {
    const otherAdmins = await UserModel.countDocuments({
      role: 'admin',
      _id: { $ne: targetUserId },
    });
    if (otherAdmins === 0) {
      throw new Error('Cannot disable the last admin account');
    }
  }

  const after = await UserModel.findByIdAndUpdate(targetUserId, { status }, { new: true });
  await AuditLogModel.create({
    actorId,
    actorRole: 'admin',
    action: `user_${status}`,
    entityType: 'user',
    entityId: targetUserId,
    after,
  });

  // Invalidate active sessions when disabling an account
  if (status !== 'active') {
    await revokeAllSessionsForUser(targetUserId);
  }

  const io = getIO();
  if (io) {
    io.to(`user:${targetUserId}`).emit('user:status', { userId: targetUserId, status });
  }
  if (after) {
    const { createNotification } = await import('./notification.service');
    await createNotification(targetUserId, {
      title: 'Account status updated',
      description: `Your account status has been changed to ${status}.`,
      type: 'system',
    });
  }
  triggerAdminDashboard();
  return after;
}

export async function deleteUserService(actorId: string, targetUserId: string) {
  const user = await UserModel.findById(targetUserId);
  if (!user) throw new Error('User not found');

  if (user.role === 'admin') {
    const otherAdmins = await UserModel.countDocuments({
      role: 'admin',
      _id: { $ne: targetUserId },
    });
    if (otherAdmins === 0) {
      throw new Error('Cannot delete the last admin account');
    }
  }

  await revokeAllSessionsForUser(targetUserId);
  await UserModel.findByIdAndDelete(targetUserId);
  await AuditLogModel.create({
    actorId,
    actorRole: 'admin',
    action: 'user_delete',
    entityType: 'user',
    entityId: targetUserId,
  });
  const io = getIO();
  if (io) {
    io.to(`user:${targetUserId}`).emit('user:deleted', { userId: targetUserId });
  }
  triggerAdminDashboard();
}

export function listPendingAgents() {
  return UserModel.find({ role: 'agent', agentVerification: 'pending' })
    .select(
      'name email emailOrPhone role agentVerification verificationEvidence earbRegistrationNumber earbVerifiedAt createdAt'
    )
    .lean();
}

export function listPendingListings() {
  return ListingModel.find({ status: 'pending_review' });
}

/** Unified moderation queue: agent verify, new listing, user KYC, business verify. */
export type ModerationItemType = 'agent_verify' | 'new_listing' | 'user_kyc' | 'business_verify';
export interface ModerationQueueItem {
  id: string;
  type: ModerationItemType;
  refId: string;
  userEntity: { name: string; email: string };
  requestType: string;
  timestamp: string;
  status: string;
  payload: Record<string, unknown>;
}

function refIdFromId(prefix: string, id: string): string {
  const suffix = (id || '').slice(-4).toUpperCase();
  return `#${prefix}-${suffix}`;
}

export async function listModerationQueue(): Promise<ModerationQueueItem[]> {
  const [agents, listings, kycUsers, businessAgents] = await Promise.all([
    UserModel.find({ role: 'agent', agentVerification: 'pending' })
      .select(
        'name email emailOrPhone role agentVerification verificationEvidence earbRegistrationNumber earbVerifiedAt createdAt'
      )
      .lean(),
    ListingModel.find({ status: 'pending_review' })
      .populate('agentId', 'name emailOrPhone')
      .sort({ createdAt: -1 })
      .lean(),
    UserModel.find({ kycStatus: 'pending' })
      .select('name emailOrPhone kycEvidence kycSubmittedAt createdAt')
      .lean(),
    UserModel.find({ role: 'agent', businessVerifyStatus: 'pending' })
      .select('name emailOrPhone businessVerifyEvidence businessVerifySubmittedAt createdAt')
      .lean(),
  ]);

  const items: ModerationQueueItem[] = [];

  agents.forEach((a: any) => {
    items.push({
      id: a._id.toString(),
      type: 'agent_verify',
      refId: refIdFromId('REQ', a._id.toString()),
      userEntity: { name: a.name || '', email: a.emailOrPhone || a.email || '' },
      requestType: 'Agent Verify',
      timestamp: a.createdAt ? new Date(a.createdAt).toISOString() : '',
      status: 'Review',
      payload: a,
    });
  });

  listings.forEach((l: any) => {
    const agent = l.agentId;
    const name = agent?.name || 'Unknown';
    const email = agent?.emailOrPhone || agent?.email || '';
    items.push({
      id: l._id.toString(),
      type: 'new_listing',
      refId: refIdFromId('LST', l._id.toString()),
      userEntity: { name, email },
      requestType: 'New Listing',
      timestamp: l.createdAt ? new Date(l.createdAt).toISOString() : '',
      status: 'Review',
      payload: { ...l, agentId: l.agentId?._id?.toString() || l.agentId },
    });
  });

  kycUsers.forEach((u: any) => {
    items.push({
      id: u._id.toString(),
      type: 'user_kyc',
      refId: refIdFromId('KYC', u._id.toString()),
      userEntity: { name: u.name || '', email: u.emailOrPhone || '' },
      requestType: 'KYC Verify',
      timestamp:
        u.kycSubmittedAt || u.createdAt
          ? new Date(u.kycSubmittedAt || u.createdAt).toISOString()
          : '',
      status: 'Review',
      payload: u,
    });
  });

  businessAgents.forEach((a: any) => {
    items.push({
      id: a._id.toString(),
      type: 'business_verify',
      refId: refIdFromId('BIZ', a._id.toString()),
      userEntity: { name: a.name || '', email: a.emailOrPhone || a.email || '' },
      requestType: 'Business Verify',
      timestamp:
        a.businessVerifySubmittedAt || a.createdAt
          ? new Date(a.businessVerifySubmittedAt || a.createdAt).toISOString()
          : '',
      status: 'Review',
      payload: a,
    });
  });

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items;
}

export async function resolveUserKyc(
  actorId: string,
  userId: string,
  decision: 'approve' | 'reject'
) {
  const status = decision === 'approve' ? 'verified' : 'rejected';
  const after = await UserModel.findByIdAndUpdate(userId, { kycStatus: status }, { new: true });
  if (!after) throw Object.assign(new Error('User not found'), { status: 404 });
  await AuditLogModel.create({
    actorId,
    actorRole: 'admin',
    action: `user_kyc_${decision}`,
    entityType: 'user',
    entityId: userId,
    after: { kycStatus: status },
  });
  const io = getIO();
  if (io) io.to(`user:${userId}`).emit('kyc:resolved', { status });
  const { createNotification } = await import('./notification.service');
  await createNotification(userId, {
    title: decision === 'approve' ? 'Identity verified' : 'Identity verification not approved',
    description:
      decision === 'approve'
        ? 'Your identity has been verified.'
        : 'Verification was not approved. You can resubmit documents.',
  });
  triggerAdminDashboard();
  return after;
}

export async function resolveBusinessVerify(
  actorId: string,
  agentId: string,
  decision: 'approve' | 'reject'
) {
  const status = decision === 'approve' ? 'verified' : 'rejected';
  const after = await UserModel.findByIdAndUpdate(
    agentId,
    { businessVerifyStatus: status },
    { new: true }
  );
  if (!after || after.role !== 'agent')
    throw Object.assign(new Error('Agent not found'), { status: 404 });
  await AuditLogModel.create({
    actorId,
    actorRole: 'admin',
    action: `business_verify_${decision}`,
    entityType: 'user',
    entityId: agentId,
    after: { businessVerifyStatus: status },
  });
  const io = getIO();
  if (io) io.to(`user:${agentId}`).emit('business_verify:resolved', { status });
  const { createNotification } = await import('./notification.service');
  await createNotification(agentId, {
    title: decision === 'approve' ? 'Business verified' : 'Business verification not approved',
    description:
      decision === 'approve'
        ? 'Your business verification is complete.'
        : 'Business verification was not approved.',
  });
  triggerAdminDashboard();
  return after;
}

export async function markEarbVerified(actorId: string, agentId: string) {
  const user = await UserModel.findById(agentId);
  if (!user || user.role !== 'agent')
    throw Object.assign(new Error('Agent not found'), { status: 404 });
  const after = await UserModel.findByIdAndUpdate(
    agentId,
    { $set: { earbVerifiedAt: new Date() } },
    { new: true }
  );
  await AuditLogModel.create({
    actorId,
    actorRole: 'admin',
    action: 'agent_earb_verified',
    entityType: 'user',
    entityId: agentId,
    after: { earbVerifiedAt: after?.earbVerifiedAt },
  });
  return after;
}

export async function verifyAgent(
  actorId: string,
  agentId: string,
  decision: 'approve' | 'reject'
) {
  const after = await UserModel.findByIdAndUpdate(
    agentId,
    { agentVerification: decision === 'approve' ? 'verified' : 'rejected' },
    { new: true }
  );
  await AuditLogModel.create({
    actorId,
    actorRole: 'admin',
    action: `agent_${decision}`,
    entityType: 'user',
    entityId: agentId,
    after,
  });
  const io = getIO();
  if (io) {
    io.to(`user:${agentId}`).emit('agent:verified', { agentId, status: after?.agentVerification });
  }
  if (after) {
    const { createNotification } = await import('./notification.service');
    await createNotification(agentId, {
      title: decision === 'approve' ? 'Verification approved' : 'Verification rejected',
      description:
        decision === 'approve'
          ? 'Your agent profile is now verified. You can publish listings.'
          : 'Verification was rejected. Please resubmit documents.',
    });
  }
  if (after?.emailOrPhone?.includes('@')) {
    const { sendMail } = await import('./email.service');
    await sendMail(
      after.emailOrPhone,
      decision === 'approve' ? 'You are verified on ZENI' : 'Your verification was not approved',
      decision === 'approve'
        ? `<p>Hi ${after.name || ''},</p><p>Your agent account has been verified. You can now publish listings.</p>`
        : `<p>Hi ${after.name || ''},</p><p>Your verification was not approved. Please resubmit your documents or contact support.</p>`
    );
  }
  triggerAgentDashboard(agentId);
  triggerAdminDashboard();
  return after;
}

export async function moderateListing(actorId: string, listingId: string, action: string) {
  const statusMap: any = {
    approve: { status: 'live', verified: true },
    reject: { status: 'rejected' },
    unlist: { status: 'archived' },
    feature: { verified: true },
  };
  const update = statusMap[action] || {};
  const after = await ListingModel.findByIdAndUpdate(listingId, update, { new: true });
  await AuditLogModel.create({
    actorId,
    actorRole: 'admin',
    action: `listing_${action}`,
    entityType: 'listing',
    entityId: listingId,
    after,
  });
  const io = getIO();
  if (io && after) {
    io.to(`agent:${after.agentId.toString()}`).emit('listing:update', after);
    if (after.status === 'live') {
      io.to('public:listings').emit('listing:changed', {
        id: listingId,
        status: after.status,
        availabilityStatus: after.availabilityStatus,
        createdAt: after.createdAt,
      });
    }
  }
  if (after) {
    const { createNotification } = await import('./notification.service');
    await createNotification(String(after.agentId), {
      title: 'Listing moderation',
      description: `Your listing "${after.title}" was ${action}`,
      type: 'system',
    });
  }
  if (after) {
    triggerAgentDashboard(String(after.agentId));
    triggerAdminDashboard();
    invalidatePrefix('listing:search');
  }
  return after;
}

export async function deleteListingService(actorId: string, listingId: string) {
  const listing = await ListingModel.findById(listingId);
  if (!listing) throw new Error('Listing not found');

  await ListingModel.findByIdAndDelete(listingId);
  await AuditLogModel.create({
    actorId,
    actorRole: 'admin',
    action: 'listing_delete',
    entityType: 'listing',
    entityId: listingId,
  });

  const io = getIO();
  if (io) {
    io.to(`agent:${listing.agentId.toString()}`).emit('listing:deleted', { listingId });
    io.to('public:listings').emit('listing:deleted', { listingId });
  }
  triggerAdminDashboard();
}

export async function analyticsCounts() {
  const [users, pendingAgents, reportsToday, listings] = await Promise.all([
    UserModel.countDocuments(),
    UserModel.countDocuments({ role: 'agent', agentVerification: 'pending' }),
    ReportModel.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ListingModel.countDocuments(),
  ]);
  return { users, pendingAgents, reportsToday, listings };
}

export function auditLogs(filter: any) {
  const q: any = {};
  if (filter.actorRole) q.actorRole = filter.actorRole;
  if (filter.action) q.action = filter.action;
  if (filter.actorId) q.actorId = filter.actorId;
  if (filter.entityType) q.entityType = filter.entityType;
  if (filter.entityId) q.entityId = filter.entityId;
  const limit = Math.min(Number(filter.limit) || 200, 500);
  return AuditLogModel.find(q).sort({ createdAt: -1 }).limit(limit);
}

export async function listNetworkAccessDecisions(limit = 25) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const rows = await AuditLogModel.find({
    entityType: 'network_access',
    action: { $in: ['network_access_allowed', 'network_access_denied'] },
  })
    .sort({ createdAt: -1 })
    .limit(cappedLimit)
    .lean();

  return rows.map((row) => {
    const details = (row.after && typeof row.after === 'object' ? row.after : {}) as Record<
      string,
      unknown
    >;
    return {
      id: String(row._id),
      action: row.action,
      createdAt: row.createdAt,
      actorId: row.actorId ? String(row.actorId) : undefined,
      actorRole: row.actorRole || undefined,
      sourceIp: typeof details.sourceIp === 'string' ? details.sourceIp : row.ip || undefined,
      surface: typeof details.surface === 'string' ? details.surface : undefined,
      reason: typeof details.reason === 'string' ? details.reason : undefined,
      path: typeof details.path === 'string' ? details.path : undefined,
      method: typeof details.method === 'string' ? details.method : undefined,
      requestId: row.requestId || undefined,
    };
  });
}

export async function exportReports(query: any) {
  const { status, severity, limit = 1000 } = query;
  const filter: any = {};
  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  const reports = await ReportModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
  const parser = new Parser({
    fields: [
      '_id',
      'category',
      'severity',
      'status',
      'targetType',
      'targetId',
      'reporterId',
      'message',
      'createdAt',
    ],
  });
  return parser.parse(reports);
}

export async function exportAgentsCsv() {
  const agents = await UserModel.find({ role: 'agent' })
    .select('_id name emailOrPhone agentVerification status createdAt')
    .lean();
  const parser = new Parser({
    fields: ['_id', 'name', 'emailOrPhone', 'agentVerification', 'status', 'createdAt'],
  });
  return parser.parse(agents);
}

export async function exportListingsCsv() {
  const listings = await ListingModel.find()
    .select('_id title price currency purpose status availabilityStatus verified agentId createdAt')
    .lean();
  const parser = new Parser({
    fields: [
      '_id',
      'title',
      'price',
      'currency',
      'purpose',
      'status',
      'availabilityStatus',
      'verified',
      'agentId',
      'createdAt',
    ],
  });
  return parser.parse(listings);
}
