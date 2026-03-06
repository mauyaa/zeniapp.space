import { Router } from 'express';
import { auth, AuthRequest } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { recordAudit } from '../utils/audit';

// Canary endpoint: any access logs a high-priority audit entry.
const router = Router();

router.get(
  '/canary/transaction',
  auth,
  requireRole(['admin', 'finance', 'agent', 'user']),
  async (req: AuthRequest, res) => {
    await recordAudit(
      {
        actorId: req.user?.id,
        actorRole: req.user?.role || 'unknown',
        action: 'canary_hit',
        entityType: 'canary',
        entityId: 'pay_transaction',
        before: { ip: req.ip, ua: req.headers['user-agent'] },
      },
      req
    );
    res.json({ status: 'logged' });
  }
);

export default router;
