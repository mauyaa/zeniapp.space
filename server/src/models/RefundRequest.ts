import mongoose, { Schema, Document } from 'mongoose';

export const refundRequestStatuses = ['pending', 'approved', 'rejected'] as const;
export type RefundRequestStatus = (typeof refundRequestStatuses)[number];

export interface RefundRequestDocument extends Document {
  userId: mongoose.Types.ObjectId;
  transactionId: mongoose.Types.ObjectId;
  reason: string;
  status: RefundRequestStatus;
  adminNotes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefundRequestSchema = new Schema<RefundRequestDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'PayTransaction',
      required: true,
      index: true,
    },
    reason: { type: String, required: true },
    status: { type: String, enum: refundRequestStatuses, default: 'pending', index: true },
    adminNotes: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { timestamps: true }
);

RefundRequestSchema.index({ status: 1, createdAt: -1 });

export const RefundRequestModel = mongoose.model<RefundRequestDocument>(
  'RefundRequest',
  RefundRequestSchema
);
