import { Request, Response } from 'express';
import { z } from 'zod';
import { listInsights, subscribeNewsletter } from '../services/marketing.service';
import type { AuthRequest } from '../middlewares/auth';

const newsletterSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
});

export async function getInsights(req: Request, res: Response) {
  const limit = Math.min(12, Math.max(1, Number(req.query.limit) || 3));
  const items = await listInsights(limit);
  res.json({ items });
}

export async function subscribe(req: AuthRequest, res: Response) {
  const body = newsletterSchema.parse(req.body);
  const result = await subscribeNewsletter(body.email, body.source, req.user?.id);
  res.status(result.status === 'created' ? 201 : 200).json(result);
}
