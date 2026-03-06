import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { asyncHandler } from '../middlewares/errorHandler';
import {
  getStats,
  dashboard,
  getAvailability,
  updateAvailability,
  payoutChecklist,
  payoutTest,
} from '../controllers/agent.controller';
import {
  submitVerificationEvidence,
  getVerificationHistory,
  updateEarb,
  submitBusinessVerifyEvidence,
} from '../controllers/verification.controller';

const router = Router();

router.use(auth);
router.use(requireRole(['agent', 'admin']));

router.get('/stats', asyncHandler(getStats));
router.get('/dashboard', asyncHandler(dashboard));
router.get('/account/availability', asyncHandler(getAvailability));
router.patch('/account/availability', asyncHandler(updateAvailability));
router.get('/payout/checklist', asyncHandler(payoutChecklist));
router.post('/payout/test', asyncHandler(payoutTest));
router.post('/verification/evidence', asyncHandler(submitVerificationEvidence));
router.get('/verification/evidence', asyncHandler(getVerificationHistory));
router.patch('/verification/earb', asyncHandler(updateEarb));
router.post('/verification/business', asyncHandler(submitBusinessVerifyEvidence));

export default router;
