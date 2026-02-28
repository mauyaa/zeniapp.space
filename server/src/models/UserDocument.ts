import mongoose, { Schema, Document } from 'mongoose';

export interface UserDocDocument extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'preapproval' | 'pof' | 'id';
  url: string;
  note?: string;
  sharedListings?: mongoose.Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const UserDocSchema = new Schema<UserDocDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['preapproval', 'pof', 'id'], required: true },
    url: { type: String, required: true },
    note: String,
    sharedListings: [{ type: Schema.Types.ObjectId, ref: 'Listing' }]
  },
  { timestamps: true }
);

UserDocSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const UserDocModel = mongoose.model<UserDocDocument>('UserDoc', UserDocSchema);
