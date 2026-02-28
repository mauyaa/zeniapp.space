import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import {
  listNotificationsHandler,
  markAllReadHandler,
  markReadHandler,
  getPrefsHandler,
  updatePrefsHandler
} from '../controllers/notification.controller';

const router = Router();
router.use(auth);

router.get('/notifications', asyncHandler(listNotificationsHandler));
router.post('/notifications/mark-all', asyncHandler(markAllReadHandler));
router.post('/notifications/:id/read', asyncHandler(markReadHandler));
router.get('/notifications/prefs', asyncHandler(getPrefsHandler));
router.put('/notifications/prefs', asyncHandler(updatePrefsHandler));

export default router;
