import React, { useEffect, useMemo, useState } from 'react';
import { fetchAgentViewings, updateAgentViewing, downloadViewingIcs } from '../../lib/api';
import type { ViewingRequest } from '../../types/api';
import { CalendarClock, Check, X, UserCircle, Download } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { errors } from '../../constants/messages';

export function AgentViewingsPage() {
  const [items, setItems] = useState<ViewingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAgentViewings();
      setItems(data);
    } catch (err) {
      logger.error('Failed to load viewings', {}, err instanceof Error ? err : undefined);
      push({ title: 'Load failed', description: errors.generic, tone: 'error' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on mount only
  }, []);

  const total = items.length;
  const requested = useMemo(
    () => items.filter((item) => item.status === 'requested').length,
    [items]
  );
  const confirmed = useMemo(
    () => items.filter((item) => item.status === 'confirmed').length,
    [items]
  );

  const templates: Record<
    'confirmed' | 'declined',
    { label: string; message: string; reason?: string }[]
  > = {
    confirmed: [
      { label: 'Standard confirm', message: 'Confirmed. See you at the scheduled time!' },
      { label: 'Bring ID', message: 'Confirmed. Please bring ID to the viewing.' },
    ],
    declined: [
      {
        label: 'Conflict',
        reason: 'Scheduling conflict',
        message: 'Sorry, I have a conflict. Let us pick another time.',
      },
      {
        label: 'Already under offer',
        reason: 'Under offer',
        message: 'This home is under offer. I will suggest alternatives.',
      },
    ],
  };

  const updateStatus = async (
    id: string,
    status: 'confirmed' | 'declined',
    reason?: string,
    message?: string
  ) => {
    setActioning(id);
    try {
      await updateAgentViewing(id, status, reason, message);
      await load();
    } finally {
      setActioning(null);
    }
  };

  const downloadIcs = async (id: string) => {
    try {
      const blob = await downloadViewingIcs(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `viewing-${id}.ics`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Download ICS failed', { id }, err instanceof Error ? err : undefined);
      push({ title: 'Download failed', description: 'Could not download invite.', tone: 'error' });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-black mb-2">Viewings</h1>
        <p className="text-sm text-gray-500">
          Confirm or decline visits and keep buyers updated. Total: {loading ? '—' : total}{' '}
          requests.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total</div>
          <div className="text-2xl font-semibold text-black mt-1">{loading ? '—' : total}</div>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Requested
          </div>
          <div className="text-2xl font-semibold text-black mt-1">{loading ? '—' : requested}</div>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Confirmed
          </div>
          <div className="text-2xl font-semibold text-black mt-1">{loading ? '—' : confirmed}</div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`agent-viewing-skeleton-${idx}`}
              className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm animate-pulse"
            >
              <div className="space-y-2">
                <div className="h-4 w-56 rounded bg-gray-200" />
                <div className="h-3 w-40 rounded bg-gray-200/80" />
                <div className="h-3 w-64 rounded bg-gray-200/80" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          variant="light"
          title="No requests"
          subtitle="You will see viewing requests from buyers here."
        />
      ) : (
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Viewing requests
          </div>
          <div className="divide-y divide-gray-200">
            {items.map((v) => (
              <div key={v._id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-black">Listing: {v.listingId}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-gray-500" />
                      {new Date(v.date).toLocaleString()}
                    </div>
                    {v.note && <div className="text-xs text-gray-600">Note: {v.note}</div>}
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        v.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : v.status === 'declined'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {v.status}
                    </span>
                    {v.agentReason && (
                      <div className="text-[11px] text-gray-500">Reason: {v.agentReason}</div>
                    )}
                    {v.agentMessage && (
                      <div className="text-[11px] text-gray-500">Message: {v.agentMessage}</div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 text-xs text-gray-500">
                    <div className="inline-flex items-center gap-1">
                      <UserCircle className="h-4 w-4" /> User {v.userId}
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Download className="h-3 w-3" />}
                        onClick={() => downloadIcs(v._id)}
                      >
                        ICS
                      </Button>

                      {v.status === 'requested' && (
                        <>
                          {templates.confirmed.map((t) => (
                            <Button
                              key={`${v._id}-c-${t.label}`}
                              size="sm"
                              variant="secondary"
                              loading={actioning === v._id}
                              leftIcon={<Check className="h-3 w-3" />}
                              onClick={() => updateStatus(v._id, 'confirmed', undefined, t.message)}
                            >
                              {t.label}
                            </Button>
                          ))}
                          {templates.declined.map((t) => (
                            <Button
                              key={`${v._id}-d-${t.label}`}
                              size="sm"
                              variant="outline"
                              loading={actioning === v._id}
                              leftIcon={<X className="h-3 w-3" />}
                              onClick={() => updateStatus(v._id, 'declined', t.reason, t.message)}
                            >
                              {t.label}
                            </Button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
