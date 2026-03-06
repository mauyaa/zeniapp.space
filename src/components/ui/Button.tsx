import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'zeni-primary'
  | 'zeni-secondary'
  | 'admin-primary';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'zeni-sm' | 'zeni-md';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional semantic tone for upstream APIs; currently maps to variant styles. */
  tone?: string;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  /** Defaults to "button" to prevent accidental form submissions */
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus-visible:ring-green-500 shadow-sm border border-green-600',
  secondary:
    'bg-white text-black hover:bg-black/5 active:bg-black/10 focus-visible:ring-black/20 border border-black/10',
  outline:
    'border border-black/20 text-black hover:bg-black/5 active:bg-black/10 focus-visible:ring-black/20 bg-transparent',
  ghost:
    'text-black/70 hover:bg-black/5 hover:text-black focus-visible:ring-black/20 bg-transparent',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500 shadow-sm shadow-rose-900/10',
  'zeni-primary':
    'bg-zeni-foreground text-white border border-zeni-foreground rounded transition-colors duration-200 hover:bg-white hover:text-zeni-foreground hover:border-zinc-200 focus-visible:ring-zinc-400',
  'zeni-secondary':
    'bg-white text-zeni-foreground border border-zinc-200 rounded transition-colors duration-200 hover:bg-zeni-foreground hover:text-white hover:border-zeni-foreground focus-visible:ring-zinc-400',
  'admin-primary':
    'bg-black text-white border border-black hover:bg-black/90 hover:border-black/90 focus-visible:ring-black',
};

/* Primary buttons: same height (h-11) and weight (font-semibold) across portals */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-base gap-2.5 rounded-xl',
  xl: 'h-11 px-6 text-lg gap-3 rounded-xl',
  'zeni-sm':
    'h-9 px-3 text-[10px] font-mono font-semibold uppercase tracking-widest gap-1.5 rounded-xl',
  'zeni-md': 'h-11 px-5 text-xs font-mono font-semibold uppercase tracking-widest gap-2 rounded-xl',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
  'zeni-sm': 'w-3.5 h-3.5',
  'zeni-md': 'w-4 h-4',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        type={type}
        whileTap={{ scale: isDisabled ? 1 : 0.98 }}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-live={loading ? 'polite' : undefined}
        className={clsx(
          // Base: same height/weight, single radius (rounded-xl)
          'inline-flex items-center justify-center font-semibold',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950',
          'active:enabled:[transform:scale(0.98)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Reduced motion
          'motion-reduce:transition-none motion-reduce:active:transform-none',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {loading ? (
          <>
            <Loader2 className={clsx('animate-spin', iconSizes[size])} aria-hidden="true" />
            <span className="sr-only">Loading</span>
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon && <span className={iconSizes[size]}>{leftIcon}</span>}
            {children}
            {rightIcon && <span className={iconSizes[size]}>{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

// Icon-only button variant
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className, ...props }, ref) => {
    const iconOnlySizes: Record<ButtonSize, string> = {
      sm: 'w-8 h-8 p-0',
      md: 'w-10 h-10 p-0',
      lg: 'w-12 h-12 p-0',
      xl: 'w-14 h-14 p-0',
      'zeni-sm': 'w-8 h-8 p-0',
      'zeni-md': 'w-10 h-10 p-0',
    };

    return (
      <Button
        ref={ref}
        size={size}
        className={clsx(iconOnlySizes[size], 'rounded-full', className)}
        {...props}
      >
        <span className={iconSizes[size]}>{icon}</span>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';
