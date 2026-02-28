import { Response, NextFunction } from 'express';
import { Role } from '../utils/constants';
import { env } from '../config/env';
import { AuthRequest } from './auth';

export function requireRole(roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (env.nodeEnv === 'test' && process.env.RBAC_RELAX === 'true') return next();
    if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
    if (!roles.includes(req.user.role)) {
      if (env.nodeEnv === 'test') {
        console.warn('[rbac] forbidden', { expected: roles, got: req.user.role });
      }
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient role' });
    }
    next();
  };
}

