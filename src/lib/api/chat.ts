/**
 * Chat API — conversations, messages.
 */

import { z } from 'zod';
import { request } from './client';
import { conversationSchema, messageSchema } from '../schemas';
import type { Conversation, Message, ConversationStatus, LeadStage } from '../../types/chat';

function parseConversationList(data: unknown): Conversation[] {
  const parsed = z.array(conversationSchema).safeParse(data);
  if (parsed.success) return parsed.data as Conversation[];

  // Fallback: keep valid items instead of failing the whole inbox.
  const raw = Array.isArray(data) ? data : [];
  const valid = raw
    .map((item) => conversationSchema.safeParse(item))
    .filter((result): result is { success: true; data: z.infer<typeof conversationSchema> } => result.success)
    .map((result) => result.data as Conversation);
  return valid;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const data = await request<unknown>('/conversations?scope=me');
  return parseConversationList(data);
}

/** Force-create Zeni Support + Zeni Agent users (if missing) and welcome conversations; returns the new list. */
export async function bootstrapConversations(): Promise<Conversation[]> {
  const data = await request<unknown>('/conversations/bootstrap', { method: 'POST' });
  return parseConversationList(data);
}

export function createConversation(listingId: string, agentId: string): Promise<Conversation> {
  return request('/conversations', {
    method: 'POST',
    body: JSON.stringify({ listingId, agentId }),
  });
}

export function updateConversation(
  id: string,
  data: Partial<{
    status: ConversationStatus;
    leadStage: LeadStage;
    pinned: boolean;
    muted: boolean;
  }>
): Promise<Conversation> {
  return request(`/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const data = await request<unknown>(`/conversations/${conversationId}/messages`);
  const parsed = z.array(messageSchema).safeParse(data);
  if (!parsed.success) throw new Error('Invalid messages payload');
  return parsed.data as Message[];
}

export function postMessage(
  conversationId: string,
  body: { type: string; content: unknown }
): Promise<Message> {
  return request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function markConversationRead(conversationId: string): Promise<void> {
  return request(`/conversations/${conversationId}/read`, { method: 'POST' });
}
