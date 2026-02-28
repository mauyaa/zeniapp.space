import mongoose, { Schema, Document } from 'mongoose';

export interface PayReceiptDocument extends Document {
  transactionId: mongoose.Types.ObjectId;
  receiptNumber: string;
  amount: number;
  currency: string;
  status: 'valid' | 'void';
  issuedAt: Date;
  hash: string;
}

const PayReceiptSchema = new Schema<PayReceiptDocument>(
  {
    transactionId: { type: Schema.Types.ObjectId, ref: 'PayTransaction', required: true, unique: true, index: true },
    receiptNumber: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'KES' },
    status: { type: String, enum: ['valid', 'void'], default: 'valid', index: true },
    issuedAt: { type: Date, default: Date.now },
    hash: { type: String, required: true, unique: true, index: true }
  },
  { timestamps: true }
);

export const PayReceiptModel = mongoose.model<PayReceiptDocument>('PayReceipt', PayReceiptSchema);
