/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Schema, Document } from 'mongoose';
import { txStatuses } from '../utils/constants';

export interface PaymentTransactionDocument extends Document {
  invoiceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  method: 'mpesa_stk' | 'card' | 'bank_transfer';
  amount: number;
  status: typeof txStatuses[number];
  provider: 'mpesa';
  providerRef?: string;
  receiptNumber?: string;
  phone?: string;
  idempotencyKey: string;
  rawCallback?: unknown;
}

const TxSchema = new Schema<PaymentTransactionDocument>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', index: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    method: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: txStatuses, default: 'pending', index: true },
    provider: { type: String, default: 'mpesa' },
    providerRef: String,
    receiptNumber: String,
    phone: String,
    idempotencyKey: { type: String, unique: true },
    rawCallback: Object
  },
  { timestamps: true }
);

TxSchema.index({ invoiceId: 1, status: 1, createdAt: -1 });
TxSchema.index({ providerRef: 1 }, { unique: true, sparse: true });
TxSchema.index({ userId: 1, createdAt: -1 });

export const PaymentTransactionModel = mongoose.model<PaymentTransactionDocument>('PaymentTransaction', TxSchema);
