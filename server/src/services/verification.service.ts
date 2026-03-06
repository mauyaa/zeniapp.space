import { UserModel } from '../models/User';
import { AuditLogModel } from '../models/AuditLog';
import { getIO } from '../socket';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { renderBrandEmail, sendMail } from './email.service';

export async function addVerificationEvidence(
  userId: string,
  payload: { url: string; note?: string }
) {
  const updated = await UserModel.findByIdAndUpdate(
    userId,
    {
      $push: {
        verificationEvidence: {
          url: payload.url,
          note: payload.note,
          uploadedAt: new Date(),
        },
      },
      $set: { agentVerification: 'pending' },
    },
    { new: true }
  ).select('agentVerification verificationEvidence name emailOrPhone');

  if (updated) {
    await AuditLogModel.create({
      actorId: userId,
      actorRole: 'agent',
      action: 'agent_verification_upload',
      entityType: 'user',
      entityId: userId,
      after: updated.toObject(),
    });
    const io = getIO();
    if (io) io.to('role:admin').emit('agent:verification', { agentId: userId });
    const { createNotification } = await import('./notification.service');
    await createNotification(userId, {
      title: 'Evidence received',
      description: 'We received your verification documents. Await approval.',
      type: 'system',
    });
    if (updated.emailOrPhone?.includes('@')) {
      await sendMail(
        updated.emailOrPhone,
        'Verification evidence received',
        `<p>Hi ${updated.name || ''},</p><p>We've received your verification documents. Our team will review and update your status.</p>`
      );
    }
  }

  return updated;
}

export async function listVerificationEvidence(userId: string) {
  const user = await UserModel.findById(userId).select(
    'agentVerification verificationEvidence earbRegistrationNumber earbVerifiedAt businessVerifyStatus businessVerifyEvidence'
  );
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 as number });
  const biz = user as unknown as {
    businessVerifyStatus?: string;
    businessVerifyEvidence?: unknown[];
  };
  return {
    status: user.agentVerification,
    evidence: user.verificationEvidence || [],
    earbRegistrationNumber: user.earbRegistrationNumber,
    earbVerifiedAt: user.earbVerifiedAt,
    businessVerifyStatus: biz.businessVerifyStatus || 'none',
    businessVerifyEvidence: biz.businessVerifyEvidence || [],
  };
}

export async function updateEarbNumber(userId: string, earbRegistrationNumber: string) {
  const updated = await UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        earbRegistrationNumber: earbRegistrationNumber.trim() || undefined,
        earbVerifiedAt: undefined,
      },
    },
    { new: true }
  ).select('earbRegistrationNumber earbVerifiedAt agentVerification');
  if (!updated) throw Object.assign(new Error('User not found'), { status: 404 });
  return updated;
}

/** User KYC: any user can submit identity documents for verification. */
export async function submitUserKyc(userId: string, payload: { url: string; note?: string }) {
  if (!payload.url || !payload.url.trim()) {
    throw Object.assign(new Error('Document URL missing'), {
      status: 400,
      code: 'INVALID_KYC_URL',
    });
  }
  const updated = await UserModel.findByIdAndUpdate(
    userId,
    {
      $push: {
        kycEvidence: {
          url: payload.url,
          note: payload.note,
          uploadedAt: new Date(),
        },
      },
      $set: { kycStatus: 'pending', kycSubmittedAt: new Date() },
    },
    { new: true }
  ).select('kycStatus kycEvidence kycSubmittedAt name emailOrPhone');

  if (updated) {
    await AuditLogModel.create({
      actorId: userId,
      actorRole: 'user',
      action: 'user_kyc_submitted',
      entityType: 'user',
      entityId: userId,
      after: updated.toObject(),
    });
    const io = getIO();
    if (io) io.to('role:admin').emit('moderation:queue');
    const email = updated.emailOrPhone?.includes('@') ? updated.emailOrPhone : null;
    if (email) {
      const firstName = (updated.name || '').split(' ')[0] || 'there';
      sendMail(
        email,
        'KYC submitted',
        renderBrandEmail({
          title: 'We received your KYC',
          body: `Hi ${firstName},<br/>Thanks for submitting your KYC documents. Our team is reviewing them now. You'll get an update as soon as we finish the review.`,
        })
      ).catch((err) => logger.warn('[kyc] user email failed', err));
    }
    if (env.zeniAdminEmail?.includes('@')) {
      sendMail(
        env.zeniAdminEmail,
        'New KYC submission',
        renderBrandEmail({
          title: 'New KYC submission',
          body: `User ${updated.name || userId} submitted KYC evidence at ${updated.kycSubmittedAt?.toISOString() || new Date().toISOString()}.`,
        })
      ).catch((err) => logger.warn('[kyc] admin email failed', err));
    }
  }
  return updated;
}

/** Get current user's KYC status and evidence (for profile/settings). */
export async function listUserKyc(userId: string) {
  const user = await UserModel.findById(userId).select('kycStatus kycEvidence kycSubmittedAt');
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return {
    status: user.kycStatus || 'none',
    evidence: user.kycEvidence || [],
    submittedAt: user.kycSubmittedAt,
  };
}

/** Agent business verification: submit company/entity documents. */
export async function submitBusinessVerify(
  agentId: string,
  payload: { url: string; note?: string }
) {
  const user = await UserModel.findById(agentId);
  if (!user || user.role !== 'agent')
    throw Object.assign(new Error('Agent not found'), { status: 404 });

  const updated = await UserModel.findByIdAndUpdate(
    agentId,
    {
      $push: {
        businessVerifyEvidence: {
          url: payload.url,
          note: payload.note,
          uploadedAt: new Date(),
        },
      },
      $set: { businessVerifyStatus: 'pending', businessVerifySubmittedAt: new Date() },
    },
    { new: true }
  ).select(
    'businessVerifyStatus businessVerifyEvidence businessVerifySubmittedAt name emailOrPhone'
  );

  if (updated) {
    await AuditLogModel.create({
      actorId: agentId,
      actorRole: 'agent',
      action: 'business_verify_submitted',
      entityType: 'user',
      entityId: agentId,
      after: updated.toObject(),
    });
    const io = getIO();
    if (io) io.to('role:admin').emit('moderation:queue');
  }
  return updated;
}
