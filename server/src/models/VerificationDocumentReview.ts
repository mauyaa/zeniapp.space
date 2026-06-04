import mongoose, { Document, Schema } from 'mongoose';

export interface VerificationDocumentReviewDocument extends Document {
  documentId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  decision: 'approved' | 'rejected';
  note?: string;
  createdAt: Date;
}

const VerificationDocumentReviewSchema = new Schema<VerificationDocumentReviewDocument>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'VerificationDocument',
      required: true,
      index: true,
    },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    decision: { type: String, enum: ['approved', 'rejected'], required: true },
    note: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

VerificationDocumentReviewSchema.index({ documentId: 1, createdAt: -1 });

export const VerificationDocumentReviewModel = mongoose.model<VerificationDocumentReviewDocument>(
  'VerificationDocumentReview',
  VerificationDocumentReviewSchema
);
