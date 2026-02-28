import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import {
  createViewing,
  listViewingsForUser,
  getViewingForUser,
  generateViewingIcs,
  cancelViewingByUser,
  confirmViewingCompletedByTenant
} from '../services/viewing.service';
import { objectIdSchema } from '../utils/validators';

const createSchema = z.object({
  body: z.object({
    listingId: objectIdSchema,
    agentId: objectIdSchema.optional(),
    date: z
      .coerce.date()
      .refine((d) => d.getTime() > Date.now() - 5 * 60 * 1000, 'Viewing date must be in the future'),
    altDates: z
      .array(
        z
          .coerce.date()
          .refine((d) => d.getTime() > Date.now() - 5 * 60 * 1000, 'Viewing date must be in the future')
      )
      .max(3)
      .optional(),
    note: z.string().optional()
  })
});

export async function createViewingRequest(req: AuthRequest, res: Response) {
  const { body } = createSchema.parse(req);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const doc = await createViewing({ ...body, userId });
  res.status(201).json(doc);
}

export async function listMyViewings(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const docs = await listViewingsForUser(userId);
  res.json(docs);
}

// Ownership guard for potential future detail view
export async function getMyViewing(req: AuthRequest, res: Response) {
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const doc = await getViewingForUser(id, userId);
  if (!doc) return res.status(404).json({ code: 'NOT_FOUND', message: 'Viewing not found' });
  res.json(doc);
}

export async function exportMyViewingIcs(req: AuthRequest, res: Response) {
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const doc = await getViewingForUser(id, userId);
  if (!doc) return res.status(404).json({ code: 'NOT_FOUND', message: 'Viewing not found' });
  const { filename, content } = await generateViewingIcs(String(id), String(doc.agentId));
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
}

export async function cancelMyViewing(req: AuthRequest, res: Response) {
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  try {
    const doc = await cancelViewingByUser(id, userId);
    res.json(doc);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status === 404) return res.status(404).json({ code: 'NOT_FOUND', message: e.message || 'Viewing not found' });
    if (e.status === 409) return res.status(409).json({ code: e.code || 'INVALID_STATUS', message: e.message });
    throw err;
  }
}

export async function confirmViewingCompleted(req: AuthRequest, res: Response) {
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  try {
    const doc = await confirmViewingCompletedByTenant(id, userId);
    res.json(doc);
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status === 404) return res.status(404).json({ code: 'NOT_FOUND', message: e.message || 'Viewing not found' });
    if (e.status === 409) return res.status(409).json({ code: e.code || 'INVALID_STATUS', message: e.message });
    throw err;
  }
}
