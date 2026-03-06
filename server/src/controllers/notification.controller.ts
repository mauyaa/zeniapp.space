import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import {
  listNotifications,
  markAllRead,
  markRead,
  getNotificationPrefs,
  updateNotificationPrefs,
} from '../services/notification.service';
import { objectIdSchema } from '../utils/validators';

export async function listNotificationsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const items = await listNotifications(userId, limit);
  res.json(items);
}

export async function markAllReadHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  await markAllRead(userId);
  res.status(204).end();
}

export async function markReadHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const updated = await markRead(userId, id);
  if (!updated)
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Notification not found' });
  res.json(updated);
}

export async function getPrefsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const prefs = await getNotificationPrefs(userId);
  res.json(prefs);
}

export async function updatePrefsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const schema = z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
    quietHours: z
      .object({
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .optional(),
  });
  const prefs = schema.parse(req.body);
  const updated = await updateNotificationPrefs(userId, prefs);
  res.json(updated);
}
