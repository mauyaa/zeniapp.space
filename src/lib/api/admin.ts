/**
 * Admin API — users, analytics, verification, reports, audit logs.
 */

import { request, buildQuery, getToken } from './client';
import { ApiError } from '../../types/api';
import type {
  AdminUser,
  PayAccount,
  AuditLogEntry,
  AdminNetworkAccessStatus,
  PendingAgent,
  PendingListing,
  ModerationQueueItem,
  AnalyticsOverview,
  AdminReport,
} from '../../types/api';
import { apiUrl } from '../runtime';

// ---------- Users ----------

export function fetchUsers(): Promise<AdminUser[]> {
  return request('/admin/users');
}

export function updateUserStatus(
  id: string,
  status: 'active' | 'suspended' | 'banned'
): Promise<AdminUser> {
  return request(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function deleteUserAccount(id: string) {
  return request<void>(`/admin/users/${id}`, { method: 'DELETE' });
}

// ---------- Analytics ----------

export function fetchAnalytics(): Promise<AnalyticsOverview> {
  return request('/admin/analytics/overview');
}

// ---------- Pay ----------

export function fetchPayAccounts(): Promise<PayAccount[]> {
  return request('/admin/pay/accounts');
}

export function setPayAccountStatus(
  userId: string,
  status: 'active' | 'suspended'
): Promise<PayAccount> {
  return request(`/admin/pay/accounts/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ---------- Audit ----------

export function fetchAuditLogs(params?: {
  actorId?: string;
  actorRole?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  return request(`/admin/audit${buildQuery(params as Record<string, unknown>)}`);
}

// ---------- Verification ----------

export function fetchPendingAgents(): Promise<PendingAgent[]> {
  return request('/admin/verification/agents');
}

export function verifyAgent(id: string, decision: 'approve' | 'reject'): Promise<PendingAgent> {
  return request(`/admin/verification/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ decision }),
  });
}

/** Mark agent's EARB license as verified (admin cross-checked on EARB portal). */
export function markAgentEarbVerified(id: string): Promise<PendingAgent> {
  return request(`/admin/verification/agents/${id}/earb-verified`, { method: 'PATCH' });
}

export function fetchPendingListings(): Promise<PendingListing[]> {
  return request('/admin/verification/listings');
}

export function verifyListing(
  id: string,
  action: 'approve' | 'reject' | 'unlist' | 'feature'
): Promise<PendingListing> {
  return request(`/admin/verification/listings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

export function deleteAdminListing(id: string): Promise<void> {
  return request<void>(`/admin/verification/listings/${id}`, { method: 'DELETE' });
}

/** Unified moderation queue (Agent Verify, New Listing, KYC Verify, Business Verify). */
export function fetchModerationQueue(): Promise<ModerationQueueItem[]> {
  return request('/admin/moderation/queue');
}

export function resolveUserKyc(userId: string, decision: 'approve' | 'reject') {
  return request(`/admin/verification/kyc/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ decision }),
  });
}

export function resolveBusinessVerify(
  agentId: string,
  decision: 'approve' | 'reject'
): Promise<unknown> {
  return request(`/admin/verification/business/${agentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ decision }),
  });
}

// ---------- Reports ----------

export type AdminReportsParams = {
  status?: 'open' | 'resolved';
  category?: string;
  severity?: string;
  targetType?: 'listing' | 'user';
  limit?: number;
};

export function fetchAdminReports(params?: AdminReportsParams): Promise<AdminReport[]> {
  return request<AdminReport[]>(`/admin/reports${buildQuery(params as Record<string, unknown>)}`);
}

export function resolveReport(
  id: string,
  action: 'resolve' | 'ignore' | 'escalate' | 'ban'
): Promise<AdminReport> {
  return request(`/admin/reports/${id}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

export async function downloadReportsCsv(): Promise<void> {
  const token = getToken();
  const res = await fetch(apiUrl('/admin/reports/export'), {
    method: 'GET',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `Export failed: ${res.status}`;
    try {
      const data = JSON.parse(text) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      if (text) message = text;
    }
    throw new ApiError(message, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reports-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Rate metrics ----------

export function fetchRateMetrics() {
  return request<{ limits: Record<string, number> }>('/admin/rate-metrics');
}

// ---------- Network access ----------

export function fetchNetworkAccessStatus(): Promise<AdminNetworkAccessStatus> {
  return request('/admin/network-access');
}
