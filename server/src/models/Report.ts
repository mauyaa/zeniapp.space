import mongoose, { Schema, Document } from 'mongoose';
import { reportCategories, reportSeverities } from '../utils/constants';

export interface ReportDocument extends Document {
  reporterId: mongoose.Types.ObjectId;
  targetType: 'listing' | 'user';
  targetId: mongoose.Types.ObjectId;
  category: (typeof reportCategories)[number];
  severity: (typeof reportSeverities)[number];
  status: 'open' | 'resolved';
  message?: string;
  action?: string;
}

const ReportSchema = new Schema<ReportDocument>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['listing', 'user'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    category: { type: String, enum: reportCategories, required: true },
    severity: { type: String, enum: reportSeverities, required: true },
    status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    message: { type: String, trim: true },
    action: String,
  },
  { timestamps: true }
);

ReportSchema.index({ status: 1, severity: 1, createdAt: -1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1 });

export const ReportModel = mongoose.model<ReportDocument>('Report', ReportSchema);
