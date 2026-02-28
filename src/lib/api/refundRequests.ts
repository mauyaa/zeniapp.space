/**
 * Refund requests API — Zeni Shield: tenant requests refund, admin mediates.
 */

import { request } from './client';

export type EligibleTransaction = {
  _id: string;
  amount: number;
  currency: string;
  purpose?: string;
  referenceId?: string;
  createdAt?: string;
};

export type RefundRequestItem = {
  _id: string;
  userId: string;
  transactionId: string | { _id: string; amount: number; currency: string; status?: string; purpose?: string; createdAt?: string };
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export function fetchEligibleTransactions(): Promise<EligibleTransaction[]> {
  return request<EligibleTransaction[]>('/refund-requests/eligible');
}

export function createRefundRequest(body: { transactionId: string; reason: string }): Promise<RefundRequestItem> {
  return request<RefundRequestItem>('/refund-requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchMyRefundRequests(): Promise<RefundRequestItem[]> {
  return request<RefundRequestItem[]>('/refund-requests');
}

export function fetchAdminRefundRequests(status?: string): Promise<RefundRequestItem[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<RefundRequestItem[]>(`/admin/refund-requests${q}`);
}

export function resolveRefundRequest(
  id: string,
  body: { decision: 'approved' | 'rejected'; adminNotes?: string }
): Promise<RefundRequestItem> {
  return request<RefundRequestItem>(`/admin/refund-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
