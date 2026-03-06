import { z } from 'zod';

export const listingSnapshotSchema = z.object({
  title: z.string(),
  price: z.string(),
  locationText: z.string(),
  thumbUrl: z.string().url().or(z.string()),
});

export const agentSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().optional(),
  verified: z.boolean().optional(),
});

export const userSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().optional(),
  role: z.enum(['user', 'agent', 'admin', 'finance']).optional(),
});

export const conversationSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  agentId: z.string(),
  userId: z.string(),
  status: z.enum(['active', 'scheduled', 'closed']),
  leadStage: z.enum(['new', 'contacted', 'viewing', 'offer', 'closed']),
  lastMessageAt: z.string(),
  unreadCount: z.number().int().nonnegative(),
  createdAt: z.string().optional(),
  responseDueAt: z.string().nullable().optional(),
  pinned: z.boolean().optional(),
  // Support/general chats intentionally have no listing attached.
  listingSnapshot: listingSnapshotSchema.nullable(),
  agentSnapshot: agentSnapshotSchema,
  userSnapshot: userSnapshotSchema.optional(),
  lastMessagePreview: z.string().optional(),
});

const messageContentSchema = z.union([
  z.string(),
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
]);

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderType: z.enum(['user', 'agent', 'bot', 'system']),
  type: z.enum(['text', 'quickReply', 'schedule', 'summary', 'attachment', 'system']),
  content: messageContentSchema,
  createdAt: z.string(),
  status: z.enum(['sending', 'sent', 'delivered', 'read', 'failed']),
});

export type ConversationParsed = z.infer<typeof conversationSchema>;
export type MessageParsed = z.infer<typeof messageSchema>;
