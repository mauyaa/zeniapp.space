import type { Message } from '../../types/chat';

/** Resolves user-visible body text (supports legacy `{ text: string }` storage). */
export function getMessageBodyText(message: Pick<Message, 'type' | 'content'>): string | null {
  if (typeof message.content === 'string') return message.content;
  if (message.content && typeof message.content === 'object' && 'text' in message.content) {
    const t = (message.content as { text?: unknown }).text;
    if (typeof t === 'string') return t;
  }
  return null;
}

export function inboxPreviewLine(message: Pick<Message, 'type' | 'content'>): string {
  if (message.type === 'attachment') return 'Sent an attachment';
  if (message.type === 'schedule') return 'Viewing scheduled';
  const body = getMessageBodyText(message);
  if (body !== null && body.length > 0) return body.slice(0, 200);
  return 'Message';
}
