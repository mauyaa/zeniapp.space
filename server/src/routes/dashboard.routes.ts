import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { dashboard as userDashboard } from '../controllers/user.controller';
import { dashboard as agentDashboard } from '../controllers/agent.controller';

const router = Router();
router.get('/user', auth, asyncHandler(userDashboard));
router.get('/agent', auth, asyncHandler(agentDashboard));

export default router;
