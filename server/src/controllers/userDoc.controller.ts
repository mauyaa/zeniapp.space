import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import { createUserDoc, listUserDocs, shareDocToListings } from '../services/userDoc.service';
import { objectIdSchema } from '../utils/validators';

export async function listDocs(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const docs = await listUserDocs(userId);
  res.json(docs);
}

export async function uploadDoc(req: AuthRequest, res: Response) {
  const schema = z.object({
    type: z.enum(['preapproval', 'pof', 'id']),
    url: z.string().url(),
    note: z.string().max(200).optional(),
    sharedListings: z.array(objectIdSchema).optional(),
  });
  const body = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const doc = await createUserDoc(userId, body);
  res.status(201).json(doc);
}

export async function updateDocSharing(req: AuthRequest, res: Response) {
  const schema = z.object({ sharedListings: z.array(objectIdSchema).default([]) });
  const body = schema.parse(req.body);
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const doc = await shareDocToListings(userId, id, body.sharedListings);
  if (!doc) return res.status(404).json({ code: 'NOT_FOUND', message: 'Document not found' });
  res.json(doc);
}
