import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  X,
  Check,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import {
  fetchModerationQueue,
  verifyAgent,
  markAgentEarbVerified,
  verifyListing,
  resolveUserKyc,
  resolveBusinessVerify,
} from '../../lib/api';
import type { ModerationQueueItem } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../context/AuthProvider';
import { useAdminStepUp } from '../../context/AdminStepUpContext';
import { logger } from '../../lib/logger';
import { errors } from '../../constants/messages';
import { KYC_ACCEPTANCE_CRITERIA, AGENT_ACCEPTANCE_CRITERIA } from '../../constants/verification';

const EARB_VERIFY_URL = 'https://earb.go.ke';

function formatTimestamp(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminVerificationPage() {
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { success, error: errorToast, push } = useToast();
  const { token } = useAuth();
  const { runWithStepUp } = useAdminStepUp();

  const load = useCallback(() => {
    setLoading(true);
    fetchModerationQueue()
      .then(setItems)
      .catch((err) => {
        logger.error('Failed to load moderation queue', {}, err instanceof Error ? err : undefined);
        push({ title: 'Load failed', description: errors.generic, tone: 'error' });
      })
      .finally(() => setLoading(false));
  }, [push]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    socket.on('user:created', load);
    socket.on('moderation:queue', load);
    return () => {
      socket.off('user:created', load);
      socket.off('moderation:queue', load);
    };
  }, [token, load]);

  const handleAgentVerify = async (id: string, decision: 'approve' | 'reject') => {
    try {
      await runWithStepUp(() => verifyAgent(id, decision));
      success(`Agent ${decision === 'approve' ? 'approved' : 'rejected'} successfully`);
      load();
    } catch {
      errorToast('Action failed');
    }
  };

  const handleMarkEarbVerified = async (id: string) => {
    try {
      await runWithStepUp(() => markAgentEarbVerified(id));
      success('EARB license marked as verified');
      load();
    } catch {
      errorToast('Action failed');
    }
  };

  const handleListingAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await runWithStepUp(() => verifyListing(id, action));
      success(`Listing ${action}d`);
      load();
    } catch {
      errorToast('Action failed');
    }
  };

  const handleKycResolve = async (userId: string, decision: 'approve' | 'reject') => {
    try {
      await runWithStepUp(() => resolveUserKyc(userId, decision));
      success(`KYC ${decision === 'approve' ? 'approved' : 'rejected'}`);
      load();
    } catch {
      errorToast('Action failed');
    }
  };

  const handleBusinessResolve = async (agentId: string, decision: 'approve' | 'reject') => {
    try {
      await runWithStepUp(() => resolveBusinessVerify(agentId, decision));
      success(`Business verification ${decision === 'approve' ? 'approved' : 'rejected'}`);
      load();
    } catch {
      errorToast('Action failed');
    }
  };

  const requestTypeLabels: Record<string, string> = {
    agent_verify: 'Agent application',
    new_listing: 'New listing',
    user_kyc: 'User KYC',
    business_verify: 'Business verification',
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-zinc-900 tracking-tight">
            Verification queue
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Review and approve user KYC, agent applications, listings, and business verification.
            Only verified users can buy or pay; agents start as users and are upgraded after
            approval.
          </p>
        </div>
      </div>

      {/* Criteria reference */}
      <div className="grid gap-4 md:grid-cols-2 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6">
        <div>
          <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            KYC acceptance criteria
          </h2>
          <ul className="text-xs text-zinc-600 space-y-1">
            {KYC_ACCEPTANCE_CRITERIA.slice(0, 3).map((c) => (
              <li key={c}>• {c}</li>
            ))}
            <li className="text-zinc-400">
              … plus document legibility and consistency with profile.
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Agent acceptance criteria
          </h2>
          <ul className="text-xs text-zinc-600 space-y-1">
            {AGENT_ACCEPTANCE_CRITERIA.slice(0, 3).map((c) => (
              <li key={c}>• {c}</li>
            ))}
            <li className="text-zinc-400">… verify EARB on portal before approving.</li>
          </ul>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-4 py-4 px-6 bg-zinc-50 border-b border-zinc-200 text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500">
            <div className="col-span-2">Ref ID</div>
            <div className="col-span-4">User / Entity</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Timestamp</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-4 py-4 px-6 border-b border-zinc-100 animate-pulse"
            >
              <div className="col-span-2 h-4 bg-zinc-200 rounded w-20" />
              <div className="col-span-4 h-4 bg-zinc-200 rounded w-32" />
              <div className="col-span-2 h-4 bg-zinc-200 rounded w-24" />
              <div className="col-span-2 h-4 bg-zinc-200 rounded w-28" />
              <div className="col-span-2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12">
          <EmptyState
            variant="light"
            title="No pending verifications"
            subtitle="You're all caught up. New KYC submissions, agent applications, and listings will appear here."
            action={{ label: 'Refresh queue', onClick: load }}
          />
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
          <div className="grid grid-cols-12 gap-4 py-4 px-6 bg-zinc-50 border-b border-zinc-200 text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500 min-w-[640px]">
            <div className="col-span-2">Ref ID</div>
            <div className="col-span-4">User / Entity</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Timestamp</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          {items.map((item) => {
            const compositeId = `${item.type}-${item.id}`;
            const isExpanded = expandedId === compositeId;
            return (
              <React.Fragment key={compositeId}>
                <div
                  className="grid grid-cols-12 gap-4 py-4 px-6 border-b border-zinc-100 items-center hover:bg-zinc-50/80 transition-colors group cursor-pointer text-sm min-w-[640px]"
                  onClick={() => setExpandedId(isExpanded ? null : compositeId)}
                >
                  <div className="col-span-2 font-mono text-xs text-zinc-500">{item.refId}</div>
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-zinc-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-semibold text-zinc-600">
                      {(item.userEntity.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">{item.userEntity.name || '—'}</p>
                      <p className="text-xs text-zinc-500">{item.userEntity.email || '—'}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-xs font-semibold text-zinc-600">
                    {requestTypeLabels[item.type] ?? item.requestType}
                  </div>
                  <div className="col-span-2 font-mono text-xs text-zinc-500">
                    {formatTimestamp(item.timestamp)}
                  </div>
                  <div className="col-span-2 flex justify-end items-center gap-2">
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                      {item.status}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.type === 'agent_verify' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAgentVerify(item.id, 'reject');
                            }}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                            aria-label="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAgentVerify(item.id, 'approve');
                            }}
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded transition-colors"
                            aria-label="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {item.type === 'new_listing' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleListingAction(item.id, 'reject');
                            }}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                            aria-label="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleListingAction(item.id, 'approve');
                            }}
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded transition-colors"
                            aria-label="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {item.type === 'user_kyc' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleKycResolve(item.refId, 'reject');
                            }}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                            aria-label="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleKycResolve(item.refId, 'approve');
                            }}
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded transition-colors"
                            aria-label="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {item.type === 'business_verify' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBusinessResolve(item.refId, 'reject');
                            }}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                            aria-label="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBusinessResolve(item.refId, 'approve');
                            }}
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded transition-colors"
                            aria-label="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : compositeId);
                      }}
                      className="p-1 text-gray-400 hover:text-black rounded"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 py-5 bg-zinc-50/80 border-b border-zinc-100 space-y-4">
                    {item.type === 'agent_verify' && (
                      <>
                        <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
                          <div className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500">
                            EARB license
                          </div>
                          {(item.payload.earbRegistrationNumber as string) ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm text-gray-700">
                                Registration: {String(item.payload.earbRegistrationNumber)}
                              </span>
                              {item.payload.earbVerifiedAt ? (
                                <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-sm text-[10px] font-bold">
                                  Verified{' '}
                                  {new Date(
                                    String(item.payload.earbVerifiedAt)
                                  ).toLocaleDateString()}
                                </span>
                              ) : (
                                <>
                                  <a
                                    href={EARB_VERIFY_URL}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                                  >
                                    Verify on EARB portal <ExternalLink className="h-3 w-3" />
                                  </a>
                                  <Button
                                    variant="admin-primary"
                                    size="sm"
                                    onClick={() => handleMarkEarbVerified(item.id)}
                                    className="inline-flex items-center gap-1 rounded-sm"
                                  >
                                    <ShieldCheck className="h-3 w-3" /> Mark EARB verified
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">
                              No EARB registration number provided.
                            </p>
                          )}
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
                          <div className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500">
                            Evidence
                          </div>
                          {(
                            item.payload.verificationEvidence as {
                              url: string;
                              note?: string;
                              uploadedAt?: string;
                            }[]
                          )?.length ? (
                            <div className="flex gap-2 flex-wrap">
                              {(
                                (item.payload.verificationEvidence as {
                                  url: string;
                                  note?: string;
                                  uploadedAt?: string;
                                }[]) || []
                              ).map((ev, idx) => (
                                <a
                                  key={`ev-${idx}`}
                                  href={ev.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 rounded border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:border-black hover:bg-gray-50"
                                >
                                  <span className="h-2 w-2 rounded-full bg-green-500" />
                                  {ev.note || 'Document'} —{' '}
                                  {ev.uploadedAt
                                    ? new Date(ev.uploadedAt).toLocaleDateString()
                                    : ''}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">No evidence uploaded yet.</p>
                          )}
                        </div>
                      </>
                    )}
                    {item.type === 'new_listing' && (
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
                          Listing
                        </div>
                        <p className="text-sm font-medium text-black">
                          {item.payload.title as string}
                        </p>
                        {item.payload.agentId && (
                          <p className="text-xs text-gray-500 mt-1">
                            Agent ID: {String(item.payload.agentId)}
                          </p>
                        )}
                      </div>
                    )}
                    {item.type === 'user_kyc' && (
                      <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
                        <div className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500">
                          KYC evidence
                        </div>
                        {(
                          item.payload.kycEvidence as {
                            url: string;
                            note?: string;
                            uploadedAt?: string;
                          }[]
                        )?.length ? (
                          <div className="flex gap-2 flex-wrap">
                            {(
                              (item.payload.kycEvidence as {
                                url: string;
                                note?: string;
                                uploadedAt?: string;
                              }[]) || []
                            ).map((ev, idx) => (
                              <a
                                key={`kyc-${idx}`}
                                href={ev.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:border-black hover:bg-gray-50"
                              >
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                {ev.note || 'Document'} —{' '}
                                {ev.uploadedAt ? new Date(ev.uploadedAt).toLocaleDateString() : ''}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No evidence uploaded yet.</p>
                        )}
                      </div>
                    )}
                    {item.type === 'business_verify' && (
                      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                          Business Evidence
                        </div>
                        {(
                          item.payload.businessVerifyEvidence as {
                            url: string;
                            note?: string;
                            uploadedAt?: string;
                          }[]
                        )?.length ? (
                          <div className="flex gap-2 flex-wrap">
                            {(
                              (item.payload.businessVerifyEvidence as {
                                url: string;
                                note?: string;
                                uploadedAt?: string;
                              }[]) || []
                            ).map((ev, idx) => (
                              <a
                                key={`biz-${idx}`}
                                href={ev.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:border-black hover:bg-gray-50"
                              >
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                {ev.note || 'Document'} —{' '}
                                {ev.uploadedAt ? new Date(ev.uploadedAt).toLocaleDateString() : ''}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No evidence uploaded yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
