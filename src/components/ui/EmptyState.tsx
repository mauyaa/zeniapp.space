import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  Home, 
  Bookmark, 
  Calendar,
  FileX,
  Inbox,
  MapPin,
  Heart,
  Bell,
  Users,
  type LucideIcon
} from 'lucide-react';

/**
 * Enhanced EmptyState component with illustrations and CTAs
 * Provides visual feedback and actionable next steps
 */

// Predefined illustration types
const illustrations: Record<string, LucideIcon> = {
  messages: MessageSquare,
  search: Search,
  home: Home,
  saved: Bookmark,
  calendar: Calendar,
  file: FileX,
  inbox: Inbox,
  location: MapPin,
  favorites: Heart,
  notifications: Bell,
  users: Users,
};

interface EmptyStateProps {
  title: string;
  subtitle: string;
  illustration?: keyof typeof illustrations | LucideIcon;
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  subtitle,
  illustration = 'inbox',
  variant = 'dark',
  size = 'md',
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  const isDark = variant === 'dark';
  const reduceMotion = useReducedMotion();
  
  // Get the icon component
  const IconComponent = typeof illustration === 'string' 
    ? illustrations[illustration] || Inbox
    : illustration;

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'px-4 py-6',
      icon: 'h-10 w-10',
      iconBg: 'h-16 w-16',
      title: 'text-sm',
      subtitle: 'text-xs',
      button: 'h-8 px-3 text-xs',
    },
    md: {
      container: 'px-6 py-10',
      icon: 'h-12 w-12',
      iconBg: 'h-20 w-20',
      title: 'text-base',
      subtitle: 'text-sm',
      button: 'h-10 px-4 text-sm',
    },
    lg: {
      container: 'px-8 py-16',
      icon: 'h-16 w-16',
      iconBg: 'h-28 w-28',
      title: 'text-lg',
      subtitle: 'text-base',
      button: 'h-12 px-6 text-base',
    },
  };

  const config = sizeConfig[size];

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={`flex flex-col items-center justify-center gap-4 rounded-xl border text-center ${config.container} ${
        isDark
          ? 'border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-900/40'
          : 'border-[#E9E2D8] bg-gradient-to-b from-[#FFFBF7] to-[#F7F2EA] shadow-[0_10px_30px_rgba(17,24,39,0.06)]'
      } ${className}`}
      role="status"
      aria-label={title}
    >
      {/* Animated illustration */}
      <motion.div
        initial={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: reduceMotion ? 0 : 0.1, duration: reduceMotion ? 0 : 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={`relative flex items-center justify-center rounded-full ${config.iconBg} ${
          isDark
            ? 'bg-gradient-to-br from-slate-800 to-slate-900'
            : 'bg-gradient-to-br from-amber-50 to-amber-100'
        }`}
      >
        {/* Decorative ring */}
        <div
          className={`absolute inset-0 rounded-full border-2 ${
            isDark ? 'border-emerald-500/20' : 'border-amber-300/60'
          }`}
        />
        
        {/* Animated dots */}
        <motion.div
          className={`absolute -right-1 -top-1 h-3 w-3 rounded-full ${
            isDark ? 'bg-emerald-500' : 'bg-amber-400'
          }`}
          animate={
            reduceMotion
              ? { scale: 1, opacity: 0.7 }
              : { scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          }
        />
        <motion.div
          className={`absolute -bottom-1 -left-1 h-2 w-2 rounded-full ${
            isDark ? 'bg-slate-600' : 'bg-amber-200'
          }`}
          animate={
            reduceMotion
              ? { scale: 1, opacity: 0.6 }
              : { scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 2.5, delay: 0.5, repeat: Infinity, ease: 'easeInOut' }
          }
        />

        <IconComponent
          className={`${config.icon} ${
            isDark ? 'text-slate-500' : 'text-amber-400'
          }`}
          strokeWidth={1.5}
        />
      </motion.div>

      {/* Text content */}
      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.2, duration: reduceMotion ? 0 : 0.3 }}
        className="space-y-1"
      >
        <h3
          className={`font-semibold ${config.title} ${
            isDark ? 'text-slate-100' : 'text-slate-800'
          }`}
        >
          {title}
        </h3>
        <p
          className={`${config.subtitle} max-w-xs ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {subtitle}
        </p>
      </motion.div>

      {/* Action buttons */}
      {(action || secondaryAction) && (
        <motion.div
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.3, duration: reduceMotion ? 0 : 0.3 }}
          className="flex flex-col gap-2 pt-2 sm:flex-row"
        >
          {action && (
            <button
              onClick={action.onClick}
              type="button"
              className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${config.button} ${
                action.variant === 'secondary'
                  ? isDark
                    ? 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 focus-visible:ring-slate-500'
                    : 'border border-[#E9E2D8] bg-[#FFFBF7] text-slate-700 hover:bg-amber-50 focus-visible:ring-amber-300'
                  : 'bg-emerald-700 text-white hover:bg-emerald-600 focus-visible:ring-emerald-500'
              }`}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${config.button} ${
                isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-amber-700 hover:text-amber-600'
              }`}
            >
              {secondaryAction.label}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Compact empty state for inline use
 */
interface InlineEmptyProps {
  message: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'dark' | 'light';
}

export function InlineEmpty({
  message,
  icon: Icon = Inbox,
  action,
  variant = 'dark',
}: InlineEmptyProps) {
  const isDark = variant === 'dark';

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
        isDark ? 'bg-slate-900/50 text-slate-400' : 'bg-amber-50 text-slate-500'
      }`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 text-sm">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className={`text-sm font-medium transition-colors ${
            isDark
              ? 'text-emerald-400 hover:text-emerald-300'
              : 'text-amber-700 hover:text-amber-600'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Full page empty state
 */
interface FullPageEmptyProps extends EmptyStateProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

export function FullPageEmpty({
  showBackButton,
  onBack,
  ...props
}: FullPageEmptyProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      {showBackButton && onBack && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className={`mb-6 flex items-center gap-2 text-sm font-medium transition-colors ${
            props.variant === 'dark'
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-amber-700 hover:text-amber-600'
          }`}
        >
          Go back
        </motion.button>
      )}
      <EmptyState {...props} size="lg" />
    </div>
  );
}
