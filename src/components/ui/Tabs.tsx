import React, { useCallback, useRef } from 'react';
import { cn } from '../../utils/cn';

interface TabsProps {
  tabs: string[];
  value: string;
  onChange: (v: string) => void;
  /** Optional accessible label for the tab group */
  ariaLabel?: string;
  /** Visual variant — defaults to 'auto' (follows system theme) */
  theme?: 'dark' | 'light' | 'auto';
}

/**
 * Accessible tabs component with keyboard navigation.
 * Supports Arrow Left/Right to move between tabs,
 * Home/End to jump to first/last tab, and Enter/Space to select.
 */
export function Tabs({ tabs, value, onChange, ariaLabel = 'Tabs', theme = 'auto' }: TabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex: number | null = null;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = (index + 1) % tabs.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = (index - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = tabs.length - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onChange(tabs[index]);
          return;
        default:
          return;
      }

      if (nextIndex !== null) {
        tabRefs.current[nextIndex]?.focus();
        onChange(tabs[nextIndex]);
      }
    },
    [tabs, onChange]
  );

  const getSelectedStyle = () => {
    if (theme === 'dark') return 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100';
    if (theme === 'light') return 'border-zeni-foreground bg-zeni-foreground text-white';
    return 'border-zeni-foreground bg-zeni-foreground text-white dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-100';
  };

  const getUnselectedStyle = () => {
    if (theme === 'dark') return 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700';
    if (theme === 'light') return 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900';
    return 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700';
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
    >
      {tabs.map((t, index) => {
        const isSelected = value === t;
        return (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            id={`tab-${t}`}
            aria-selected={isSelected}
            aria-controls={`tabpanel-${t}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(t)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
              theme === 'dark' ? 'focus-visible:ring-emerald-400' : 'focus-visible:ring-zeni-foreground',
              isSelected ? getSelectedStyle() : getUnselectedStyle()
            )}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
