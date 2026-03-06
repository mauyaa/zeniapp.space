import React from 'react';
import { Sparkles, TrendingUp, ShieldCheck, Heart } from 'lucide-react';
import { StatsBar } from '../../../components/ui/StatsBar';

interface HeroSectionProps {
  displayName: string;
  timeGreeting: string;
  activeUpdates: number;
  loading: boolean;
  itemCount: number;
  verifiedCount: number;
  savedCount: number;
}

export const HeroSection = React.memo(function HeroSection({
  displayName,
  timeGreeting,
  activeUpdates,
  loading,
  itemCount,
  verifiedCount,
  savedCount,
}: HeroSectionProps) {
  return (
    <section className="mb-10" aria-label="Dashboard overview">
      {/* Greeting row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 py-1 px-3 mb-4 border border-zinc-200 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 bg-white rounded-sm">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            Dashboard
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl text-zinc-900 leading-tight font-serif">
            Good {timeGreeting}, <span className="italic text-zinc-400">{displayName}.</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500 flex items-center gap-2">
            <span
              className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse"
              aria-hidden="true"
            />
            {activeUpdates > 0 ? (
              <>
                <strong className="text-zinc-800">{activeUpdates}</strong> active update
                {activeUpdates !== 1 ? 's' : ''} today
              </>
            ) : (
              'All caught up — no new updates'
            )}
          </p>
        </div>

        <StatsBar
          variant="zeni"
          loading={loading}
          items={[
            { label: 'Listings', value: String(itemCount) },
            { label: 'Verified', value: String(verifiedCount), dot: 'bg-green-500' },
            { label: 'Saved', value: String(savedCount), muted: savedCount === 0 },
          ]}
        />
      </div>

      {/* Summary insight strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 flex-shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-800">Market active</p>
            <p className="text-[11px] text-zinc-500 truncate">
              {itemCount} properties available near you
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-800">Verified listings</p>
            <p className="text-[11px] text-zinc-500 truncate">
              {verifiedCount} agent-verified homes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500 flex-shrink-0">
            <Heart className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-800">Your saves</p>
            <p className="text-[11px] text-zinc-500 truncate">
              {savedCount > 0 ? `${savedCount} listings saved` : 'No saves yet — start exploring'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});
