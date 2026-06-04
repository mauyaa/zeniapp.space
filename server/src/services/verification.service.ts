import { UserModel } from '../models/User';
import { AuditLogModel } from '../models/AuditLog';
import { getIO } from '../socket';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { renderBrandEmail, sendMail } from './email.service';
import {
  deleteOwnVerificationDocument,
  markDocumentPendingReview,
} from './verificationDocument.service';

function safeEvidenceList(evidence: unknown[] | undefined) {
  return (evidence || []).map((entry) => {
    const source =
      entry && typeof (entry as { toObject?: () => Record<string, unknown> }).toObject === 'function'
        ? (entry as { toObject: () => Record<string, unknown> }).toObject()
        : (entry as Record<string, unknown>);
    const documentId = source?.documentId ? String(source.documentId) : undefined;
    return {
      _id: source?._id ? String(source._id) : undefined,
      documentId,
      note: typeof source?.note === 'string' ? source.note : undefined,
      idNumber: typeof source?.idNumber === 'string' ? source.idNumber : undefined,
      uploadedAt: source?.uploadedAt,
      migrationRequired: !documentId,
    };
  });
}

export async function addVerificationEvidence(
  userId: string,
  payload: { documentId: string; note?: string; idNumber: string }
) {
  await markDocumentPendingReview(payload.documentId, userId, 'agent_identity');

  const updated = await UserModel.findByIdAndUpdate(
    userId,
    {
      $push: {
        verificationEvidence: {
          documentId: payload.documentId,
          note: payload.note,
          idNumber: payload.idNumber,
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
      after: {
        agentVerification: updated.agentVerification,
        evidenceCount: updated.verificationEvidence?.length || 0,
      },
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
      sendMail(
        updated.emailOrPhone,
        'Verification evidence received',
        `<p>Hi ${updated.name || ''},</p><p>We've received your verification documents. Our team will review and update your status.</p>`
      ).catch((err) => logger.warn('[agent-verification] user email failed', err));
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
    evidence: safeEvidenceList(user.verificationEvidence as unknown[] | undefined),
    earbRegistrationNumber: user.earbRegistrationNumber,
    earbVerifiedAt: user.earbVerifiedAt,
    businessVerifyStatus: biz.businessVerifyStatus || 'none',
    businessVerifyEvidence: safeEvidenceList(biz.businessVerifyEvidence),
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

export async function updateVerificationEvidence(
  userId: string,
  evidenceId: string,
  payload: { documentId: string; note?: string; idNumber: string }
) {
  if (!payload.idNumber || !payload.idNumber.trim()) {
    throw Object.assign(new Error('ID number required'), {
      status: 400,
      code: 'INVALID_VERIFICATION_ID_NUMBER',
    });
  }

  const user = await UserModel.findById(userId).select(
    'role agentVerification verificationEvidence'
  );
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  if (user.agentVerification === 'verified') {
    throw Object.assign(new Error('Verified agent evidence cannot be edited'), {
      status: 409,
      code: 'AGENT_VERIFICATION_LOCKED',
    });
  }
  await markDocumentPendingReview(payload.documentId, userId, 'agent_identity');

  const nextEvidence = [
    ...((user.verificationEvidence || []) as Array<{
      _id?: { toString(): string };
      documentId?: { toString(): string };
      url?: string;
      note?: string;
      idNumber?: string;
      uploadedAt: Date;
    }>),
  ];
  const evidenceIndex = nextEvidence.findIndex((item) => item?._id?.toString() === evidenceId);
  if (evidenceIndex < 0) {
    throw Object.assign(new Error('Verification evidence not found'), {
      status: 404,
      code: 'AGENT_EVIDENCE_NOT_FOUND',
    });
  }

  const existingEvidence = nextEvidence[evidenceIndex] as
    | ({ toObject?: () => Record<string, unknown> } & Record<string, unknown>)
    | undefined;
  const previousDocumentId = nextEvidence[evidenceIndex]?.documentId?.toString();
  nextEvidence[evidenceIndex] = {
    ...(typeof existingEvidence?.toObject === 'function'
      ? existingEvidence.toObject()
      : existingEvidence),
    documentId: payload.documentId,
    url: undefined,
    note: payload.note,
    idNumber: payload.idNumber.trim(),
    uploadedAt: new Date(),
  } as (typeof nextEvidence)[number];

  user.verificationEvidence = nextEvidence as typeof user.verificationEvidence;
  await user.save();
  if (previousDocumentId && previousDocumentId !== payload.documentId) {
    await deleteOwnVerificationDocument(previousDocumentId, userId);
  }

  await AuditLogModel.create({
    actorId: userId,
    actorRole: user.role === 'agent' ? 'agent' : 'user',
    action: 'agent_verification_updated',
    entityType: 'user',
    entityId: userId,
    after: {
      agentVerification: user.agentVerification,
      evidenceId,
      evidenceCount: user.verificationEvidence?.length || 0,
    },
  });

  const io = getIO();
  if (io) io.to('role:admin').emit('agent:verification', { agentId: userId });

  return user;
}

export async function deleteVerificationEvidence(userId: string, evidenceId: string) {
  const user = await UserModel.findById(userId).select(
    'role agentVerification verificationEvidence'
  );
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  if (user.agentVerification === 'verified') {
    throw Object.assign(new Error('Verified agent evidence cannot be deleted'), {
      status: 409,
      code: 'AGENT_VERIFICATION_LOCKED',
    });
  }

  const nextEvidence = [
    ...((user.verificationEvidence || []) as Array<{
      _id?: { toString(): string };
      documentId?: { toString(): string };
      url?: string;
      note?: string;
      idNumber?: string;
      uploadedAt: Date;
    }>),
  ];
  const evidenceIndex = nextEvidence.findIndex((item) => item?._id?.toString() === evidenceId);
  if (evidenceIndex < 0) {
    throw Object.assign(new Error('Verification evidence not found'), {
      status: 404,
      code: 'AGENT_EVIDENCE_NOT_FOUND',
    });
  }
  const documentId = nextEvidence[evidenceIndex]?.documentId?.toString();

  user.verificationEvidence = nextEvidence.filter(
    (_, index) => index !== evidenceIndex
  ) as typeof user.verificationEvidence;
  if ((user.verificationEvidence?.length || 0) === 0 && user.agentVerification === 'pending') {
    user.agentVerification = 'unverified';
  }
  await user.save();
  if (documentId) {
    await deleteOwnVerificationDocument(documentId, userId);
  }

  await AuditLogModel.create({
    actorId: userId,
    actorRole: user.role === 'agent' ? 'agent' : 'user',
    action: 'agent_verification_deleted',
    entityType: 'user',
    entityId: userId,
    after: {
      agentVerification: user.agentVerification,
      evidenceId,
      remainingEvidence: user.verificationEvidence?.length || 0,
    },
  });

  const io = getIO();
  if (io) io.to('role:admin').emit('agent:verification', { agentId: userId });

  return user;
}

/** User KYC: any user can submit identity documents for verification. */
export async function submitUserKyc(userId: string, payload: { documentId: string; note?: string }) {
  await markDocumentPendingReview(payload.documentId, userId, 'kyc_identity');
  const updated = await UserModel.findByIdAndUpdate(
    userId,
    {
      $push: {
        kycEvidence: {
          documentId: payload.documentId,
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
      after: {
        kycStatus: updated.kycStatus,
        kycSubmittedAt: updated.kycSubmittedAt,
        evidenceCount: updated.kycEvidence?.length || 0,
      },
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

export async function updateUserKycEvidence(
  userId: string,
  evidenceId: string,
  payload: { documentId: string; note?: string }
) {
  const user = await UserModel.findById(userId).select(
    'name emailOrPhone kycStatus kycEvidence kycSubmittedAt'
  );
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  if (user.kycStatus === 'verified') {
    throw Object.assign(new Error('Verified KYC cannot be edited'), {
      status: 409,
      code: 'KYC_LOCKED',
    });
  }
  await markDocumentPendingReview(payload.documentId, userId, 'kyc_identity');

  const nextEvidence = [
    ...((user.kycEvidence || []) as Array<{
      _id?: { toString(): string };
      documentId?: { toString(): string };
      url?: string;
      note?: string;
      uploadedAt: Date;
    }>),
  ];
  const evidenceIndex = nextEvidence.findIndex((item) => item?._id?.toString() === evidenceId);
  if (evidenceIndex < 0) {
    throw Object.assign(new Error('KYC evidence not found'), {
      status: 404,
      code: 'KYC_EVIDENCE_NOT_FOUND',
    });
  }

  const existingEvidence = nextEvidence[evidenceIndex] as
    | ({ toObject?: () => Record<string, unknown> } & Record<string, unknown>)
    | undefined;
  const previousDocumentId = nextEvidence[evidenceIndex]?.documentId?.toString();
  nextEvidence[evidenceIndex] = {
    ...(typeof existingEvidence?.toObject === 'function'
      ? existingEvidence.toObject()
      : existingEvidence),
    documentId: payload.documentId,
    url: undefined,
    note: payload.note,
    uploadedAt: new Date(),
  } as (typeof nextEvidence)[number];
  user.kycEvidence = nextEvidence as typeof user.kycEvidence;
  user.kycStatus = 'pending';
  user.kycSubmittedAt = new Date();
  await user.save();
  if (previousDocumentId && previousDocumentId !== payload.documentId) {
    await deleteOwnVerificationDocument(previousDocumentId, userId);
  }

  await AuditLogModel.create({
    actorId: userId,
    actorRole: 'user',
    action: 'user_kyc_updated',
    entityType: 'user',
    entityId: userId,
    after: {
      kycStatus: user.kycStatus,
      kycSubmittedAt: user.kycSubmittedAt,
      evidenceId,
    },
  });

  const io = getIO();
  if (io) io.to('role:admin').emit('moderation:queue');
  return user;
}

export async function deleteUserKycEvidence(userId: string, evidenceId: string) {
  const user = await UserModel.findById(userId).select(
    'name emailOrPhone kycStatus kycEvidence kycSubmittedAt'
  );
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  if (user.kycStatus === 'verified') {
    throw Object.assign(new Error('Verified KYC cannot be deleted'), {
      status: 409,
      code: 'KYC_LOCKED',
    });
  }

  const nextEvidence = [
    ...((user.kycEvidence || []) as Array<{
      _id?: { toString(): string };
      documentId?: { toString(): string };
      url?: string;
      note?: string;
      uploadedAt: Date;
    }>),
  ];
  const evidenceIndex = nextEvidence.findIndex((item) => item?._id?.toString() === evidenceId);
  if (evidenceIndex < 0) {
    throw Object.assign(new Error('KYC evidence not found'), {
      status: 404,
      code: 'KYC_EVIDENCE_NOT_FOUND',
    });
  }
  const documentId = nextEvidence[evidenceIndex]?.documentId?.toString();

  user.kycEvidence = nextEvidence.filter((_, index) => index !== evidenceIndex) as typeof user.kycEvidence;
  if ((user.kycEvidence?.length || 0) === 0) {
    user.kycStatus = 'none';
    user.kycSubmittedAt = undefined;
  } else {
    user.kycStatus = 'pending';
    user.kycSubmittedAt = new Date();
  }
  await user.save();
  if (documentId) {
    await deleteOwnVerificationDocument(documentId, userId);
  }

  await AuditLogModel.create({
    actorId: userId,
    actorRole: 'user',
    action: 'user_kyc_deleted',
    entityType: 'user',
    entityId: userId,
    after: {
      kycStatus: user.kycStatus,
      kycSubmittedAt: user.kycSubmittedAt,
      evidenceId,
      remainingEvidence: user.kycEvidence?.length || 0,
    },
  });

  const io = getIO();
  if (io) io.to('role:admin').emit('moderation:queue');
  return user;
}

/** Get current user's KYC status and evidence (for profile/settings). */
export async function listUserKyc(userId: string) {
  const user = await UserModel.findById(userId).select('kycStatus kycEvidence kycSubmittedAt');
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return {
    status: user.kycStatus || 'none',
    evidence: safeEvidenceList(user.kycEvidence as unknown[] | undefined),
    submittedAt: user.kycSubmittedAt,
  };
}

/** Agent business verification: submit company/entity documents. */
export async function submitBusinessVerify(
  agentId: string,
  payload: { documentId: string; note?: string }
) {
  const user = await UserModel.findById(agentId);
  if (!user || user.role !== 'agent')
    throw Object.assign(new Error('Agent not found'), { status: 404 });
  await markDocumentPendingReview(payload.documentId, agentId, 'business_verification');

  const updated = await UserModel.findByIdAndUpdate(
    agentId,
    {
      $push: {
        businessVerifyEvidence: {
          documentId: payload.documentId,
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
      after: {
        businessVerifyStatus: (
          updated as unknown as { businessVerifyStatus?: string }
        ).businessVerifyStatus,
        businessVerifySubmittedAt: (
          updated as unknown as { businessVerifySubmittedAt?: Date }
        ).businessVerifySubmittedAt,
        evidenceCount:
          (updated as unknown as { businessVerifyEvidence?: unknown[] }).businessVerifyEvidence
            ?.length || 0,
      },
    });
    const io = getIO();
    if (io) io.to('role:admin').emit('moderation:queue');
  }
  return updated;
}
