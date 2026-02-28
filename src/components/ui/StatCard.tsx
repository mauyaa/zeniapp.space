import React from 'react';
import { cn } from '../../utils/cn';

type Tone = 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'slate';
type Theme = 'dark' | 'light' | 'auto';

export function StatCard({
  label,
  value,
  trend,
  tone = 'emerald',
  compact = false,
  theme = 'auto',
}: {
  label: string;
  value: string | number;
  trend?: string;
  tone?: Tone;
  compact?: boolean;
  theme?: Theme;
}) {
  const darkColors: Record<Tone, string> = {
    emerald: 'text-emerald-300',
    blue: 'text-blue-300',
    amber: 'text-amber-300',
    rose: 'text-rose-300',
    purple: 'text-purple-300',
    slate: 'text-slate-200',
  };
  const lightColors: Record<Tone, string> = {
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
    purple: 'text-purple-700',
    slate: 'text-slate-700',
  };
  const autoColors: Record<Tone, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-300',
    blue: 'text-blue-700 dark:text-blue-300',
    amber: 'text-amber-700 dark:text-amber-300',
    rose: 'text-rose-700 dark:text-rose-300',
    purple: 'text-purple-700 dark:text-purple-300',
    slate: 'text-slate-700 dark:text-slate-200',
  };

  const colors = theme === 'dark' ? darkColors : theme === 'light' ? lightColors : autoColors;

  const containerBase = theme === 'dark'
    ? 'border-slate-800 bg-slate-900/60'
    : theme === 'light'
    ? 'border-slate-200 bg-white'
    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60';

  const labelColor = theme === 'dark'
    ? 'text-slate-500'
    : theme === 'light'
    ? 'text-slate-500'
    : 'text-slate-500 dark:text-slate-500';

  return (
    <div
      className={cn(
        'rounded-2xl border p-3 shadow-sm',
        containerBase,
        compact ? 'w-24 text-center' : ''
      )}
    >
      <div className={cn('flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide', labelColor)}>
        <span>{label}</span>
        {!compact && trend && (
          <span className={cn('text-[10px] font-semibold', colors[tone])}>{trend}</span>
        )}
      </div>
      <div className={cn('text-xl font-bold', colors[tone])}>{value}</div>
    </div>
  );
}
