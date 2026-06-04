import mongoose, { Document, Schema } from 'mongoose';

export const verificationDocumentPurposes = [
  'kyc_identity',
  'agent_identity',
  'business_verification',
] as const;
export type VerificationDocumentPurpose = (typeof verificationDocumentPurposes)[number];

export const verificationDocumentTypes = [
  'national_id',
  'passport',
  'driver_license',
  'agent_license',
  'business_registration',
  'proof_of_address',
] as const;
export type VerificationDocumentType = (typeof verificationDocumentTypes)[number];

export const verificationDocumentTypesByPurpose: Record<
  VerificationDocumentPurpose,
  readonly VerificationDocumentType[]
> = {
  kyc_identity: ['national_id', 'passport', 'driver_license', 'proof_of_address'],
  agent_identity: ['national_id', 'passport', 'driver_license', 'agent_license'],
  business_verification: ['business_registration', 'proof_of_address'],
};

export function isVerificationDocumentTypeAllowed(
  purpose: VerificationDocumentPurpose,
  documentType: VerificationDocumentType
) {
  return verificationDocumentTypesByPurpose[purpose].includes(documentType);
}

export const verificationDocumentStatuses = [
  'uploaded',
  'pending_review',
  'approved',
  'rejected',
  'expired',
  'deleted',
  'migrated_from_public_url',
] as const;
export type VerificationDocumentStatus = (typeof verificationDocumentStatuses)[number];

export interface VerificationDocumentDocument extends Document {
  ownerId: mongoose.Types.ObjectId;
  purpose: VerificationDocumentPurpose;
  documentType: VerificationDocumentType;
  status: VerificationDocumentStatus;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  encryptedBytes?: Buffer;
  encryptionIv?: Buffer;
  encryptionTag?: Buffer;
  storageProvider: 'mongodb_encrypted' | 'legacy_public_url';
  legacyPublicUrl?: string;
  scanStatus: 'pending' | 'clean' | 'rejected' | 'error';
  scanProvider: string;
  expiresAt: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationDocumentSchema = new Schema<VerificationDocumentDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, enum: verificationDocumentPurposes, required: true, index: true },
    documentType: { type: String, enum: verificationDocumentTypes, required: true },
    status: {
      type: String,
      enum: verificationDocumentStatuses,
      default: 'uploaded',
      index: true,
    },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, required: true },
    encryptedBytes: Buffer,
    encryptionIv: Buffer,
    encryptionTag: Buffer,
    storageProvider: {
      type: String,
      enum: ['mongodb_encrypted', 'legacy_public_url'],
      required: true,
    },
    legacyPublicUrl: String,
    scanStatus: {
      type: String,
      enum: ['pending', 'clean', 'rejected', 'error'],
      default: 'pending',
      index: true,
    },
    scanProvider: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    deletedAt: Date,
  },
  { timestamps: true }
);

VerificationDocumentSchema.index({ ownerId: 1, purpose: 1, createdAt: -1 });
VerificationDocumentSchema.index({ status: 1, expiresAt: 1 });

export const VerificationDocumentModel = mongoose.model<VerificationDocumentDocument>(
  'VerificationDocument',
  VerificationDocumentSchema
);
