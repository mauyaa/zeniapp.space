import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import { createShareSnapshot, getSharedShortlist } from '../services/savedListingShare.service';

export async function shareSavedListings(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { token, count } = await createShareSnapshot(userId);
  res.json({ shareToken: token, count });
}

export async function getSharedListings(req: AuthRequest, res: Response) {
  const { token } = z.object({ token: z.string().min(8) }).parse(req.params);
  const data = await getSharedShortlist(token);
  if (!data) return res.status(404).json({ code: 'NOT_FOUND', message: 'Shared shortlist not found' });
  res.json(data);
}
