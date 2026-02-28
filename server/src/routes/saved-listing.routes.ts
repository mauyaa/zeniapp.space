import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { asyncHandler } from '../middlewares/errorHandler';
import { shareSavedListings, getSharedListings } from '../controllers/savedListingShare.controller';

const router = Router();

router.post('/share', auth, requireRole(['user']), asyncHandler(shareSavedListings));
router.get('/shared/:token', asyncHandler(getSharedListings));

export default router;
