import React from 'react';
import { cn } from '../../utils/cn';

/**
 * StatsBar — unified horizontal stat strip used across all portals.
 * Replaces the repeated flex/border stat sections on every page header.
 */

export interface StatItem {
  label: string;
  value: string | number;
  /** Optional: muted appearance when value is zero/empty */
  muted?: boolean;
  /** Optional: accent dot color (e.g. 'bg-green-500') */
  dot?: string;
}

interface StatsBarProps {
  items: StatItem[];
  /** visual style: 'zeni' for user portal serif, 'system' for mono admin/agent/pay */
  variant?: 'zeni' | 'system';
  loading?: boolean;
  className?: string;
}

export function StatsBar({ items, variant = 'zeni', loading = false, className }: StatsBarProps) {
  const isZeni = variant === 'zeni';

  return (
    <div
      className={cn(
        'inline-flex flex-wrap border rounded-lg overflow-hidden',
        isZeni
          ? 'border-zinc-200 bg-white'
          : 'border-slate-700 bg-slate-900/60',
        className
      )}
      role="group"
      aria-label="Quick stats"
    >
      {items.map((item, idx) => (
        <div
          key={item.label}
          className={cn(
            'px-5 py-3.5 flex flex-col justify-center min-w-[100px]',
            idx < items.length - 1 && (isZeni ? 'border-r border-zinc-200' : 'border-r border-slate-700')
          )}
        >
          <p
            className={cn(
              'text-[10px] font-bold uppercase tracking-[0.15em] mb-1',
              isZeni ? 'text-zinc-400' : 'text-slate-500'
            )}
          >
            {item.label}
          </p>
          {loading ? (
            <div
              className={cn(
                'h-6 w-10 rounded animate-pulse',
                isZeni ? 'bg-zinc-200' : 'bg-slate-700'
              )}
              aria-hidden="true"
            />
          ) : (
            <div className="flex items-center gap-2">
              {item.dot && (
                <span className={cn('h-2 w-2 rounded-full flex-shrink-0', item.dot)} />
              )}
              <p
                className={cn(
                  'text-xl font-semibold tabular-nums',
                  isZeni ? 'font-serif' : 'font-mono',
                  item.muted
                    ? (isZeni ? 'text-zinc-300' : 'text-slate-600')
                    : (isZeni ? 'text-zinc-900' : 'text-slate-100')
                )}
              >
                {item.value}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
