import mongoose, { Schema, Document } from 'mongoose';
import { viewingStatuses } from '../utils/constants';

export type ViewingStatus = (typeof viewingStatuses)[number];

export const viewingFeeStatuses = ['pending_payment', 'held', 'released'] as const;
export type ViewingFeeStatus = (typeof viewingFeeStatuses)[number];

export interface ViewingRequestDocument extends Document {
  userId: mongoose.Types.ObjectId;
  agentId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  date: Date;
  note?: string;
  altDates?: Date[];
  status: ViewingStatus;
  agentReason?: string;
  agentMessage?: string;
  /** IANA timezone for display (e.g. Africa/Nairobi). Stored date is UTC. */
  timezone?: string;
  /** Viewing fee in KES; Zeni holds until showing complete + tenant confirms. */
  viewingFeeAmount?: number;
  viewingFeeTxId?: mongoose.Types.ObjectId;
  viewingFeeStatus?: ViewingFeeStatus;
  /** Set when tenant confirms viewing was completed (releases fee to agent). */
  tenantConfirmedAt?: Date;
}

const ViewingRequestSchema = new Schema<ViewingRequestDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    date: { type: Date, required: true },
    note: { type: String },
    altDates: [{ type: Date }],
    status: { type: String, enum: viewingStatuses, default: 'requested', index: true },
    agentReason: { type: String },
    agentMessage: { type: String },
    timezone: { type: String, default: 'Africa/Nairobi' },
    viewingFeeAmount: { type: Number, default: 0 },
    viewingFeeTxId: { type: Schema.Types.ObjectId, ref: 'PayTransaction', index: true },
    viewingFeeStatus: { type: String, enum: viewingFeeStatuses, index: true },
    tenantConfirmedAt: { type: Date }
  },
  { timestamps: true }
);

ViewingRequestSchema.index({ userId: 1, listingId: 1, createdAt: -1 });
ViewingRequestSchema.index({ agentId: 1, date: 1, status: 1 });
ViewingRequestSchema.index({ userId: 1, createdAt: -1 });
ViewingRequestSchema.index({ agentId: 1, createdAt: -1 });

export const ViewingRequestModel = mongoose.model<ViewingRequestDocument>('ViewingRequest', ViewingRequestSchema);
