import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { recommendations } from '../controllers/recommendation.controller';

const router = Router();
router.get('/recommendations', auth, asyncHandler(recommendations));

export default router;
