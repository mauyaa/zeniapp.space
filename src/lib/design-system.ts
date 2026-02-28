/**
 * KejaHunt Design System
 * A comprehensive design system for consistent, accessible UI
 */

// =============================================================================
// COLOR TOKENS
// =============================================================================
export const colors = {
  // Brand Colors
  brand: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669', // Primary
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  // Neutral (Slate)
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  // Semantic Colors
  success: { light: '#dcfce7', DEFAULT: '#22c55e', dark: '#15803d' },
  warning: { light: '#fef3c7', DEFAULT: '#f59e0b', dark: '#b45309' },
  error: { light: '#fee2e2', DEFAULT: '#ef4444', dark: '#b91c1c' },
  info: { light: '#dbeafe', DEFAULT: '#3b82f6', dark: '#1d4ed8' },
} as const;

// =============================================================================
// SPACING SCALE
// =============================================================================
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================
export const typography = {
  fonts: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, Menlo, monospace',
  },
  sizes: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================
export const radii = {
  none: '0',
  sm: '0.25rem',
  DEFAULT: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.25rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

// =============================================================================
// SHADOWS
// =============================================================================
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================
export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  DEFAULT: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// =============================================================================
// Z-INDEX SCALE
// =============================================================================
export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  toast: 1600,
  tooltip: 1700,
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// =============================================================================
// COMPONENT VARIANTS (Tailwind Class Presets)
// =============================================================================
/**
 * Button token presets – kept in sync with `src/components/ui/Button.tsx`.
 * Sizes use the same scale (h-9/h-11) so that every portal renders
 * identical hit-targets and visual weight.
 */
export const buttonVariants = {
  base: 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  sizes: {
    sm: 'h-9 px-3 text-xs gap-1.5 rounded-xl',
    md: 'h-11 px-4 text-sm gap-2 rounded-xl',
    lg: 'h-11 px-5 text-base gap-2.5 rounded-xl',
    xl: 'h-11 px-6 text-lg gap-3 rounded-xl',
    'zeni-sm': 'h-9 px-3 text-[10px] font-mono font-semibold uppercase tracking-widest gap-1.5 rounded-xl',
    'zeni-md': 'h-11 px-5 text-xs font-mono font-semibold uppercase tracking-widest gap-2 rounded-xl',
  },
  variants: {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500 shadow-sm shadow-emerald-900/10',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400 border border-slate-200',
    outline: 'border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-400 bg-transparent',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400 bg-transparent',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500 shadow-sm shadow-rose-900/10',
    'zeni-primary': 'bg-zeni-foreground text-white border border-zeni-foreground rounded transition-colors duration-200 hover:bg-white hover:text-zeni-foreground hover:border-zinc-200 focus-visible:ring-zinc-400',
    'zeni-secondary': 'bg-white text-zeni-foreground border border-zinc-200 rounded transition-colors duration-200 hover:bg-zeni-foreground hover:text-white hover:border-zeni-foreground focus-visible:ring-zinc-400',
  },
} as const;

export const inputVariants = {
  base: 'w-full rounded-xl border bg-white shadow-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500',
  sizes: {
    sm: 'h-9 text-xs px-3 rounded-xl',
    md: 'h-11 text-sm px-4 rounded-xl',
    lg: 'h-11 text-base px-5 rounded-xl',
  },
  states: {
    default: 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-100',
    success: 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100',
  },
} as const;

export const cardVariants = {
  base: 'rounded-xl border bg-white shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-lg dark:shadow-slate-950/30',
  interactive: 'hover:shadow-md hover:border-emerald-200 cursor-pointer dark:hover:border-emerald-500/40',
  selected: 'ring-2 ring-emerald-500 border-emerald-500/50 shadow-md',
} as const;

// =============================================================================
// ACCESSIBILITY UTILITIES
// =============================================================================
export const a11y = {
  srOnly: 'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
  notSrOnly: 'static w-auto h-auto p-0 m-0 overflow-visible whitespace-normal',
  focusRing: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
  focusRingInset: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset',
  skipLink: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow-lg',
} as const;

// =============================================================================
// ANIMATION PRESETS
// =============================================================================
export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
  stagger: {
    animate: { transition: { staggerChildren: 0.05 } },
  },
} as const;

// =============================================================================
// THEME MODES
// =============================================================================
export type ThemeMode = 'light' | 'dark' | 'system';

export const themeClasses = {
  light: {
    bg: 'bg-slate-50',
    bgCard: 'bg-white',
    bgMuted: 'bg-slate-100',
    text: 'text-slate-900',
    textMuted: 'text-slate-500',
    border: 'border-slate-200',
  },
  dark: {
    bg: 'bg-slate-950',
    bgCard: 'bg-slate-900',
    bgMuted: 'bg-slate-800',
    text: 'text-slate-50',
    textMuted: 'text-slate-400',
    border: 'border-slate-800',
  },
} as const;
