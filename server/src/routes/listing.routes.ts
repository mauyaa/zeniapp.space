import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import {
  search,
  byId,
  saveToggle,
  alertToggle,
  savedList,
  createAgentListing,
  updateAgentListing,
  deleteAgentListing,
  submitAgentListing,
  listAgent,
  getAgent,
  recordLead
} from '../controllers/listing.controller';

const router = Router();
const agentRouter = Router();

router.get('/search', search);
router.get('/saved', auth, requireRole(['user']), savedList);
router.get('/:id', byId);
router.post('/:id/save', auth, requireRole(['user']), saveToggle);
router.post('/:id/alert', auth, requireRole(['user']), alertToggle);
router.post('/:id/lead', recordLead); // Public endpoint for tracking, optional auth

agentRouter.get('/listings', auth, requireRole(['agent']), listAgent);
agentRouter.get('/listings/:id', auth, requireRole(['agent']), getAgent);
agentRouter.post('/listings', auth, requireRole(['agent']), createAgentListing);
agentRouter.patch('/listings/:id', auth, requireRole(['agent']), updateAgentListing);
agentRouter.delete('/listings/:id', auth, requireRole(['agent']), deleteAgentListing);
agentRouter.post('/listings/:id/submit', auth, requireRole(['agent']), submitAgentListing);

export default router;
export { agentRouter };
