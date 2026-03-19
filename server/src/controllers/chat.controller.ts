import { Response } from 'express';
import { z } from 'zod';
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

export async function conversations(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  const role = req.user?.role;
  if (!userId || !role)
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  try {
    await ensureWelcomeAgentsInDb();
    if (role === 'user') {
      await ensureWelcomeConversations(userId);
    } else if (role === 'agent') {
      await ensureAgentSupportConversation(userId);
    } else if (role === 'admin') {
      await ensureAdminZeniAgentConversation(userId);
    }
  } catch {
    // Do not block inbox loading if bootstrap fails.
  }
  const items = await listConversations(userId, role);
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
  const role = req.user?.role;
  if (!userId || !role)
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  await markRead(id, userId, role);
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
