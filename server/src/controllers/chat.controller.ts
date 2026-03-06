import { Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { AuthRequest } from '../middlewares/auth';
import { PaginationQuery } from '../utils/paginate';
import { objectIdSchema, paginationSchema } from '../utils/validators';
import {
  getOrCreateConversation,
  listConversations,
  listMessages,
  sendMessage,
  markRead,
  formatMessage,
  getConversationForUser,
  updateConversation,
  ensureWelcomeAgentsInDb,
  ensureWelcomeConversations,
  ensureAgentSupportConversation,
  ensureAdminZeniAgentConversation,
} from '../services/chat.service';

const chatDebugInTest =
  process.env.CHAT_DEBUG_IN_TEST === 'true' || process.env.REQUEST_LOG_IN_TEST === 'true';
const shouldLogChatDebug = env.nodeEnv !== 'test' || chatDebugInTest;

const chatDebug = (...args: unknown[]) => {
  if (!shouldLogChatDebug) return;
  console.log(...args);
};

const chatDebugError = (...args: unknown[]) => {
  if (!shouldLogChatDebug) return;
  console.error(...args);
};

export async function conversations(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  const role = req.user?.role;
  if (!userId || !role)
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  let items = await listConversations(userId, role);
  try {
    await ensureWelcomeAgentsInDb();
    if (role === 'user') {
      await ensureWelcomeConversations(userId);
      items = await listConversations(userId, role);
    } else if (role === 'agent') {
      await ensureAgentSupportConversation(userId);
      items = await listConversations(userId, role);
    } else if (role === 'admin') {
      await ensureAdminZeniAgentConversation(userId);
      items = await listConversations(userId, role);
    }
  } catch (err) {
    chatDebugError('[chat] ensure welcome conversations failed', err);
  }
  res.json(items);
}

/**
 * Force bootstrap: create Zeni Support + Zeni Agent users (if missing), create welcome conversations, return list.
 * Use when Messages shows "No chats yet" and Refresh didn't help.
 */
export async function bootstrapConversations(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  const role = req.user?.role;
  if (!userId || !role)
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  chatDebug('[chat] bootstrap start', { userId, role });
  try {
    await ensureWelcomeAgentsInDb();
  } catch (err) {
    chatDebugError('[chat] bootstrap ensureWelcomeAgentsInDb failed', err);
  }
  try {
    if (role === 'user') {
      await ensureWelcomeConversations(userId);
    } else if (role === 'agent') {
      await ensureAgentSupportConversation(userId);
    } else if (role === 'admin') {
      await ensureAdminZeniAgentConversation(userId);
    }
  } catch (err) {
    chatDebugError('[chat] bootstrap ensure welcome conversations failed', err);
  }
  let items: Awaited<ReturnType<typeof listConversations>> = [];
  try {
    items = await listConversations(userId, role);
    chatDebug('[chat] bootstrap listConversations returned', items.length, 'conversations');
  } catch (err) {
    chatDebugError('[chat] bootstrap listConversations failed', err);
  }
  res.json(items);
}

export async function createConversation(req: AuthRequest, res: Response) {
  const schema = z.object({ listingId: objectIdSchema, agentId: objectIdSchema });
  const { listingId, agentId } = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const conv = await getOrCreateConversation(listingId, userId, agentId);
  const formatted = await getConversationForUser(String(conv._id), userId);
  res.status(201).json(formatted ?? conv);
}

export async function messages(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  const role = req.user?.role;
  if (!userId || !role)
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const paramsSchema = z.object({ id: objectIdSchema }).merge(paginationSchema);
  const parsed = paramsSchema.parse({ id: req.params.id, ...req.query });
  const msgs = await listMessages(parsed.id, userId, parsed as unknown as PaginationQuery, role);
  res.json(msgs);
}

export async function postMessage(req: AuthRequest, res: Response) {
  const schema = z.object({
    id: objectIdSchema,
    type: z.string(),
    content: z.any(),
    clientTempId: z.string().max(64).optional(),
  });
  const { type, content, id, clientTempId } = schema.parse({ ...req.body, id: req.params.id });
  const userId = req.user?.id;
  const role = req.user?.role;
  if (!userId || !role)
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const msg = await sendMessage(id, userId, role, type, content, clientTempId);
  res.status(201).json(formatMessage(msg));
}

export async function markConversationRead(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  await markRead(id, userId);
  res.status(204).end();
}

export async function updateConversationState(req: AuthRequest, res: Response) {
  const schema = z.object({
    id: objectIdSchema,
    status: z.enum(['active', 'scheduled', 'closed']).optional(),
    leadStage: z.enum(['new', 'contacted', 'viewing', 'offer', 'closed']).optional(),
    pinned: z.boolean().optional(),
    muted: z.boolean().optional(),
  });
  const body = schema.parse({ ...req.body, id: req.params.id });
  const userId = req.user?.id;
  const role = req.user?.role;
  if (!userId || !role)
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await updateConversation(body.id, userId, role, body);
  res.json(updated);
}
