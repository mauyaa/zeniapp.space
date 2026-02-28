/**
 * Viewings API — schedule, confirm, manage viewing requests.
 */

import { request, getToken } from './client';
import type { ViewingRequest, AgentStats } from '../../types/api';
import { apiUrl } from '../runtime';

// ---------- User viewings ----------

export type CreateViewingResponse = {
  _id: string;
  id?: string;
  listingId: string;
  agentId: string;
  userId: string;
  date: string;
  status: string;
  needsViewingFee?: boolean;
  viewingFeeAmount?: number;
  viewingFeeStatus?: string;
  [key: string]: unknown;
};

export function createViewingRequest(body: {
  listingId: string;
  agentId?: string;
  date: string;
  altDates?: string[];
  note?: string;
}) {
  return request<CreateViewingResponse>('/viewings', { method: 'POST', body: JSON.stringify(body) });
}

export function fetchMyViewings(options?: { signal?: AbortSignal }) {
  return request<ViewingRequest[]>('/viewings', options);
}

export function confirmViewingCompleted(viewingId: string) {
  return request<{ ok?: boolean }>(`/viewings/${viewingId}/confirm-completed`, { method: 'PATCH' });
}

export function updateViewingStatus(id: string, status: 'confirmed' | 'declined') {
  return request(`/agent/viewings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

// ---------- Agent viewings ----------

export function fetchAgentViewings(): Promise<ViewingRequest[]> {
  return request<ViewingRequest[]>('/agent/viewings');
}

export function updateAgentViewing(
  id: string,
  status: 'confirmed' | 'declined',
  reason?: string,
  message?: string
) {
  return request(`/agent/viewings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason, message }),
  });
}

export function fetchAgentStats(): Promise<AgentStats> {
  return request<AgentStats>('/agent/stats');
}

export function getAgentAvailability() {
  return request<{ availability: 'active' | 'paused' }>('/agent/account/availability');
}

export function setAgentAvailability(availability: 'active' | 'paused') {
  return request<{ availability: 'active' | 'paused' }>('/agent/account/availability', {
    method: 'PATCH',
    body: JSON.stringify({ availability }),
  });
}

export async function downloadViewingIcs(id: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(apiUrl(`/agent/viewings/${id}/ics`), {
    method: 'GET',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Unable to download invite');
  return res.blob();
}

export function fetchPayoutChecklist() {
  return request<{ items: { id: string; label: string; done: boolean }[] }>(
    '/agent/payout/checklist'
  );
}

export function runTestPayout() {
  return request<{
    status: string;
    reference: string;
    amount: number;
    currency: string;
  }>('/agent/payout/test', { method: 'POST' });
}

// ---------- Agent verification ----------

export function submitVerificationEvidence(url: string, note?: string) {
  return request('/agent/verification/evidence', {
    method: 'POST',
    body: JSON.stringify({ url, note }),
  });
}

export function fetchVerificationHistory(): Promise<{
  status: string;
  evidence: { url: string; note?: string; uploadedAt: string }[];
  earbRegistrationNumber?: string;
  earbVerifiedAt?: string;
}> {
  return request('/agent/verification/evidence');
}

export function updateEarbNumber(earbRegistrationNumber: string): Promise<{ earbRegistrationNumber?: string; earbVerifiedAt?: string }> {
  return request('/agent/verification/earb', {
    method: 'PATCH',
    body: JSON.stringify({ earbRegistrationNumber }),
  });
}

/** Agent: submit business verification documents (company/entity). */
export function submitBusinessVerify(url: string, note?: string) {
  return request('/agent/verification/business', {
    method: 'POST',
    body: JSON.stringify({ url, note }),
  });
}
