import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { listDocs, uploadDoc, updateDocSharing } from '../controllers/userDoc.controller';

const router = Router();
router.use(auth);
router.get('/', asyncHandler(listDocs));
router.post('/', asyncHandler(uploadDoc));
router.patch('/:id/share', asyncHandler(updateDocSharing));

export default router;
