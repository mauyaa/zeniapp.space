import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Conversation } from '../../../types/chat';
import { ThreadPage } from '../Thread';

let chatMock: {
  conversations: Conversation[];
  messages: Record<string, unknown[]>;
  loadMessages: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
  loadingThread: boolean;
  setActiveConversation: ReturnType<typeof vi.fn>;
  markRead: ReturnType<typeof vi.fn>;
  typing: Record<string, boolean>;
};

let authMock: {
  role: 'user' | 'agent' | 'admin';
  token: string;
  user: { id: string; role: 'user' | 'agent' | 'admin' };
};

const socketEmit = vi.fn();
const toastPush = vi.fn();

vi.mock('../../../context/ChatContext', () => ({
  useChat: () => chatMock,
}));

vi.mock('../../../context/AuthProvider', () => ({
  useAuth: () => authMock,
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ push: toastPush }),
}));

vi.mock('../../../lib/socket', () => ({
  getSocket: () => ({ emit: socketEmit }),
}));

const conversation: Conversation = {
  id: 'conv-1',
  listingId: '',
  agentId: 'agent-1',
  userId: 'user-1',
  status: 'active',
  leadStage: 'new',
  lastMessageAt: new Date('2026-03-19T08:00:00.000Z').toISOString(),
  unreadCount: 0,
  listingSnapshot: null,
  agentSnapshot: { id: 'agent-1', name: 'Zeni Agent' },
  userSnapshot: { id: 'user-1', name: 'Test User', role: 'user' },
};

function renderThread() {
  return render(
    <MemoryRouter initialEntries={['/app/messages/conv-1']}>
      <Routes>
        <Route path="/app/messages/:conversationId" element={<ThreadPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ThreadPage', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
  });

  beforeEach(() => {
    socketEmit.mockReset();
    toastPush.mockReset();

    authMock = {
      role: 'user',
      token: 'token-1',
      user: { id: 'user-1', role: 'user' },
    };

    chatMock = {
      conversations: [conversation],
      messages: { 'conv-1': [] },
      loadMessages: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      loadingThread: false,
      setActiveConversation: vi.fn(),
      markRead: vi.fn().mockResolvedValue(undefined),
      typing: {},
    };
  });

  it('does not refetch the same thread when chat callbacks get recreated', async () => {
    const initialLoadMessages = vi.fn().mockResolvedValue(undefined);
    const initialMarkRead = vi.fn().mockResolvedValue(undefined);

    chatMock = {
      ...chatMock,
      loadMessages: initialLoadMessages,
      markRead: initialMarkRead,
    };

    const view = renderThread();

    await waitFor(() => {
      expect(initialLoadMessages).toHaveBeenCalledTimes(1);
      expect(initialMarkRead).toHaveBeenCalledTimes(1);
    });

    const nextLoadMessages = vi.fn().mockResolvedValue(undefined);
    const nextMarkRead = vi.fn().mockResolvedValue(undefined);

    chatMock = {
      ...chatMock,
      loadMessages: nextLoadMessages,
      markRead: nextMarkRead,
    };

    view.rerender(
      <MemoryRouter initialEntries={['/app/messages/conv-1']}>
        <Routes>
          <Route path="/app/messages/:conversationId" element={<ThreadPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(initialLoadMessages).toHaveBeenCalledTimes(1);
      expect(initialMarkRead).toHaveBeenCalledTimes(1);
    });

    expect(nextLoadMessages).not.toHaveBeenCalled();
    expect(nextMarkRead).not.toHaveBeenCalled();
  });

  it('prevents duplicate sends while a send is already in progress', async () => {
    let resolveSend: (() => void) | undefined;
    const sendMessage = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        })
    );

    chatMock = {
      ...chatMock,
      sendMessage,
    };

    renderThread();

    const input = screen.getByLabelText('Message input');
    fireEvent.change(input, { target: { value: 'Hello there' } });

    const sendButton = screen.getByLabelText('Send message');
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendButton).toBeDisabled();

    await act(async () => {
      resolveSend?.();
    });
  });
});
