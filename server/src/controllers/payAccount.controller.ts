import { Response } from 'express';
import { z } from 'zod';
import { PayAuthRequest } from '../middlewares/payAuth';
import { AuthRequest } from '../middlewares/auth';
import {
  ensurePayAccount,
  listPayAccounts,
  setPayAccountStatus,
  updatePayAccountDefaults,
} from '../services/payAccount.service';
import { AuditLogModel } from '../models/AuditLog';

const updateSchema = z.object({
  defaultCurrency: z.string().optional(),
  defaultMethod: z.enum(['mpesa_stk', 'card', 'bank_transfer']).optional(),
});

export async function getPayAccountController(req: PayAuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const account = await ensurePayAccount(req.user.id);
  res.json(account);
}

export async function updatePayAccountController(req: PayAuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const body = updateSchema.parse(req.body);
  const account = await updatePayAccountDefaults(req.user.id, body);
  if (!account) return res.status(404).json({ code: 'NOT_FOUND', message: 'Account not found' });
  await AuditLogModel.create({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'pay_account_update',
    entityType: 'PayAccount',
    entityId: account.id,
    after: account.toObject(),
  });
  res.json(account);
}

export async function adminListPayAccounts(_req: AuthRequest, res: Response) {
  const accounts = await listPayAccounts();
  res.json(accounts);
}

export async function adminSetPayAccountStatus(req: AuthRequest, res: Response) {
  const schema = z.object({ status: z.enum(['active', 'suspended']) });
  const body = schema.parse(req.body);
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const account = await setPayAccountStatus(req.params.userId, body.status);
  if (!account) return res.status(404).json({ code: 'NOT_FOUND', message: 'Account not found' });
  await AuditLogModel.create({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: `pay_account_${body.status}`,
    entityType: 'PayAccount',
    entityId: account.id,
    after: account.toObject(),
  });
  res.json(account);
}
