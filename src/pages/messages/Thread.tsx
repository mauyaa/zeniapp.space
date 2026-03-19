/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCheck, Paperclip, Send } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { EmptyState } from '../../components/chat/EmptyState';
import { useAuth } from '../../context/AuthProvider';
import { getSocket } from '../../lib/socket';
import { Message } from '../../types/chat';
import { cn } from '../../utils/cn';
import {
  getSystemConversationLabel,
  resolveUserContactLabel,
  getAgentOtherPartyLabel,
  getAdminOtherPartyLabel,
} from './contactLabels';

const userSuggestions = [
  'Hi, I am interested in this property.',
  'Is this listing still available?',
  'I would like to schedule a viewing.',
  'What are the deposit and monthly fees?',
  'Can I get a video tour of this property?',
  'What is the move-in date?',
  'Are pets allowed?',
  'Is parking included?',
  'Can we negotiate the price?',
  'What are the lease terms?',
  'Thank you for the information.',
  'I will get back to you shortly.',
];

const staffSuggestions = [
  'Hi, thank you for your interest.',
  'Yes, this listing is still available.',
  'I can schedule a viewing for you this week.',
  'The deposit is one month rent, paid upfront.',
  'I have sent you the floor plan and photos.',
  'Following up on your interest. Are you available this week?',
  'I have viewing slots on Thursday and Saturday. Which works for you?',
  'Let me know if you would like to proceed with this listing.',
  'I can share additional documents if needed.',
  'The property is available for immediate move-in.',
  'Thank you, I will be in touch.',
];

export function ThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const {
    conversations,
    messages,
    loadMessages,
    sendMessage,
    loadingThread,
    setActiveConversation,
    markRead,
    typing,
  } = useChat();
  const { role, token, user } = useAuth();
  const basePath =
    role === 'agent' ? '/agent/messages' : role === 'admin' ? '/admin/messages' : '/app/messages';
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const lastTypingEmit = useRef(0);
  const loadMessagesRef = useRef(loadMessages);
  const markReadRef = useRef(markRead);
  const sendLockRef = useRef(false);
  const { push: pushToast } = useToast();

  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const conversation = useMemo(
    () => conversations.find((item) => item.id === conversationId),
    [conversations, conversationId]
  );

  const selfSenderType: Message['senderType'] | null = useMemo(() => {
    if (!conversation || !user) {
      if (role === 'user') return 'user';
      if (role === 'agent' || role === 'admin') return 'agent';
      return null;
    }
    if (conversation.agentId === user.id) return 'agent';
    if (conversation.userId === user.id) return 'user';
    if (role === 'agent' || role === 'admin') return 'agent';
    return null;
  }, [conversation, role, user]);

  const headerName = (() => {
    if (role === 'user') return resolveUserContactLabel(conversation?.agentSnapshot?.name);
    if (role === 'agent' && conversation) return getAgentOtherPartyLabel(conversation);
    if (role === 'admin' && conversation) return getAdminOtherPartyLabel(conversation);
    return 'Chat';
  })();
  const headerInitials = headerName
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z]/g, '')[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const threadMessages = messages[conversationId ?? ''] ?? [];
  const canSend = text.trim().length > 0;
  const canCompose = Boolean(
    conversation &&
    user &&
    (conversation.userId === user.id ||
      conversation.agentId === user.id ||
      (role === 'admin' &&
        getSystemConversationLabel(conversation.agentSnapshot?.name) === 'Zeni Admin'))
  );

  const allSuggestions = role === 'user' ? userSuggestions : staffSuggestions;

  const filteredSuggestions = useMemo(() => {
    const query = text.trim().toLowerCase();
    if (!query) return [];
    return allSuggestions.filter(
      (s) => s.toLowerCase().includes(query) && s.toLowerCase() !== query
    );
  }, [text, allSuggestions]);

  const groupedMessages = useMemo(() => {
    const withinWindow = (left: Message, right: Message) =>
      Math.abs(new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) <
      5 * 60 * 1000;

    return threadMessages.map((message, index) => {
      const previous = threadMessages[index - 1];
      const next = threadMessages[index + 1];
      const previousDay = previous ? new Date(previous.createdAt).toDateString() : '';
      const currentDay = new Date(message.createdAt).toDateString();
      const nextDay = next ? new Date(next.createdAt).toDateString() : '';
      const sameAsPrevious =
        Boolean(previous) &&
        previous.senderType === message.senderType &&
        previousDay === currentDay &&
        withinWindow(previous, message);
      const sameAsNext =
        Boolean(next) &&
        next.senderType === message.senderType &&
        nextDay === currentDay &&
        withinWindow(message, next);

      return {
        message,
        showDateSeparator: !previous || previousDay !== currentDay,
        isFirstInGroup: !sameAsPrevious,
        isLastInGroup: !sameAsNext,
      };
    });
  }, [threadMessages]);

  useEffect(() => {
    loadMessagesRef.current = loadMessages;
  }, [loadMessages]);

  useEffect(() => {
    markReadRef.current = markRead;
  }, [markRead]);

  useEffect(() => {
    if (!conversationId) return;
    setActiveConversation(conversationId);
    void loadMessagesRef.current(conversationId);
    void markReadRef.current(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId, setActiveConversation]);

  useEffect(() => {
    if (!conversationId || !token) return;
    const socket = getSocket(token);
    socket.emit('join:conversation', conversationId);
    return () => {
      socket.emit('leave:conversation', conversationId);
    };
  }, [conversationId, token]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [threadMessages.length, loadingThread]);

  useEffect(() => {
    if (filteredSuggestions.length > 0 && text.trim().length > 0) {
      setShowSuggestions(true);
      setSelectedSuggestionIndex(-1);
    } else {
      setShowSuggestions(false);
    }
  }, [filteredSuggestions, text]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSend = useCallback(
    async (value: string) => {
      if (!conversationId || sendLockRef.current) return;
      sendLockRef.current = true;
      setSending(true);
      try {
        await sendMessage(conversationId, { type: 'text', content: value });
      } finally {
        sendLockRef.current = false;
        setSending(false);
      }
    },
    [conversationId, sendMessage]
  );

  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMessageContent = (message: Message) => {
    if (message.type === 'summary' && typeof message.content === 'string') {
      return <p className="text-sm leading-relaxed text-current">{message.content}</p>;
    }
    if (message.type === 'quickReply' && typeof message.content === 'string') {
      return <p className="text-sm text-current">{message.content}</p>;
    }
    if (message.type === 'schedule') {
      return (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Viewing</p>
          <p className="text-sm leading-relaxed text-current">
            {typeof message.content === 'string'
              ? message.content
              : JSON.stringify(message.content)}
          </p>
        </div>
      );
    }
    if (
      message.type === 'attachment' &&
      message.content &&
      typeof message.content === 'object' &&
      'url' in message.content
    ) {
      const content = message.content as { url: string; name?: string };
      const name = content.name || 'Attachment';
      const isImage =
        /\.(jpe?g|png|webp|gif)$/i.test(content.url) || /^data:image\//i.test(content.url);
      if (isImage) {
        return (
          <div className="space-y-1">
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden max-w-[280px]"
            >
              <img src={content.url} alt={name} className="w-full h-auto object-cover" />
            </a>
            {name && name !== content.url && (
              <p className="text-xs text-slate-500 truncate">{name}</p>
            )}
          </div>
        );
      }
      return (
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-emerald-600 underline break-all"
        >
          {name}
        </a>
      );
    }
    if (typeof message.content === 'string') {
      return <p className="text-sm leading-relaxed text-current break-words">{message.content}</p>;
    }
    return (
      <pre className="whitespace-pre-wrap break-words text-xs">
        {JSON.stringify(message.content, null, 2)}
      </pre>
    );
  };

  const acceptSuggestion = (suggestion: string) => {
    setText(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    textareaRef.current?.focus();
  };

  const sendFromComposer = () => {
    if (!canCompose || !canSend || sending) return;
    void handleSend(text.trim());
    setText('');
    setShowSuggestions(false);
    if (textareaRef.current) textareaRef.current.style.height = '48px';
  };

  const handleAttachClick = () => {
    if (!canCompose) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !conversationId) return;
    if (!file.type.startsWith('image/')) {
      pushToast({
        title: 'Invalid file',
        description: 'Please choose an image (JPEG, PNG, WebP, or GIF).',
        tone: 'error',
      });
      return;
    }
    setUploading(true);
    try {
      const { url } = await api.uploadChatImage(file);
      await sendMessage(conversationId, { type: 'attachment', content: { url, name: file.name } });
    } catch (err) {
      pushToast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not attach image.',
        tone: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        return;
      }
      if (event.key === 'Tab' || (event.key === 'Enter' && selectedSuggestionIndex >= 0)) {
        event.preventDefault();
        const idx = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0;
        acceptSuggestion(filteredSuggestions[idx]);
        return;
      }
      if (event.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendFromComposer();
    }
  };

  React.useEffect(() => {
    if (conversationId && !conversation) {
      navigate(basePath, { replace: true });
    }
  }, [conversationId, conversation, navigate, basePath]);

  if (!conversationId) {
    return (
      <EmptyState
        title="No conversation selected"
        subtitle="Pick one from the inbox."
        variant="light"
      />
    );
  }

  if (!conversation) {
    return (
      <EmptyState
        title="Conversation not found"
        subtitle="Taking you back to the inbox."
        variant={role === 'admin' ? 'dark' : 'light'}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(248,250,245,0.9)_0%,rgba(241,246,238,0.94)_100%)]">
      <header className="border-b border-[var(--zeni-line)] bg-white/78 px-4 py-3 backdrop-blur-sm md:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--zeni-line)] text-[var(--zeni-muted)] hover:border-[var(--zeni-green)] hover:text-[var(--zeni-green)] md:hidden"
              onClick={() => navigate(basePath)}
              aria-label="Back to inbox"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--zeni-black)] text-sm font-semibold text-white">
              {headerInitials}
            </div>
            <div className="min-w-0">
              <h2 className="line-clamp-1 font-serif text-[1.35rem] font-semibold text-[var(--zeni-black)]">
                {headerName}
              </h2>
              {conversation.listingSnapshot && (
                <p className="line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--zeni-green)]">
                  {conversation.listingSnapshot.title}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="no-scrollbar custom-scroll flex-1 overflow-y-auto px-4 py-5 md:px-6"
      >
        {threadMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--zeni-muted)]">
            Send a message to start the conversation.
          </div>
        ) : (
          <div className="space-y-1.5">
            {groupedMessages.map(
              ({ message, showDateSeparator, isFirstInGroup, isLastInGroup }) => {
                const isBot = message.senderType === 'bot' || message.senderType === 'system';
                const isMine = selfSenderType !== null && message.senderType === selfSenderType;
                const roundClass = isMine
                  ? `${isFirstInGroup ? 'rounded-tr-2xl' : 'rounded-tr-md'} ${
                      isLastInGroup ? 'rounded-br-2xl' : 'rounded-br-md'
                    } rounded-l-2xl`
                  : `${isFirstInGroup ? 'rounded-tl-2xl' : 'rounded-tl-md'} ${
                      isLastInGroup ? 'rounded-bl-2xl' : 'rounded-bl-md'
                    } rounded-r-2xl`;

                return (
                  <React.Fragment key={message.id}>
                    {showDateSeparator && (
                      <div className="flex justify-center py-3">
                        <span className="rounded-full bg-white/85 px-3 py-1 text-[10px] font-medium text-[var(--zeni-muted)] shadow-[0_12px_24px_-20px_rgba(7,17,12,0.4)]">
                          {formatDateLabel(message.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={cn('flex w-full', isMine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[80%] px-3.5 py-2 md:max-w-md',
                          roundClass,
                          isMine
                            ? 'bg-[var(--zeni-black)] text-white'
                            : isBot
                              ? 'border border-[rgba(240,138,50,0.22)] bg-[rgba(255,247,238,0.96)] text-[var(--zeni-black)]'
                              : 'border border-[var(--zeni-line)] bg-white/92 text-[var(--zeni-black)]'
                        )}
                      >
                        {renderMessageContent(message)}
                        <div
                          className={cn(
                            'mt-1 flex items-center gap-1 text-[10px]',
                            isMine ? 'justify-end text-white/60' : 'text-[var(--zeni-muted)]'
                          )}
                        >
                          <span>{formatTime(message.createdAt)}</span>
                          {isMine &&
                            (message.status === 'read' || message.status === 'delivered' ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            ))}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              }
            )}
          </div>
        )}

        {typing[conversationId] && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--zeni-line)] bg-white/88 px-3 py-1.5 text-xs text-[var(--zeni-muted)]">
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--zeni-orange)]" />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--zeni-orange)]"
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--zeni-orange)]"
                style={{ animationDelay: '0.3s' }}
              />
            </span>
            {headerName} is typing
          </div>
        )}
      </div>

      <div className="border-t border-[var(--zeni-line)] bg-white/82 px-4 py-3 backdrop-blur-sm md:px-5">
        {canCompose ? (
          <div className="relative">
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-xl border border-[var(--zeni-line)] bg-white shadow-lg"
              >
                {filteredSuggestions.slice(0, 5).map((suggestion, idx) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      acceptSuggestion(suggestion);
                    }}
                    className={cn(
                      'w-full px-4 py-2.5 text-left text-sm transition-colors',
                      idx === selectedSuggestionIndex
                        ? 'bg-[var(--zeni-soft-green)] text-[var(--zeni-black)]'
                        : 'text-[rgba(7,17,12,0.74)] hover:bg-[rgba(28,106,81,0.06)]'
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              aria-hidden
              onChange={handleFileChange}
            />
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleAttachClick}
                disabled={uploading || sending}
                className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--zeni-line)] text-[var(--zeni-muted)] hover:border-[var(--zeni-green)] hover:text-[var(--zeni-green)] disabled:opacity-50"
                aria-label="Attach image"
                title="Attach image"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={text}
                aria-label="Message input"
                autoComplete="off"
                onChange={(event) => {
                  setText(event.target.value);
                  if (!conversationId || !token) return;
                  const now = Date.now();
                  if (now - lastTypingEmit.current > 2000) {
                    lastTypingEmit.current = now;
                    const socket = getSocket(token);
                    socket.emit('typing', { conversationId });
                  }
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${Math.min(
                      textareaRef.current.scrollHeight,
                      120
                    )}px`;
                  }
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (filteredSuggestions.length > 0 && text.trim().length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--zeni-line)] bg-white px-4 py-2.5 text-sm text-[var(--zeni-black)] placeholder:text-[var(--zeni-muted)] focus:border-[var(--zeni-green)] focus:outline-none"
              />
              <button
                type="button"
                onClick={sendFromComposer}
                disabled={!canSend || sending || uploading}
                className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--zeni-green)] text-white hover:bg-[var(--zeni-green-deep)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--zeni-muted)]">
            Read-only thread
          </p>
        )}
      </div>
    </div>
  );
}
