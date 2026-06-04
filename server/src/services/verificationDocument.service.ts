import crypto from 'crypto';
import mongoose from 'mongoose';
import { env } from '../config/env';
import {
  VerificationDocumentModel,
  isVerificationDocumentTypeAllowed,
  type VerificationDocumentDocument,
  type VerificationDocumentPurpose,
  type VerificationDocumentType,
} from '../models/VerificationDocument';
import { VerificationDocumentAccessLogModel } from '../models/VerificationDocumentAccessLog';
import { VerificationDocumentReviewModel } from '../models/VerificationDocumentReview';
import { VerificationDocumentRetentionPolicyModel } from '../models/VerificationDocumentRetentionPolicy';
import type { AuthRequest } from '../middlewares/auth';
import { recordAudit } from '../utils/audit';

export const MAX_PRIVATE_DOCUMENT_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;

type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

type SafeDocument = {
  id: string;
  purpose: VerificationDocumentPurpose;
  documentType: VerificationDocumentType;
  status: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: string;
  uploadedAt: Date;
};

function encryptionKey() {
  const material =
    env.verificationDocumentEncryptionKey ||
    (env.nodeEnv === 'production' ? '' : `development-only:${env.jwtSecret}`);
  if (!material) {
    throw Object.assign(new Error('Private document encryption is not configured'), {
      status: 503,
      code: 'PRIVATE_STORAGE_DISABLED',
    });
  }
  return crypto.createHash('sha256').update(material).digest();
}

export function sanitizeVerificationFilename(filename: string) {
  const normalized = filename.normalize('NFKD').replace(/[^\x20-\x7E]/g, '');
  const base = normalized.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return (base.slice(0, 96) || 'verification-document').replace(/^\.+/, 'document-');
}

function detectMimeType(bytes: Buffer): (typeof ACCEPTED_MIME_TYPES)[number] | null {
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString('hex') === '89504e47') {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes.subarray(0, 3).toString('hex') === 'ffd8ff') {
    return 'image/jpeg';
  }
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }
  return null;
}

function validateDocumentFile(file: UploadedFile) {
  if (!file.buffer?.length) {
    throw Object.assign(new Error('No document uploaded'), {
      status: 400,
      code: 'NO_FILE',
    });
  }
  if (file.size > MAX_PRIVATE_DOCUMENT_BYTES) {
    throw Object.assign(new Error('Verification documents must be 5MB or smaller'), {
      status: 413,
      code: 'FILE_TOO_LARGE',
    });
  }
  const detectedMime = detectMimeType(file.buffer);
  if (!detectedMime || !ACCEPTED_MIME_TYPES.includes(detectedMime)) {
    throw Object.assign(new Error('Only PDF, JPEG and PNG verification documents are allowed'), {
      status: 400,
      code: 'INVALID_DOCUMENT_TYPE',
    });
  }
  if (file.mimetype !== detectedMime) {
    throw Object.assign(new Error('Uploaded document type does not match its contents'), {
      status: 400,
      code: 'MIME_MISMATCH',
    });
  }
  return detectedMime;
}

async function scanDocument(bytes: Buffer) {
  // Adapter boundary for a managed malware scanner. This baseline blocks the standard EICAR marker.
  const content = bytes.toString('utf8');
  if (content.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
    throw Object.assign(new Error('Document failed malware screening'), {
      status: 400,
      code: 'DOCUMENT_REJECTED',
    });
  }
  return { status: 'clean' as const, provider: 'baseline-signature-scanner' };
}

function encrypt(bytes: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encryptedBytes = Buffer.concat([cipher.update(bytes), cipher.final()]);
  const encryptionTag = cipher.getAuthTag();
  return { encryptedBytes, encryptionIv: iv, encryptionTag };
}

function decrypt(document: VerificationDocumentDocument) {
  if (!document.encryptedBytes || !document.encryptionIv || !document.encryptionTag) {
    throw Object.assign(new Error('Document content is no longer available'), {
      status: 410,
      code: 'DOCUMENT_CONTENT_REMOVED',
    });
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), document.encryptionIv);
  decipher.setAuthTag(document.encryptionTag);
  return Buffer.concat([decipher.update(document.encryptedBytes), decipher.final()]);
}

export function safeVerificationDocument(document: VerificationDocumentDocument): SafeDocument {
  return {
    id: document.id,
    purpose: document.purpose,
    documentType: document.documentType,
    status: document.status,
    filename: document.originalFilename,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    scanStatus: document.scanStatus,
    uploadedAt: document.createdAt,
  };
}

async function getRetentionDays(purpose: VerificationDocumentPurpose) {
  const policy = await VerificationDocumentRetentionPolicyModel.findOne({ purpose }).lean();
  return policy?.retentionDays || env.verificationDocumentRetentionDays;
}

export async function uploadPrivateVerificationDocument(
  ownerId: string,
  purpose: VerificationDocumentPurpose,
  documentType: VerificationDocumentType,
  file: UploadedFile,
  req?: AuthRequest
) {
  if (!isVerificationDocumentTypeAllowed(purpose, documentType)) {
    throw Object.assign(new Error('Document type is not allowed for this verification purpose'), {
      status: 400,
      code: 'INVALID_DOCUMENT_TYPE_FOR_PURPOSE',
    });
  }
  const detectedMime = validateDocumentFile(file);
  const scan = await scanDocument(file.buffer);
  const retentionDays = await getRetentionDays(purpose);
  const encrypted = encrypt(file.buffer);
  const document = await VerificationDocumentModel.create({
    ownerId,
    purpose,
    documentType,
    status: 'uploaded',
    originalFilename: sanitizeVerificationFilename(file.originalname),
    mimeType: detectedMime,
    sizeBytes: file.size,
    sha256: crypto.createHash('sha256').update(file.buffer).digest('hex'),
    ...encrypted,
    storageProvider: 'mongodb_encrypted',
    scanStatus: scan.status,
    scanProvider: scan.provider,
    expiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
  });
  await VerificationDocumentAccessLogModel.create({
    documentId: document.id,
    actorId: ownerId,
    actorRole: req?.user?.role || 'user',
    action: 'upload',
    allowed: true,
    requestId: req?.requestId,
    ip: req?.ip,
    userAgent: req?.headers['user-agent'],
  });
  await recordAudit(
    {
      actorId: ownerId,
      actorRole: req?.user?.role || 'user',
      action: 'verification_document_uploaded',
      entityType: 'VerificationDocument',
      entityId: document.id,
      after: {
        purpose,
        documentType,
        status: document.status,
        scanStatus: document.scanStatus,
      },
    },
    req
  );
  return safeVerificationDocument(document);
}

export async function assertOwnedVerificationDocument(
  documentId: string,
  ownerId: string,
  purpose: VerificationDocumentPurpose
) {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw Object.assign(new Error('Invalid verification document id'), {
      status: 400,
      code: 'INVALID_DOCUMENT_ID',
    });
  }
  const document = await VerificationDocumentModel.findOne({
    _id: documentId,
    ownerId,
    purpose,
    status: { $nin: ['deleted', 'expired'] },
    scanStatus: 'clean',
  });
  if (!document) {
    throw Object.assign(new Error('Verification document unavailable'), {
      status: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });
  }
  return document;
}

export async function markDocumentPendingReview(
  documentId: string,
  ownerId: string,
  purpose: VerificationDocumentPurpose
) {
  const document = await assertOwnedVerificationDocument(documentId, ownerId, purpose);
  document.status = 'pending_review';
  await document.save();
  return document;
}

export async function listOwnVerificationDocuments(ownerId: string) {
  const documents = await VerificationDocumentModel.find({ ownerId })
    .sort({ createdAt: -1 })
    .select('-encryptedBytes -encryptionIv -encryptionTag -sha256 -legacyPublicUrl');
  return documents.map(safeVerificationDocument);
}

export async function deleteOwnVerificationDocument(
  documentId: string,
  ownerId: string,
  req?: AuthRequest
) {
  const document = await VerificationDocumentModel.findOne({ _id: documentId, ownerId });
  if (!document) {
    throw Object.assign(new Error('Verification document not found'), {
      status: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });
  }
  if (document.status === 'approved') {
    throw Object.assign(
      new Error('Approved verification documents cannot be deleted by the uploader'),
      {
        status: 409,
        code: 'DOCUMENT_LOCKED',
      }
    );
  }
  document.status = 'deleted';
  document.deletedAt = new Date();
  document.encryptedBytes = undefined;
  document.encryptionIv = undefined;
  document.encryptionTag = undefined;
  await document.save();
  await VerificationDocumentAccessLogModel.create({
    documentId: document.id,
    actorId: ownerId,
    actorRole: req?.user?.role || 'user',
    action: 'delete',
    allowed: true,
    requestId: req?.requestId,
    ip: req?.ip,
    userAgent: req?.headers['user-agent'],
  });
}

export async function downloadVerificationDocumentForAdmin(documentId: string, req: AuthRequest) {
  const document = await VerificationDocumentModel.findById(documentId);
  const actorId = req.user?.id;
  const reviewableStatuses = new Set([
    'pending_review',
    'approved',
    'rejected',
    'migrated_from_public_url',
  ]);
  const allowed = Boolean(document && actorId && reviewableStatuses.has(document.status));
  if (document) {
    await VerificationDocumentAccessLogModel.create({
      documentId: document.id,
      actorId,
      actorRole: req.user?.role || 'unknown',
      action: 'view',
      allowed,
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
  if (!document || !actorId || !allowed) {
    throw Object.assign(new Error('Verification document not found'), {
      status: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });
  }
  await recordAudit(
    {
      actorId,
      actorRole: req.user?.role || 'unknown',
      action: 'verification_document_viewed',
      entityType: 'VerificationDocument',
      entityId: document.id,
      after: { purpose: document.purpose, ownerId: document.ownerId.toString() },
    },
    req
  );
  return {
    bytes: decrypt(document),
    mimeType: document.mimeType,
    filename: document.originalFilename,
  };
}

export async function reviewDocumentsForOwnerPurpose(
  ownerId: string,
  purpose: VerificationDocumentPurpose,
  reviewerId: string,
  decision: 'approve' | 'reject'
) {
  const status = decision === 'approve' ? 'approved' : 'rejected';
  const documents = await VerificationDocumentModel.find({
    ownerId,
    purpose,
    status: 'pending_review',
  });
  for (const document of documents) {
    document.status = status;
    await document.save();
    await VerificationDocumentReviewModel.create({
      documentId: document.id,
      reviewerId,
      decision: status,
    });
  }
  return documents.length;
}

export async function expireVerificationDocuments(now = new Date()) {
  const expired = await VerificationDocumentModel.find({
    expiresAt: { $lte: now },
    status: { $nin: ['deleted', 'expired'] },
  });
  for (const document of expired) {
    const policy = await VerificationDocumentRetentionPolicyModel.findOne({
      purpose: document.purpose,
    }).lean();
    if (policy?.legalHold) continue;
    document.status = 'expired';
    if (policy?.deleteEncryptedPayloadOnExpiry !== false) {
      document.encryptedBytes = undefined;
      document.encryptionIv = undefined;
      document.encryptionTag = undefined;
    }
    await document.save();
  }
  return expired.filter((document) => document.status === 'expired').length;
}
