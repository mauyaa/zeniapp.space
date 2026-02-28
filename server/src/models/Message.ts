/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Schema, Document } from 'mongoose';

export interface MessageDocument extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderType: 'user' | 'agent' | 'bot' | 'system';
  type: 'text' | 'quickReply' | 'schedule' | 'summary' | 'system' | 'attachment';
  content: unknown;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  /** Client-provided id for dedupe; unique per conversation. */
  clientTempId?: string;
}

const MessageSchema = new Schema<MessageDocument>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true, required: true },
    senderType: { type: String, required: true },
    type: { type: String, required: true },
    content: Schema.Types.Mixed,
    status: { type: String, default: 'sent' },
    clientTempId: { type: String, index: true }
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ conversationId: 1, clientTempId: 1 }, { unique: true, sparse: true });
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 730 * 24 * 60 * 60 });

export const MessageModel = mongoose.model<MessageDocument>('Message', MessageSchema);
