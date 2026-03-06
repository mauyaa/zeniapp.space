import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import { createReport, listReports, resolveReport } from '../services/report.service';
import { objectIdSchema } from '../utils/validators';

export async function create(req: AuthRequest, res: Response) {
  const schema = z.object({
    targetType: z.enum(['listing', 'user']),
    targetId: objectIdSchema,
    category: z.enum(['scam', 'abuse', 'duplicates', 'spam', 'other']),
    severity: z.enum(['low', 'medium', 'high']),
    message: z.string().max(500).optional(),
  });
  const body = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const report = await createReport(userId, body);
  res.status(201).json(report);
}

export async function adminList(req: AuthRequest, res: Response) {
  const querySchema = z.object({
    status: z.enum(['open', 'resolved']).optional(),
    category: z.enum(['scam', 'abuse', 'duplicates', 'spam', 'other']).optional(),
    severity: z.enum(['low', 'medium', 'high']).optional(),
    targetType: z.enum(['listing', 'user']).optional(),
    reporterId: objectIdSchema.optional(),
    targetId: objectIdSchema.optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  });
  const { limit = 50, ...filters } = querySchema.parse(req.query);
  const reports = await listReports(filters, limit);
  res.json(reports);
}

export async function resolve(req: AuthRequest, res: Response) {
  const schema = z.object({
    id: objectIdSchema,
    body: z.object({
      action: z.enum(['resolve', 'ignore', 'escalate', 'ban']).default('resolve'),
    }),
  });
  const { id, body } = schema.parse({ id: req.params.id, body: req.body });
  const updated = await resolveReport(id, body.action);
  if (!updated) return res.status(404).json({ code: 'NOT_FOUND', message: 'Report not found' });
  res.json(updated);
}
