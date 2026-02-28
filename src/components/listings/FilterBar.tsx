import { useEffect, useState, useMemo } from 'react';
import { SlidersHorizontal, MapPin, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useDebouncedCallback } from '../../hooks/useDebounce';

export interface FilterState {
  purpose: 'rent' | 'buy';
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  type?: string;
  verifiedOnly: boolean;
}

const PURPOSES: FilterState['purpose'][] = ['rent', 'buy'];
const TYPES = ['Apartment', 'House', 'Townhouse', 'Studio', 'Office'];
const BED_OPTIONS = [1, 2, 3, 4, 5];
const BATH_OPTIONS = [1, 2, 3, 4];

const STORAGE_KEY = 'buyer_filters_v1';
const DEFAULT_FILTERS: FilterState = { purpose: 'rent', verifiedOnly: false };

export function FilterBar({
  onChange,
  className
}: {
  onChange: (filters: FilterState) => void;
  className?: string;
}) {
  const [storedFilters, setStoredFilters] = useLocalStorage<FilterState>(STORAGE_KEY, DEFAULT_FILTERS);
  const [filters, setFilters] = useState<FilterState>(storedFilters);

  // Price validation error
  const priceError = useMemo(() => {
    if (
      filters.minPrice !== undefined &&
      filters.maxPrice !== undefined &&
      filters.minPrice > filters.maxPrice
    ) {
      return 'Min price cannot exceed max price';
    }
    return null;
  }, [filters.minPrice, filters.maxPrice]);

  // Debounce filter changes to avoid excessive API calls
  const debouncedOnChange = useDebouncedCallback(
    (f: FilterState) => {
      // Only emit if price range is valid
      if (f.minPrice !== undefined && f.maxPrice !== undefined && f.minPrice > f.maxPrice) return;
      onChange(f);
      setStoredFilters(f);
    },
    300
  );

  useEffect(() => {
    debouncedOnChange(filters);
  }, [filters, debouncedOnChange]);

  const set = (patch: Partial<FilterState>) => setFilters((prev) => ({ ...prev, ...patch }));

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-2 rounded-2xl border border-[#E9E2D8] bg-[#FFFBF7] px-3 py-2 shadow-[0_10px_30px_rgba(17,24,39,0.06)]',
        className
      )}>
      <div className="flex items-center gap-2 pr-3 text-xs font-semibold uppercase text-slate-500">
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </div>

      <div className="flex gap-1 rounded-2xl bg-[#F7F2EA] p-1 text-sm font-semibold text-slate-700">
        {PURPOSES.map((p) => (
          <button
            key={p}
            onClick={() => set({ purpose: p })}
            className={clsx(
              'rounded-xl px-3 py-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300',
              filters.purpose === p ? 'bg-[#FFFBF7] shadow text-slate-900' : 'text-slate-600'
            )}>
            {p === 'rent' ? 'Rent' : 'Buy'}
          </button>
        ))}
      </div>

      <SelectChip
        label="Beds"
        value={filters.beds}
        options={BED_OPTIONS}
        onSelect={(v) => set({ beds: v })}
      />
      <SelectChip
        label="Baths"
        value={filters.baths}
        options={BATH_OPTIONS}
        onSelect={(v) => set({ baths: v })}
      />

      <div className="relative flex items-center gap-2 rounded-xl border border-[#E9E2D8] bg-[#FFFBF7] px-3 py-1.5 text-sm text-slate-700 shadow-inner">
        <span>Price</span>
        <input
          type="number"
          min={0}
          value={filters.minPrice ?? ''}
          onChange={(e) => set({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="Min"
          aria-label="Minimum price"
          className={clsx(
            'w-20 rounded-lg border px-2 py-1 text-sm focus:outline-none',
            priceError ? 'border-red-400 focus:border-red-500' : 'border-[#E9E2D8] focus:border-amber-400'
          )}
        />
        <span className="text-slate-400">-</span>
        <input
          type="number"
          min={0}
          value={filters.maxPrice ?? ''}
          onChange={(e) => set({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="Max"
          aria-label="Maximum price"
          className={clsx(
            'w-20 rounded-lg border px-2 py-1 text-sm focus:outline-none',
            priceError ? 'border-red-400 focus:border-red-500' : 'border-[#E9E2D8] focus:border-amber-400'
          )}
        />
        {priceError && (
          <span className="absolute -bottom-5 left-0 text-[10px] text-red-500 font-medium whitespace-nowrap">
            {priceError}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#E9E2D8] bg-[#FFFBF7] px-3 py-1.5 text-sm text-slate-700 shadow-inner">
        <MapPin className="h-4 w-4 text-emerald-700" />
        <select
          className="bg-transparent text-sm focus:outline-none"
          value={filters.type ?? ''}
          onChange={(e) => set({ type: e.target.value || undefined })}>
          <option value="">Any type</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => set({ verifiedOnly: !filters.verifiedOnly })}
        className={clsx(
          'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300',
          filters.verifiedOnly
            ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700'
            : 'border-[#E9E2D8] bg-[#FFFBF7] text-slate-600'
        )}>
        <ShieldCheck className="h-4 w-4" />
        Verified only
      </button>

      <button
        onClick={() => setFilters(DEFAULT_FILTERS)}
        className="ml-auto text-xs font-semibold text-amber-700 transition hover:text-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
        Reset
      </button>
    </div>
  );
}

function SelectChip({
  label,
  value,
  options,
  onSelect
}: {
  label: string;
  value?: number;
  options: number[];
  onSelect: (v?: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-[#E9E2D8] bg-[#FFFBF7] px-3 py-1.5 text-sm text-slate-700 shadow-inner">
      <span>{label}</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(value === opt ? undefined : opt)}
            className={clsx(
              'rounded-lg px-2 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300',
              value === opt ? 'bg-amber-100 text-amber-800' : 'bg-[#F7F2EA] text-slate-600'
            )}>
            {opt}+
          </button>
        ))}
      </div>
    </div>
  );
}
