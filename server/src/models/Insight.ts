import mongoose, { Schema, Document } from 'mongoose';

export interface InsightDocument extends Document {
  tag: string;
  title: string;
  desc: string;
  href?: string;
  published: boolean;
}

const InsightSchema = new Schema<InsightDocument>(
  {
    tag: { type: String, required: true },
    title: { type: String, required: true },
    desc: { type: String, required: true },
    href: String,
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

InsightSchema.index({ published: 1, createdAt: -1 });

export const InsightModel = mongoose.model<InsightDocument>('Insight', InsightSchema);
