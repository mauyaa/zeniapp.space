import { getToken } from './client';
import { apiUrl } from '../runtime';

export type VerificationDocumentPurpose =
  | 'kyc_identity'
  | 'agent_identity'
  | 'business_verification';
export type VerificationDocumentType =
  | 'national_id'
  | 'passport'
  | 'driver_license'
  | 'agent_license'
  | 'business_registration'
  | 'proof_of_address';

export type PrivateVerificationDocument = {
  id: string;
  purpose: VerificationDocumentPurpose;
  documentType: VerificationDocumentType;
  status: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: string;
  uploadedAt: string;
};

async function parseUploadFailure(res: Response): Promise<never> {
  const error = (await res.json().catch(() => ({}))) as { message?: string };
  throw new Error(error.message || 'Secure document upload failed');
}

export async function uploadVerificationDocument(
  file: File,
  purpose: VerificationDocumentPurpose,
  documentType: VerificationDocumentType = 'national_id'
): Promise<PrivateVerificationDocument> {
  const form = new FormData();
  form.append('file', file);
  form.append('purpose', purpose);
  form.append('documentType', documentType);
  const res = await fetch(apiUrl('/verification-documents'), {
    method: 'POST',
    credentials: 'include',
    body: form,
    headers: { Authorization: `Bearer ${getToken() || ''}` },
  });
  if (!res.ok) return parseUploadFailure(res);
  const body = (await res.json()) as { document: PrivateVerificationDocument };
  return body.document;
}

export async function openVerificationDocumentForReview(documentId: string): Promise<void> {
  const res = await fetch(apiUrl(`/admin/verification-documents/${documentId}/content`), {
    credentials: 'include',
    headers: { Authorization: `Bearer ${getToken() || ''}` },
  });
  if (!res.ok) return parseUploadFailure(res);
  const url = URL.createObjectURL(await res.blob());
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    URL.revokeObjectURL(url);
    throw new Error('Allow pop-ups to view this reviewed document');
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
