import { api } from './api';
import { logger } from './logger';
import { Conversation, Message, LeadStage, ConversationStatus } from '../types/chat';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

export async function safeFetchConversations(): Promise<Conversation[]> {
  try {
    return await withTimeout(api.fetchConversations(), 8000, []);
  } catch (error) {
    logger.warn('Failed to load conversations', error);
    return [];
  }
}

/** Force bootstrap (create agents + welcome convos), then return the list. Use when Messages is empty. */
export async function safeBootstrapConversations(): Promise<Conversation[]> {
  try {
    return await withTimeout(api.bootstrapConversations(), 10000, []);
  } catch (error) {
    logger.warn('Bootstrap conversations failed', error);
    return [];
  }
}

export async function safeFetchMessages(conversationId: string): Promise<Message[]> {
  try {
    return await withTimeout(api.fetchMessages(conversationId), 6000, []);
  } catch (error) {
    logger.warn('Failed to load messages', error);
    return [];
  }
}

export async function safeCreateConversation(
  listingId: string,
  agentId: string
): Promise<Conversation> {
  return api.createConversation(listingId, agentId);
}

export async function safePostMessage(
  conversationId: string,
  body: { type: string; content: unknown }
): Promise<Message> {
  return api.postMessage(conversationId, body);
}

export function formatSummary(answers: Record<string, string>): string {
  const parts = [
    answers.budget ? `budget ${answers.budget}` : null,
    answers.moveIn ? `move-in ${answers.moveIn}` : null,
    answers.viewing ? `prefers ${answers.viewing} viewing` : null,
    answers.mustHaves ? `needs ${answers.mustHaves}` : null
  ].filter(Boolean);
  return `Interested in listing: ${parts.join(', ')}.`;
}

export async function startConversation(
  listingId: string,
  agentId: string
): Promise<Conversation> {
  // API should handle reuse; front-end just calls create and trusts backend to return existing
  return safeCreateConversation(listingId, agentId);
}

export async function updateLeadStage(
  id: string,
  data: Partial<{
    status: ConversationStatus;
    leadStage: LeadStage;
    pinned: boolean;
    muted: boolean;
  }>
) {
  try {
    return await api.updateConversation(id, data);
  } catch (error) {
    logger.warn('Lead stage update failed', error);
    return { id, ...data } as Conversation;
  }
}
