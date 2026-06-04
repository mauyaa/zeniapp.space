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
import { inboxPreviewLine } from '../pages/messages/messagePreview';

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
  const { user, token } = useAuth();
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
  const messagesRef = useRef<Record<string, Message[]>>({});
  const activeConversationIdRef = useRef<string | null>(null);
  const refreshConversationsRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const socketHydrateTimerRef = useRef<number | null>(null);
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

  /** Avoid false "read-only" when socket created a placeholder row before userId/agentId are known. */
  const sameParticipantId = (a?: string | null, b?: string | null) =>
    String(a ?? '').trim() === String(b ?? '').trim();

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
      ).requestIdleCallback(() => refreshConversations(), { timeout: 600 });
      return () =>
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
    } else {
      const t = setTimeout(() => refreshConversations(), 0);
      return () => clearTimeout(t);
    }
  }, [user?.id]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Realtime sockets — re-bind when JWT changes (refresh) so rooms stay authorized
  useEffect(() => {
    if (!user) return;
    const socketToken = token || getToken();
    if (!socketToken) return;
    const s = getSocket(socketToken);

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
      let addedSocketPlaceholder = false;
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
          : (() => {
              addedSocketPlaceholder = true;
              return {
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
            })();
        const rest = prev.filter((c) => c.id !== msg.conversationId);
        return dedupeConversations([updated, ...rest]);
      });
      if (addedSocketPlaceholder) {
        if (socketHydrateTimerRef.current != null) {
          window.clearTimeout(socketHydrateTimerRef.current);
        }
        socketHydrateTimerRef.current = window.setTimeout(() => {
          socketHydrateTimerRef.current = null;
          void refreshConversationsRef.current();
        }, 400);
      }
      if (activeConversationIdRef.current === msg.conversationId) {
        markRead(msg.conversationId);
      } else if (!isSelfMessage) {
        const preview =
          msg.type === 'text' || msg.type === 'quickReply' || msg.type === 'summary'
            ? inboxPreviewLine(msg).slice(0, 80)
            : msg.type === 'attachment'
              ? 'Sent an attachment'
              : msg.type === 'schedule'
                ? 'Viewing scheduled'
                : 'New message';
        push({
          title: 'New message',
          description: preview,
          tone: 'info',
        });
        pushNotification({
          title: 'New message',
          description: preview,
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
      if (socketHydrateTimerRef.current != null) {
        window.clearTimeout(socketHydrateTimerRef.current);
        socketHydrateTimerRef.current = null;
      }
      setSocketConnected(false);
      s.off('message:new', onMessage);
      s.off('conversation:update', onConversation);
      s.off('typing', onTyping);
      s.off('viewing:new', onViewing);
      s.off('viewing:update', onViewingUpdate);
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token]);

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
        const activeId = activeConversationIdRef.current;
        if (activeId && !allowedIds.has(activeId) && isObjectId(activeId)) {
          allowedIds.add(activeId);
        }
        return Object.fromEntries(
          Object.entries(prev).filter(([conversationId]) => allowedIds.has(conversationId))
        ) as Record<string, Message[]>;
      });
      const aid = activeConversationIdRef.current;
      if (aid && !list.some((item) => item.id === aid)) {
        const hasLocalThread = (messagesRef.current[aid] ?? []).length > 0;
        if (!hasLocalThread) {
          setActiveConversationId(null);
        }
      }
    } catch {
      setConversationsLoadError(true);
    } finally {
      setLoadingConversations(false);
    }
  };

  refreshConversationsRef.current = refreshConversations;

  const previewFromOutgoingBody = (body: { type: string; content: unknown }) =>
    inboxPreviewLine({
      type: body.type as Message['type'],
      content: body.content as Message['content'],
    }).slice(0, 80);

  const bumpConversationAfterSend = (
    conversationId: string,
    createdAt: string,
    preview: string
  ) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conversationId);
      if (idx < 0) {
        return prev;
      }
      const updated = {
        ...prev[idx],
        lastMessageAt: createdAt,
        lastMessagePreview: preview,
      };
      const rest = prev.filter((c) => c.id !== conversationId);
      return [updated, ...rest];
    });
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
    const hasParticipantIds = Boolean(
      String(conversation?.userId ?? '').trim() || String(conversation?.agentId ?? '').trim()
    );
    const isParticipant = Boolean(
      conversation &&
      user &&
      (sameParticipantId(conversation.userId, user.id) ||
        sameParticipantId(conversation.agentId, user.id))
    );
    if (
      user &&
      conversation &&
      hasParticipantIds &&
      !isParticipant &&
      !canActAsSystemAdmin(conversation)
    ) {
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
    const outgoingPreview = previewFromOutgoingBody(body);
    bumpConversationAfterSend(conversationId, optimistic.createdAt, outgoingPreview);

    try {
      const real = await safePostMessage(conversationId, { ...body, clientTempId });
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).map((m) =>
          m.id === optimistic.id ? real : m
        ),
      }));
      bumpConversationAfterSend(
        conversationId,
        real.createdAt,
        previewFromOutgoingBody({ type: real.type, content: real.content })
      );
      if (!conversationsRef.current.some((c) => c.id === conversationId)) {
        void refreshConversations();
      }
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
