import React, { useRef, useState } from 'react';
import { Paperclip, Send, Smile } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../context/AuthProvider';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  conversationId?: string;
}

export function MessageComposer({ onSend, disabled, conversationId }: Props) {
  const [text, setText] = useState('');
  const { token } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleTyping = () => {
    if (!conversationId || !token) return;
    const s = getSocket(token);
    s.emit('typing', { conversationId });
  };

  const handleResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-[#E9E2D8] bg-[#FFFBF7]/90 p-2 shadow-[0_12px_30px_rgba(17,24,39,0.08)] backdrop-blur dark:border-slate-800/80 dark:bg-[#0F1914]/80">
      <button
        className="rounded-xl p-2 text-slate-400 hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-300"
        title="Attachments — coming soon"
        type="button"
      >
        <Paperclip className="h-5 w-5" />
      </button>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          handleTyping();
          handleResize();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        rows={1}
        placeholder="Type a message (Enter to send)"
        className="min-h-[44px] flex-1 resize-none rounded-xl bg-transparent px-2 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <button
        className="rounded-xl p-2 text-slate-400 hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-300"
        type="button"
      >
        <Smile className="h-5 w-5" />
      </button>
      <button
        onClick={handleSend}
        disabled={!canSend}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        Send
      </button>
    </div>
  );
}
