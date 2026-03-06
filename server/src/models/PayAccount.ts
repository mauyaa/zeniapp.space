import mongoose, { Schema, Document } from 'mongoose';

export interface PayAccountDocument extends Document {
  userId: mongoose.Types.ObjectId;
  status: 'active' | 'suspended';
  defaultCurrency: string;
  defaultMethod?: 'mpesa_stk' | 'card' | 'bank_transfer';
  createdAt: Date;
  updatedAt: Date;
}

const PayAccountSchema = new Schema<PayAccountDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    defaultCurrency: { type: String, default: 'KES' },
    defaultMethod: {
      type: String,
      enum: ['mpesa_stk', 'card', 'bank_transfer'],
      default: 'mpesa_stk',
    },
  },
  { timestamps: true }
);

export const PayAccountModel = mongoose.model<PayAccountDocument>('PayAccount', PayAccountSchema);
