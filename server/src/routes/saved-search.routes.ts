import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import {
  create,
  list,
  remove,
  update,
  duplicate,
  share,
  getShared,
} from '../controllers/savedSearch.controller';

const router = Router();

router.get('/', auth, asyncHandler(list));
router.post('/', auth, asyncHandler(create));
router.patch('/:id', auth, asyncHandler(update));
router.post('/:id/duplicate', auth, asyncHandler(duplicate));
router.post('/:id/share', auth, asyncHandler(share));
router.get('/shared/:token', asyncHandler(getShared));
router.delete('/:id', auth, asyncHandler(remove));

export default router;
