import mongoose, { Schema, Document } from 'mongoose';

export interface SavedSearchDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  params: Record<string, unknown>;
  alertsEnabled?: boolean;
  snoozeUntil?: Date | null;
  shareToken?: string | null;
  shareTokenExpiresAt?: Date | null;
  lastUsedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const SavedSearchSchema = new Schema<SavedSearchDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    name: { type: String, required: true },
    params: { type: Schema.Types.Mixed, default: {} },
    alertsEnabled: { type: Boolean, default: true },
    snoozeUntil: { type: Date, default: null },
    shareToken: { type: String, default: null },
    shareTokenExpiresAt: { type: Date, default: null },
    lastUsedAt: Date,
  },
  { timestamps: true }
);

SavedSearchSchema.index({ userId: 1, createdAt: -1 });
SavedSearchSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

export const SavedSearchModel = mongoose.model<SavedSearchDocument>(
  'SavedSearch',
  SavedSearchSchema
);
