import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserDocument, UserModel } from '../models/User';
import { AuthSessionModel } from '../models/AuthSession';

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
      req.authSessionId = payload.sid;
      req.authSession = await AuthSessionModel.findById(payload.sid);
    }
    next();
  } catch {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token' });
  }
}
