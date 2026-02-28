import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  MessagesSquare,
  Inbox,
  type LucideIcon 
} from 'lucide-react';

/**
 * Chat-specific empty states with animations and CTAs
 */

interface ChatEmptyStateProps {
  title: string;
  subtitle: string;
  type?: 'conversations' | 'messages' | 'search' | 'custom';
  icon?: LucideIcon;
  variant?: 'light' | 'dark';
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Icon mappings for different empty state types
const iconMap: Record<string, LucideIcon> = {
  conversations: Inbox,
  messages: MessageSquare,
  search: MessagesSquare,
  custom: MessageSquare,
};

export function EmptyState({ 
  title, 
  subtitle,
  type = 'messages',
  icon,
  variant = 'dark',
  action,
}: ChatEmptyStateProps) {
  const IconComponent = icon || iconMap[type];
  const isLight = variant === 'light';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={`flex flex-col items-center justify-center gap-4 rounded-2xl border px-6 py-12 text-center ${
        isLight
          ? 'border-[#E9E2D8] bg-[#FFFBF7]/90 text-slate-900 shadow-[0_10px_30px_rgba(17,24,39,0.06)]'
          : 'border-slate-800 bg-gradient-to-b from-[#0F1914] to-[#0B1512] text-slate-100'
      }`}
    >
      {/* Animated icon container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="relative"
      >
        {/* Background circle */}
        <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
          isLight ? 'bg-amber-50' : 'bg-gradient-to-br from-slate-800 to-slate-900'
        }`}>
          <IconComponent className={`h-8 w-8 ${
            isLight ? 'text-amber-400' : 'text-slate-500'
          }`} strokeWidth={1.5} />
        </div>
        
        {/* Decorative elements */}
        <motion.div
          className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500/60"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-slate-600"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 2.5,
            delay: 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>

      {/* Text content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="space-y-1"
      >
        <h3 className={`text-sm font-semibold font-display ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{title}</h3>
        <p className={`max-w-[240px] text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</p>
      </motion.div>

      {/* Action button */}
      {action && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className={`mt-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
            isLight ? 'focus-visible:ring-offset-white' : 'focus-visible:ring-offset-slate-900'
          }`}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

/**
 * Specialized empty state for no conversations
 */
export function NoConversationsState({
  onExplore,
  variant = 'dark'
}: {
  onExplore?: () => void;
  variant?: 'light' | 'dark';
}) {
  return (
    <EmptyState
      type="conversations"
      title="No conversations yet"
      subtitle="Start a conversation by messaging an agent about a property you're interested in."
      variant={variant}
      action={onExplore ? {
        label: 'Explore Properties',
        onClick: onExplore,
      } : undefined}
    />
  );
}

/**
 * Specialized empty state for conversation search
 */
export function NoSearchResultsState({
  query,
  variant = 'dark'
}: {
  query: string;
  variant?: 'light' | 'dark';
}) {
  return (
    <EmptyState
      type="search"
      title="No results found"
      subtitle={`We couldn't find any conversations matching "${query}". Try a different search term.`}
      variant={variant}
    />
  );
}

/**
 * Inline empty state for chat thread
 */
export function InlineEmptyChat() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-8 text-center"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
        <MessageSquare className="h-6 w-6 text-slate-500" />
      </div>
      <p className="text-sm text-slate-400">Start the conversation!</p>
      <p className="mt-1 text-xs text-slate-500">Send a message to get things going</p>
    </motion.div>
  );
}
