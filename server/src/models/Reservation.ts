import mongoose, { Schema, Document } from 'mongoose';

export interface ReservationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: 'held' | 'released' | 'captured';
  expiresAt: Date;
}

const ReservationSchema = new Schema<ReservationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'KES' },
    status: { type: String, enum: ['held', 'released', 'captured'], default: 'held' },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

ReservationSchema.index({ userId: 1, listingId: 1, status: 1 });
ReservationSchema.index({ status: 1, expiresAt: 1 });
ReservationSchema.index({ listingId: 1, status: 1 });

export const ReservationModel = mongoose.model<ReservationDocument>('Reservation', ReservationSchema);
