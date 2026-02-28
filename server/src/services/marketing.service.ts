import mongoose from 'mongoose';
import { InsightModel } from '../models/Insight';
import { NewsletterSubscriptionModel } from '../models/NewsletterSubscription';

export async function listInsights(limit = 3) {
  const items = await InsightModel.find({ published: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return items.map((item) => ({
    id: String(item._id),
    tag: item.tag,
    title: item.title,
    desc: item.desc,
    href: item.href
  }));
}

export async function subscribeNewsletter(email: string, source?: string, userId?: string) {
  const normalized = email.trim().toLowerCase();
  const existing = await NewsletterSubscriptionModel.findOne({ email: normalized });
  if (existing) {
    if (existing.status !== 'active') {
      existing.status = 'active';
      if (source) existing.source = source;
      if (userId) existing.userId = new mongoose.Types.ObjectId(userId);
      await existing.save();
      return { status: 'reactivated' };
    }
    return { status: 'exists' };
  }

  await NewsletterSubscriptionModel.create({
    email: normalized,
    source,
    userId
  });
  return { status: 'created' };
}
