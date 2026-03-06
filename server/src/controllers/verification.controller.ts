import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import {
  addVerificationEvidence,
  listVerificationEvidence,
  updateEarbNumber,
  submitUserKyc,
  submitBusinessVerify,
  listUserKyc,
} from '../services/verification.service';

export async function submitVerificationEvidence(req: AuthRequest, res: Response) {
  const schema = z.object({
    url: z.string().url(),
    note: z.string().max(200).optional(),
  });
  const body = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await addVerificationEvidence(userId, body);
  res.status(201).json(updated);
}

export async function getVerificationHistory(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const data = await listVerificationEvidence(userId);
  res.json(data);
}

export async function updateEarb(req: AuthRequest, res: Response) {
  const schema = z.object({
    body: z.object({ earbRegistrationNumber: z.string().min(1).max(64) }),
  });
  const { body } = schema.parse(req);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await updateEarbNumber(userId, body.earbRegistrationNumber);
  res.json(updated);
}

/** Any user: submit identity (KYC) documents for admin review. */
export async function submitKyc(req: AuthRequest, res: Response) {
  const schema = z.object({
    url: z.string().trim().min(4, 'Document URL required'),
    note: z.string().max(500).optional(),
  });
  const body = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await submitUserKyc(userId, body);
  res.status(201).json(updated);
}

/** Any user: get own KYC status. */
export async function getKycStatus(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const data = await listUserKyc(userId);
  res.json(data);
}

/** Agent: submit business verification documents. */
export async function submitBusinessVerifyEvidence(req: AuthRequest, res: Response) {
  const schema = z.object({ url: z.string().url(), note: z.string().max(200).optional() });
  const body = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await submitBusinessVerify(userId, body);
  res.status(201).json(updated);
}
