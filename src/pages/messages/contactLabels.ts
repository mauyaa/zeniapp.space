import type { Conversation } from '../../types/chat';

type ConversationRole = 'user' | 'agent' | 'admin' | 'finance' | undefined;

function normalize(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function cleanLabel(value?: string | null) {
  return (value || '').trim().replace(/\s+/g, ' ');
}

function normalizeKeyPart(value?: string | null) {
  return (
    normalize(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'agent'
  );
}

function keyForAgent(agentId?: string | null, fallbackLabel?: string | null) {
  return agentId || normalizeKeyPart(fallbackLabel);
}

function isAdminSupportLabel(value?: string | null) {
  const v = normalize(value);
  return (
    v === 'zeni support' ||
    v === 'zeni admin' ||
    v === 'zei admin' ||
    v === 'support' ||
    v === 'admin' ||
    v === 'customer support'
  );
}

function isSystemAgentLabel(value?: string | null) {
  const v = normalize(value);
  return v === 'zeni agent' || v === 'demo agent';
}

export function getSystemConversationLabel(
  name?: string | null
): 'Zeni Admin' | 'Zeni Agent' | null {
  if (isAdminSupportLabel(name)) return 'Zeni Admin';
  if (isSystemAgentLabel(name)) return 'Zeni Agent';
  return null;
}

function getUserSystemConversationLabel(name?: string | null): 'Zeni Admin' | 'Zeni Agent' | null {
  if (normalize(name) === 'agent') return 'Zeni Agent';
  return getSystemConversationLabel(name);
}

export function formatKnownContactLabel(name?: string | null): string {
  const systemLabel = getSystemConversationLabel(name);
  if (systemLabel) return systemLabel;
  return cleanLabel(name) || 'Agent';
}

/**
 * For the user inbox: keep system accounts normalized, but preserve real agent names.
 */
export function resolveUserContactLabel(name?: string | null): string {
  const systemLabel = getUserSystemConversationLabel(name);
  if (systemLabel) return systemLabel;
  return cleanLabel(name) || 'Agent';
}

/** User inbox/thread keys: keep support threads deduped, but preserve separate listing conversations. */
export function getUserConversationKey(conversation: Conversation): string {
  const systemLabel = getUserSystemConversationLabel(conversation.agentSnapshot?.name);
  if (systemLabel) {
    return `system:${normalizeKeyPart(systemLabel)}`;
  }
  const label = resolveUserContactLabel(conversation.agentSnapshot?.name);
  const agentKey = keyForAgent(conversation.agentId, label);
  return `agent:${agentKey}`;
}

/** Agent inbox/thread: show the user's actual name, or the internal counterpart for non-user chats. */
export function getAgentOtherPartyLabel(conversation: Conversation): string {
  if (conversation.userSnapshot?.role === 'user' || conversation.userSnapshot?.role === 'admin') {
    return (
      conversation.userSnapshot?.name?.trim() ||
      (conversation.userSnapshot?.role === 'admin' ? 'Admin' : 'User')
    );
  }
  return formatKnownContactLabel(conversation.agentSnapshot?.name);
}

/** Admin inbox/thread: show the real user name for user threads, otherwise preserve the actual agent label. */
export function getAdminOtherPartyLabel(conversation: Conversation): string {
  if (conversation.userSnapshot?.role === 'user') {
    return conversation.userSnapshot?.name?.trim() || 'User';
  }
  return formatKnownContactLabel(conversation.agentSnapshot?.name);
}

/** Key to dedupe conversations for agent: one row per other party (user or admin). */
export function getAgentOtherPartyKey(conversation: Conversation): string {
  if (conversation.userSnapshot?.role === 'admin') {
    const adminSystemLabel = getSystemConversationLabel(conversation.userSnapshot?.name);
    if (adminSystemLabel === 'Zeni Admin') {
      return 'system:zeni-admin';
    }
    return `admin:${conversation.userId || conversation.id}`;
  }
  if (conversation.userSnapshot?.role === 'user') {
    return `${conversation.userSnapshot.role}:${conversation.userId || conversation.id}`;
  }
  const systemLabel = getSystemConversationLabel(conversation.agentSnapshot?.name);
  if (systemLabel) {
    return `system:${normalizeKeyPart(systemLabel)}`;
  }
  return `agent:${keyForAgent(conversation.agentId, conversation.agentSnapshot?.name)}`;
}

/** Key to dedupe conversations for admin: one row per other party (user or agent). */
export function getAdminOtherPartyKey(conversation: Conversation): string {
  if (conversation.userSnapshot?.role === 'user') {
    return `user:${conversation.userId || conversation.id}`;
  }
  const systemLabel = getSystemConversationLabel(conversation.agentSnapshot?.name);
  if (systemLabel) {
    return `system:${normalizeKeyPart(systemLabel)}`;
  }
  return `agent:${keyForAgent(conversation.agentId, conversation.agentSnapshot?.name)}`;
}

export function shouldIncludeConversationForRole(
  role: ConversationRole,
  conversation: Conversation,
  currentUserId?: string | null
): boolean {
  if (role === 'agent') {
    const userRole = conversation.userSnapshot?.role;
    if (!userRole || userRole === 'user' || userRole === 'admin') {
      return true;
    }
    return (
      userRole === 'agent' &&
      conversation.userId === currentUserId &&
      getSystemConversationLabel(conversation.agentSnapshot?.name) === 'Zeni Admin'
    );
  }

  if (role === 'admin') {
    if (conversation.userSnapshot?.role === 'user') {
      return getSystemConversationLabel(conversation.agentSnapshot?.name) === 'Zeni Admin';
    }
    return (
      conversation.userSnapshot?.role === 'admin' &&
      conversation.userId === currentUserId &&
      getSystemConversationLabel(conversation.agentSnapshot?.name) !== 'Zeni Admin'
    );
  }

  return true;
}
