import React from 'react';
import { Search, ArrowUpDown, X } from 'lucide-react';
import clsx from 'clsx';

export type SortKey = 'recommended' | 'price-asc' | 'price-desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

interface ResultsToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  resultCount: number;
  loading?: boolean;
  className?: string;
}

export function ResultsToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  resultCount,
  loading = false,
  className,
}: ResultsToolbarProps) {
  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-2 rounded-2xl border border-[#E9E2D8] bg-[#FFFBF7] p-2 shadow-[0_10px_30px_rgba(17,24,39,0.06)]',
        className
      )}
    >
      <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#E9E2D8] bg-white px-3 py-2 shadow-inner">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by listing, location, or agent"
          className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => onQueryChange('')}
            className="rounded-full p-1 text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#E9E2D8] bg-white px-3 py-2 text-sm text-slate-700 shadow-inner">
        <ArrowUpDown className="h-4 w-4 text-amber-600" />
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="bg-transparent text-sm focus:outline-none"
          aria-label="Sort results"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ml-auto rounded-xl border border-transparent bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
        {loading ? 'Loading listings...' : `${resultCount} results`}
      </div>
    </div>
  );
}
