import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { updateViewingStatusForAgent, listViewingsForAgent, exportViewingIcs } from '../controllers/viewingAgent.controller';

const router = Router();

router.get('/', auth, requireRole(['agent']), listViewingsForAgent);
router.patch('/:id', auth, requireRole(['agent']), updateViewingStatusForAgent);
router.get('/:id/ics', auth, requireRole(['agent']), exportViewingIcs);

export default router;
