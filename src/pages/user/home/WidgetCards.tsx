import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, TrendingUp, Home, ArrowRight, ArrowUpRight } from 'lucide-react';
import { formatCompactPrice } from '../../../lib/format';
import { PropertyMap } from '../../../components/PropertyMap';
import type { Property } from '../../../utils/mockData';

// ---------- Schedule Widget ----------

interface ScheduleWidgetProps {
  nextViewing: { date: string } | undefined;
  nextViewingTitle: string | undefined;
  upcomingCount: number;
}

export const ScheduleWidget = React.memo(function ScheduleWidget({
  nextViewing,
  nextViewingTitle,
  upcomingCount,
}: ScheduleWidgetProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all group relative overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
          <Calendar className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Schedule
        </span>
      </div>
      <div className="mb-2 relative z-10">
        <h3 className="text-2xl font-bold font-serif">
          {nextViewing && nextViewingTitle ? 'Next Viewing' : 'No Viewings'}
        </h3>
        <p className="text-xs text-green-600 mt-1">
          {nextViewing && nextViewingTitle
            ? `${nextViewingTitle} — ${new Date(nextViewing.date).toLocaleString()}`
            : 'Book a viewing from a listing'}
        </p>
      </div>
      <div className="mt-6 relative z-10">
        <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 mb-2">
          <span>Today&apos;s capacity</span>
          <span>{upcomingCount === 0 ? 'All clear' : `${upcomingCount} scheduled`}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, upcomingCount * 25)}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate('/app/viewings')}
        className="mt-4 text-xs font-bold uppercase tracking-widest text-blue-700 hover:text-blue-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        aria-label="Open viewing schedule"
      >
        Open schedule
      </button>
    </div>
  );
});

// ---------- Market Pulse Widget ----------

interface MarketPulseProps {
  averagePrice: number | null;
  currency: string;
  topNeighborhood: string;
  verifiedCount: number;
}

export const MarketPulseWidget = React.memo(function MarketPulseWidget({
  averagePrice,
  currency,
  topNeighborhood,
  verifiedCount,
}: MarketPulseProps) {
  return (
    <div className="bg-black text-white p-6 rounded-2xl relative overflow-hidden group">
      <svg
        className="absolute bottom-0 left-0 w-full h-24 text-zinc-800 opacity-50 group-hover:opacity-70 transition-opacity"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        <path d="M0,40 Q20,35 40,20 T100,10 V40 H0 Z" fill="currentColor" />
      </svg>
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="bg-zinc-800 text-white p-2 rounded-lg">
          <TrendingUp className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Market
        </span>
      </div>
      <div className="relative z-10">
        <h3 className="text-3xl font-mono font-bold mb-1">
          {averagePrice ? formatCompactPrice(averagePrice, currency) : '--'}
        </h3>
        <p className="text-xs text-zinc-300">
          Avg. listing in <span className="text-white font-bold">{topNeighborhood}</span>
        </p>
      </div>
      <div className="mt-6 flex items-center gap-2 relative z-10">
        <span className="text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded">
          {verifiedCount} verified
        </span>
      </div>
    </div>
  );
});

// ---------- New Match Widget ----------

interface NewMatchProps {
  match: (Property & { saved?: boolean }) | undefined;
  onSelect: (id: string) => void;
}

export const NewMatchWidget = React.memo(function NewMatchWidget({
  match,
  onSelect,
}: NewMatchProps) {
  if (!match) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 border-l-4 border-l-green-500 hover:shadow-lg transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="bg-green-50 text-green-600 p-2 rounded-lg">
          <Home className="w-5 h-5" />
        </div>
        <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded-full">
          New
        </span>
      </div>
      <h3 className="text-lg font-bold mb-1">{match.title}</h3>
      <p className="text-xs text-zinc-600 mb-4">
        {match.features?.bedrooms ?? 0} Bed &bull; {match.features?.bathrooms ?? 0} Bath &bull;{' '}
        {formatCompactPrice(match.price, match.currency)}
        {(match.purpose === 'rent' || (match.category || '').toLowerCase().includes('rent')) &&
          ' per month'}
      </p>
      <button
        type="button"
        onClick={() => onSelect(match.id)}
        className="w-full py-2.5 border border-gray-200 hover:border-black text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
      >
        View <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
});

// ---------- Mini Map Widget ----------

interface MiniMapProps {
  items: Property[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  itemCount: number;
}

export const MiniMapWidget = React.memo(function MiniMapWidget({
  items,
  selectedId,
  onSelect,
  itemCount,
}: MiniMapProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200 h-[200px] relative overflow-hidden group cursor-pointer">
      <div className="absolute inset-0 bg-gray-200">
        <PropertyMap
          properties={items.filter((p) => !(p.location?.lat === 0 && p.location?.lng === 0))}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>
      <div className="absolute bottom-4 left-4 right-4 bg-white p-3 rounded-xl shadow-lg flex justify-between items-center z-10">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase font-bold">Explore map</p>
          <p className="font-mono font-bold text-sm">{itemCount} listings</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/app/explore?view=map')}
          className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
          aria-label="Open full map"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
