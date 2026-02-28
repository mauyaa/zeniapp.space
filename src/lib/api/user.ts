/**
 * User API — profile, KYC, block, export.
 */

import { request } from './client';
import type { UserKycStatus } from '../../types/api';

export function submitKyc(url: string, note?: string): Promise<unknown> {
  return request('/user/kyc', {
    method: 'POST',
    body: JSON.stringify({ url, note }),
  });
}

export function getKycStatus(): Promise<UserKycStatus> {
  return request('/user/kyc');
}
