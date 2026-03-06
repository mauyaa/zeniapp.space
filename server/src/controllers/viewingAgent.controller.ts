import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import {
  listViewingsForAgent as listService,
  updateViewingStatus,
  generateViewingIcs,
} from '../services/viewing.service';
import { objectIdSchema } from '../utils/validators';

const patchSchema = z.object({
  body: z.object({
    status: z.enum(['confirmed', 'declined', 'completed', 'no_show', 'canceled']),
    reason: z.string().max(140).optional(),
    message: z.string().max(280).optional(),
  }),
});

export async function listViewingsForAgent(req: AuthRequest, res: Response) {
  const agentId = req.user?.id;
  if (!agentId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const docs = await listService(agentId);
  res.json(docs);
}

export async function updateViewingStatusForAgent(req: AuthRequest, res: Response) {
  const { body } = patchSchema.parse(req);
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const agentId = req.user?.id;
  if (!agentId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await updateViewingStatus(
    id,
    agentId,
    body.status as 'confirmed' | 'declined' | 'completed' | 'no_show' | 'canceled',
    body.reason,
    body.message
  );
  res.json(updated);
}

export async function exportViewingIcs(req: AuthRequest, res: Response) {
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const agentId = req.user?.id;
  if (!agentId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { filename, content } = await generateViewingIcs(id, agentId);
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
}
