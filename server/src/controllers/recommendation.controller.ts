import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { recommendListings } from '../services/recommendation.service';

export async function recommendations(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const items = await recommendListings(userId);
  res.json({ items });
}
