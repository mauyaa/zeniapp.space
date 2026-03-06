import React from 'react';

const options = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'closed', label: 'Closed' },
];

export function FilterChips({
  value,
  onChange,
}: {
  value: 'all' | 'active' | 'scheduled' | 'closed';
  onChange: (val: 'all' | 'active' | 'scheduled' | 'closed') => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value as typeof value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? 'bg-[#0F2E2A] text-white shadow-sm'
                : 'border border-[#E9E2D8] bg-[#FFFBF7]/90 text-slate-600 hover:border-amber-300 hover:text-amber-700 dark:border-slate-800/80 dark:bg-[#0F1914]/70 dark:text-slate-300 dark:hover:border-amber-500/40'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
