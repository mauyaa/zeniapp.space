import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import {
  createRefundRequest,
  listRefundRequestsByUser,
  listRefundRequestsAdmin,
  resolveRefundRequest,
  getEligibleTransactionsForRefund,
} from '../services/refundRequest.service';
import { objectIdSchema } from '../utils/validators';

export async function create(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const schema = z.object({
    body: z.object({ transactionId: objectIdSchema, reason: z.string().min(10).max(500) }),
  });
  const { body } = schema.parse(req);
  try {
    const doc = await createRefundRequest(userId, body.transactionId, body.reason);
    res.status(201).json(doc);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 404) return res.status(404).json({ code: 'NOT_FOUND', message: e.message });
    if (e.status === 403) return res.status(403).json({ code: 'FORBIDDEN', message: e.message });
    if (e.status === 400) return res.status(400).json({ code: 'BAD_REQUEST', message: e.message });
    if (e.status === 409) return res.status(409).json({ code: 'CONFLICT', message: e.message });
    throw err;
  }
}

export async function listMine(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const list = await listRefundRequestsByUser(userId);
  res.json(list);
}

export async function eligibleTransactions(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const list = await getEligibleTransactionsForRefund(userId);
  res.json(list);
}

export async function listAdmin(req: AuthRequest, res: Response) {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const list = await listRefundRequestsAdmin(status);
  res.json(list);
}

export async function resolve(req: AuthRequest, res: Response) {
  const adminId = req.user?.id;
  if (!adminId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const schema = z.object({
    params: z.object({ id: objectIdSchema }),
    body: z.object({
      decision: z.enum(['approved', 'rejected']),
      adminNotes: z.string().max(500).optional(),
    }),
  });
  const { params, body } = schema.parse(req);
  try {
    const doc = await resolveRefundRequest(params.id, adminId, body.decision, body.adminNotes, req);
    res.json(doc);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 404) return res.status(404).json({ code: 'NOT_FOUND', message: e.message });
    if (e.status === 409) return res.status(409).json({ code: 'CONFLICT', message: e.message });
    throw err;
  }
}
