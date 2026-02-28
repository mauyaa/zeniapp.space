import React from 'react';
import { cn } from '../../utils/cn';

/**
 * SectionHeader — consistent page/section heading used across all portals.
 * Replaces the repeated eyebrow + title + subtitle + stats pattern.
 */

interface SectionHeaderProps {
  /** Small eyebrow label above the title */
  eyebrow?: string;
  /** Main heading */
  title: string;
  /** Supporting text below the title */
  subtitle?: string;
  /** Right-aligned actions (buttons etc.) */
  actions?: React.ReactNode;
  /** Content rendered below the title block (e.g. StatsBar) */
  children?: React.ReactNode;
  /** visual style */
  variant?: 'zeni' | 'system';
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  variant = 'zeni',
  className,
}: SectionHeaderProps) {
  const isZeni = variant === 'zeni';

  return (
    <section className={cn('space-y-4', className)} aria-label={title}>
      {eyebrow && (
        <span
          className={cn(
            'inline-block py-1 px-3 text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm border',
            isZeni
              ? 'border-zinc-200 text-zinc-500 bg-white'
              : 'border-slate-700 text-slate-400 bg-slate-900/60'
          )}
        >
          {eyebrow}
        </span>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="min-w-0">
          <h1
            className={cn(
              'text-2xl lg:text-4xl leading-tight',
              isZeni ? 'font-serif text-zinc-900' : 'font-semibold text-slate-100'
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'mt-1.5 text-sm max-w-xl',
                isZeni ? 'text-zinc-500' : 'text-slate-400'
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>

      {children}
    </section>
  );
}
