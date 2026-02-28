import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { EmptyState, NoSearchResultsState } from '../../components/chat/EmptyState';
import { useAuth } from '../../context/AuthProvider';
import { cn } from '../../utils/cn';
import { useDebounce } from '../../hooks/useDebounce';
import {
  resolveUserContactLabel,
  getAgentOtherPartyLabel,
  getAdminOtherPartyLabel,
  getAgentOtherPartyKey,
  getAdminOtherPartyKey
} from './contactLabels';

type InboxTab = 'All' | 'Unread' | 'Archived';

const inboxTabs: InboxTab[] = ['All', 'Unread', 'Archived'];

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
    bootstrapConversations,
    activeConversationId,
    searchTerm,
    setSearchTerm,
    setActiveConversation
  } = useChat();
  const basePath =
    role === 'agent' ? '/agent/messages' : role === 'admin' ? '/admin/messages' : '/app/messages';
  const [tab, setTab] = useState<InboxTab>('All');
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const debouncedSearch = useDebounce(localSearch, 250);
  const activeId = conversationId ?? activeConversationId;

  useEffect(() => {
    setSearchTerm(debouncedSearch);
  }, [debouncedSearch, setSearchTerm]);

  useEffect(() => {
    setActiveConversation(null);
  }, [setActiveConversation]);

  useEffect(() => {
    if (inboxTabs.includes(tab)) return;
    setTab('All');
  }, [tab]);

  const baseConversations = useMemo(() => {
    if (role === 'user') {
      return conversations.filter((c) => !c.listingSnapshot);
    }
    return conversations;
  }, [conversations, role]);

  const dedupedByOtherParty = useMemo(() => {
    const byKey = new Map<string, (typeof baseConversations)[0]>();
    const sorted = [...baseConversations].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    if (role === 'user') {
      sorted.forEach((c) => {
        const label = resolveUserContactLabel(c.agentSnapshot?.name);
        if (!byKey.has(label)) byKey.set(label, c);
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

  const filteredConversations = useMemo(() => {
    if (role !== 'user') return dedupedByOtherParty;
    switch (tab) {
      case 'Unread':
        return dedupedByOtherParty.filter((conversation) => conversation.unreadCount > 0);
      case 'Archived':
        return dedupedByOtherParty.filter((conversation) => conversation.status === 'closed');
      default:
        return dedupedByOtherParty;
    }
  }, [role, tab, dedupedByOtherParty]);

  const handleOpenConversation = (conversationIdToOpen: string) => {
    setActiveConversation(conversationIdToOpen);
    navigate(`${basePath}/${conversationIdToOpen}`);
  };

  const displayName = (conversation: typeof filteredConversations[0]) => {
    if (role === 'user') return resolveUserContactLabel(conversation.agentSnapshot?.name);
    if (role === 'agent') return getAgentOtherPartyLabel(conversation);
    if (role === 'admin') return getAdminOtherPartyLabel(conversation);
    return 'Chat';
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
    <div className="flex h-full w-full flex-col bg-white" role="region" aria-label="Inbox">
      <div className="border-b border-gray-200 px-4 py-4">
        <h2 id="inbox-title" className="font-serif text-[2rem] leading-none text-black">
          Messages
        </h2>
        <div className="group relative mt-3" role="search">
          <Search
            className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-black"
            aria-hidden
          />
          <input
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder="Search chats..."
            aria-label="Search conversations"
            aria-describedby="inbox-title"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
          />
        </div>
        {role === 'user' && (
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="tablist"
            aria-label="Filter conversations"
          >
            {inboxTabs.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                aria-controls="conversation-list"
                onClick={() => setTab(item)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors',
                  tab === item
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-black hover:text-black'
                )}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {conversationsLoadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Couldn&apos;t load conversations.
          </p>
          <button
            type="button"
            onClick={() => refreshConversations()}
            className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
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
                ? 'Zeni Agent and Zeni Admin will appear here. Click Refresh to load them. If they still do not appear, run the seed script to create those users.'
                : 'No conversations yet.'
            }
          />
          <button
            type="button"
            onClick={() =>
              baseConversations.length === 0 ? bootstrapConversations() : refreshConversations()
            }
            disabled={loadingConversations}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingConversations
              ? 'Loading...'
              : baseConversations.length === 0
              ? 'Create Zeni Agent & Zeni Admin'
              : 'Refresh'}
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
                  'w-full border-b border-gray-100 px-4 py-3 text-left transition-colors',
                  isActive && 'border-l-4 border-l-black bg-slate-100 pl-3',
                  !isActive && 'hover:bg-slate-50'
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
                      <span className="line-clamp-1 text-[1.08rem] font-semibold text-black">{name}</span>
                      <span className="flex-shrink-0 text-xs text-gray-500">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="line-clamp-1 text-sm text-slate-600">{preview}</span>
                      {conversation.unreadCount > 0 && (
                        <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
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
