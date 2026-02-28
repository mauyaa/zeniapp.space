import { Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AuthSessionModel, AuthSessionDocument } from '../models/AuthSession';
import { AuthRequest } from './auth';

export const adminStepUpProtected = [
  'PATCH /api/admin/users/:id/status',
  'DELETE /api/admin/users/:id',
  'PATCH /api/admin/verification/agents/:id',
  'PATCH /api/admin/verification/listings/:id',
  'GET /api/admin/reports/export',
  'GET /api/admin/agents/export',
  'GET /api/admin/listings/export',
  'PATCH /api/admin/pay/accounts/:userId/status'
];

export function requireAdminStepUp(maxAgeMinutes = 10) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (env.nodeEnv === 'test') return next();
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Admin only' });
    }
    const sid = req.authSessionId;
    if (!sid) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Session missing' });
    const session: AuthSessionDocument | null =
      (req.authSession as AuthSessionDocument | null) || (await AuthSessionModel.findById(sid));
    if (!session) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Session not found' });
    if (!session.stepUpVerifiedAt) {
      return res.status(403).json({ code: 'STEP_UP_REQUIRED', message: 'Admin step-up required' });
    }
    const ageMs = Date.now() - new Date(session.stepUpVerifiedAt).getTime();
    if (ageMs > maxAgeMinutes * 60 * 1000) {
      return res.status(403).json({ code: 'STEP_UP_EXPIRED', message: 'Admin step-up expired' });
    }
    next();
  };
}
