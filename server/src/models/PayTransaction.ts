import mongoose, { Schema, Document } from 'mongoose';
import { txStatuses } from '../utils/constants';

export const payPurposes = [
  'booking_fee',
  'viewing_fee',
  'deposit',
  'subscription',
  'boost',
  'rent',
  'service_fee',
  'property_purchase',
  'other'
] as const;
export type PayPurpose = (typeof payPurposes)[number];

export interface PayTransactionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: 'mpesa_stk' | 'card' | 'bank_transfer';
  status: typeof txStatuses[number];
  ref?: string;
  receiptId?: mongoose.Types.ObjectId;
  idempotencyKey: string;
  /** What this payment is for (accounting/reporting). */
  purpose?: PayPurpose;
  /** Link to Invoice when payment is against an invoice. */
  invoiceId?: mongoose.Types.ObjectId;
  /** Business reference (e.g. listingId, viewingId). */
  referenceId?: string;
  rawCallback?: Record<string, unknown>;
  approvals?: Array<{
    userId: mongoose.Types.ObjectId;
    action: string;
    at: Date;
  }>;
  riskScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  riskFlags?: string[];
}

const PayTransactionSchema = new Schema<PayTransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'KES' },
    method: { type: String, required: true },
    status: { type: String, enum: txStatuses, default: 'pending', index: true },
    ref: { type: String },
    receiptId: { type: Schema.Types.ObjectId, ref: 'PayReceipt' },
    idempotencyKey: { type: String, required: true, unique: true },
    purpose: { type: String, enum: payPurposes, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', index: true },
    referenceId: { type: String, index: true },
    rawCallback: Object,
    riskScore: { type: Number, default: 0 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low', index: true },
    riskFlags: { type: [String], default: [] },
    approvals: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        action: String,
        at: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

PayTransactionSchema.index({ userId: 1, createdAt: -1 });
PayTransactionSchema.index({ ref: 1 }, { unique: true, sparse: true });
PayTransactionSchema.index({ status: 1, createdAt: -1 });
PayTransactionSchema.index({ riskLevel: 1, createdAt: -1 });

export const PayTransactionModel = mongoose.model<PayTransactionDocument>('PayTransaction', PayTransactionSchema);
