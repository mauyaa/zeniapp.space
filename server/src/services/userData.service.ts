/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request } from 'express';
import { UserModel } from '../models/User';
import { SavedListingModel } from '../models/SavedListing';
import { ViewingRequestModel } from '../models/ViewingRequest';
import { ConversationModel } from '../models/Conversation';
import { PayTransactionModel } from '../models/PayTransaction';
import { recordAudit } from '../utils/audit';
import { revokeAllSessionsForUser } from './auth.service';

export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const [user, savedListings, viewings, conversations, transactions] = await Promise.all([
    UserModel.findById(userId)
      .select('name email phone emailOrPhone role status availability agentVerification notificationPrefs consentVersion consentAt createdAt')
      .lean(),
    SavedListingModel.find({ userId }).select('listingId alert createdAt').lean(),
    ViewingRequestModel.find({ userId })
      .select('listingId agentId date status note createdAt')
      .lean(),
    ConversationModel.find({ userId }).select('listingId agentId status lastMessageAt createdAt').lean(),
    PayTransactionModel.find({ userId })
      .select('amount currency method status purpose referenceId createdAt')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
  ]);
  return {
    exportedAt: new Date().toISOString(),
    profile: user
      ? {
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          consentVersion: user.consentVersion,
          consentAt: user.consentAt,
          createdAt: (user as { createdAt?: Date }).createdAt
        }
      : null,
    savedListings: (savedListings || []).map((s) => ({
      listingId: s.listingId,
      alert: s.alert,
      createdAt: (s as { createdAt?: Date }).createdAt
    })),
    viewings: (viewings || []).map((v) => ({
      listingId: v.listingId,
      date: v.date,
      status: v.status,
      createdAt: (v as { createdAt?: Date }).createdAt
    })),
    conversations: (conversations || []).map((c) => ({
      listingId: c.listingId,
      agentId: c.agentId,
      lastMessageAt: c.lastMessageAt,
      createdAt: (c as { createdAt?: Date }).createdAt
    })),
    transactions: (transactions || []).map((t) => ({
      amount: t.amount,
      currency: t.currency,
      method: t.method,
      status: t.status,
      purpose: t.purpose,
      createdAt: (t as { createdAt?: Date }).createdAt
    }))
  };
}

export async function deleteAccount(userId: string, req?: Request) {
  const user = await UserModel.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    (err as any).status = 404;
    throw err;
  }
  const deletedIdentifier = `deleted-${userId}@deleted.local`;
  user.name = 'Deleted User';
  user.email = undefined;
  user.phone = undefined;
  user.emailOrPhone = deletedIdentifier;
  user.password = await import('bcryptjs').then((b) => b.hash(deletedIdentifier, 10));
  user.status = 'banned';
  user.mfaEnabled = false;
  user.mfaSecret = undefined;
  user.mfaRecoveryCodes = [];
  user.verificationEvidence = [];
  user.consentVersion = undefined;
  user.consentAt = undefined;
  await user.save();
  await revokeAllSessionsForUser(userId);
  if (req) {
    await recordAudit(
      {
        actorId: userId,
        actorRole: user.role,
        action: 'account_deleted',
        entityType: 'User',
        entityId: userId,
        after: { deletedAt: new Date().toISOString() }
      },
      req
    );
  }
  return { deleted: true };
}
