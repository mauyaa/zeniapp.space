import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { generateSecret, verifyTOTP, keyUri } from '../utils/totp';
import {
  createUser,
  authenticate,
  createAuthSession,
  rotateAuthSession,
  revokeAuthSession,
  requestPasswordReset,
  resetPassword as resetUserPassword,
  findOrCreateUserFromGoogle,
  REFRESH_TTL_MS,
} from '../services/auth.service';
import { UserModel, UserDocument } from '../models/User';
import { env } from '../config/env';
import { recordAudit } from '../utils/audit';
import { getIO } from '../socket';
import { AuthRequest } from '../middlewares/auth';
import { AuthSessionModel } from '../models/AuthSession';
import { evaluatePrivilegedRequest } from '../middlewares/ipAllowlist';
import { renderBrandEmail, sendMail } from '../services/email.service';
import { logger } from '../utils/logger';

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    emailOrPhone: z.string().email().or(z.string().min(7)), // email or phone-ish
    password: z.string().min(8),
    role: z.enum(['user', 'agent', 'admin', 'finance']).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    emailOrPhone: z.string(),
    password: z.string(),
    otp: z.string().optional(),
  }),
});

const forgotSchema = z.object({
  body: z.object({
    emailOrPhone: z.string(),
  }),
});

const resetSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    password: z.string().min(8),
  }),
});

const googleSchema = z.object({
  body: z.object({
    credential: z.string().min(10),
  }),
});

const adminStepUpSchema = z.object({
  body: z.object({
    // Accept number or string from clients; coerce to trimmed string for comparison
    code: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  }),
});

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.nodeEnv === 'production',
    maxAge: REFRESH_TTL_MS,
    path: '/api/auth',
  };
}

function appBaseUrl() {
  const firstOrigin = (env.corsOrigin || '').split(',')[0]?.trim();
  return process.env.APP_URL || firstOrigin || 'http://localhost:5173';
}

function getRefreshTokenFromRequest(req: Request): string | null {
  const header = (req.headers['x-refresh-token'] as string) || '';
  if (header) return header.trim();
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return null;
  const parts = rawCookie.split(';').map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith('refreshToken=')) {
      return decodeURIComponent(part.replace('refreshToken=', ''));
    }
  }
  return null;
}

export async function register(req: Request, res: Response) {
  const { body } = registerSchema.parse(req);
  const requestedRole = body.role;
  const isAdminEmail = (emailOrPhone: string) =>
    env.adminDomains.some(
      (domain) => domain === '*' || emailOrPhone.toLowerCase().endsWith(`@${domain.toLowerCase()}`)
    );

  const allowPrivileged = env.allowPrivilegedSignup && isAdminEmail(body.emailOrPhone);

  let role: 'user' | 'agent' | 'admin' | 'finance' = 'user';
  if (requestedRole === 'agent') {
    role = 'agent';
  } else if ((requestedRole === 'admin' || requestedRole === 'finance') && allowPrivileged) {
    role = requestedRole;
  } else if (
    !requestedRole &&
    env.nodeEnv !== 'production' &&
    allowPrivileged &&
    body.emailOrPhone.toLowerCase().startsWith('admin@')
  ) {
    // Developer convenience: auto-elevate obvious admin accounts when explicitly allowed
    role = 'admin';
  }

  const user = await createUser({ ...body, role });
  const { accessToken, refreshToken, expiresAt } = await createAuthSession(user, {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  const email = user.emailOrPhone?.includes('@') ? user.emailOrPhone : null;
  if (email) {
    const firstName = (user.name || '').split(' ')[0] || 'there';
    const url = `${appBaseUrl()}/login`;
    sendMail(
      email,
      'Welcome to ZENI',
      renderBrandEmail({
        title: 'Welcome to ZENI',
        body: `Hi ${firstName},<br/>Your account is ready. Explore verified listings, live maps, and guided viewings.`,
        ctaLabel: 'Log in',
        ctaHref: url,
      })
    ).catch((err) => logger.warn('[auth] welcome email failed', err));
  }
  getIO()?.to('role:admin').emit('user:created', pickUser(user));
  res
    .cookie('refreshToken', refreshToken, cookieOptions())
    .json({ token: accessToken, refreshToken, user: pickUser(user), refreshExpiresAt: expiresAt });
}

export async function login(req: Request, res: Response) {
  const { body } = loginSchema.parse(req);
  const user = await authenticate(body.emailOrPhone, body.password);

  if (user.role === 'admin') {
    const adminDomains = env.adminDomains.length ? env.adminDomains : [env.adminDomain];
    const normalizedEmail = (user.emailOrPhone || '').toLowerCase();
    const allowed =
      adminDomains.some((domain) => domain === '*') ||
      adminDomains.some((domain) => normalizedEmail.endsWith(`@${domain.toLowerCase()}`));
    if (!allowed) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Admin domain not allowed' });
    }

    const network = evaluatePrivilegedRequest(req).admin;
    if (!network.allowed) {
      if (network.reason === 'tailnet_required') {
        return res
          .status(403)
          .json({
            code: 'TAILNET_REQUIRED',
            message: 'Tailscale network access is required for admin',
          });
      }
      return res.status(403).json({ code: 'FORBIDDEN', message: 'IP not allowed for admin' });
    }

    if (user.mfaEnabled) {
      const otp = body.otp;
      const validOtp = Boolean(otp && user.mfaSecret && verifyTOTP(otp, user.mfaSecret));
      const recoveryIndex = user.mfaRecoveryCodes?.findIndex((c) => c === otp) ?? -1;
      const validRecovery = recoveryIndex >= 0;
      if (!validOtp && !validRecovery) {
        return res.status(401).json({ code: 'OTP_REQUIRED', message: 'MFA code required' });
      }
      if (validRecovery && user.mfaRecoveryCodes) {
        user.mfaRecoveryCodes.splice(recoveryIndex, 1);
        await user.save();
      }
    } else if (env.adminOtp) {
      if (!body.otp || body.otp !== env.adminOtp) {
        return res.status(401).json({ code: 'OTP_REQUIRED', message: 'Admin OTP required' });
      }
    }
  }
  if (user.role === 'agent' && user.agentVerification !== 'verified') {
    return res
      .status(403)
      .json({ code: 'AGENT_UNVERIFIED', message: 'Agent account pending verification' });
  }

  const { accessToken, refreshToken, expiresAt } = await createAuthSession(user, {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  if (user.role === 'admin') {
    await recordAudit(
      {
        actorId: user.id,
        actorRole: 'admin',
        action: 'admin_login',
        entityType: 'user',
        entityId: user.id,
        after: { ip: req.ip, ua: req.headers['user-agent'] },
      },
      req
    );
  }

  res
    .cookie('refreshToken', refreshToken, cookieOptions())
    .json({ token: accessToken, refreshToken, user: pickUser(user), refreshExpiresAt: expiresAt });
}

export async function me(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const user = await UserModel.findById(userId);
  if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
  res.json({ user: pickUser(user) });
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken)
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing refresh token' });
  const rotated = await rotateAuthSession(refreshToken, {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  if (!rotated)
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid refresh token' });
  if (rotated.ok === false && rotated.reused) {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return res.status(401).json({
      code: 'REFRESH_TOKEN_REUSED',
      message:
        'Token was already used. All sessions have been revoked for security. Please sign in again.',
    });
  }
  if (rotated.ok === true) {
    res
      .cookie('refreshToken', rotated.refreshToken, cookieOptions())
      .json({
        token: rotated.accessToken,
        refreshToken: rotated.refreshToken,
        user: pickUser(rotated.user),
      });
  }
}

export async function adminStepUp(req: AuthRequest, res: Response) {
  const { body } = adminStepUpSchema.parse(req);
  const normalizedCode = body.code.replace(/\s+/g, '');
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Admin only' });
  }
  const user = await UserModel.findById(req.user.id);
  if (!user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found' });

  const configuredStepUp = (env.adminStepUpCode || '').trim();
  const hasMfa = Boolean(user.mfaEnabled && user.mfaSecret);
  const isProd = env.nodeEnv === 'production';

  // In production we must have either MFA or a configured step-up code
  if (!hasMfa && !configuredStepUp && isProd) {
    return res
      .status(500)
      .json({ code: 'STEP_UP_CONFIG_REQUIRED', message: 'Admin step-up code is not configured' });
  }

  if (!normalizedCode) {
    return res.status(400).json({ code: 'STEP_UP_INVALID', message: 'Step-up code is required' });
  }

  let ok = false;
  if (hasMfa && user.mfaSecret) {
    ok = verifyTOTP(normalizedCode, user.mfaSecret);
    if (
      !ok &&
      user.mfaRecoveryCodes?.some((c) => c.toUpperCase() === normalizedCode.toUpperCase())
    ) {
      user.mfaRecoveryCodes = user.mfaRecoveryCodes.filter(
        (c) => c.toUpperCase() !== normalizedCode.toUpperCase()
      );
      await user.save();
      ok = true;
    }
  } else if (configuredStepUp) {
    ok = normalizedCode === configuredStepUp;
  } else if (!isProd) {
    // Development convenience: allow any non-empty code when no step-up code is configured.
    ok = true;
  }

  if (!ok) {
    return res.status(401).json({ code: 'STEP_UP_INVALID', message: 'Invalid step-up code' });
  }
  const sid = (req as AuthRequest).authSessionId as string | undefined;
  if (!sid) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Session missing' });
  const session = await AuthSessionModel.findById(sid);
  if (!session) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Session not found' });
  session.stepUpVerifiedAt = new Date();
  await session.save();
  await recordAudit(
    {
      actorId: user.id,
      actorRole: 'admin',
      action: 'admin_step_up',
      entityType: 'AuthSession',
      entityId: session.id,
      after: { verifiedAt: session.stepUpVerifiedAt },
    },
    req
  );
  return res.json({ ok: true, verifiedAt: session.stepUpVerifiedAt });
}

export async function adminMfaSetup(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Admin only' });
  }
  const secret = generateSecret();
  const otpauthUrl = keyUri(req.user.emailOrPhone || req.user.id, 'Zeni Admin', secret);
  return res.json({ secret, otpauthUrl });
}

function generateRecoveryCodes(count = 6) {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    codes.push(Math.random().toString(36).slice(2, 10).toUpperCase());
  }
  return codes;
}

export async function adminMfaEnable(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Admin only' });
  }
  const secret = String(req.body?.secret || '');
  const token = String(req.body?.token || '');
  if (!secret || !token) {
    return res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'Secret and token required' });
  }
  if (!verifyTOTP(token, secret)) {
    return res.status(401).json({ code: 'STEP_UP_INVALID', message: 'Invalid code' });
  }
  const user = await UserModel.findById(req.user.id);
  if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
  const recoveryCodes = generateRecoveryCodes();
  user.mfaEnabled = true;
  user.mfaSecret = secret;
  user.mfaRecoveryCodes = recoveryCodes;
  await user.save();
  return res.json({ ok: true, recoveryCodes });
}

export async function adminMfaDisable(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Admin only' });
  }
  const code = String(req.body?.code || '');
  const user = await UserModel.findById(req.user.id);
  if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
  let ok = false;
  if (user.mfaEnabled && user.mfaSecret) {
    ok = verifyTOTP(code, user.mfaSecret);
    if (!ok && user.mfaRecoveryCodes?.includes(code)) {
      user.mfaRecoveryCodes = user.mfaRecoveryCodes.filter((c) => c !== code);
      ok = true;
    }
  }
  if (!ok) return res.status(401).json({ code: 'STEP_UP_INVALID', message: 'Invalid code' });
  user.mfaEnabled = false;
  user.mfaSecret = undefined;
  user.mfaRecoveryCodes = [];
  await user.save();
  return res.json({ ok: true });
}

export async function logout(req: Request, res: Response) {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (refreshToken) {
    await revokeAuthSession(refreshToken);
    await recordAudit(
      {
        actorRole: 'user',
        action: 'session_logout',
        entityType: 'AuthSession',
        entityId: 'self',
        after: { ip: req.ip },
      },
      req as unknown as AuthRequest
    );
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.status(204).end();
}

export async function listSessions(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const sessions = await AuthSessionModel.find({ userId: req.user.id })
    .select('userAgent ip createdAt lastUsedAt stepUpVerifiedAt expiresAt')
    .sort({ lastUsedAt: -1 });
  res.json({ sessions });
}

export async function revokeSession(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const session = await AuthSessionModel.findOne({ _id: req.params.id, userId: req.user.id });
  if (!session) return res.status(404).json({ code: 'NOT_FOUND', message: 'Session not found' });
  await session.deleteOne();
  await recordAudit(
    {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'session_revoke',
      entityType: 'AuthSession',
      entityId: req.params.id,
    },
    req
  );
  res.status(204).end();
}

export async function revokeAllSessions(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  await AuthSessionModel.deleteMany({ userId: req.user.id });
  await recordAudit(
    {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'session_revoke_all',
      entityType: 'AuthSession',
      entityId: String(req.user.id),
    },
    req
  );
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.status(204).end();
}

export async function forgotPassword(req: Request, res: Response) {
  const { body } = forgotSchema.parse(req);
  const result = await requestPasswordReset(body.emailOrPhone, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  const payload: Record<string, unknown> = { status: 'sent' };
  if (result.user && result.token && result.user.emailOrPhone?.includes('@')) {
    const url = `${appBaseUrl()}/reset?token=${result.token}`;
    const firstName = (result.user.name || '').split(' ')[0] || 'there';
    sendMail(
      result.user.emailOrPhone,
      'Reset your ZENI password',
      renderBrandEmail({
        title: 'Reset your password',
        body: `Hi ${firstName},<br/>We received a request to reset your password. This link will expire soon for security.`,
        ctaLabel: 'Reset password',
        ctaHref: url,
      })
    ).catch((err) => logger.warn('[auth] reset email failed', err));
  }
  if (env.nodeEnv !== 'production' && result.token) {
    payload.resetToken = result.token;
    payload.expiresAt = result.expiresAt;
  }
  res.status(202).json(payload);
}

export async function resetPassword(req: Request, res: Response) {
  const { body } = resetSchema.parse(req);
  const user = await resetUserPassword(body.token, body.password, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  const { accessToken, refreshToken, expiresAt } = await createAuthSession(user, {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  res
    .cookie('refreshToken', refreshToken, cookieOptions())
    .json({ token: accessToken, refreshToken, user: pickUser(user), refreshExpiresAt: expiresAt });
}

export async function googleLogin(req: Request, res: Response) {
  if (!env.googleClientId) {
    return res
      .status(503)
      .json({ code: 'GOOGLE_DISABLED', message: 'Google sign-in is not configured' });
  }
  const { body } = googleSchema.parse(req);
  const client = new OAuth2Client(env.googleClientId);
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: body.credential,
      audience: env.googleClientId,
    });
  } catch (err) {
    return res
      .status(401)
      .json({ code: 'INVALID_GOOGLE_TOKEN', message: 'Invalid or expired Google credential' });
  }
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    return res
      .status(400)
      .json({ code: 'MISSING_EMAIL', message: 'Google account email is required' });
  }
  if (payload.email_verified === false) {
    return res.status(400).json({
      code: 'EMAIL_NOT_VERIFIED',
      message:
        'Google account email must be verified. Please verify your email in Google account settings.',
    });
  }
  const user = await findOrCreateUserFromGoogle(payload.email, payload.name || '');
  const { accessToken, refreshToken, expiresAt } = await createAuthSession(user, {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  // Send welcome email for newly created Google users (created within last 10 seconds)
  const userCreatedAt = (user as unknown as { createdAt?: Date }).createdAt;
  const isNewUser = userCreatedAt ? Date.now() - new Date(userCreatedAt).getTime() < 10_000 : false;
  if (isNewUser && payload.email) {
    const firstName = (user.name || '').split(' ')[0] || 'there';
    const url = `${appBaseUrl()}/login`;
    sendMail(
      payload.email,
      'Welcome to ZENI',
      renderBrandEmail({
        title: 'Welcome to ZENI',
        body: `Hi ${firstName},<br/>Your account is ready. Explore verified listings, live maps, and guided viewings.`,
        ctaLabel: 'Get started',
        ctaHref: url,
      })
    ).catch((err) => logger.warn('[auth] Google welcome email failed', err));
  }

  getIO()?.to('role:admin').emit('user:created', pickUser(user));
  res
    .cookie('refreshToken', refreshToken, cookieOptions())
    .json({ token: accessToken, refreshToken, user: pickUser(user), refreshExpiresAt: expiresAt });
}

function pickUser(u: UserDocument) {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    availability: u.availability,
    agentVerification: u.agentVerification,
    mfaEnabled: u.mfaEnabled,
    avatarUrl: u.avatarUrl,
  };
}
