/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Heart, MoreHorizontal } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import {
  fetchAgentListings,
  submitAgentListing,
  deleteAgentListing,
  updateAgentListing,
  type AgentListing,
} from '../../lib/api';

export function ListingsPage() {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [rows, setRows] = useState<AgentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'drafts' | 'sold'>('active');

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAgentListings();
      setRows(data);
    } catch (e) {
      error('Failed to load listings');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (id: string) => {
    setMenuOpenId(null);
    setSubmittingId(id);
    try {
      await submitAgentListing(id);
      success('Listing submitted for review');
      await load();
    } catch (e) {
      error('Failed to submit listing');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Archive this listing?')) return;
    setMenuOpenId(null);
    setDeletingId(id);
    try {
      await deleteAgentListing(id);
      success('Listing archived');
      await load();
    } catch (e) {
      error('Failed to archive listing');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestore = async (id: string) => {
    setMenuOpenId(null);
    setUpdatingId(id);
    try {
      await updateAgentListing(id, { status: 'live' });
      success('Listing restored to live');
      await load();
    } catch (e) {
      error('Failed to restore listing');
    } finally {
      setUpdatingId(null);
    }
  };

  const activeListings = useMemo(
    () => rows.filter((r) => r.status !== 'draft' && r.availabilityStatus !== 'sold' && r.availabilityStatus !== 'let' && r.status !== 'archived'),
    [rows]
  );
  const draftListings = useMemo(() => rows.filter((r) => r.status === 'draft'), [rows]);
  const soldListings = useMemo(() => rows.filter((r) => r.availabilityStatus === 'sold' || r.availabilityStatus === 'let'), [rows]);
  const filtered = tab === 'active' ? activeListings : tab === 'drafts' ? draftListings : soldListings;

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-serif font-medium text-black">My Portfolio</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors ${
              tab === 'active' ? 'bg-white border border-gray-200 text-black' : 'bg-transparent border border-transparent text-gray-400 hover:text-black'
            }`}
          >
            Active ({activeListings.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('drafts')}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors ${
              tab === 'drafts' ? 'bg-white border border-gray-200 text-black' : 'bg-transparent border border-transparent text-gray-400 hover:text-black'
            }`}
          >
            Drafts ({draftListings.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('sold')}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors ${
              tab === 'sold' ? 'bg-white border border-gray-200 text-black' : 'bg-transparent border border-transparent text-gray-400 hover:text-black'
            }`}
          >
            Sold ({soldListings.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col md:flex-row h-48 animate-pulse">
              <div className="w-full md:w-64 h-48 md:h-full bg-gray-200" />
              <div className="flex-1 p-6 flex flex-col justify-center gap-2">
                <div className="h-5 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 rounded" />
                <div className="h-6 w-24 bg-gray-200 rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <EmptyState
            variant="light"
            title={tab === 'active' ? 'No active listings' : tab === 'drafts' ? 'No drafts' : 'No sold listings'}
            subtitle={tab === 'active' ? 'Create a listing to get started.' : 'Nothing in this tab yet.'}
            action={tab === 'active' ? { label: 'Create listing', onClick: () => navigate('/agent/listings/new') } : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filtered.map((r) => (
            <ListingCard
              key={r._id}
              listing={r}
              onManage={() => navigate(`/agent/listings/${r._id}/edit`)}
              onEdit={() => navigate(`/agent/listings/${r._id}/edit`)}
              onSubmit={() => handleSubmit(r._id)}
              onArchive={() => handleDelete(r._id)}
              onRestore={() => handleRestore(r._id)}
              submitting={submittingId === r._id}
              deleting={deletingId === r._id}
              updating={updatingId === r._id}
              menuOpen={menuOpenId === r._id}
              onMenuToggle={() => setMenuOpenId(menuOpenId === r._id ? null : r._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({
  listing,
  onManage,
  onEdit,
  onSubmit,
  onArchive,
  onRestore,
  submitting,
  deleting,
  updating,
  menuOpen,
  onMenuToggle,
}: {
  listing: AgentListing;
  onManage: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  submitting: boolean;
  deleting: boolean;
  updating: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
}) {
  const imgUrl =
    listing.images?.find((i) => i.isPrimary)?.url ||
    listing.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80';
  const location = [listing.location?.area, listing.location?.city].filter(Boolean).join(', ') || 'Kenya';
  const isSold = listing.availabilityStatus === 'sold' || listing.availabilityStatus === 'let';
  const isDraft = listing.status === 'draft';
  const isArchived = listing.status === 'archived';
  const statusLabel = isSold ? 'Sold' : isDraft ? 'Draft' : isArchived ? 'Archived' : 'Active';
  const statusClass = isSold
    ? 'bg-gray-100 text-gray-600'
    : isDraft
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : isArchived
        ? 'bg-gray-100 text-gray-500'
        : 'bg-green-50 text-green-700 border border-green-200';

  return (
    <div className="group bg-white border border-gray-200 hover:border-black transition-all duration-300 rounded-lg overflow-hidden flex flex-col md:flex-row h-auto md:h-48">
      <div
        className="w-full md:w-64 h-48 md:h-full relative overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer"
        onClick={onManage}
        onKeyDown={(e) => e.key === 'Enter' && onManage()}
        role="button"
        tabIndex={0}
      >
        <img
          src={imgUrl}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale-[20%] group-hover:grayscale-0"
        />
        <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border ${statusClass}`}>
          {statusLabel}
        </div>
      </div>
      <div className="flex-1 p-6 flex flex-col justify-between min-w-0 relative">
        <div>
          <div className="flex justify-between items-start mb-2">
            <div className="min-w-0 pr-8">
              <h3 className="text-xl font-serif font-medium text-black group-hover:underline decoration-1 underline-offset-4 truncate">{listing.title}</h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1 flex items-center">
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2 flex-shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            </div>
            <div className="absolute top-6 right-6">
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuToggle();
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-black"
                  aria-label="Actions"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" aria-hidden onClick={onMenuToggle} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => { onEdit(); onMenuToggle(); }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      {listing.status === 'draft' && (
                        <button
                          type="button"
                          onClick={onSubmit}
                          disabled={submitting}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          {submitting ? 'Submitting...' : 'Submit for review'}
                        </button>
                      )}
                      {listing.status === 'archived' ? (
                        <button
                          type="button"
                          onClick={onRestore}
                          disabled={updating}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          {updating ? 'Restoring...' : 'Restore'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onArchive}
                          disabled={deleting}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        >
                          {deleting ? 'Archiving...' : 'Archive'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <p className="font-mono text-lg font-medium mt-2 text-black">
            {listing.currency === 'KES' ? 'KES' : listing.currency} {Number(listing.price).toLocaleString()}
            {!isSold && <span className="text-xs text-gray-400 font-sans"> / mo</span>}
          </p>
          {isSold && (
            <p className="font-mono text-lg font-medium mt-0.5 line-through text-gray-400">
              {listing.currency} {Number(listing.price).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <Eye className="w-4 h-4 text-gray-400" />
            —
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <Heart className="w-4 h-4 text-gray-400" />
            —
          </div>
          <div className="flex-1 text-right">
            {isSold ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Deal Closed</span>
            ) : (
              <button
                type="button"
                onClick={onManage}
                className="text-[10px] font-bold uppercase tracking-widest hover:underline decoration-1 underline-offset-4"
              >
                Manage
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
