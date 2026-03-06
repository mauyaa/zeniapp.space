import React from 'react';
import { LeadStage } from '../../types/chat';

const options: { value: LeadStage; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-slate-700 text-slate-200' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-500/15 text-blue-200' },
  { value: 'viewing', label: 'Viewing', color: 'bg-amber-500/15 text-amber-200' },
  { value: 'offer', label: 'Offer', color: 'bg-teal-500/15 text-teal-200' },
  { value: 'closed', label: 'Closed', color: 'bg-emerald-500/15 text-emerald-200' },
];

export function LeadStageSelect({
  value,
  onChange,
  size = 'md',
}: {
  value: LeadStage;
  onChange: (val: LeadStage) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as LeadStage)}
      className={`rounded-xl border border-[#E9E2D8] bg-[#FFFBF7] text-xs font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-200/60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 ${
        size === 'sm' ? 'px-2 py-1' : 'px-3 py-2'
      }`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className={opt.color}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
