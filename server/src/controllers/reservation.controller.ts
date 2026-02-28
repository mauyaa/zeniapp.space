import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import { createReservation, listReservations, releaseReservation } from '../services/reservation.service';
import { objectIdSchema } from '../utils/validators';

export async function createHold(req: AuthRequest, res: Response) {
  const schema = z.object({
    listingId: objectIdSchema,
    amount: z.number().positive(),
    currency: z.string().default('KES')
  });
  const body = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const hold = await createReservation(userId, body.listingId, body.amount, body.currency);
  res.status(201).json(hold);
}

export async function listHolds(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const items = await listReservations(userId);
  res.json(items);
}

export async function cancelHold(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const { id } = z.object({ id: objectIdSchema }).parse({ id: req.params.id });
  const updated = await releaseReservation(id, userId);
  if (!updated) return res.status(404).json({ code: 'NOT_FOUND', message: 'Reservation not found' });
  res.json(updated);
}
