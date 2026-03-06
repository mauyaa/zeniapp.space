import mongoose, { Schema, Document } from 'mongoose';

export interface NotificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type?: 'message' | 'viewing' | 'system';
  read: boolean;
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    type: { type: String },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const NotificationModel = mongoose.model<NotificationDocument>(
  'Notification',
  NotificationSchema
);
