import { Router } from 'express';
import { getInsights, subscribe } from '../controllers/marketing.controller';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

router.get('/insights', asyncHandler(getInsights));
router.post('/newsletter', asyncHandler(subscribe));

export default router;
