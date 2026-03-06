/**
 * Shared API DTOs and response types for type-safe client usage.
 */

export type Role = 'user' | 'agent' | 'admin';

/** User as returned from /admin/users and auth endpoints */
export interface AdminUser {
  _id: string;
  id?: string;
  email?: string;
  name: string;
  role: Role;
  status?: 'active' | 'suspended' | 'banned';
  createdAt?: string;
  updatedAt?: string;
  agentVerification?: string;
  availability?: 'active' | 'paused';
}

/** Pay account as returned from /admin/pay/accounts */
export interface PayAccount {
  _id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  status: 'active' | 'suspended';
  defaultCurrency?: string;
  defaultMethod?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Single audit log entry from /admin/audit */
export interface AuditLogEntry {
  _id: string;
  actorId?: string;
  actorRole?: string;
  entityType?: string;
  entityId?: string;
  action: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

/** Network access decision row from /admin/network-access */
export interface NetworkAccessDecision {
  id: string;
  action: 'network_access_allowed' | 'network_access_denied' | string;
  createdAt: string;
  actorId?: string;
  actorRole?: string;
  sourceIp?: string;
  surface?: 'admin' | 'pay_admin' | string;
  reason?: string;
  path?: string;
  method?: string;
  requestId?: string;
}

/** Read-only network posture and request status for admin security view */
export interface AdminNetworkAccessStatus {
  policy: {
    loadedAt: string;
    tailnetExpectedCidrs: string[];
    adminIpAllowlist: {
      mode: 'open' | 'restricted';
      entries: string[];
    };
    enforcement: {
      adminTailnetRequired: boolean;
      payAdminTailnetRequired: boolean;
    };
  };
  request: {
    sourceIp?: string;
    tailnetDetected: boolean;
    admin: { allowed: boolean; reason: string };
    payAdmin: { allowed: boolean; reason: string };
  };
  recentDecisions: NetworkAccessDecision[];
}

/** Pending agent from /admin/verification/agents */
export interface PendingAgent {
  _id: string;
  name: string;
  email?: string;
  emailOrPhone?: string;
  role: string;
  earbRegistrationNumber?: string;
  earbVerifiedAt?: string;
  verificationEvidence?: Array<{
    url: string;
    note?: string;
    uploadedAt?: string;
    createdAt?: string;
  }>;
  createdAt?: string;
}

/** Pending listing from /admin/verification/listings */
export interface PendingListing {
  _id: string;
  title: string;
  agentId?: string;
  agentName?: string;
  status?: string;
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Unified moderation queue item from GET /admin/moderation/queue */
export type ModerationItemType = 'agent_verify' | 'new_listing' | 'user_kyc' | 'business_verify';
export interface ModerationQueueItem {
  id: string;
  type: ModerationItemType;
  refId: string;
  userEntity: { name: string; email: string };
  requestType: string;
  timestamp: string;
  status: string;
  payload: Record<string, unknown>;
}

/** User KYC status from GET /user/kyc */
export interface UserKycStatus {
  status: 'none' | 'pending' | 'verified' | 'rejected';
  evidence: Array<{ url: string; note?: string; uploadedAt?: string }>;
  submittedAt?: string;
}

/** Analytics overview from /admin/analytics/overview */
export interface AnalyticsOverview {
  totalUsers?: number;
  totalListings?: number;
  totalViewings?: number;
  verifiedListings?: number;
  activeAgents?: number;
  [key: string]: unknown;
}

/** Agent stats from /agent/stats */
export interface AgentStatsKpi {
  label: string;
  value: string | number;
  tone?: string;
}
export interface AgentStatsPipelineStage {
  stage: string;
  count: number;
}
export interface AgentStatsInsight {
  label: string;
  value: string | number;
  hint?: string;
}
export interface AgentStatsTrendMonth {
  month: string;
  label: string;
  count: number;
}
export interface AgentStats {
  listings?: number;
  viewings?: number;
  conversations?: number;
  kpis?: AgentStatsKpi[];
  pipeline?: AgentStatsPipelineStage[];
  insights?: AgentStatsInsight[];
  trend?: AgentStatsTrendMonth[];
  [key: string]: unknown;
}

/** Viewing request as returned from /viewings or /agent/viewings */
export interface ViewingRequest {
  _id: string;
  listingId: string;
  agentId: string;
  userId?: string;
  userSnapshot?: { name?: string };
  listingSnapshot?: { title?: string };
  date: string;
  status: 'requested' | 'confirmed' | 'declined' | 'completed' | 'canceled' | 'no_show';
  note?: string;
  viewingFeeAmount?: number;
  viewingFeeStatus?: 'pending_payment' | 'held' | 'released';
  tenantConfirmedAt?: string;
  agentReason?: string;
  agentMessage?: string;
  createdAt?: string;
}

/** Report as returned from GET /admin/reports */
export interface AdminReport {
  _id: string;
  reporterId: string;
  targetType: 'listing' | 'user';
  targetId: string;
  category: string;
  severity: string;
  status: 'open' | 'resolved';
  message?: string;
  action?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** API error with status and optional code (from request helper) */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
