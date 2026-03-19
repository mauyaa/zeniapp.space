/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Conversation, Message, LeadStage, ConversationStatus, MessageStatus } from '../types/chat';
import {
  safeFetchConversations,
  safeFetchMessages,
  safePostMessage,
  startConversation as startConversationApi,
  updateLeadStage,
} from '../lib/chat';
import { api, getToken } from '../lib/api';
import { logger } from '../lib/logger';
import { useAuth } from './AuthProvider';
import { getSocket, disconnectSocket } from '../lib/socket';
import { useToast } from './ToastContext';
import { useNotifications } from './NotificationContext';
import {
  getSystemConversationLabel,
  shouldIncludeConversationForRole,
} from '../pages/messages/contactLabels';

type Scope = 'all' | 'active' | 'scheduled' | 'closed';

interface ChatContextValue {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  loadingConversations: boolean;
  conversationsLoadError: boolean;
  loadingThread: boolean;
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
  refreshConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, body: { type: string; content: unknown }) => Promise<void>;
  startConversation: (listingId: string, agentId: string) => Promise<Conversation>;
  markRead: (conversationId: string) => Promise<void>;
  filter: Scope;
  setFilter: (scope: Scope) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  updateLead: (
    id: string,
    data: Partial<{
      status: ConversationStatus;
      leadStage: LeadStage;
      pinned: boolean;
      muted: boolean;
    }>
  ) => Promise<void>;
  typing: Record<string, boolean>;
  socketConnected: boolean;
  socketReconnecting: boolean;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { push } = useToast();
  const { push: pushNotification } = useNotifications();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [conversationsLoadError, setConversationsLoadError] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Scope>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketReconnecting, setSocketReconnecting] = useState(false);
  const conversationsRef = useRef<Conversation[]>([]);
  const activeConversationIdRef = useRef<string | null>(null);
  const selfSenderType: Message['senderType'] = user?.role === 'user' ? 'user' : 'agent';
  const senderTypeForConversation = (conversationId: string): Message['senderType'] => {
    const userId = user?.id;
    if (!userId) return selfSenderType;
    const conversation = conversationsRef.current.find((item) => item.id === conversationId);
    if (conversation?.agentId === userId) return 'agent';
    if (conversation?.userId === userId) return 'user';
    if (user?.role === 'admin') return 'agent';
    return selfSenderType;
  };
  const isObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);
  const conversationKey = (c: Conversation) => c.id;
  const dedupeConversations = (items: Conversation[]) => {
    const map = new Map<string, Conversation>();
    items.forEach((c) => {
      const key = conversationKey(c);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, c);
        return;
      }
      const existingTime = new Date(existing.lastMessageAt).getTime();
      const currentTime = new Date(c.lastMessageAt).getTime();
      if (currentTime >= existingTime) {
        map.set(key, c);
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  };
  const canActAsSystemAdmin = (conversation?: Conversation | null) =>
    Boolean(
      user?.role === 'admin' &&
        conversation &&
        getSystemConversationLabel(conversation.agentSnapshot?.name) === 'Zeni Admin'
    );

  // Defer initial conversation fetch so it doesn't block first paint.
  // The UI renders instantly with empty state, then fills in.
  useEffect(() => {
    if (!user?.id) return;
    // Use requestIdleCallback to load after the browser is idle,
    // or fall back to a short delay so the first paint goes through.
    if ('requestIdleCallback' in window) {
      const id = (
        window as unknown as {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(() => refreshConversations(), { timeout: 2000 });
      return () =>
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
    } else {
      const t = setTimeout(() => refreshConversations(), 100);
      return () => clearTimeout(t);
    }
  }, [user?.id]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Realtime sockets
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;
    const s = getSocket(token);

    const onMessage = (msg: Message) => {
      const isSelfMessage = senderTypeForConversation(msg.conversationId) === msg.senderType;
      const sameContent = (a: Message, b: Message) => {
        if (a.senderType !== b.senderType) return false;
        if (a.type !== b.type) return false;
        const aContent = typeof a.content === 'string' ? a.content : JSON.stringify(a.content);
        const bContent = typeof b.content === 'string' ? b.content : JSON.stringify(b.content);
        return aContent === bContent;
      };

      setMessages((prev) => {
        const list = prev[msg.conversationId] ?? [];
        if (list.some((m) => m.id === msg.id)) return prev;

        const optimisticIndex = list.findIndex(
          (m) =>
            m.status === 'sending' &&
            sameContent(m, msg) &&
            Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 10000
        );
        if (optimisticIndex >= 0) {
          const next = [...list];
          next[optimisticIndex] = msg;
          return { ...prev, [msg.conversationId]: next };
        }

        return { ...prev, [msg.conversationId]: [...list, msg] };
      });
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === msg.conversationId);
        const updated = existing
          ? {
              ...existing,
              lastMessageAt: msg.createdAt,
              unreadCount:
                activeConversationIdRef.current === msg.conversationId || isSelfMessage
                  ? 0
                  : existing.unreadCount + 1,
            }
          : {
              id: msg.conversationId,
              listingId: '',
              agentId: '',
              userId: '',
              status: 'active' as const,
              leadStage: 'new' as const,
              lastMessageAt: msg.createdAt,
              unreadCount:
                activeConversationIdRef.current === msg.conversationId || isSelfMessage ? 0 : 1,
              listingSnapshot: null,
              agentSnapshot: { id: '', name: 'Agent' },
              userSnapshot: { id: '', name: 'User', role: 'user' as const },
            };
        const rest = prev.filter((c) => c.id !== msg.conversationId);
        return dedupeConversations([updated, ...rest]);
      });
      if (activeConversationIdRef.current === msg.conversationId) {
        markRead(msg.conversationId);
      } else if (!isSelfMessage) {
        push({
          title: 'New message',
          description: msg.type === 'text' ? String(msg.content).slice(0, 80) : msg.type,
          tone: 'info',
        });
        pushNotification({
          title: 'New message',
          description: msg.type === 'text' ? String(msg.content).slice(0, 80) : msg.type,
          type: 'message',
        });
      }
    };

    const onConversation = (conv: Conversation) => {
      setConversations((prev) => {
        const rest = prev.filter((c) => c.id !== conv.id);
        return dedupeConversations([conv, ...rest]);
      });
    };

    const onTyping = (payload: { conversationId: string; from: string }) => {
      setTyping((prev) => ({ ...prev, [payload.conversationId]: true }));
      setTimeout(() => {
        setTyping((prev) => ({ ...prev, [payload.conversationId]: false }));
      }, 2000);
    };

    const onViewing = (payload: {
      id: string;
      listingId: string;
      userId: string;
      date?: string;
    }) => {
      pushNotification({
        title: 'New viewing request',
        description: payload.date
          ? `For ${new Date(payload.date).toLocaleString()}`
          : 'You have a new viewing to review',
        type: 'viewing',
      });
    };

    const onViewingUpdate = (payload: { id: string; status: string }) => {
      pushNotification({
        title: 'Viewing updated',
        description: `Status: ${payload.status}`,
        type: 'viewing',
      });
    };

    s.on('connect', () => {
      setSocketConnected(true);
      setSocketReconnecting(false);
    });
    s.on('disconnect', () => {
      setSocketConnected(false);
      setSocketReconnecting(true);
    });
    s.io?.on?.('reconnect', () => {
      setSocketConnected(true);
      setSocketReconnecting(false);
      push({
        title: 'Reconnected',
        description: 'Real-time connection restored.',
        tone: 'success',
      });
      refreshConversations();
      if (activeConversationIdRef.current) loadMessages(activeConversationIdRef.current);
    });
    s.io?.on?.('reconnect_failed', () => {
      setSocketReconnecting(false);
      push({
        title: 'Connection lost',
        description: 'Unable to reconnect. Try refreshing the page.',
        tone: 'error',
      });
    });
    s.on('message:new', onMessage);
    s.on('conversation:update', onConversation);
    s.on('typing', onTyping);
    s.on('viewing:new', onViewing);
    s.on('viewing:update', onViewingUpdate);

    return () => {
      setSocketConnected(false);
      s.off('message:new', onMessage);
      s.off('conversation:update', onConversation);
      s.off('typing', onTyping);
      s.off('viewing:new', onViewing);
      s.off('viewing:update', onViewingUpdate);
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const refreshConversations = async () => {
    if (!user || !getToken()) {
      setConversations([]);
      setMessages({});
      setActiveConversationId(null);
      setLoadingConversations(false);
      setConversationsLoadError(false);
      return;
    }

    setLoadingConversations(true);
    setConversationsLoadError(false);
    try {
      const data = await safeFetchConversations();
      const list = dedupeConversations(data);
      setConversations(list);
      setMessages((prev) => {
        const allowedIds = new Set(list.map((conversation) => conversation.id));
        return Object.fromEntries(
          Object.entries(prev).filter(([conversationId]) => allowedIds.has(conversationId))
        ) as Record<string, Message[]>;
      });
      if (
        activeConversationIdRef.current &&
        !list.some((item) => item.id === activeConversationIdRef.current)
      ) {
        setActiveConversationId(null);
      }
    } catch {
      setConversationsLoadError(true);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setLoadingThread(true);
    try {
      const data = await safeFetchMessages(conversationId);
      setMessages((prev) => ({ ...prev, [conversationId]: data }));
    } finally {
      setLoadingThread(false);
    }
  };

  const sendMessage = async (conversationId: string, body: { type: string; content: unknown }) => {
    const conversation = conversationsRef.current.find((item) => item.id === conversationId);
    const isParticipant = Boolean(
      conversation && user && (conversation.userId === user.id || conversation.agentId === user.id)
    );
    if (user && conversation && !isParticipant && !canActAsSystemAdmin(conversation)) {
      push({
        title: 'Read-only thread',
        description: 'You can view this conversation but cannot send messages.',
        tone: 'info',
      });
      return;
    }

    const senderType = senderTypeForConversation(conversationId);
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderType,
      type: body.type as Message['type'],
      content: body.content as string | Record<string, unknown>,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    const clientTempId = optimistic.id;

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), optimistic],
    }));

    try {
      const real = await safePostMessage(conversationId, { ...body, clientTempId });
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).map((m) =>
          m.id === optimistic.id ? real : m
        ),
      }));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[chat] sendMessage failed:', errMsg, error);
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).map((m) =>
          m.id === optimistic.id ? { ...m, status: 'failed' as MessageStatus } : m
        ),
      }));
      push({
        title: 'Message failed',
        description: errMsg.length > 100 ? 'Could not send message. Try again.' : errMsg,
        tone: 'error',
      });
    }
  };

  const startConversation = async (listingId: string, agentId: string) => {
    const conv = await startConversationApi(listingId, agentId);
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === conv.id);
      if (existing) {
        return prev;
      }
      return [conv, ...prev];
    });
    return conv;
  };

  const markRead = async (conversationId: string) => {
    // Avoid hitting API with mock/fallback IDs
    if (isObjectId(conversationId)) {
      try {
        await api.markConversationRead(conversationId);
      } catch (e) {
        logger.warn('markRead failed', { error: e as Error });
      }
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  };

  const updateLead = async (
    id: string,
    data: Partial<{
      status: ConversationStatus;
      leadStage: LeadStage;
      pinned: boolean;
      muted: boolean;
    }>
  ) => {
    const updated = await updateLeadStage(id, data);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  };

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations: conversations
        .filter((c) => shouldIncludeConversationForRole(user?.role, c, user?.id))
        .filter((c) => {
          if (filter === 'all') return true;
          return c.status === filter;
        })
        .filter((c) => {
          if (!searchTerm) return true;
          const hay =
            `${c.listingSnapshot?.title ?? ''} ${c.listingSnapshot?.locationText ?? ''} ${c.listingSnapshot?.price ?? ''} ${c.agentSnapshot?.name ?? ''} ${c.userSnapshot?.name ?? ''}`.toLowerCase();
          return hay.includes(searchTerm.toLowerCase());
        }),
      messages,
      loadingConversations,
      conversationsLoadError,
      loadingThread,
      activeConversationId,
      setActiveConversation: setActiveConversationId,
      refreshConversations,
      loadMessages,
      sendMessage,
      startConversation,
      markRead,
      filter,
      setFilter,
      searchTerm,
      setSearchTerm,
      updateLead,
      typing,
      socketConnected,
      socketReconnecting,
    }),
    [
      conversations,
      messages,
      loadingConversations,
      conversationsLoadError,
      loadingThread,
      activeConversationId,
      filter,
      searchTerm,
      user?.id,
      user?.role,
      typing,
      socketConnected,
      socketReconnecting,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return ctx;
}
