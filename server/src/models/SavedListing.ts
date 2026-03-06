import mongoose, { Schema, Document } from 'mongoose';

export interface SavedListingDocument extends Document {
  userId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  alert: boolean;
}

const SavedListingSchema = new Schema<SavedListingDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', index: true, required: true },
    alert: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SavedListingSchema.index({ userId: 1, listingId: 1 }, { unique: true });

export const SavedListingModel = mongoose.model<SavedListingDocument>(
  'SavedListing',
  SavedListingSchema
);
