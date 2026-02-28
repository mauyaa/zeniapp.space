import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { createHold, listHolds, cancelHold } from '../controllers/reservation.controller';

const router = Router();
router.use(auth);
router.get('/', asyncHandler(listHolds));
router.post('/', asyncHandler(createHold));
router.post('/:id/cancel', asyncHandler(cancelHold));

export default router;
