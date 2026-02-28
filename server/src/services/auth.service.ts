/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserModel, UserDocument } from '../models/User';
import { AuthSessionModel } from '../models/AuthSession';
import { UsedRefreshTokenHashModel } from '../models/UsedRefreshTokenHash';
import { PasswordResetTokenModel } from '../models/PasswordResetToken';
import { env } from '../config/env';

interface CreateUserInput {
  name: string;
  emailOrPhone: string;
  password: string;
  role?: 'user' | 'agent' | 'admin' | 'finance';
}

type IdentityKind = 'email' | 'phone';

const ACCESS_TTL = '7d';
const REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

function normalizeIdentity(input: string): { kind: IdentityKind; value: string; raw: string } {
  const raw = input.trim();
  const isEmail = raw.includes('@');
  if (isEmail) {
    return { kind: 'email', value: raw.toLowerCase(), raw };
  }
  const compact = raw.replace(/\s+/g, '');
  return { kind: 'phone', value: compact, raw };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function createUser(input: CreateUserInput): Promise<UserDocument> {
  const { name, emailOrPhone, password, role = 'user' } = input;
  const identity = normalizeIdentity(emailOrPhone);

  const existing = await UserModel.findOne({
    $or:
      identity.kind === 'email'
        ? [{ emailOrPhone: identity.value }, { email: identity.value }]
        : [{ emailOrPhone: identity.value }, { phone: identity.value }]
  });
  if (existing) {
    const error = new Error('User already exists with this email or phone');
    (error as any).status = 409;
    (error as any).code = 'USER_EXISTS';
    throw error;
  }

  const userData: any = {
    name,
    emailOrPhone: identity.value,
    password,
    role
  };

  if (identity.kind === 'email') {
    userData.email = identity.value;
  } else {
    userData.phone = identity.value;
  }
  
  if (role === 'agent') {
    userData.agentVerification = 'pending';
  }

  const user = await UserModel.create(userData);
  // Auto-provision pay account
  try {
    const { ensurePayAccount } = await import('./payAccount.service');
    await ensurePayAccount(user.id);
  } catch (err) {
    // Do not block signup on pay provisioning issues
    console.error('[pay] failed to provision account', err);
  }
  // Welcome chats: Zeni Agent + Zeni Admin for users; support channels for agents/admins
  try {
    const chatService = await import('./chat.service');
    await chatService.ensureWelcomeAgentsInDb();
    if (role === 'user') {
      await chatService.ensureWelcomeConversations(String(user._id));
    } else if (role === 'agent') {
      await chatService.ensureAgentSupportConversation(String(user._id));
    } else if (role === 'admin') {
      await chatService.ensureAdminZeniAgentConversation(String(user._id));
    }
  } catch (err) {
    console.error('[auth] failed to create welcome conversations', err);
  }
  return user;
}

export async function authenticate(emailOrPhone: string, password: string): Promise<UserDocument> {
  const identity = normalizeIdentity(emailOrPhone);
  const orConditions: any[] = [];
  if (identity.kind === 'email') {
    const regex = new RegExp(`^${escapeRegex(identity.value)}$`, 'i');
    orConditions.push(
      { emailOrPhone: identity.value },
      { email: identity.value },
      { emailOrPhone: regex },
      { email: regex }
    );
  } else {
    orConditions.push({ emailOrPhone: identity.value }, { phone: identity.value });
    if (identity.raw !== identity.value) {
      orConditions.push({ emailOrPhone: identity.raw }, { phone: identity.raw });
    }
  }

  const user = await UserModel.findOne({ $or: orConditions });
  
  if (!user) {
    const error = new Error('Invalid credentials');
    (error as any).status = 401;
    (error as any).code = 'INVALID_CREDENTIALS';
    throw error;
  }

  if (user.status === 'banned') {
    const error = new Error('Account has been banned');
    (error as any).status = 403;
    (error as any).code = 'ACCOUNT_BANNED';
    throw error;
  }

  if (user.status === 'suspended') {
    const error = new Error('Account is suspended');
    (error as any).status = 403;
    (error as any).code = 'ACCOUNT_SUSPENDED';
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid credentials');
    (error as any).status = 401;
    (error as any).code = 'INVALID_CREDENTIALS';
    throw error;
  }

  return user;
}

/**
 * Find user by email or create one for Google sign-in (with random password).
 */
export async function findOrCreateUserFromGoogle(email: string, name: string): Promise<UserDocument> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    const err = new Error('Invalid Google email');
    (err as any).status = 400;
    (err as any).code = 'INVALID_GOOGLE_EMAIL';
    throw err;
  }

  let user = await UserModel.findOne({
    $or: [{ emailOrPhone: normalized }, { email: normalized }]
  });

  if (user) {
    if (user.status === 'banned') {
      const err = new Error('Account has been banned');
      (err as any).status = 403;
      (err as any).code = 'ACCOUNT_BANNED';
      throw err;
    }
    if (user.status === 'suspended') {
      const err = new Error('Account is suspended');
      (err as any).status = 403;
      (err as any).code = 'ACCOUNT_SUSPENDED';
      throw err;
    }
    return user;
  }

  const randomPassword = crypto.randomBytes(32).toString('hex');
  user = await UserModel.create({
    name: name?.trim() || normalized.split('@')[0],
    emailOrPhone: normalized,
    email: normalized,
    password: randomPassword,
    role: 'user'
  });

  try {
    const { ensurePayAccount } = await import('./payAccount.service');
    await ensurePayAccount(user.id);
  } catch (err) {
    // Do not block signup
  }
  // Welcome chats for Google-created users
  try {
    const chatService = await import('./chat.service');
    await chatService.ensureWelcomeAgentsInDb();
    await chatService.ensureWelcomeConversations(String(user._id));
  } catch (err) {
    console.error('[auth] failed to create welcome conversations for Google user', err);
  }
  return user;
}

export function signAccessToken(user: UserDocument, sessionId?: string): string {
  const sid = sessionId || crypto.randomBytes(12).toString('hex');
  const payload = {
    sub: user.id,
    role: user.role,
    sid
  };

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: ACCESS_TTL
  });
}

// Backward-compatible alias
export const signToken = signAccessToken as (user: UserDocument, sessionId?: string) => string;

export async function createAuthSession(
  user: UserDocument,
  meta: { userAgent?: string; ip?: string }
): Promise<{ accessToken: string; refreshToken: string; sessionId: string; expiresAt: Date }> {
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  const session = await AuthSessionModel.create({
    userId: user.id,
    refreshTokenHash,
    userAgent: meta.userAgent,
    ip: meta.ip,
    lastUsedAt: new Date(),
    expiresAt
  });

  const accessToken = signAccessToken(user, session.id);
  return { accessToken, refreshToken, sessionId: session.id, expiresAt };
}

export type RotateResult =
  | { ok: true; accessToken: string; refreshToken: string; user: UserDocument }
  | { ok: false; reused: true }
  | null;

export async function rotateAuthSession(
  refreshToken: string,
  meta: { userAgent?: string; ip?: string }
): Promise<RotateResult> {
  const hash = hashToken(refreshToken);

  // Token reuse detection: if this hash was already used (rotated), revoke all sessions for that user
  const used = await UsedRefreshTokenHashModel.findOne({ tokenHash: hash });
  if (used) {
    await UsedRefreshTokenHashModel.deleteOne({ tokenHash: hash });
    await AuthSessionModel.deleteMany({ userId: used.userId });
    return { ok: false, reused: true };
  }

  const session = await AuthSessionModel.findOne({ refreshTokenHash: hash });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await session.deleteOne();
    return null;
  }

  const user = await UserModel.findById(session.userId);
  if (!user) {
    await session.deleteOne();
    return null;
  }

  if (user.status === 'banned' || user.status === 'suspended') {
    await session.deleteOne();
    const err = new Error('Account is disabled');
    (err as any).status = 403;
    (err as any).code = user.status === 'banned' ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED';
    throw err;
  }

  // Store current hash as "used" before rotating (1h TTL) so reuse is detected
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await UsedRefreshTokenHashModel.create({ tokenHash: hash, userId: user.id, expiresAt });

  const nextRefresh = crypto.randomBytes(48).toString('hex');
  session.refreshTokenHash = hashToken(nextRefresh);
  session.lastUsedAt = new Date();
  session.userAgent = meta.userAgent;
  session.ip = meta.ip;
  await session.save();

  const accessToken = signAccessToken(user, session.id);
  return { ok: true, accessToken, refreshToken: nextRefresh, user };
}

export async function revokeAuthSession(refreshToken: string) {
  const hash = hashToken(refreshToken);
  await AuthSessionModel.deleteOne({ refreshTokenHash: hash });
}

export async function revokeAllSessionsForUser(userId: string) {
  await AuthSessionModel.deleteMany({ userId });
}

export async function requestPasswordReset(emailOrPhone: string, meta: { ip?: string; userAgent?: string }) {
  const identity = normalizeIdentity(emailOrPhone);
  const query =
    identity.kind === 'email'
      ? { $or: [{ emailOrPhone: identity.value }, { email: identity.value }] }
      : { $or: [{ emailOrPhone: identity.value }, { phone: identity.value }, { emailOrPhone: identity.raw }, { phone: identity.raw }] };

  const user = await UserModel.findOne(query);
  if (!user) {
    return { sent: true };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await PasswordResetTokenModel.deleteMany({ userId: user.id });
  await PasswordResetTokenModel.create({
    userId: user.id,
    tokenHash,
    expiresAt,
    ip: meta.ip,
    userAgent: meta.userAgent
  });

  return { sent: true, user, token, expiresAt };
}

export async function resetPassword(token: string, newPassword: string, meta: { ip?: string; userAgent?: string }) {
  const tokenHash = hashToken(token);
  const record = await PasswordResetTokenModel.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
    usedAt: { $exists: false }
  });
  if (!record) {
    const error = new Error('Invalid or expired token');
    (error as any).status = 400;
    (error as any).code = 'INVALID_TOKEN';
    throw error;
  }

  const user = await UserModel.findById(record.userId);
  if (!user) {
    await record.deleteOne();
    const error = new Error('Account not found');
    (error as any).status = 404;
    throw error;
  }

  user.password = newPassword;
  await user.save();
  record.usedAt = new Date();
  record.ip = meta.ip ?? record.ip;
  record.userAgent = meta.userAgent ?? record.userAgent;
  await record.save();
  await revokeAllSessionsForUser(user.id);
  return user;
}

export { hashToken, REFRESH_TTL_MS, ACCESS_TTL, RESET_TTL_MS };
/* eslint-disable @typescript-eslint/no-explicit-any */
