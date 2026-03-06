import mongoose, { Schema, Document } from 'mongoose';

/**
 * Stores hashes of refresh tokens that have been rotated (used).
 * If the same token is presented again, it's token reuse (theft) -> revoke all sessions.
 * TTL 1 hour so we only detect reuse within a short window.
 */
export interface UsedRefreshTokenHashDocument extends Document {
  tokenHash: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
}

const UsedRefreshTokenHashSchema = new Schema<UsedRefreshTokenHashDocument>(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);
UsedRefreshTokenHashSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UsedRefreshTokenHashModel = mongoose.model<UsedRefreshTokenHashDocument>(
  'UsedRefreshTokenHash',
  UsedRefreshTokenHashSchema
);
