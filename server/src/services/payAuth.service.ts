import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { PaySessionModel } from '../models/PaySession';
import { UserDocument } from '../models/User';

const PAY_ACCESS_TTL = '15m';
const PAY_REFRESH_BYTES = 48;
const PAY_REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken() {
  return crypto.randomBytes(PAY_REFRESH_BYTES).toString('hex');
}

export function signPayAccessToken(user: UserDocument, sessionId: string) {
  return jwt.sign({ sub: user.id, role: user.role, aud: 'pay', sid: sessionId }, env.jwtSecret, {
    expiresIn: PAY_ACCESS_TTL,
  });
}

export async function createPaySession(
  user: UserDocument,
  meta: { userAgent?: string; ip?: string }
) {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + PAY_REFRESH_TTL_MS);
  const session = await PaySessionModel.create({
    userId: user.id,
    refreshTokenHash,
    userAgent: meta.userAgent,
    ip: meta.ip,
    lastUsedAt: new Date(),
    expiresAt,
  });
  const accessToken = signPayAccessToken(user, session.id);
  return { accessToken, refreshToken, sessionId: session.id, expiresAt };
}

export async function rotatePaySession(refreshToken: string) {
  const refreshTokenHash = hashToken(refreshToken);
  const session = await PaySessionModel.findOne({ refreshTokenHash });
  if (!session) return null;
  if (!session.expiresAt || session.expiresAt.getTime() < Date.now()) {
    await session.deleteOne();
    return null;
  }
  const nextRefresh = generateRefreshToken();
  session.refreshTokenHash = hashToken(nextRefresh);
  session.lastUsedAt = new Date();
  session.expiresAt = new Date(Date.now() + PAY_REFRESH_TTL_MS);
  await session.save();
  return { session, refreshToken: nextRefresh, expiresAt: session.expiresAt };
}

export async function invalidatePaySession(sessionId: string) {
  await PaySessionModel.findByIdAndDelete(sessionId);
}

export { hashToken, PAY_REFRESH_TTL_MS };
