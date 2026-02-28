import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import { useChat } from '../../context/ChatContext';
import { fetchPendingListings, verifyListing } from '../../lib/api';
import type { PendingListing } from '../../types/api';
import { useAdminStepUp } from '../../context/AdminStepUpContext';
import { errors } from '../../constants/messages';

export function ListingsPage() {
  const { success, error, push } = useToast();
  const { startConversation } = useChat();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const { runWithStepUp } = useAdminStepUp();

  const load = () => {
    setLoading(true);
    fetchPendingListings()
      .then(setRows)
      .catch(() => {
        push({ title: 'Load failed', description: errors.generic, tone: 'error' });
        setRows([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on mount only
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionId(id);
    try {
      await runWithStepUp(() => verifyListing(id, action));
      success(`Listing ${action}d`);
      load();
    } catch (e) {
      error('Action failed');
    } finally {
      setActionId(null);
    }
  };

  const handleMessageAgent = async (listing: PendingListing) => {
    const agentId = listing.agentId;
    if (!agentId) {
      push({ title: 'Missing agent', description: errors.auth.cannotStartChat, tone: 'error' });
      return;
    }
    try {
      const conv = await startConversation(listing._id, agentId);
      navigate(`/admin/messages/${conv.id}`);
    } catch {
      push({ title: 'Failed', description: errors.auth.cannotStartChat, tone: 'error' });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-black mb-2">Inventory</h1>
        <p className="text-sm text-gray-500">Approve listings that meet quality and compliance standards. Pending: {rows.length}</p>
      </div>
      {loading ? (
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <th className="py-3 pl-4 pr-2 font-mono w-28">ID</th>
                <th className="py-3 px-2">Title</th>
                <th className="py-3 px-2 font-mono w-32">Price</th>
                <th className="py-3 px-2 w-28">Status</th>
                <th className="py-3 pr-4 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`listing-skeleton-${idx}`} className="border-b border-gray-100">
                  <td className="py-3 pl-4 pr-2"><div className="h-3 w-16 rounded bg-gray-200 animate-pulse" /></td>
                  <td className="py-3 px-2"><div className="h-3 w-44 rounded bg-gray-200 animate-pulse" /></td>
                  <td className="py-3 px-2"><div className="h-3 w-20 rounded bg-gray-200 animate-pulse" /></td>
                  <td className="py-3 px-2"><div className="h-5 w-16 rounded bg-gray-200 animate-pulse" /></td>
                  <td className="py-3 pr-4 pl-2 text-right"><div className="h-8 w-24 rounded ml-auto bg-gray-200 animate-pulse" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12">
          <EmptyState
            variant="light"
            title="No pending listings"
            subtitle="New submissions will appear here for review."
            action={{ label: 'Refresh queue', onClick: load }}
          />
        </div>
      ) : (
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
          <div className="overflow-y-auto max-h-[70vh]">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-3 pl-4 pr-2 font-mono w-28">ID</th>
                  <th className="py-3 px-2">Title</th>
                  <th className="py-3 px-2 font-mono w-32">Price</th>
                  <th className="py-3 px-2 w-28">Status</th>
                  <th className="py-3 pr-4 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-b-0">
                    <td className="py-3 pl-4 pr-2 font-mono text-xs text-gray-500 tabular-nums">
                      {r._id.slice(-8)}
                    </td>
                    <td className="py-3 px-2 text-black line-clamp-1 max-w-[200px]">{r.title}</td>
                    <td className="py-3 px-2 font-mono text-gray-700 tabular-nums">
                      {(r as { currency?: string; price?: number }).currency} {(r as { price?: number }).price?.toLocaleString?.() ?? (r as { price?: number }).price ?? '—'}
                    </td>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center gap-1.5 rounded-sm border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pending
                      </span>
                    </td>
                    <td className="py-3 pr-4 pl-2">
                      <div className="flex justify-end gap-2" role="group" aria-label="Row actions">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-300 hover:bg-slate-800 font-mono text-[10px] uppercase tracking-widest"
                          onClick={() => handleMessageAgent(r)}
                          aria-label={`Message agent for ${r.title}`}
                        >
                          Message
                        </Button>
                        <Button
                          size="sm"
                          disabled={actionId === r._id}
                          onClick={() => handleAction(r._id, 'reject')}
                          variant="danger"
                          aria-label={`Reject ${r.title}`}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={actionId === r._id}
                          onClick={() => handleAction(r._id, 'approve')}
                          aria-label={`Approve ${r.title}`}
                        >
                          Approve
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
