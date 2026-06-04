import mongoose, { Document, Schema } from 'mongoose';

export interface VerificationDocumentAccessLogDocument extends Document {
  documentId: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  actorRole: string;
  action: 'view' | 'download' | 'delete' | 'upload';
  allowed: boolean;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const VerificationDocumentAccessLogSchema = new Schema<VerificationDocumentAccessLogDocument>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'VerificationDocument',
      required: true,
      index: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: { type: String, required: true },
    action: { type: String, enum: ['view', 'download', 'delete', 'upload'], required: true },
    allowed: { type: Boolean, required: true },
    requestId: String,
    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

VerificationDocumentAccessLogSchema.index({ documentId: 1, createdAt: -1 });

export const VerificationDocumentAccessLogModel =
  mongoose.model<VerificationDocumentAccessLogDocument>(
    'VerificationDocumentAccessLog',
    VerificationDocumentAccessLogSchema
  );
