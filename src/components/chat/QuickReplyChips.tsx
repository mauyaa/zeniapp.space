import React from 'react';

export interface QuickReplyOption {
  id: string;
  label: string;
  value: string;
}

export function QuickReplyChips({
  options,
  onSelect,
}: {
  options: QuickReplyOption[];
  onSelect: (value: QuickReplyOption) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt)}
          className="rounded-full border border-amber-200/70 bg-[#FFFBF7]/90 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-slate-800/80 dark:bg-[#0F1914]/70 dark:text-amber-200 dark:hover:border-amber-500/50"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
