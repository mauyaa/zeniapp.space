import mongoose, { Schema, Document } from 'mongoose';

export interface PaySessionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  lastUsedAt?: Date;
  stepUpVerifiedAt?: Date;
  expiresAt: Date;
}

const PaySessionSchema = new Schema<PaySessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    userAgent: String,
    ip: String,
    lastUsedAt: Date,
    stepUpVerifiedAt: Date,
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
  },
  { timestamps: true }
);

PaySessionSchema.index({ userId: 1, createdAt: -1 });
PaySessionSchema.index({ userId: 1, lastUsedAt: -1 });

export const PaySessionModel = mongoose.model<PaySessionDocument>('PaySession', PaySessionSchema);
