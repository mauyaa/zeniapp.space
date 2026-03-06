import React from 'react';
import { Bookmark, Phone, Share, ExternalLink } from 'lucide-react';
import { ListingSnapshot } from '../../types/chat';
import { toggleSaveListing } from '../../lib/api';
import { useAuth } from '../../context/AuthProvider';

interface ListingHeaderCardProps {
  listing: ListingSnapshot;
  listingId?: string;
  onView?: () => void;
  agent?: { name?: string; verified?: boolean };
}

export function ListingHeaderCard({ listing, listingId, onView, agent }: ListingHeaderCardProps) {
  const { role } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const handleSave = async () => {
    if (!listingId) return;
    setSaving(true);
    try {
      const res = await toggleSaveListing(listingId ?? listing.title);
      setSaved(res.saved);
    } catch {
      setSaved((prev) => !prev);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sticky top-0 z-10 rounded-3xl border border-[#E9E2D8] bg-[#FFFBF7]/90 p-4 shadow-[0_20px_50px_rgba(17,24,39,0.08)] backdrop-blur dark:border-slate-800/80 dark:bg-[#0F1914]/80">
      <div className="flex gap-4">
        <img
          src={listing.thumbUrl}
          alt={listing.title}
          className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover ring-2 ring-amber-200/60 dark:ring-emerald-500/20"
        />
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 line-clamp-1 dark:text-slate-100 font-display tracking-wide">
                {listing.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {listing.locationText}
              </div>
            </div>
            {agent?.name && (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <span>{agent.name}</span>
                {agent.verified && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {listing.price}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Listing details and actions
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onView}
          className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
        >
          <ExternalLink className="h-4 w-4" />
          View Listing
        </button>
        {role === 'user' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-xl border border-[#E9E2D8] px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-slate-800 dark:text-slate-200 dark:hover:border-amber-500/50"
          >
            <Bookmark className="h-4 w-4" />
            {saved ? 'Saved' : 'Save'}
          </button>
        )}
        <button className="inline-flex items-center gap-1 rounded-xl border border-[#E9E2D8] px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-slate-800 dark:text-slate-200 dark:hover:border-amber-500/50">
          <Phone className="h-4 w-4" />
          Call
        </button>
        <button className="inline-flex items-center gap-1 rounded-xl border border-[#E9E2D8] px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-slate-800 dark:text-slate-200 dark:hover:border-amber-500/50">
          <Share className="h-4 w-4" />
          Share
        </button>
      </div>
    </div>
  );
}
