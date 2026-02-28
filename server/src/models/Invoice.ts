/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Schema, Document } from 'mongoose';
import { payStatuses } from '../utils/constants';

export interface InvoiceDocument extends Document {
  userId: mongoose.Types.ObjectId;
  roleScope: 'user' | 'agent';
  purpose: 'booking_fee' | 'deposit' | 'subscription' | 'boost' | 'rent' | 'service_fee';
  amount: number;
  currency: string;
  status: typeof payStatuses[number];
  dueDate: Date;
  lineItems: { label: string; amount: number }[];
  metadata?: Record<string, unknown>;
}

const InvoiceSchema = new Schema<InvoiceDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roleScope: { type: String, enum: ['user', 'agent'], required: true },
    purpose: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'KES' },
    status: { type: String, enum: payStatuses, default: 'unpaid', index: true },
    dueDate: { type: Date, required: true },
    lineItems: [{ label: String, amount: Number }],
    metadata: Object
  },
  { timestamps: true }
);

InvoiceSchema.index({ userId: 1, status: 1, createdAt: -1 });
InvoiceSchema.index({ userId: 1, status: 1, dueDate: 1 });
InvoiceSchema.index({ status: 1, dueDate: 1 });
InvoiceSchema.index({ status: 1, createdAt: -1 });

export const InvoiceModel = mongoose.model<InvoiceDocument>('Invoice', InvoiceSchema);
