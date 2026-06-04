import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import {
  addVerificationEvidence,
  deleteVerificationEvidence,
  deleteUserKycEvidence,
  listVerificationEvidence,
  updateEarbNumber,
  updateVerificationEvidence,
  submitUserKyc,
  submitBusinessVerify,
  listUserKyc,
  updateUserKycEvidence,
} from '../services/verification.service';

export async function submitVerificationEvidence(req: AuthRequest, res: Response) {
  const schema = z.object({
    documentId: z.string().regex(/^[a-f\d]{24}$/i, 'Private document id required'),
    note: z.string().max(200).optional(),
    idNumber: z.string().trim().min(4, 'ID number required').max(64),
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

export async function updateVerification(req: AuthRequest, res: Response) {
  const schema = z.object({
    params: z.object({ evidenceId: z.string().trim().min(1) }),
    body: z.object({
      documentId: z.string().regex(/^[a-f\d]{24}$/i, 'Private document id required'),
      note: z.string().max(200).optional(),
      idNumber: z.string().trim().min(4, 'ID number required').max(64),
    }),
  });
  const {
    params: { evidenceId },
    body,
  } = schema.parse(req);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await updateVerificationEvidence(userId, evidenceId, body);
  res.json(updated);
}

export async function deleteVerification(req: AuthRequest, res: Response) {
  const schema = z.object({
    params: z.object({ evidenceId: z.string().trim().min(1) }),
  });
  const {
    params: { evidenceId },
  } = schema.parse(req);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await deleteVerificationEvidence(userId, evidenceId);
  res.json(updated);
}

/** Any user: submit identity (KYC) documents for admin review. */
export async function submitKyc(req: AuthRequest, res: Response) {
  const schema = z.object({
    documentId: z.string().regex(/^[a-f\d]{24}$/i, 'Private document id required'),
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

export async function updateKyc(req: AuthRequest, res: Response) {
  const schema = z.object({
    params: z.object({ evidenceId: z.string().trim().min(1) }),
    body: z.object({
      documentId: z.string().regex(/^[a-f\d]{24}$/i, 'Private document id required'),
      note: z.string().max(500).optional(),
    }),
  });
  const {
    params: { evidenceId },
    body,
  } = schema.parse(req);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await updateUserKycEvidence(userId, evidenceId, body);
  res.json(updated);
}

export async function deleteKyc(req: AuthRequest, res: Response) {
  const schema = z.object({
    params: z.object({ evidenceId: z.string().trim().min(1) }),
  });
  const {
    params: { evidenceId },
  } = schema.parse(req);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await deleteUserKycEvidence(userId, evidenceId);
  res.json(updated);
}

/** Agent: submit business verification documents. */
export async function submitBusinessVerifyEvidence(req: AuthRequest, res: Response) {
  const schema = z.object({
    documentId: z.string().regex(/^[a-f\d]{24}$/i, 'Private document id required'),
    note: z.string().max(200).optional(),
  });
  const body = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await submitBusinessVerify(userId, body);
  res.status(201).json(updated);
}
