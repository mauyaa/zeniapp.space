export type SenderType = 'user' | 'agent' | 'bot' | 'system';

export type MessageType = 'text' | 'quickReply' | 'schedule' | 'summary' | 'attachment' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ListingSnapshot {
  title: string;
  price: string;
  locationText: string;
  thumbUrl: string;
}

export interface AgentSnapshot {
  id: string;
  name: string;
  avatarUrl?: string;
  verified?: boolean;
}

export interface UserSnapshot {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: 'user' | 'agent' | 'admin' | 'finance';
}

export type LeadStage = 'new' | 'contacted' | 'viewing' | 'offer' | 'closed';

export type ConversationStatus = 'active' | 'scheduled' | 'closed';

export interface Conversation {
  id: string;
  listingId: string;
  agentId: string;
  userId: string;
  status: ConversationStatus;
  leadStage: LeadStage;
  lastMessageAt: string;
  unreadCount: number;
  createdAt?: string;
  responseDueAt?: string | null;
  pinned?: boolean;
  muted?: boolean;
  /** Present only when conversation is about a property listing. Support/general agent chats have no listing. */
  listingSnapshot: ListingSnapshot | null;
  agentSnapshot: AgentSnapshot;
  userSnapshot?: UserSnapshot;
  lastMessagePreview?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  type: MessageType;
  content: string | Record<string, unknown>;
  createdAt: string;
  status: MessageStatus;
}
