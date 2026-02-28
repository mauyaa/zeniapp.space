import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

/**
 * Enhanced BottomNav with animations, badges, and haptic feedback
 */

interface NavTab {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface BottomNavProps {
  tabs: NavTab[];
  badges?: Record<string, number>;
  variant?: 'dark' | 'light';
  className?: string;
}

export function BottomNav({
  tabs,
  badges,
  variant = 'dark',
  className = '',
}: BottomNavProps) {
  const isDark = variant === 'dark';
  const reduceMotion = useReducedMotion();

  return (
    <motion.nav
      initial={reduceMotion ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: reduceMotion ? 0 : 0.2, duration: reduceMotion ? 0 : 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={clsx(
        'fixed inset-x-0 bottom-0 z-30 backdrop-blur-xl',
        'pb-[env(safe-area-inset-bottom)]',
        isDark
          ? 'border-t border-white/10 bg-black/95'
          : 'border-t border-black/10 bg-white/95',
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Gradient overlay for depth */}
      <div
        className={clsx(
          'absolute inset-x-0 top-0 h-px',
          isDark
            ? 'bg-gradient-to-r from-transparent via-green-500/30 to-transparent'
            : 'bg-gradient-to-r from-transparent via-orange-500/40 to-transparent'
        )}
      />

      <div className="mx-auto flex h-16 max-w-5xl items-center justify-around px-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'relative flex flex-col items-center justify-center gap-0.5',
                'min-w-[64px] rounded-2xl px-3 py-2',
                'text-[11px] font-semibold',
                'transition-all duration-200',
                'focus:outline-none focus-visible:ring-2',
                isDark ? 'focus-visible:ring-green-500' : 'focus-visible:ring-orange-500',
                isActive
                  ? isDark
                    ? 'text-green-400'
                    : 'text-orange-600'
                  : isDark
                  ? 'text-white/60 active:bg-white/10'
                  : 'text-black/60 active:bg-orange-500/10'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active background */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className={clsx(
                        'absolute inset-0 rounded-2xl',
                        isDark ? 'bg-green-500/10' : 'bg-orange-500/15'
                      )}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                        duration: reduceMotion ? 0 : undefined,
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon with animation */}
                <motion.div
                  className="relative"
                  whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17, duration: reduceMotion ? 0 : undefined }}
                >
                  <Icon
                    className={clsx(
                      'h-5 w-5 transition-transform duration-200',
                      isActive && 'scale-110'
                    )}
                  />

                  {/* Unread dot (orange for all users when new message) */}
                  {badges?.[to] && badges[to] > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-orange-500"
                      aria-label={`${badges[to]} unread`}
                    />
                  )}
                </motion.div>

                {/* Label */}
                <span className="relative z-10 mt-0.5">{label}</span>

                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className={clsx(
                      'absolute -top-0.5 h-1 w-1 rounded-full',
                      isDark ? 'bg-green-400' : 'bg-orange-500'
                    )}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                      duration: reduceMotion ? 0 : undefined,
                    }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </motion.nav>
  );
}

/**
 * Floating action button for bottom nav area
 */
interface FloatingActionProps {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  label: string;
  variant?: 'primary' | 'secondary';
}

export function FloatingAction({
  icon: Icon,
  onClick,
  label,
  variant = 'primary',
}: FloatingActionProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      whileHover={reduceMotion ? undefined : { scale: 1.05 }}
      whileTap={reduceMotion ? undefined : { scale: 0.95 }}
      onClick={onClick}
      className={clsx(
        'fixed bottom-20 right-4 z-40',
        'flex h-14 w-14 items-center justify-center',
        'rounded-full shadow-lg',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        variant === 'primary'
          ? 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500'
          : 'bg-white text-black border border-black/10 hover:bg-black/5 focus-visible:ring-black'
      )}
      aria-label={label}
    >
      <Icon className="h-6 w-6" />
    </motion.button>
  );
}

/**
 * Tab bar alternative for desktop/tablet
 */
interface TabBarProps {
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (to: string) => void;
  variant?: 'dark' | 'light';
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
  variant = 'light',
}: TabBarProps) {
  const isDark = variant === 'dark';
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 rounded-xl p-1',
        isDark ? 'bg-white/10' : 'bg-black/5'
      )}
      role="tablist"
    >
      {tabs.map(({ to, label, icon: Icon }) => {
        const isActive = activeTab === to;
        return (
          <button
            key={to}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(to)}
            className={clsx(
              'relative flex items-center gap-2 rounded-lg px-4 py-2',
              'text-sm font-medium transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
              isActive
                ? isDark
                  ? 'text-white'
                  : 'text-black'
                : isDark
                ? 'text-white/70 hover:text-white'
                : 'text-black/60 hover:text-black'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="tab-active"
                className={clsx(
                  'absolute inset-0 rounded-lg',
                  isDark ? 'bg-white/10' : 'bg-white shadow-sm border border-black/10'
                )}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                  duration: reduceMotion ? 0 : undefined,
                }}
              />
            )}
            <Icon className="relative z-10 h-4 w-4" />
            <span className="relative z-10">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
