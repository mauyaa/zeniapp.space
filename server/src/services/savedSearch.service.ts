import crypto from 'crypto';
import { SavedSearchModel } from '../models/SavedSearch';

const SHARE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function listSavedSearches(userId: string) {
  const items = await SavedSearchModel.find({ userId }).sort({ createdAt: -1 }).lean();
  return items.map((item) => ({
    id: String(item._id),
    name: item.name,
    params: item.params || {},
    alertsEnabled: item.alertsEnabled ?? true,
    snoozeUntil: item.snoozeUntil,
    shareToken: item.shareToken,
    shareTokenExpiresAt: item.shareTokenExpiresAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

export async function createSavedSearch(
  userId: string,
  name: string,
  params: Record<string, unknown>
) {
  const saved = await SavedSearchModel.create({
    userId,
    name,
    params,
    alertsEnabled: true,
  });
  return {
    id: String(saved._id),
    name: saved.name,
    params: saved.params || {},
    alertsEnabled: saved.alertsEnabled ?? true,
    snoozeUntil: saved.snoozeUntil,
    shareToken: saved.shareToken,
    shareTokenExpiresAt: saved.shareTokenExpiresAt,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
  };
}

export async function deleteSavedSearch(userId: string, id: string) {
  const deleted = await SavedSearchModel.findOneAndDelete({ _id: id, userId });
  return deleted ? { success: true } : null;
}

export async function updateSavedSearch(
  userId: string,
  id: string,
  data: Partial<{
    name: string;
    params: Record<string, unknown>;
    alertsEnabled: boolean;
    snoozeUntil: Date | null;
  }>
) {
  const update: Partial<{
    name: string;
    params: Record<string, unknown>;
    alertsEnabled: boolean;
    snoozeUntil: Date | null;
  }> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.params !== undefined) update.params = data.params;
  if (data.alertsEnabled !== undefined) update.alertsEnabled = data.alertsEnabled;
  if (data.snoozeUntil !== undefined) update.snoozeUntil = data.snoozeUntil;
  if (!Object.keys(update).length) return null;

  const saved = await SavedSearchModel.findOneAndUpdate({ _id: id, userId }, update, { new: true });
  if (!saved) return null;
  return {
    id: String(saved._id),
    name: saved.name,
    params: saved.params || {},
    alertsEnabled: saved.alertsEnabled ?? true,
    snoozeUntil: saved.snoozeUntil,
    shareToken: saved.shareToken,
    shareTokenExpiresAt: saved.shareTokenExpiresAt,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
  };
}

export async function duplicateSavedSearch(userId: string, id: string) {
  const original = await SavedSearchModel.findOne({ _id: id, userId });
  if (!original) return null;
  const copy = await SavedSearchModel.create({
    userId,
    name: `${original.name} (copy)`,
    params: original.params,
    alertsEnabled: original.alertsEnabled,
    snoozeUntil: original.snoozeUntil,
  });
  return {
    id: String(copy._id),
    name: copy.name,
    params: copy.params || {},
    alertsEnabled: copy.alertsEnabled ?? true,
    snoozeUntil: copy.snoozeUntil,
    shareToken: copy.shareToken,
    shareTokenExpiresAt: copy.shareTokenExpiresAt,
    createdAt: copy.createdAt,
    updatedAt: copy.updatedAt,
  };
}

export async function shareSavedSearch(userId: string, id: string) {
  const shareTokenExpiresAt = new Date(Date.now() + SHARE_TOKEN_TTL_MS);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = crypto.randomBytes(12).toString('hex');
    try {
      const updated = await SavedSearchModel.findOneAndUpdate(
        { _id: id, userId },
        { shareToken: token, shareTokenExpiresAt },
        { new: true }
      );
      if (!updated) return null;
      return token;
    } catch (error: unknown) {
      if ((error as { code?: number })?.code !== 11000) throw error;
    }
  }

  throw Object.assign(new Error('Unable to allocate a unique share token'), {
    status: 500,
    code: 'SHARE_TOKEN_FAILED',
  });
}

export async function getSharedSavedSearch(token: string) {
  const now = new Date();
  const doc = await SavedSearchModel.findOne({
    shareToken: token,
    $or: [{ shareTokenExpiresAt: null }, { shareTokenExpiresAt: { $gt: now } }],
  }).lean();
  if (!doc) return null;
  return {
    id: String(doc._id),
    name: doc.name,
    params: doc.params || {},
    alertsEnabled: doc.alertsEnabled ?? true,
    snoozeUntil: doc.snoozeUntil,
    shareTokenExpiresAt: doc.shareTokenExpiresAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
