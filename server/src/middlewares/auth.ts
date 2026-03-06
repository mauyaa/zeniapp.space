import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserDocument, UserModel } from '../models/User';
import { AuthSessionModel } from '../models/AuthSession';
import { objectIdSchema } from '../utils/validators';

export interface AuthRequest extends Request {
  user?: UserDocument;
  authSessionId?: string;
  authSession?: Awaited<ReturnType<typeof AuthSessionModel.findById>> | null;
  requestId?: string;
}

export async function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing token' });
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string; sid?: string };
    const user = await UserModel.findById(payload.sub);
    if (!user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token' });
    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ code: 'ACCOUNT_DISABLED', message: 'Account is disabled' });
    }
    req.user = user;
    if (payload.sid) {
      if (!objectIdSchema.safeParse(payload.sid).success) {
        return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid session' });
      }
      const session = await AuthSessionModel.findById(payload.sid);
      if (!session) {
        return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Session expired' });
      }
      if (String(session.userId) !== String(user.id)) {
        return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid session' });
      }
      if (!session.expiresAt || session.expiresAt.getTime() < Date.now()) {
        await session.deleteOne();
        return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Session expired' });
      }
      req.authSessionId = payload.sid;
      req.authSession = session;
    }
    next();
  } catch {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token' });
  }
}
