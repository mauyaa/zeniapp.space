import { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middlewares/auth';
import {
  verificationDocumentPurposes,
  verificationDocumentTypes,
} from '../models/VerificationDocument';
import {
  deleteOwnVerificationDocument,
  downloadVerificationDocumentForAdmin,
  listOwnVerificationDocuments,
  uploadPrivateVerificationDocument,
} from '../services/verificationDocument.service';

export async function uploadVerificationDocument(req: AuthRequest, res: Response) {
  const schema = z.object({
    purpose: z.enum(verificationDocumentPurposes),
    documentType: z.enum(verificationDocumentTypes),
  });
  const { purpose, documentType } = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const file = (req as AuthRequest & { file?: unknown }).file as
    | { buffer: Buffer; originalname: string; mimetype: string; size: number }
    | undefined;
  if (!file) return res.status(400).json({ code: 'NO_FILE', message: 'No document uploaded' });
  const document = await uploadPrivateVerificationDocument(
    userId,
    purpose,
    documentType,
    file,
    req
  );
  return res.status(201).json({ document });
}

export async function getMyVerificationDocuments(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  return res.json({ documents: await listOwnVerificationDocuments(userId) });
}

export async function deleteMyVerificationDocument(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  await deleteOwnVerificationDocument(req.params.documentId, userId, req);
  return res.status(204).end();
}

export async function downloadVerificationDocument(req: AuthRequest, res: Response) {
  const output = await downloadVerificationDocumentForAdmin(req.params.documentId, req);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', output.mimeType);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${output.filename.replace(/["\\]/g, '_')}"`
  );
  return res.send(output.bytes);
}
