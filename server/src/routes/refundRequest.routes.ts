import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { asyncHandler } from '../middlewares/errorHandler';
import { create, listMine, eligibleTransactions } from '../controllers/refundRequest.controller';

const router = Router();
router.use(auth);
router.use(requireRole(['user']));

router.post('/', asyncHandler(create));
router.get('/eligible', asyncHandler(eligibleTransactions));
router.get('/', asyncHandler(listMine));

export default router;
