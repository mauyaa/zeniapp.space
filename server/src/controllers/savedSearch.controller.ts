import { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middlewares/auth';
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  updateSavedSearch,
  duplicateSavedSearch,
  shareSavedSearch,
  getSharedSavedSearch
} from '../services/savedSearch.service';
import { objectIdSchema } from '../utils/validators';

const savedSearchSchema = z.object({
  name: z.string().min(1).max(80),
  params: z.record(z.any()).default({}),
  alertsEnabled: z.boolean().optional(),
  snoozeUntil: z.coerce.date().nullable().optional()
});

export async function list(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const items = await listSavedSearches(userId);
  res.json({ items });
}

export async function create(req: AuthRequest, res: Response) {
  const body = savedSearchSchema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const saved = await createSavedSearch(userId, body.name, body.params || {});
  res.status(201).json(saved);
}

export async function update(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const body = savedSearchSchema.partial().parse(req.body);
  const updated = await updateSavedSearch(userId, id, body);
  if (!updated) return res.status(404).json({ code: 'NOT_FOUND', message: 'Saved search not found' });
  res.json(updated);
}

export async function duplicate(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const copy = await duplicateSavedSearch(userId, id);
  if (!copy) return res.status(404).json({ code: 'NOT_FOUND', message: 'Saved search not found' });
  res.status(201).json(copy);
}

export async function share(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const token = await shareSavedSearch(userId, id);
  if (!token) return res.status(404).json({ code: 'NOT_FOUND', message: 'Saved search not found' });
  res.json({ shareToken: token });
}

export async function getShared(req: AuthRequest, res: Response) {
  const { token } = z.object({ token: z.string().min(8) }).parse({ token: req.params.token });
  const data = await getSharedSavedSearch(token);
  if (!data) return res.status(404).json({ code: 'NOT_FOUND', message: 'Shared search not found' });
  res.json(data);
}

export async function remove(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const deleted = await deleteSavedSearch(userId, id);
  if (!deleted) return res.status(404).json({ code: 'NOT_FOUND', message: 'Saved search not found' });
  res.status(204).send();
}
