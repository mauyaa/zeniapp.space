import { Router } from 'express';
import { emailHealth } from '../controllers/health.controller';

const router = Router();

router.get('/health/email', emailHealth);

export default router;
