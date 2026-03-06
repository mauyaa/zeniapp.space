import React, { forwardRef, InputHTMLAttributes, useState, useId } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

export type InputState = 'default' | 'error' | 'success';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  state?: InputState;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const stateStyles: Record<InputState, string> = {
  default: 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100',
  error: 'border-red-300 focus:border-red-500 focus:ring-red-100',
  success: 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100',
};

const sizeStyles = {
  sm: 'h-9 text-xs px-3 rounded-xl',
  md: 'h-11 text-sm px-4 rounded-xl',
  lg: 'h-11 text-base px-5 rounded-xl',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      success,
      state: propState,
      leftIcon,
      rightIcon,
      size = 'md',
      fullWidth = true,
      className,
      id: propId,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = propId || generatedId;
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    // Determine state from props or error/success messages
    const state = propState || (error ? 'error' : success ? 'success' : 'default');

    // Password visibility toggle
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className={clsx('space-y-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            type={inputType}
            disabled={disabled}
            aria-invalid={state === 'error'}
            aria-describedby={clsx(hint && hintId, error && errorId) || undefined}
            className={clsx(
              // Base: single radius (rounded-xl), clear focus
              'w-full border bg-white shadow-sm',
              'text-slate-900 placeholder:text-slate-400',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0 focus-visible:ring-2',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50',
              'dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500',
              // Size
              sizeStyles[size],
              // State
              stateStyles[state],
              // Icon padding
              leftIcon && 'pl-10',
              (rightIcon || isPassword || state !== 'default') && 'pr-10',
              // Custom
              className
            )}
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus-visible:text-emerald-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
            {!isPassword && state === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
            {!isPassword && state === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
            {!isPassword && rightIcon && state === 'default' && rightIcon}
          </div>
        </div>

        {/* Hint text */}
        {hint && !error && !success && (
          <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-medium text-red-600 flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}

        {/* Success message */}
        {success && !error && (
          <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {success}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea variant
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  state?: InputState;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, state: propState, className, id: propId, ...props }, ref) => {
    const generatedId = useId();
    const id = propId || generatedId;
    const state = propState || (error ? 'error' : 'default');

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={id}
          aria-invalid={state === 'error'}
          className={clsx(
            'w-full rounded-xl border bg-white px-4 py-3 shadow-sm',
            'text-sm text-slate-900 placeholder:text-slate-400',
            'transition-all duration-200 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500',
            stateStyles[state],
            className
          )}
          {...props}
        />

        {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}

        {error && (
          <p role="alert" className="text-xs font-medium text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
