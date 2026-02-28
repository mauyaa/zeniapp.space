import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

/**
 * Enhanced Card component with variants and animations.
 *
 * The `theme` prop defaults to `'auto'` which reads the Tailwind `dark:` class
 * on `<html>` so the card automatically follows the global theme.  Pass
 * `'dark'` or `'light'` to force a specific appearance (e.g. inside the Pay
 * portal which always uses a dark chrome).
 */

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  interactive?: boolean;
  selected?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** @default 'auto' — follows system/user theme via Tailwind dark: class */
  theme?: 'dark' | 'light' | 'auto';
}

const variantStyles = {
  dark: {
    default: 'border-slate-800 bg-slate-900/70 shadow-lg shadow-slate-950/30',
    elevated: 'border-slate-800 bg-slate-900 shadow-xl shadow-slate-950/50',
    outlined: 'border-slate-700 bg-transparent',
    glass: 'border-slate-700/50 bg-slate-900/50 backdrop-blur-xl',
  },
  light: {
    default: 'border-slate-200 bg-white shadow-sm',
    elevated: 'border-slate-200 bg-white shadow-lg shadow-slate-200/50',
    outlined: 'border-slate-200 bg-transparent',
    glass: 'border-slate-200/50 bg-white/80 backdrop-blur-xl shadow-sm',
  },
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

// Auto-theme styles use Tailwind dark: variants so the card follows the global theme
const autoVariantStyles: Record<string, string> = {
  default: 'border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-lg dark:shadow-slate-950/30',
  elevated: 'border-slate-200 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-xl dark:shadow-slate-950/50',
  outlined: 'border-slate-200 bg-transparent dark:border-slate-700 dark:bg-transparent',
  glass: 'border-slate-200/50 bg-white/80 backdrop-blur-xl shadow-sm dark:border-slate-700/50 dark:bg-slate-900/50 dark:backdrop-blur-xl',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      interactive = false,
      selected = false,
      padding = 'md',
      theme = 'auto',
      children,
      ...props
    },
    ref
  ) => {
    const reduceMotion = useReducedMotion();

    // Resolve variant styles based on theme mode
    const resolvedVariantClass =
      theme === 'auto'
        ? autoVariantStyles[variant]
        : variantStyles[theme][variant];

    return (
      <motion.div
        ref={ref}
        whileHover={interactive && !reduceMotion ? { scale: 1.01, y: -2 } : undefined}
        whileTap={interactive && !reduceMotion ? { scale: 0.99 } : undefined}
        className={clsx(
          'rounded-xl border transition-all duration-200 ease-out',
          resolvedVariantClass,
          paddingStyles[padding],
          interactive && 'cursor-pointer hover:shadow-lg',
          selected && 'ring-2 ring-emerald-500 border-emerald-500/50',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

/**
 * Card header component
 */
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  theme?: 'dark' | 'light' | 'auto';
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  theme = 'auto',
  className,
  ...props
}: CardHeaderProps) {
  // For explicit dark/light, use static classes; for auto, use Tailwind dark: variants
  const isAuto = theme === 'auto';
  const isDark = theme === 'dark';

  const iconBg = isAuto ? 'bg-slate-100 dark:bg-slate-800' : isDark ? 'bg-slate-800' : 'bg-slate-100';
  const titleColor = isAuto ? 'text-slate-900 dark:text-slate-100' : isDark ? 'text-slate-100' : 'text-slate-900';
  const subtitleColor = isAuto ? 'text-slate-500 dark:text-slate-400' : isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={clsx('flex items-start justify-between gap-4', className)} {...props}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', iconBg)}>
            {icon}
          </div>
        )}
        <div>
          <h3 className={clsx('font-semibold', titleColor)}>
            {title}
          </h3>
          {subtitle && (
            <p className={clsx('mt-0.5 text-sm', subtitleColor)}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * Card content wrapper
 */
export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('mt-4', className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Card footer component
 */
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  theme?: 'dark' | 'light' | 'auto';
}

export function CardFooter({
  className,
  theme = 'auto',
  children,
  ...props
}: CardFooterProps) {
  const isAuto = theme === 'auto';
  const isDark = theme === 'dark';
  const borderBg = isAuto
    ? 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
    : isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50';

  return (
    <div
      className={clsx(
        '-mx-4 -mb-4 mt-4 flex items-center justify-end gap-2 rounded-b-xl border-t px-4 py-3',
        borderBg,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Skeleton card for loading states
 */
interface CardSkeletonProps {
  theme?: 'dark' | 'light' | 'auto';
  lines?: number;
  hasHeader?: boolean;
}

export function CardSkeleton({
  theme = 'auto',
  lines = 3,
  hasHeader = true,
}: CardSkeletonProps) {
  const isAuto = theme === 'auto';
  const isDark = theme === 'dark';
  const bgColor = isAuto ? 'bg-slate-200 dark:bg-slate-800' : isDark ? 'bg-slate-800' : 'bg-slate-200';

  return (
    <Card theme={theme} className="animate-pulse">
      {hasHeader && (
        <div className="flex items-start gap-3">
          <div className={clsx('h-10 w-10 rounded-xl', bgColor)} />
          <div className="flex-1 space-y-2">
            <div className={clsx('h-4 w-2/3 rounded', bgColor)} />
            <div className={clsx('h-3 w-1/2 rounded', bgColor)} />
          </div>
        </div>
      )}
      <div className={clsx('space-y-2', hasHeader && 'mt-4')}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx('h-3 rounded', bgColor)}
            style={{ width: `${100 - i * 15}%` }}
          />
        ))}
      </div>
    </Card>
  );
}
