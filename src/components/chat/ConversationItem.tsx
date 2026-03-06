import React from 'react';
import { motion } from 'framer-motion';
import { Conversation } from '../../types/chat';
import { BadgeCheck, ChevronRight, Clock, Calendar, CheckCheck } from 'lucide-react';
import { LeadStageSelect } from './LeadStageSelect';
import { useAuth } from '../../context/AuthProvider';

/**
 * Enhanced ConversationItem with animations and better visual hierarchy
 */

interface Props {
  conversation: Conversation;
  active?: boolean;
  onClick: () => void;
  onLeadStageChange?: (leadStage: Conversation['leadStage']) => void;
  variant?: 'dark' | 'light';
  index?: number;
  preview?: string;
  isTyping?: boolean;
}

export function ConversationItem({
  conversation,
  active,
  onClick,
  onLeadStageChange,
  variant = 'dark',
  index = 0,
  preview,
  isTyping = false,
}: Props) {
  const { role } = useAuth();
  const isDark = variant === 'dark';
  const unread = conversation.unreadCount > 0;

  // Format time relative
  const formatTime = (date: string) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Status badge config
  const getStatusConfig = (status: Conversation['status']) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          classes: isDark
            ? 'bg-emerald-500/15 text-emerald-200'
            : 'bg-emerald-100 text-emerald-700',
          icon: null,
        };
      case 'scheduled':
        return {
          label: 'Viewing Set',
          classes: isDark ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-100 text-amber-700',
          icon: Calendar,
        };
      case 'closed':
        return {
          label: 'Closed',
          classes: isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600',
          icon: CheckCheck,
        };
      default:
        return {
          label: status,
          classes: isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600',
          icon: null,
        };
    }
  };

  const statusConfig = getStatusConfig(conversation.status);
  const buyerName =
    conversation.userSnapshot?.name || `Buyer ${conversation.userId?.slice(-4) || ''}`.trim();
  const buyerRole = conversation.userSnapshot?.role;
  const buyerLabel = buyerRole === 'admin' ? 'Zeni Admin' : buyerName;
  const agentName = conversation.agentSnapshot?.name || 'Zeni Agent';
  const agentLabel = agentName.toLowerCase().includes('admin') ? 'Zeni Admin' : 'Zeni Agent';
  const agentInitials = agentLabel === 'Zeni Admin' ? 'ZAd' : 'ZA';
  const isAdmin = role === 'admin';
  const listingTitle = conversation.listingSnapshot?.title;
  const listingLocation = conversation.listingSnapshot?.locationText;
  const listingPrice = conversation.listingSnapshot?.price;
  const titleText =
    role === 'agent'
      ? buyerLabel || 'User'
      : role === 'admin'
        ? buyerRole === 'user'
          ? buyerName
          : agentLabel
        : listingTitle || agentLabel || 'Chat';
  const secondaryLabel =
    role === 'agent' || role === 'admin'
      ? listingTitle
        ? `Listing: ${listingTitle}`
        : conversation.agentSnapshot?.name || 'Agent'
      : agentLabel;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`group w-full rounded-2xl border p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
        active
          ? isDark
            ? 'border-emerald-500/40 bg-gradient-to-r from-[#0F1914] to-[#0B1410] shadow-[0_18px_48px_rgba(0,0,0,0.4)]'
            : 'border-amber-200/80 bg-gradient-to-r from-[#F7F2EA] to-[#FFFCFA] shadow-[0_18px_48px_rgba(17,24,39,0.06)]'
          : isDark
            ? 'border-slate-800/80 bg-[#0B1512]/70 hover:border-slate-700 hover:bg-[#0B1512]/90'
            : 'border-[#E9E2D8] bg-[#FFFBF7]/90 shadow-[0_10px_30px_rgba(17,24,39,0.05)] hover:border-amber-200 hover:shadow-[0_16px_40px_rgba(17,24,39,0.08)]'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail with unread indicator */}
        <div className="relative flex-shrink-0">
          {isAdmin ? (
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xs font-semibold text-white ring-2 ${
                active ? 'ring-amber-400/60' : isDark ? 'ring-slate-800/70' : 'ring-[#EFE6DA]'
              } bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-[0_8px_20px_rgba(16,185,129,0.25)]`}
            >
              {agentInitials}
            </div>
          ) : conversation.listingSnapshot?.thumbUrl ? (
            <img
              src={conversation.listingSnapshot.thumbUrl}
              alt={conversation.listingSnapshot.title || 'Listing'}
              className={`h-14 w-14 rounded-2xl object-cover ring-2 ${
                active ? 'ring-amber-400/60' : isDark ? 'ring-slate-800/70' : 'ring-[#EFE6DA]'
              }`}
            />
          ) : (
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-lg ring-2 ${
                active
                  ? 'ring-amber-400/60'
                  : isDark
                    ? 'ring-slate-800/70 bg-slate-800/80 text-slate-300'
                    : 'ring-[#EFE6DA] bg-amber-100/80 text-amber-700'
              }`}
            >
              💬
            </div>
          )}
          {conversation.unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow"
            >
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </motion.span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: Title and time */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className={`truncate text-sm font-semibold ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                } font-display ${unread ? 'font-bold' : ''}`}
              >
                {titleText}
              </h3>
              {!isAdmin && listingPrice != null && (
                <p
                  className={`mt-0.5 text-xs font-semibold ${
                    isDark ? 'text-emerald-300' : 'text-emerald-700'
                  }`}
                >
                  {listingPrice}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={`flex items-center gap-1 text-[11px] ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <Clock className="h-3 w-3" />
                {formatTime(conversation.lastMessageAt)}
              </span>
            </div>
          </div>

          {/* Location and agent */}
          <div className="mt-1.5 space-y-1">
            {!isAdmin && (listingLocation != null || listingTitle != null) && (
              <p className={`truncate text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {listingLocation ?? listingTitle ?? '—'}
              </p>
            )}
            <div
              className={`flex items-center gap-1 text-[11px] ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              <span>{secondaryLabel}</span>
              {role === 'user' && conversation.agentSnapshot.verified && (
                <BadgeCheck
                  className={`h-3 w-3 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                />
              )}
            </div>
            {preview && (
              <div
                className={`truncate text-[11px] ${
                  unread
                    ? isDark
                      ? 'text-slate-200'
                      : 'text-slate-700'
                    : isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                }`}
              >
                {isTyping ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="italic text-amber-500">Typing</span>
                    <span className="flex items-center gap-0.5">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-amber-500" />
                      <span
                        className="h-1 w-1 animate-bounce rounded-full bg-amber-500"
                        style={{ animationDelay: '0.1s' }}
                      />
                      <span
                        className="h-1 w-1 animate-bounce rounded-full bg-amber-500"
                        style={{ animationDelay: '0.2s' }}
                      />
                    </span>
                  </span>
                ) : (
                  preview
                )}
              </div>
            )}
          </div>

          {/* Bottom row: Status and lead stage */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusConfig.classes}`}
              >
                {statusConfig.icon && <statusConfig.icon className="h-3 w-3" />}
                {statusConfig.label}
              </span>
              {role === 'agent' && (
                <LeadStageSelect
                  value={conversation.leadStage}
                  onChange={(val) => onLeadStageChange?.(val)}
                  size="sm"
                />
              )}
            </div>
            <ChevronRight
              className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${
                isDark ? 'text-amber-300/70' : 'text-amber-400'
              }`}
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

/**
 * Skeleton loader for conversation items
 */
export function ConversationItemSkeleton({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const isDark = variant === 'dark';

  return (
    <div
      className={`w-full rounded-2xl border p-3 ${
        isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`h-14 w-14 animate-pulse rounded-2xl ${
            isDark ? 'bg-slate-800' : 'bg-slate-200'
          }`}
        />
        <div className="flex-1 space-y-2">
          <div
            className={`h-4 w-3/4 animate-pulse rounded ${
              isDark ? 'bg-slate-800' : 'bg-slate-200'
            }`}
          />
          <div
            className={`h-3 w-1/2 animate-pulse rounded ${
              isDark ? 'bg-slate-800' : 'bg-slate-200'
            }`}
          />
          <div
            className={`h-3 w-2/3 animate-pulse rounded ${
              isDark ? 'bg-slate-800' : 'bg-slate-200'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
