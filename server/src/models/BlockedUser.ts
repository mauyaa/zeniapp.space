import mongoose, { Schema, Document } from 'mongoose';

export interface BlockedUserDocument extends Document {
  blockerId: mongoose.Types.ObjectId;
  blockedId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BlockedUserSchema = new Schema<BlockedUserDocument>(
  {
    blockerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blockedId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);
BlockedUserSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export const BlockedUserModel = mongoose.model<BlockedUserDocument>(
  'BlockedUser',
  BlockedUserSchema
);
