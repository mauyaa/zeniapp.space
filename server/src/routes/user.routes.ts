import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import {
  current,
  dashboard,
  block,
  unblock,
  listBlocked,
  exportData,
  deleteMyAccount,
  updateAvatar,
} from '../controllers/user.controller';
import { submitKyc, getKycStatus } from '../controllers/verification.controller';

const router = Router();
router.get('/me', auth, current);
router.get('/dashboard', auth, asyncHandler(dashboard));
router.post('/block', auth, asyncHandler(block));
router.get('/block', auth, asyncHandler(listBlocked));
router.delete('/block/:userId', auth, asyncHandler(unblock));
router.get('/export', auth, asyncHandler(exportData));
router.delete('/account', auth, asyncHandler(deleteMyAccount));
router.post('/kyc', auth, asyncHandler(submitKyc));
router.get('/kyc', auth, asyncHandler(getKycStatus));
router.patch('/avatar', auth, asyncHandler(updateAvatar));
export default router;
