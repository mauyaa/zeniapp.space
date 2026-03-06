import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { sendLimiter } from '../middlewares/rateLimit';
import { asyncHandler } from '../middlewares/errorHandler';
import {
  conversations,
  bootstrapConversations,
  createConversation,
  messages,
  postMessage,
  markConversationRead,
  updateConversationState,
} from '../controllers/chat.controller';

const router = Router();
router.use(auth);

router.get('/conversations', asyncHandler(conversations));
router.post('/conversations/bootstrap', asyncHandler(bootstrapConversations));
router.post('/conversations', asyncHandler(createConversation));
router.get('/conversations/:id/messages', asyncHandler(messages));
router.post('/conversations/:id/messages', sendLimiter, asyncHandler(postMessage));
router.post('/conversations/:id/read', asyncHandler(markConversationRead));
router.patch('/conversations/:id', asyncHandler(updateConversationState));

export default router;
