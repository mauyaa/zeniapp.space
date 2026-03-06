import mongoose, { Schema, Document } from 'mongoose';

export interface SavedListingShareDocument extends Document {
  ownerId: mongoose.Types.ObjectId;
  listingIds: mongoose.Types.ObjectId[];
  token: string;
  createdAt?: Date;
}

const SavedListingShareSchema = new Schema<SavedListingShareDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    listingIds: [{ type: Schema.Types.ObjectId, ref: 'Listing', required: true }],
    token: { type: String, required: true },
  },
  { timestamps: true }
);

SavedListingShareSchema.index({ token: 1 }, { unique: true });

export const SavedListingShareModel = mongoose.model<SavedListingShareDocument>(
  'SavedListingShare',
  SavedListingShareSchema
);
