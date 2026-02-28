import React, { useMemo } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { useChat } from '../../context/ChatContext';

const stages = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'viewing', label: 'Viewing' },
  { key: 'offer', label: 'Offer' },
  { key: 'closed', label: 'Closed' }
] as const;

export function LeadsPage() {
  const { conversations } = useChat();
  const leadConversations = useMemo(
    () => conversations.filter((conv) => conv.userSnapshot?.role !== 'admin'),
    [conversations]
  );
  const totalLeads = leadConversations.length;
  const hotLeads = leadConversations.filter((lead) => lead.unreadCount > 0).length;
  const inViewing = leadConversations.filter((lead) => lead.leadStage === 'viewing').length;

  const grouped = useMemo(() => {
    return stages.map((stage) => {
      const items = leadConversations
        .filter((conv) => conv.leadStage === stage.key)
        .map((conv) => ({
          id: conv.id,
          name: conv.userSnapshot?.name || `Buyer ${conv.userId?.slice(-4) || ''}`.trim(),
          listing: conv.listingSnapshot.title,
          time: conv.lastMessageAt
        }));
      return {
        stage: stage.label,
        items
      };
    });
  }, [leadConversations]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-black mb-2">Leads</h1>
        <p className="text-sm text-gray-500">
          Move buyers through the funnel with fast responses and consistent follow-up. Pending: {totalLeads} leads.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total leads</div>
          <div className="text-2xl font-semibold text-black mt-1">{totalLeads}</div>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Hot leads</div>
          <div className="text-2xl font-semibold text-black mt-1">{hotLeads}</div>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">In viewing</div>
          <div className="text-2xl font-semibold text-black mt-1">{inViewing}</div>
        </div>
      </div>

      {leadConversations.length === 0 ? (
        <EmptyState
          variant="light"
          title="No leads yet"
          subtitle="Leads appear when users message you about your listings or save your properties."
        />
      ) : (
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 gap-0 md:grid-cols-5">
            {grouped.map((col) => (
              <div key={col.stage} className="border-b md:border-b-0 md:border-r border-gray-200 last:md:border-r-0">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{col.stage}</span>
                  <span className="text-sm font-semibold text-black">{col.items.length}</span>
                </div>
                <div className="p-3 space-y-2 min-h-[120px]">
                  {col.items.length === 0 ? (
                    <p className="text-xs text-gray-500">No leads in this stage.</p>
                  ) : (
                    col.items.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-sm border border-gray-200 bg-white p-3 text-xs text-gray-700"
                      >
                        <div className="font-semibold text-black">{l.name}</div>
                        <div className="mt-0.5 text-gray-600">{l.listing}</div>
                        <div className="mt-1 text-gray-500">
                          Last touch: {new Date(l.time).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
