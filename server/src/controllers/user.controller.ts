import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import { getUserDashboardData } from '../services/dashboard.service';
import { blockUser, unblockUser, listBlockedUserIds } from '../services/block.service';
import { exportUserData, deleteAccount } from '../services/userData.service';
import { objectIdSchema } from '../utils/validators';

export async function current(req: AuthRequest, res: Response) {
  const user = req.user;
  if (!user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  res.json({ user: { id: user.id, name: user.name, role: user.role } });
}

export async function dashboard(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const data = await getUserDashboardData(userId);
  res.json(data);
}

export async function block(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { blockedId } = z.object({ body: z.object({ blockedId: objectIdSchema }) }).parse({ body: req.body }).body;
  try {
    const out = await blockUser(userId, blockedId);
    res.status(201).json(out);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status === 400) return res.status(400).json({ code: e.code || 'INVALID', message: e.message });
    throw err;
  }
}

export async function unblock(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { blockedId } = z.object({ blockedId: objectIdSchema }).parse({ blockedId: req.params.userId });
  const out = await unblockUser(userId, blockedId);
  res.json(out);
}

export async function listBlocked(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const ids = await listBlockedUserIds(userId);
  res.json({ blockedUserIds: ids });
}

export async function exportData(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const data = await exportUserData(userId);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
  res.json(data);
}

export async function deleteMyAccount(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  await deleteAccount(userId, req);
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.status(200).json({ deleted: true });
}
