import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { InboxPage } from './Inbox';
import { cn } from '../../utils/cn';

export function MessagesLayout() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const hasThread = Boolean(conversationId);
  const hint = 'Open a conversation from the left to continue.';

  return (
    <div
      className="flex h-full min-h-[520px] overflow-hidden border border-gray-200 bg-white"
      role="application"
      aria-label="Messages"
    >
      <aside
        className={cn(
          'relative z-10 w-full flex-shrink-0 border-r border-gray-200 bg-white md:w-[420px]',
          hasThread ? 'hidden md:flex' : 'flex'
        )}
        aria-label="Conversation list"
      >
        <InboxPage />
      </aside>
      <main
        className="relative z-10 flex-1 flex flex-col bg-gray-50/50 min-w-0"
        aria-label="Active conversation"
      >
        {hasThread ? (
          <Outlet />
        ) : (
          <div
            className="flex h-full items-center justify-center p-6"
            role="status"
            aria-live="polite"
          >
            <div className="max-w-sm rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm">
              <p className="text-sm font-serif font-semibold text-black">Select a conversation</p>
              <p className="mt-2 text-xs text-gray-500">{hint}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
