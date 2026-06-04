/**
 * User API — profile, KYC, block, export.
 */

import { request } from './client';
import type { UserKycStatus } from '../../types/api';

export function submitKyc(documentId: string, note?: string): Promise<unknown> {
  return request('/user/kyc', {
    method: 'POST',
    body: JSON.stringify({ documentId, note }),
  });
}

export function getKycStatus(): Promise<UserKycStatus> {
  return request('/user/kyc');
}

export function updateKycEvidence(
  evidenceId: string,
  documentId: string,
  note?: string
): Promise<unknown> {
  return request(`/user/kyc/${evidenceId}`, {
    method: 'PATCH',
    body: JSON.stringify({ documentId, note }),
  });
}

export function deleteKycEvidence(evidenceId: string): Promise<unknown> {
  return request(`/user/kyc/${evidenceId}`, {
    method: 'DELETE',
  });
}

export function updateAvatar(avatarUrl: string): Promise<{ avatarUrl: string }> {
  return request('/user/avatar', {
    method: 'PATCH',
    body: JSON.stringify({ avatarUrl }),
  });
}
