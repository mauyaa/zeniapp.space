import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { create, adminList, resolve } from '../controllers/report.controller';
import { reportLimiter } from '../middlewares/rateLimit';

const router = Router();

router.post('/reports', auth, reportLimiter, create);
router.get('/admin/reports', auth, requireRole(['admin']), adminList);
router.patch('/admin/reports/:id/resolve', auth, requireRole(['admin']), resolve);

export default router;
