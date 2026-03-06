import React from 'react';
import { cn } from '../../utils/cn';

type Tone = 'emerald' | 'rose' | 'amber' | 'blue' | 'slate' | 'purple';
type Theme = 'dark' | 'light' | 'auto';

export function Badge({
  children,
  tone = 'slate',
  theme = 'auto',
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  theme?: Theme;
  className?: string;
}) {
  const darkColors: Record<Tone, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-200',
    rose: 'bg-rose-500/20 text-rose-200',
    amber: 'bg-amber-500/20 text-amber-200',
    blue: 'bg-blue-500/20 text-blue-200',
    slate: 'bg-slate-700 text-slate-200',
    purple: 'bg-purple-500/20 text-purple-200',
  };
  const lightColors: Record<Tone, string> = {
    emerald: 'bg-emerald-100 text-emerald-800',
    rose: 'bg-rose-100 text-rose-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
    slate: 'bg-slate-100 text-slate-700',
    purple: 'bg-purple-100 text-purple-800',
  };
  const autoColors: Record<Tone, string> = {
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
    rose: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200',
  };

  const colors = theme === 'dark' ? darkColors : theme === 'light' ? lightColors : autoColors;

  return (
    <span
      className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', colors[tone], className)}
    >
      {children}
    </span>
  );
}
