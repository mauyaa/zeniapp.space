import { NotificationModel } from '../models/Notification';
import { getIO } from '../socket';
import { UserModel } from '../models/User';
import type { NotificationPayload } from '../types/notification';

/** In-app only by default. Register senders for email/SMS/push to enable those channels. */
const channelSenders: Array<import('../types/notification').INotificationSender> = [];

export function registerNotificationSender(
  sender: import('../types/notification').INotificationSender
) {
  channelSenders.push(sender);
}

export async function createNotification(
  userId: string,
  payload: { title: string; description?: string; type?: string; actionUrl?: string }
) {
  const note = await NotificationModel.create({ userId, ...payload });
  const io = getIO();
  if (io) io.to(`user:${userId}`).emit('notification:new', note);
  const fullPayload: NotificationPayload = { userId, ...payload };
  for (const sender of channelSenders) {
    sender.send(fullPayload).catch((err) => console.error('[notification]', sender.channel, err));
  }
  return note;
}

export function listNotifications(userId: string, limit = 50) {
  return NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(limit);
}

export function markAllRead(userId: string) {
  return NotificationModel.updateMany({ userId, read: false }, { read: true });
}

export function markRead(userId: string, id: string) {
  return NotificationModel.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true });
}

export async function getNotificationPrefs(userId: string) {
  const user = await UserModel.findById(userId).select('notificationPrefs');
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return user.notificationPrefs;
}

export async function updateNotificationPrefs(
  userId: string,
  prefs: Partial<{
    email: boolean;
    sms: boolean;
    push: boolean;
    quietHours: { start: string; end: string };
  }>
) {
  const updated = await UserModel.findByIdAndUpdate(
    userId,
    { $set: { notificationPrefs: prefs } },
    { new: true, projection: 'notificationPrefs' }
  );
  if (!updated) throw Object.assign(new Error('User not found'), { status: 404 });
  return updated.notificationPrefs;
}
