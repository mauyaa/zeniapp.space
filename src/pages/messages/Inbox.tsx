import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { EmptyState, NoSearchResultsState } from '../../components/chat/EmptyState';
import { useAuth } from '../../context/AuthProvider';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '../../utils/cn';
import {
  resolveUserContactLabel,
  getUserConversationKey,
  getAgentOtherPartyLabel,
  getAdminOtherPartyLabel,
  getAgentOtherPartyKey,
  getAdminOtherPartyKey,
} from './contactLabels';

export function InboxPage() {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const { role } = useAuth();
  const {
    conversations,
    messages,
    loadingConversations,
    conversationsLoadError,
    refreshConversations,
    activeConversationId,
    searchTerm,
    setSearchTerm,
    setActiveConversation,
  } = useChat();
  const basePath =
    role === 'agent' ? '/agent/messages' : role === 'admin' ? '/admin/messages' : '/app/messages';
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const debouncedSearch = useDebounce(localSearch, 250);
  const activeId = conversationId ?? activeConversationId;

  useEffect(() => {
    setSearchTerm(debouncedSearch);
  }, [debouncedSearch, setSearchTerm]);

  useEffect(() => {
    setActiveConversation(null);
  }, [setActiveConversation]);

  const baseConversations = useMemo(() => conversations, [conversations]);

  const dedupedByOtherParty = useMemo(() => {
    const byKey = new Map<string, (typeof baseConversations)[0]>();
    const sorted = [...baseConversations].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    if (role === 'user') {
      sorted.forEach((c) => {
        const key = getUserConversationKey(c);
        if (!byKey.has(key)) byKey.set(key, c);
      });
    } else {
      const getKey = role === 'agent' ? getAgentOtherPartyKey : getAdminOtherPartyKey;
      sorted.forEach((c) => {
        const key = getKey(c);
        if (!byKey.has(key)) byKey.set(key, c);
      });
    }

    return Array.from(byKey.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }, [baseConversations, role]);

  const displayName = useCallback(
    (conversation: (typeof dedupedByOtherParty)[number]) => {
      if (role === 'user') return resolveUserContactLabel(conversation.agentSnapshot?.name);
      if (role === 'agent') return getAgentOtherPartyLabel(conversation);
      if (role === 'admin') return getAdminOtherPartyLabel(conversation);
      return 'Chat';
    },
    [role]
  );

  const filteredConversations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return dedupedByOtherParty;
    return dedupedByOtherParty.filter((conversation) => {
      const name = displayName(conversation).toLowerCase();
      const preview = (conversation.lastMessagePreview || '').toLowerCase();
      const listingTitle = (conversation.listingSnapshot?.title || '').toLowerCase();
      const location = (conversation.listingSnapshot?.locationText || '').toLowerCase();
      return (
        name.includes(query) ||
        preview.includes(query) ||
        listingTitle.includes(query) ||
        location.includes(query)
      );
    });
  }, [dedupedByOtherParty, displayName, searchTerm]);

  const handleOpenConversation = (conversationIdToOpen: string) => {
    setActiveConversation(conversationIdToOpen);
    navigate(`${basePath}/${conversationIdToOpen}`);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 864e5).toDateString() === d.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      className="flex h-full w-full flex-col bg-[linear-gradient(180deg,rgba(248,250,245,0.96)_0%,rgba(241,246,238,0.96)_100%)]"
      role="region"
      aria-label="Inbox"
    >
      <div className="border-b border-[var(--zeni-line)] bg-white/70 px-4 py-4 backdrop-blur-sm">
        <h2
          id="inbox-title"
          className="font-serif text-[2rem] leading-none text-[var(--zeni-black)]"
        >
          Messages
        </h2>
        <div className="group relative mt-3" role="search">
          <Search
            className="absolute left-3 top-2.5 h-4 w-4 text-[var(--zeni-muted)] group-focus-within:text-[var(--zeni-green)]"
            aria-hidden
          />
          <input
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder="Search chats..."
            aria-label="Search conversations"
            aria-describedby="inbox-title"
            className="w-full rounded-xl border border-[var(--zeni-line)] bg-white/90 py-2.5 pl-10 pr-4 text-sm text-[var(--zeni-black)] placeholder:text-[var(--zeni-muted)] focus:border-[var(--zeni-green)] focus:outline-none"
          />
        </div>
      </div>

      {conversationsLoadError ? (
        <div className="rounded-xl border border-[rgba(240,138,50,0.22)] bg-[rgba(255,247,238,0.96)] p-6 text-center">
          <p className="text-sm font-medium text-[var(--zeni-black)]">
            Couldn&apos;t load conversations.
          </p>
          <button
            type="button"
            onClick={() => refreshConversations()}
            className="mt-3 rounded-xl bg-[var(--zeni-orange)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-95"
          >
            Retry
          </button>
        </div>
      ) : filteredConversations.length === 0 && searchTerm ? (
        <div className="p-6">
          <NoSearchResultsState query={searchTerm} variant="light" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="space-y-4 p-6">
          <EmptyState
            variant="light"
            title="No chats yet"
            subtitle={
              role === 'user'
                ? 'Message an agent from any listing to start a conversation.'
                : 'No conversations yet.'
            }
          />
          <button
            type="button"
            onClick={() => refreshConversations()}
            disabled={loadingConversations}
            className="rounded-xl border border-[var(--zeni-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--zeni-black)] transition-colors hover:bg-[var(--zeni-soft-green)] disabled:opacity-50"
          >
            {loadingConversations ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      ) : (
        <div
          id="conversation-list"
          className="no-scrollbar custom-scroll flex-1 overflow-y-auto"
          role="list"
          aria-label="Conversations"
          tabIndex={0}
        >
          {filteredConversations.map((conversation, index) => {
            const list = messages[conversation.id] || [];
            const lastMessage = list[list.length - 1];
            const preview = lastMessage
              ? typeof lastMessage.content === 'string'
                ? lastMessage.content
                : lastMessage.type === 'attachment'
                  ? 'Sent an attachment'
                  : lastMessage.type === 'schedule'
                    ? 'Viewing scheduled'
                    : 'Message'
              : conversation.lastMessagePreview
                ? conversation.lastMessagePreview
                : 'Tap to start chatting';
            const isActive = activeId === conversation.id;
            const name = displayName(conversation);

            return (
              <div
                key={conversation.id}
                role="listitem"
                className={cn(
                  'w-full border-b border-[rgba(7,17,12,0.06)] px-4 py-3 text-left transition-colors',
                  isActive &&
                    'border-l-4 border-l-[var(--zeni-green)] bg-[rgba(28,106,81,0.08)] pl-3',
                  !isActive && 'hover:bg-white/70'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleOpenConversation(conversation.id)}
                  className="w-full text-left"
                  aria-label={`Open conversation with ${name}`}
                  aria-posinset={index + 1}
                  aria-setsize={filteredConversations.length}
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="line-clamp-1 text-[1.08rem] font-semibold text-[var(--zeni-black)]">
                        {name}
                      </span>
                      <span className="flex-shrink-0 text-xs text-[var(--zeni-muted)]">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    {conversation.listingSnapshot && (
                      <div className="mt-1 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--zeni-green)]">
                        {conversation.listingSnapshot.title}
                      </div>
                    )}
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="line-clamp-1 text-sm text-[rgba(7,17,12,0.68)]">
                        {preview}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="flex-shrink-0 rounded-full bg-[rgba(240,138,50,0.18)] px-2 py-0.5 text-[10px] font-bold text-[var(--zeni-orange)]">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
