import mongoose, { Schema, Document } from 'mongoose';
import { conversationStatuses, leadStages } from '../utils/constants';

export interface ConversationDocument extends Document {
  listingId?: mongoose.Types.ObjectId | null;
  userId: mongoose.Types.ObjectId;
  agentId: mongoose.Types.ObjectId;
  status: (typeof conversationStatuses)[number];
  leadStage: (typeof leadStages)[number];
  lastMessageAt: Date;
  unreadCountBy: Record<string, number>;
  pinnedBy: Record<string, boolean>;
  mutedBy: Record<string, boolean>;
  /** Per-user last read timestamp for "seen" semantics. */
  lastReadAtBy?: Record<string, Date>;
}

const ConversationSchema = new Schema<ConversationDocument>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: false, default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: conversationStatuses, default: 'active' },
    leadStage: { type: String, enum: leadStages, default: 'new' },
    lastMessageAt: { type: Date, default: Date.now },
    unreadCountBy: { type: Map, of: Number, default: {} },
    pinnedBy: { type: Map, of: Boolean, default: {} },
    mutedBy: { type: Map, of: Boolean, default: {} },
    lastReadAtBy: { type: Map, of: Date, default: {} },
  },
  { timestamps: true }
);

ConversationSchema.index({ listingId: 1, userId: 1, agentId: 1 }, { unique: true });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ userId: 1, lastMessageAt: -1 });
ConversationSchema.index({ agentId: 1, lastMessageAt: -1 });
ConversationSchema.index({ status: 1, lastMessageAt: -1 });
ConversationSchema.index({ agentId: 1, status: 1 });

export const ConversationModel = mongoose.model<ConversationDocument>(
  'Conversation',
  ConversationSchema
);
