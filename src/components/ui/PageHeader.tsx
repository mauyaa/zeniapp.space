import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

interface Stat {
  label: string;
  value: string | number;
  hint?: string;
}

type PageHeaderVariant = 'light' | 'dark';
type PageHeaderTone = 'emerald' | 'amber' | 'blue' | 'rose';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  stats?: Stat[];
  variant?: PageHeaderVariant;
  tone?: PageHeaderTone;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  stats,
  variant = 'light',
  tone,
  className,
}: PageHeaderProps) {
  const isDark = variant === 'dark';
  const reduceMotion = useReducedMotion();
  const effectiveTone: PageHeaderTone = tone || (isDark ? 'emerald' : 'amber');

  const toneStyles: Record<
    PageHeaderTone,
    { badge: string; dot: string; glowA: string; glowB: string; stat: string }
  > = {
    emerald: {
      badge: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
      dot: 'bg-emerald-400',
      glowA: 'bg-emerald-500/25',
      glowB: 'bg-emerald-300/20',
      stat: 'text-emerald-200',
    },
    amber: {
      badge: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
      dot: 'bg-amber-400',
      glowA: 'bg-amber-500/25',
      glowB: 'bg-amber-300/20',
      stat: 'text-amber-200',
    },
    blue: {
      badge: 'bg-blue-500/15 text-blue-200 border-blue-500/30',
      dot: 'bg-blue-400',
      glowA: 'bg-blue-500/25',
      glowB: 'bg-blue-300/20',
      stat: 'text-blue-200',
    },
    rose: {
      badge: 'bg-rose-500/15 text-rose-200 border-rose-500/30',
      dot: 'bg-rose-400',
      glowA: 'bg-rose-500/25',
      glowB: 'bg-rose-300/20',
      stat: 'text-rose-200',
    },
  };

  const toneStyle = toneStyles[effectiveTone];

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.4, 0, 0.2, 1] }}
      className={clsx(
        'relative overflow-hidden rounded-3xl border p-5 shadow-[0_18px_45px_rgba(17,24,39,0.08)]',
        isDark
          ? 'border-slate-800 bg-slate-950/80 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.45)]'
          : 'border-[#E9E2D8] bg-[#FFFCFA] text-slate-900',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className={clsx(
            'absolute -top-28 right-0 h-56 w-56 rounded-full blur-3xl',
            isDark ? toneStyle.glowA : 'bg-amber-200/40'
          )}
        />
        <div
          className={clsx(
            'absolute -bottom-32 left-0 h-64 w-64 rounded-full blur-3xl',
            isDark ? toneStyle.glowB : 'bg-emerald-200/30'
          )}
        />
      </div>

      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          {eyebrow && (
            <span
              className={clsx(
                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]',
                isDark ? `border ${toneStyle.badge}` : 'bg-amber-100/70 text-amber-700'
              )}
            >
              <span
                className={clsx(
                  'h-1.5 w-1.5 rounded-full',
                  isDark ? toneStyle.dot : 'bg-amber-500'
                )}
              />
              {eyebrow}
            </span>
          )}
          <div>
            <h1
              className={clsx(
                'text-2xl font-semibold font-display tracking-wide md:text-3xl',
                isDark ? 'text-slate-100' : 'text-slate-900'
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className={clsx(
                  'mt-1 max-w-xl text-sm',
                  isDark ? 'text-slate-400' : 'text-slate-600'
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {stats && stats.length > 0 && (
        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={clsx(
                'rounded-2xl border px-4 py-3 shadow-[0_12px_30px_rgba(17,24,39,0.05)]',
                isDark ? 'border-slate-800 bg-slate-900/60' : 'border-[#E9E2D8] bg-[#FFFBF7]'
              )}
            >
              <div
                className={clsx(
                  'text-xs font-semibold uppercase tracking-widest',
                  isDark ? 'text-slate-500' : 'text-slate-500'
                )}
              >
                {stat.label}
              </div>
              <div
                className={clsx(
                  'mt-1 text-lg font-semibold',
                  isDark ? toneStyle.stat : 'text-slate-900'
                )}
              >
                {stat.value}
              </div>
              {stat.hint && (
                <div className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>
                  {stat.hint}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}
