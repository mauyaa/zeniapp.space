import mongoose, { Schema, Document } from 'mongoose';

export interface AuthSessionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  userAgent?: string;
  ip?: string;
  lastUsedAt?: Date;
  expiresAt: Date;
  stepUpVerifiedAt?: Date;
}

const AuthSessionSchema = new Schema<AuthSessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    userAgent: String,
    ip: String,
    lastUsedAt: Date,
    stepUpVerifiedAt: Date,
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

export const AuthSessionModel = mongoose.model<AuthSessionDocument>(
  'AuthSession',
  AuthSessionSchema
);
