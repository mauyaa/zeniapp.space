import mongoose, { Document, Schema } from 'mongoose';
import type { VerificationDocumentPurpose } from './VerificationDocument';
import { verificationDocumentPurposes } from './VerificationDocument';

export interface VerificationDocumentRetentionPolicyDocument extends Document {
  purpose: VerificationDocumentPurpose;
  retentionDays: number;
  deleteEncryptedPayloadOnExpiry: boolean;
  legalHold: boolean;
  updatedBy?: mongoose.Types.ObjectId;
}

const VerificationDocumentRetentionPolicySchema =
  new Schema<VerificationDocumentRetentionPolicyDocument>(
    {
      purpose: { type: String, enum: verificationDocumentPurposes, required: true, unique: true },
      retentionDays: { type: Number, required: true, min: 1 },
      deleteEncryptedPayloadOnExpiry: { type: Boolean, default: true },
      legalHold: { type: Boolean, default: false },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  );

export const VerificationDocumentRetentionPolicyModel =
  mongoose.model<VerificationDocumentRetentionPolicyDocument>(
    'VerificationDocumentRetentionPolicy',
    VerificationDocumentRetentionPolicySchema
  );
