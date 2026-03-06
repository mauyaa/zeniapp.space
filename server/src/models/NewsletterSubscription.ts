import mongoose, { Schema, Document } from 'mongoose';

export interface NewsletterSubscriptionDocument extends Document {
  email: string;
  source?: string;
  userId?: mongoose.Types.ObjectId;
  status: 'active' | 'unsubscribed';
}

const NewsletterSubscriptionSchema = new Schema<NewsletterSubscriptionDocument>(
  {
    email: { type: String, required: true, unique: true },
    source: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: ['active', 'unsubscribed'], default: 'active' },
  },
  { timestamps: true }
);

export const NewsletterSubscriptionModel = mongoose.model<NewsletterSubscriptionDocument>(
  'NewsletterSubscription',
  NewsletterSubscriptionSchema
);
