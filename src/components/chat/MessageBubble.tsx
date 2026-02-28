import React from 'react';
import { motion } from 'framer-motion';
import { Message } from '../../types/chat';
import { Check, CheckCheck, Bot, Shield, User, Clock, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  message: Message;
  isMine: boolean;
  showAvatar?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showMeta?: boolean;
  senderLabel?: string;
}

function StatusIcon({ status }: { status: Message['status'] }) {
  const icons = {
    read: <CheckCheck className="h-3.5 w-3.5 text-amber-200" />,
    delivered: <CheckCheck className="h-3.5 w-3.5 text-amber-200/80" />,
    sent: <Check className="h-3.5 w-3.5 text-amber-200/70" />,
    sending: <Clock className="h-3.5 w-3.5 text-amber-200/70 animate-pulse" />,
    failed: <AlertCircle className="h-3.5 w-3.5 text-red-400" />
  };
  return icons[status] || icons.sending;
}

function SenderAvatar({ senderType, isMine }: { senderType: string; isMine: boolean }) {
  const avatarClasses = clsx(
    'w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs',
    senderType === 'bot' && 'bg-gradient-to-br from-amber-500 to-orange-500',
    senderType === 'agent' && !isMine && 'bg-gradient-to-br from-emerald-500 to-teal-600',
    senderType === 'user' && isMine && 'bg-gradient-to-br from-slate-600 to-slate-700',
    senderType === 'system' && 'bg-gradient-to-br from-amber-500 to-orange-600'
  );

  const icons = {
    bot: <Bot className="w-4 h-4" />,
    agent: <Shield className="w-4 h-4" />,
    user: <User className="w-4 h-4" />,
    system: <AlertCircle className="w-4 h-4" />
  };

  return (
    <div className={avatarClasses}>
      {icons[senderType as keyof typeof icons] || icons.user}
    </div>
  );
}

export const MessageBubble = React.memo(function MessageBubble({ 
  message, 
  isMine, 
  showAvatar = true,
  isFirstInGroup = true,
  isLastInGroup = true,
  showMeta = true,
  senderLabel
}: Props) {
  const isBot = message.senderType === 'bot' || message.senderType === 'system';

  // Bubble styles based on sender
  const bubbleStyles = clsx(
    'relative max-w-[85%] px-4 py-3 shadow-sm',
    // Border radius based on position in group
    isFirstInGroup && isLastInGroup && 'rounded-2xl',
    isFirstInGroup && !isLastInGroup && (isMine ? 'rounded-2xl rounded-br-lg' : 'rounded-2xl rounded-bl-lg'),
    !isFirstInGroup && isLastInGroup && (isMine ? 'rounded-2xl rounded-tr-lg' : 'rounded-2xl rounded-tl-lg'),
    !isFirstInGroup && !isLastInGroup && (isMine ? 'rounded-2xl rounded-r-lg' : 'rounded-2xl rounded-l-lg'),
    // Colors
    isMine 
      ? 'bg-gradient-to-br from-[#0F2E2A] to-[#13463E] text-[#F8F5F0] ring-1 ring-emerald-500/30'
      : isBot
        ? 'bg-[#FFF6E8] border border-amber-200 text-slate-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-slate-100'
        : 'bg-[#FFFBF7] border border-[#E9E2D8] text-slate-900 dark:bg-[#0B1512] dark:border-slate-800 dark:text-slate-100'
  );

  const renderContent = () => {
    // Summary message type
    if (message.type === 'summary' && typeof message.content === 'string') {
      return (
        <div className="space-y-2">
          <div className={clsx(
            'text-[10px] uppercase tracking-wider font-bold',
            isMine ? 'text-amber-200' : 'text-amber-700'
          )}>
            Lead Summary
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-line">
            {message.content}
          </div>
        </div>
      );
    }

    // Quick reply chip
    if (message.type === 'quickReply' && typeof message.content === 'string') {
      return (
        <div className={clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold',
          isMine ? 'bg-amber-400/20' : 'bg-amber-50 text-amber-700'
        )}>
          {message.content}
        </div>
      );
    }

    // Schedule message
    if (message.type === 'schedule') {
      return (
        <div className="space-y-2">
          <div className={clsx(
            'text-[10px] uppercase tracking-wider font-bold',
            isMine ? 'text-amber-200' : 'text-blue-600'
          )}>
            Viewing Scheduled
          </div>
          <div className="text-sm">
            {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
          </div>
        </div>
      );
    }

    // Attachment (image or file link)
    if (message.type === 'attachment' && message.content && typeof message.content === 'object' && 'url' in message.content) {
      const content = message.content as { url: string; name?: string };
      const url = content.url;
      const name = content.name || 'Attachment';
      const isImage = /\.(jpe?g|png|webp|gif)$/i.test(url) || /^data:image\//i.test(url);
      if (isImage) {
        return (
          <div className="space-y-1">
            <a href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden max-w-[280px]">
              <img src={url} alt={name} className="w-full h-auto object-cover" />
            </a>
            {name && name !== url && <p className="text-xs text-slate-500 truncate">{name}</p>}
          </div>
        );
      }
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 dark:text-emerald-400 underline break-all">
          {name}
        </a>
      );
    }

    // Default text message
    if (typeof message.content === 'string') {
      return (
        <p className="text-sm leading-relaxed break-words">
          {message.content}
        </p>
      );
    }

    // Fallback for complex content
    return (
      <pre className="text-xs overflow-auto max-w-full">
        {JSON.stringify(message.content, null, 2)}
      </pre>
    );
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'flex gap-2',
        isMine ? 'flex-row-reverse' : 'flex-row',
        !isLastInGroup && 'mb-0.5'
      )}
    >
      {/* Avatar - only show for first message in group */}
      {showAvatar && (
        <div className="flex-shrink-0 w-8">
          {isFirstInGroup && (
            <SenderAvatar senderType={message.senderType} isMine={isMine} />
          )}
        </div>
      )}

      {/* Message bubble */}
      <div className={bubbleStyles}>
        {/* Sender label for non-user messages */}
        {!isMine && isFirstInGroup && (
          <div className={clsx(
            'text-[10px] uppercase tracking-wider font-bold mb-1',
            isBot ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'
          )}>
            {senderLabel || (message.senderType === 'bot' ? 'Assistant' : message.senderType)}
          </div>
        )}

        {/* Content */}
        {renderContent()}

        {/* Timestamp and status */}
        {showMeta && (
          <div className={clsx(
            'flex items-center gap-1.5 mt-2 text-[10px]',
            isMine ? 'justify-end text-amber-200' : 'text-slate-400'
          )}>
            <span>{formatTime(message.createdAt)}</span>
            {isMine && <StatusIcon status={message.status} />}
          </div>
        )}
      </div>
    </motion.div>
  );
});

// Date separator component
export function DateSeparator({ date }: { date: string }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-amber-200/60 dark:bg-slate-800" />
      <div className="rounded-full border border-amber-200/70 bg-[#FFFBF7]/90 px-3 py-1 text-[11px] font-semibold text-amber-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-amber-200">
        {formatDate(date)}
      </div>
      <div className="h-px flex-1 bg-amber-200/60 dark:bg-slate-800" />
    </div>
  );
}
