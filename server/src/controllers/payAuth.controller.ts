import { Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../services/auth.service';
import {
  createPaySession,
  rotatePaySession,
  signPayAccessToken,
  invalidatePaySession,
} from '../services/payAuth.service';
import { UserModel } from '../models/User';
import { PaySessionModel } from '../models/PaySession';
import { PayAuthRequest } from '../middlewares/payAuth';
import { env } from '../config/env';
import { AuditLogModel } from '../models/AuditLog';

const loginSchema = z.object({
  emailOrPhone: z.string(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const stepUpSchema = z.object({
  code: z.string().min(4),
});

export async function payLogin(req: Request, res: Response) {
  const body = loginSchema.parse(req.body);
  const user = await authenticate(body.emailOrPhone, body.password);
  // Ensure pay account exists for legacy users
  const { ensurePayAccount } = await import('../services/payAccount.service');
  await ensurePayAccount(user.id);

  const { accessToken, refreshToken, sessionId, expiresAt } = await createPaySession(user, {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  await AuditLogModel.create({
    actorId: user.id,
    actorRole: user.role,
    action: 'pay_login',
    entityType: 'pay_session',
    entityId: sessionId,
    after: { ip: req.ip, ua: req.headers['user-agent'] },
  });

  res.json({
    accessToken,
    refreshToken,
    sessionId,
    refreshExpiresAt: expiresAt,
    user: { id: user.id, name: user.name, role: user.role },
  });
}

export async function payRefresh(req: Request, res: Response) {
  const body = refreshSchema.parse(req.body);
  const rotated = await rotatePaySession(body.refreshToken);
  if (!rotated)
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid refresh token' });

  const userDoc = await UserModel.findById(rotated.session.userId);
  if (!userDoc) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid session' });
  if (userDoc.status === 'banned' || userDoc.status === 'suspended') {
    return res.status(403).json({ code: 'ACCOUNT_DISABLED', message: 'Account is disabled' });
  }

  const accessToken = signPayAccessToken(userDoc, rotated.session.id);
  await AuditLogModel.create({
    actorId: userDoc.id,
    actorRole: userDoc.role,
    action: 'pay_refresh',
    entityType: 'pay_session',
    entityId: rotated.session.id,
  });
  res.json({
    accessToken,
    refreshToken: rotated.refreshToken,
    refreshExpiresAt: rotated.expiresAt,
    user: { id: userDoc.id, name: userDoc.name, role: userDoc.role },
  });
}

export async function payLogout(req: PayAuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  if (req.paySession) {
    await invalidatePaySession(req.paySession.id);
    await AuditLogModel.create({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'pay_logout',
      entityType: 'pay_session',
      entityId: req.paySession.id,
    });
  }
  res.status(204).end();
}

export async function payMe(req: PayAuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const user = req.user;
  res.json({ user: { id: user.id, name: user.name, role: user.role } });
}

export async function payStepUp(req: PayAuthRequest, res: Response) {
  const body = stepUpSchema.parse(req.body);
  const configured = env.payStepUpCode;
  const isProd = env.nodeEnv === 'production';
  if (isProd && !configured) {
    return res
      .status(500)
      .json({ code: 'STEP_UP_CONFIG_REQUIRED', message: 'Step-up configuration missing' });
  }
  if (configured) {
    if (body.code !== configured) {
      return res
        .status(403)
        .json({ code: 'STEP_UP_INVALID', message: 'Invalid verification code' });
    }
  } else if (!isProd && !body.code) {
    return res.status(403).json({ code: 'STEP_UP_INVALID', message: 'Verification code required' });
  }

  if (req.paySession) {
    req.paySession.stepUpVerifiedAt = new Date();
    await req.paySession.save();
  }

  res.json({ ok: true, verifiedAt: new Date().toISOString() });
}

export async function paySessions(req: PayAuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const sessions = await PaySessionModel.find({ userId: req.user.id })
    .sort({ lastUsedAt: -1 })
    .select('userAgent ip createdAt lastUsedAt stepUpVerifiedAt expiresAt');
  res.json(sessions);
}

export async function payLogoutAll(req: PayAuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  await PaySessionModel.deleteMany({ userId: req.user.id });
  await AuditLogModel.create({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'pay_logout_all',
    entityType: 'pay_session',
    entityId: req.user.id,
  });
  res.status(204).end();
}
