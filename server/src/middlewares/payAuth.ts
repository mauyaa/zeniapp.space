import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserDocument, UserModel } from '../models/User';
import { PaySessionDocument, PaySessionModel } from '../models/PaySession';
import { objectIdSchema } from '../utils/validators';

export interface PayAuthRequest extends Request {
  user?: UserDocument;
  paySession?: PaySessionDocument | null;
  requestId?: string;
}

export async function payAuth(req: PayAuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing token' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as {
      sub: string;
      role: string;
      aud?: string;
      sid?: string;
    };
    if (payload.aud !== 'pay') {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token audience' });
    }

    const user = await UserModel.findById(payload.sub);
    if (!user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token' });
    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ code: 'ACCOUNT_DISABLED', message: 'Account is disabled' });
    }

    if (!payload.sid || !objectIdSchema.safeParse(payload.sid).success) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Session missing' });
    }
    const session = await PaySessionModel.findById(payload.sid);
    if (!session) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Session expired' });
    }
    if (!session.expiresAt || session.expiresAt.getTime() < Date.now()) {
      await session.deleteOne();
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Session expired' });
    }

    req.user = user;
    req.paySession = session;
    next();
  } catch {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token' });
  }
}

export function requirePayRole(roles: string[]) {
  return (req: PayAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient role' });
    next();
  };
}

export function requireStepUp(maxAgeMinutes = 10) {
  return (req: PayAuthRequest, res: Response, next: NextFunction) => {
    const session = req.paySession;
    if (!session?.stepUpVerifiedAt) {
      return res
        .status(403)
        .json({ code: 'STEP_UP_REQUIRED', message: 'Step-up verification required' });
    }
    const ageMs = Date.now() - new Date(session.stepUpVerifiedAt).getTime();
    if (ageMs > maxAgeMinutes * 60 * 1000) {
      return res
        .status(403)
        .json({ code: 'STEP_UP_EXPIRED', message: 'Step-up verification expired' });
    }
    next();
  };
}
