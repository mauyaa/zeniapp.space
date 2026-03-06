import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import {
  createViewingRequest,
  listMyViewings,
  getMyViewing,
  exportMyViewingIcs,
  cancelMyViewing,
  confirmViewingCompleted,
} from '../controllers/viewing.controller';

const router = Router();

router.get('/', auth, requireRole(['user']), listMyViewings);
router.get('/:id', auth, requireRole(['user']), getMyViewing);
router.get('/:id/ics', auth, requireRole(['user']), exportMyViewingIcs);
router.post('/', auth, requireRole(['user']), createViewingRequest);
router.patch('/:id/cancel', auth, requireRole(['user']), cancelMyViewing);
router.patch('/:id/confirm-completed', auth, requireRole(['user']), confirmViewingCompleted);

export default router;
