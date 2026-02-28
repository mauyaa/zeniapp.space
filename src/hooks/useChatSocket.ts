import { useEffect, useState, useRef } from 'react';
import type { Message, Conversation } from '../types/chat';
import { getSocket, disconnectSocket } from '../lib/socket';

interface UseChatSocketOptions {
  userId: string | undefined;
  activeConversationId: string | null;
  selfSenderType: string;
  onMessage: (msg: Message) => void;
  onConversation: (conv: Conversation) => void;
  onTyping: (payload: { conversationId: string; from: string }) => void;
  onViewing: (payload: { id: string; listingId: string; userId: string; date?: string }) => void;
  onViewingUpdate: (payload: { id: string; status: string }) => void;
  /** Called when socket reconnects (e.g. after 4G drop). Use to refetch messages so they appear without full refresh. */
  onReconnect?: () => void;
}

interface UseChatSocketReturn {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
}

/**
 * Extracted socket management hook for ChatContext.
 * Handles connecting, reconnecting, and dispatching real-time events.
 */
export function useChatSocket({
  userId,
  activeConversationId,
  selfSenderType,
  onMessage,
  onConversation,
  onTyping,
  onViewing,
  onViewingUpdate,
  onReconnect,
}: UseChatSocketOptions): UseChatSocketReturn {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const hadDisconnectedRef = useRef(false);

  const callbacksRef = useRef({
    onMessage,
    onConversation,
    onTyping,
    onViewing,
    onViewingUpdate,
    onReconnect,
  });
  callbacksRef.current = {
    onMessage,
    onConversation,
    onTyping,
    onViewing,
    onViewingUpdate,
    onReconnect,
  };

  useEffect(() => {
    if (!userId) return;
    let token: string | null = null;
    try {
      token = localStorage.getItem('token');
    } catch {
      // blocked
    }
    if (!token) return;

    const s = getSocket(token);

    const handleConnect = () => {
      setConnected(true);
      setReconnecting(false);
      setReconnectAttempts(0);
      if (hadDisconnectedRef.current) {
        hadDisconnectedRef.current = false;
        callbacksRef.current.onReconnect?.();
      }
    };

    const handleDisconnect = () => {
      hadDisconnectedRef.current = true;
      setConnected(false);
    };

    const handleReconnectAttempt = (attempt: number) => {
      setReconnecting(true);
      setReconnectAttempts(attempt);
    };

    const handleReconnect = () => {
      setReconnecting(false);
      setConnected(true);
      setReconnectAttempts(0);
    };

    const handleReconnectFailed = () => {
      setReconnecting(false);
    };

    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);

    // Socket.io reconnect events (if using io manager)
    s.io?.on?.('reconnect_attempt', handleReconnectAttempt);
    s.io?.on?.('reconnect', handleReconnect);
    s.io?.on?.('reconnect_failed', handleReconnectFailed);

    // Business events — delegate to ref'd callbacks
    s.on('message:new', (msg: Message) => callbacksRef.current.onMessage(msg));
    s.on('conversation:update', (conv: Conversation) => callbacksRef.current.onConversation(conv));
    s.on('typing', (payload: { conversationId: string; from: string }) =>
      callbacksRef.current.onTyping(payload)
    );
    s.on(
      'viewing:new',
      (payload: { id: string; listingId: string; userId: string; date?: string }) =>
        callbacksRef.current.onViewing(payload)
    );
    s.on('viewing:update', (payload: { id: string; status: string }) =>
      callbacksRef.current.onViewingUpdate(payload)
    );

    return () => {
      setConnected(false);
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
      s.io?.off?.('reconnect_attempt', handleReconnectAttempt);
      s.io?.off?.('reconnect', handleReconnect);
      s.io?.off?.('reconnect_failed', handleReconnectFailed);
      s.removeAllListeners('message:new');
      s.removeAllListeners('conversation:update');
      s.removeAllListeners('typing');
      s.removeAllListeners('viewing:new');
      s.removeAllListeners('viewing:update');
      disconnectSocket();
    };
  }, [userId, activeConversationId, selfSenderType]);

  return { connected, reconnecting, reconnectAttempts };
}
