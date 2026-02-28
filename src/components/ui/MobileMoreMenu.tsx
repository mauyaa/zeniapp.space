import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronUp, MoreHorizontal, X } from 'lucide-react';
import clsx from 'clsx';

type MoreItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

interface MobileMoreMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  title: string;
  items: MoreItem[];
  theme?: 'light' | 'dark';
  className?: string;
}

export function MobileMoreMenu({
  open,
  onToggle,
  onClose,
  title,
  items,
  theme = 'light',
  className
}: MobileMoreMenuProps) {
  const isDark = theme === 'dark';

  return (
    <>
      <button
        onClick={onToggle}
        className={clsx(
          'fixed bottom-20 right-4 z-40 xl:hidden inline-flex h-12 items-center gap-2 rounded-full px-4 text-xs font-semibold uppercase tracking-[0.2em] shadow-lg transition-colors',
          isDark
            ? 'border border-white/15 bg-black/50 text-slate-200 hover:border-amber-300/40 hover:text-amber-200'
            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-900 hover:text-slate-900',
          className
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
        More
        <ChevronUp className={clsx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            className={clsx('absolute inset-0 w-full', isDark ? 'bg-black/60' : 'bg-slate-900/35')}
            onClick={onClose}
            aria-label="Close menu"
          />
          <div
            className={clsx(
              'absolute inset-x-0 bottom-0 rounded-t-3xl border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl',
              isDark ? 'border-white/10 bg-[#0b111a]' : 'border-slate-200 bg-white'
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className={clsx('text-[11px] font-semibold uppercase tracking-[0.22em]', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {title}
              </div>
              <button
                onClick={onClose}
                className={clsx(
                  'inline-flex h-8 w-8 items-center justify-center rounded-full border',
                  isDark ? 'border-white/10 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-900'
                )}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2 rounded-2xl border px-3 py-3 text-xs font-semibold',
                        isDark
                          ? isActive
                            ? 'border-amber-300/30 bg-amber-300/10 text-amber-200'
                            : 'border-white/10 bg-white/5 text-slate-300'
                          : isActive
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

